const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  try {
    console.log('DocuSign success function called');

    // Get query parameters from the URL
    const { bundleID } = event.queryStringParameters;

    if (!bundleID) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Bundle ID is required' }),
      };
    }

    // Initialize Supabase client
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

    // Retrieve bundle data from Supabase using bundleID
    const { data: orderData, error } = await supabase
      .from('pending_orders')
      .select('*')
      .eq('bundle_id', bundleID)
      .single(); // Expecting one record

    if (error || !orderData) {
      console.error('Supabase retrieval error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to retrieve order data' }),
      };
    }

    // Extract necessary data from Supabase response
    const { bundle_name, final_monthly, sub_length } = orderData;

    // Validate retrieved data
    if (!final_monthly || !sub_length) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required bundle data' }),
      };
    }

    // Create Stripe checkout session using retrieved data
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            recurring: { interval: 'month' },
            unit_amount: Math.round(parseFloat(final_monthly) * 100), // Convert to cents
            product_data: {
              name: bundle_name || 'Custom Bundle',
              description: `${sub_length}-month subscription`,
              metadata: { bundleID },
            },
          },
          quantity: 1,
        },
      ],
      success_url: 'https://www.buzzwordstrategies.com/success.html',
      cancel_url: 'https://www.buzzwordstrategies.com/cancel.html',
    });

    // Redirect to Stripe checkout
    return {
      statusCode: 303,
      headers: {
        Location: session.url,
      },
      body: '',
    };
  } catch (error) {
    console.error('Stripe Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || 'Failed to create checkout session',
      }),
    };
  }
};

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    // Get query parameters from the URL
    const { bundleID, bundleName, finalMonthly, subLength } = event.queryStringParameters;
    
    if (!finalMonthly || !subLength) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'usd',
          recurring: { interval: 'month' },
          unit_amount: Math.round(parseFloat(finalMonthly) * 100),
          product_data: {
            name: bundleName || 'Custom Bundle',
            description: `${subLength}-month subscription`,
            metadata: { bundleID }
          }
        },
        quantity: 1
      }],
      success_url: 'https://www.buzzwordstrategies.com/success.html',
      cancel_url: 'https://www.buzzwordstrategies.com/cancel.html'
    });

    // Redirect to Stripe checkout
    return {
      statusCode: 303,
      headers: {
        Location: session.url
      },
      body: ''
    };
  } catch (error) {
    console.error('Stripe Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to create checkout session' })
    };
  }
};

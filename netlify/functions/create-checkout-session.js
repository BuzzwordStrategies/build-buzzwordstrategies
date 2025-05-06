const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
exports.handler = async function(event) {
  try {
    const { selectedTiers, subLength, bundleName, finalMonthly } = JSON.parse(event.body || '{}');

    if (!finalMonthly || finalMonthly <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing or invalid price.' })
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(finalMonthly * 100),
          recurring: { interval: 'month' },
          product_data: {
            name: bundleName || 'Custom Buzzword Bundle',
            description: `${subLength}-month subscription`,
            metadata: {
              selectedTiers: JSON.stringify(selectedTiers),
              subLength
            }
          }
        },
        quantity: 1
      }],
      success_url: 'https://www.buzzwordstrategies.com/my-bundle?success=true',
      cancel_url: 'https://www.buzzwordstrategies.com/build-my-bundle?canceled=true'
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url })
    };
  } catch (err) {
    console.error("Stripe error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Checkout session creation failed.' })
    };
  }
};

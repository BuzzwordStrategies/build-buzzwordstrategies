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

    // Format the selected products into readable descriptions
    const productList = Object.entries(selectedTiers)
      .map(([product, tier]) => `${product} - ${tier}`)
      .join(', ');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      allow_promotion_codes: true, // ✅ Enables promo code field at checkout
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(finalMonthly * 100),
          recurring: { interval: 'month' },
          product_data: {
            name: bundleName || 'Custom Buzzword Bundle',
            description: `${subLength}-month subscription | ${productList}`,
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

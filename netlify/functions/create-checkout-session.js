// File path: /netlify/functions/create-checkout-session.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  try {
    const data = JSON.parse(event.body);

    const { selectedTiers, subLength, bundleName, finalMonthly } = data;

    if (!selectedTiers || !subLength || !finalMonthly) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    const lineItems = Object.entries(selectedTiers).map(([product, tier]) => {
      const price = finalMonthly; // Adjust if you want per-product price tracking
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${product} - ${tier}`,
          },
          unit_amount: Math.round(price * 100), // Stripe expects cents
          recurring: {
            interval: 'month',
          },
        },
        quantity: 1,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: lineItems,
      success_url: 'https://build.buzzwordstrategies.com/success.html',
      cancel_url: 'https://build.buzzwordstrategies.com/cancel.html',
      metadata: {
        bundle_name: bundleName || 'Custom Bundle',
        months: subLength,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error("Stripe error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error", details: err.message }),
    };
  }
};


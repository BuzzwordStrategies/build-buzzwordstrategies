// netlify/functions/createCheckout.js
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

/**
 * Utility → convert dollars to Stripe's integer‑cents
 */
const dollars = (n) => Math.round(Number(n) * 100);

/**
 * Netlify handler
 */
export default async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  try {
    const data = JSON.parse(event.body);           // sent from index.html
    const { bundleName, totalPrice, months } = data;

    // 💡 If you prefer a *recurring* payment, swap mode to "subscription"
    // and use price_data.recurring  (Stripe docs).  Below = one‑time.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${event.headers.origin}/success.html?name=${encodeURIComponent(bundleName)}`,
      cancel_url:  `${event.headers.origin}/cancel.html`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            product_data: {
              name: bundleName,
              description: `Custom marketing bundle – ${months}‑month plan`,
            },
            unit_amount: dollars(totalPrice),
          },
        },
      ],
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: 'Server error creating Stripe Checkout session.',
    };
  }
}

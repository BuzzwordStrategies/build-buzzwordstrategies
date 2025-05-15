// server/routes/stripe.js
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { v4: uuidv4 } = require('uuid');

// Create a Stripe checkout session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { bundleName, finalMonthly, subLength, selectedServices } = req.body;
    
    // Create a unique bundleID if not provided
    const bundleID = req.body.bundleID || `bwb-${uuidv4()}`;
    
    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${bundleName || 'Marketing Bundle'} - ${subLength} month subscription`,
              description: selectedServices || 'Marketing services'
            },
            unit_amount: Math.round(parseFloat(finalMonthly) * 100), // Convert to cents
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}&bundle_id=${bundleID}`,
      cancel_url: `${req.headers.origin}/cancel`,
    });
    
    res.json({ 
      success: true, 
      sessionId: session.id,
      url: session.url,
      bundleID: bundleID
    });
  } catch (error) {
    console.error('Error creating Stripe session:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Webhook to handle Stripe events
router.post('/webhook', async (req, res) => {
  // This will be implemented in a future step
  res.json({ received: true });
});

module.exports = router;

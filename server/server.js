// server/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// Import routes
const stripeRoutes = require('./routes/stripe');
const supabaseRoutes = require('./routes/supabase');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Basic route to test server
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Buzzword Strategies API is running'
  });
});

// Use routes
app.use('/api/stripe', stripeRoutes);
app.use('/api/supabase', supabaseRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

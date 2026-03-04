require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Supabase setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'Iyaya API running',
    version: '1.0.0',
    network: process.env.SOLANA_NETWORK || 'devnet',
    timestamp: new Date().toISOString()
  });
});

// Mount routes
app.use('/api/payments', require('./api/routes.js'));
app.use('/api/points', require('./api/points-routes.js'));
app.use('/api/solana', require('./api/solana-routes.js'));

// Error handling
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Iyaya API running on port ${PORT}`);
  console.log(`📡 Solana network: ${process.env.SOLANA_NETWORK || 'devnet'}`);
  console.log(`🔗 Supabase: ${process.env.SUPABASE_URL ? 'Connected' : 'NOT CONFIGURED'}`);
});
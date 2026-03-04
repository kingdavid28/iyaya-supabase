const express = require('express');
const { verifyTransaction } = require('../services/payment-verification.service');
const { awardPoints } = require('../services/points-calculation.service');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const router = express.Router();

// Verify payment transaction
router.post('/payments/verify', async (req, res) => {
  const { signature, bookingId, expected } = req.body;
  
  try {
    const result = await verifyTransaction(signature, bookingId, expected);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get caregiver points
router.get('/caregivers/:id/points', async (req, res) => {
  const { id } = req.params;
  
  try {
    const { data: summary } = await supabase
      .from('caregiver_points_summary')
      .select('*')
      .eq('caregiver_id', id)
      .single();

    const { data: recent } = await supabase
      .from('caregiver_points_ledger')
      .select('metric, delta, reason, created_at')
      .eq('caregiver_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      totalPoints: summary?.total_points || 0,
      tier: summary?.tier || 'Bronze',
      recent: recent || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
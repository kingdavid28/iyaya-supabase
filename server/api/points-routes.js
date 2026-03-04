const express = require('express');
const { awardPoints } = require('../services/points-engine');

const router = express.Router();

// Award points after payment confirmation
router.post('/points/award', async (req, res) => {
    const { caregiverId, rating, bookingId } = req.body;
    
    if (!caregiverId || !rating) {
        return res.status(400).json({ error: 'Missing caregiverId or rating' });
    }
    
    try {
        const result = await awardPoints(caregiverId, rating, bookingId);
        res.json({ 
            success: true, 
            pointsAwarded: result.delta,
            newTotal: result.newTotal 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get caregiver points and tier
router.get('/caregivers/:id/points', async (req, res) => {
    const { id } = req.params;
    
    try {
        const { data: summary } = await supabase
            .from('caregiver_points_summary')
            .select('total_points')
            .eq('caregiver_id', id)
            .single();
            
        const { data: caregiver } = await supabase
            .from('caregiver')
            .select('tier')
            .eq('id', id)
            .single();
            
        const { data: history } = await supabase
            .from('caregiver_points_ledger')
            .select('delta, reason, created_at')
            .eq('caregiver_id', id)
            .order('created_at', { ascending: false })
            .limit(10);
        
        res.json({
            totalPoints: summary?.total_points || 0,
            tier: caregiver?.tier || 'Bronze',
            recentActivity: history || []
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
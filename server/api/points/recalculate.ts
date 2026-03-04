import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { caregiverId } = req.body;
  if (!caregiverId) {
    return res.status(400).json({ error: 'caregiverId required' });
  }

  try {
    // Get all points from ledger
    const { data: ledgerEntries } = await supabase
      .from('caregiver_points_ledger')
      .select('delta')
      .eq('caregiver_id', caregiverId);

    const totalPoints = ledgerEntries?.reduce((sum, entry) => sum + entry.delta, 0) || 0;

    // Calculate tier
    const tier = recalcTier(totalPoints);

    // Get recent ratings for rolling average
    const { data: recentRatings } = await supabase
      .from('caregiver_points_ledger')
      .select('delta')
      .eq('caregiver_id', caregiverId)
      .eq('metric', 'rating')
      .order('created_at', { ascending: false })
      .limit(10);

    const avgRating = recentRatings?.length 
      ? recentRatings.reduce((sum, r) => sum + Math.max(0, r.delta), 0) / recentRatings.length
      : 0;

    // Update summary
    await supabase
      .from('caregiver_points_summary')
      .upsert({
        caregiver_id: caregiverId,
        total_points: totalPoints,
        rolling_avg_rating: avgRating,
        last_updated: new Date().toISOString()
      });

    // Update caregiver tier
    await supabase
      .from('caregiver')
      .update({ tier })
      .eq('id', caregiverId);

    res.json({ 
      totalPoints, 
      tier, 
      avgRating: avgRating.toFixed(2) 
    });
  } catch (error) {
    console.error('Points recalculation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function recalcTier(totalPoints: number): 'Bronze' | 'Silver' | 'Gold' | 'Platinum' {
  if (totalPoints >= 500) return 'Platinum';
  if (totalPoints >= 250) return 'Gold';
  if (totalPoints >= 100) return 'Silver';
  return 'Bronze';
}
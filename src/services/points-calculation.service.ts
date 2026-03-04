import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export function calculateTier(totalPoints: number): 'Bronze' | 'Silver' | 'Gold' | 'Platinum' {
  if (totalPoints >= 500) return 'Platinum';
  if (totalPoints >= 250) return 'Gold';
  if (totalPoints >= 100) return 'Silver';
  return 'Bronze';
}

export async function awardPoints(caregiverId: string, bookingId: string, deltas: {
  metric: string;
  delta: number;
  reason: string;
}[]) {
  for (const { metric, delta, reason } of deltas) {
    await supabase.from('caregiver_points_ledger').insert({
      caregiver_id: caregiverId,
      booking_id: bookingId,
      metric,
      delta,
      reason
    });
  }

  // Update tier if needed
  const { data: summary } = await supabase
    .from('caregiver_points_summary')
    .select('total_points')
    .eq('caregiver_id', caregiverId)
    .single();

  if (summary) {
    const newTier = calculateTier(summary.total_points);
    await supabase
      .from('caregiver')
      .update({ tier: newTier })
      .eq('id', caregiverId);
  }
}
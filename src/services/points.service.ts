// Week 3: Points System
import { supabase } from './supabase';

export async function awardCompletionPoints({ caregiverId, bookingId, rating = 5, punctual = true }: any) {
    const deltas = [
        { metric: 'rating', delta: rating >= 4 ? 10 : rating >= 3 ? 5 : -5, reason: `rating=${rating}` },
        { metric: 'completion', delta: 5, reason: 'completed booking' },
        { metric: 'punctuality', delta: punctual ? 5 : -3, reason: punctual ? 'on-time' : 'late' }
    ];
    
    for (const { metric, delta, reason } of deltas) {
        await supabase.from('caregiver_points_ledger').insert({
            caregiver_id: caregiverId,
            booking_id: bookingId,
            metric,
            delta,
            reason
        });
    }
    
    await recalculatePointsSummary(caregiverId);
}

async function recalculatePointsSummary(caregiverId: string) {
    const { data: ledger } = await supabase
        .from('caregiver_points_ledger')
        .select('delta')
        .eq('caregiver_id', caregiverId);
    
    const totalPoints = ledger?.reduce((sum, entry) => sum + entry.delta, 0) || 0;
    const tier = totalPoints >= 500 ? 'Platinum' : totalPoints >= 250 ? 'Gold' : totalPoints >= 100 ? 'Silver' : 'Bronze';
    
    await supabase.from('caregiver_points_summary').upsert({
        caregiver_id: caregiverId,
        total_points: totalPoints,
        last_updated: new Date().toISOString()
    });
    
    await supabase.from('caregiver').update({ tier }).eq('id', caregiverId);
}

export function recalcTier(totalPoints: number): 'Bronze'|'Silver'|'Gold'|'Platinum' {
    if (totalPoints >= 500) return 'Platinum';
    if (totalPoints >= 250) return 'Gold';
    if (totalPoints >= 100) return 'Silver';
    return 'Bronze';
}
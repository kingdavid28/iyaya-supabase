import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function awardPoints(caregiverId: string, rating: number, bookingId?: string) {
    const delta = rating >= 4 ? 10 : 5;
    
    // Insert points with audit trail
    const { error } = await supabase.from('caregiver_points_ledger').insert({
        caregiver_id: caregiverId,
        booking_id: bookingId,
        metric: 'rating',
        delta,
        reason: `rating=${rating}`
    });
    
    if (error) throw error;
    
    // Update tier automatically via trigger
    await updateTier(caregiverId);
    
    return { delta, newTotal: await getTotalPoints(caregiverId) };
}

async function updateTier(caregiverId: string) {
    const total = await getTotalPoints(caregiverId);
    const tier = calculateTier(total);
    
    await supabase
        .from('caregiver')
        .update({ tier })
        .eq('id', caregiverId);
}

function calculateTier(points: number): 'Bronze' | 'Silver' | 'Gold' | 'Platinum' {
    if (points >= 500) return 'Platinum';
    if (points >= 250) return 'Gold';
    if (points >= 100) return 'Silver';
    return 'Bronze';
}

async function getTotalPoints(caregiverId: string): Promise<number> {
    const { data } = await supabase
        .from('caregiver_points_summary')
        .select('total_points')
        .eq('caregiver_id', caregiverId)
        .single();
    
    return data?.total_points || 0;
}
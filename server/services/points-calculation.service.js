const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Calculate points based on rating
 */
function calculatePoints(rating) {
  // Base points for job completion
  const basePoints = 50;
  // Bonus based on rating (1-5 stars)
  const ratingBonus = (rating || 5) * 10;
  return basePoints + ratingBonus;
}

/**
 * Determine tier based on total points
 */
function determineTier(totalPoints) {
  if (totalPoints >= 500) return 'Platinum';
  if (totalPoints >= 300) return 'Gold';
  if (totalPoints >= 150) return 'Silver';
  return 'Bronze';
}

/**
 * Award points to caregiver after payment
 */
async function awardPoints(caregiverId, rating, bookingId) {
  try {
    const pointsDelta = calculatePoints(rating);
    const reason = `Job completed with ${rating}-star rating`;

    // Add to ledger
    const { data: ledgerEntry, error: ledgerError } = await supabase
      .from('caregiver_points_ledger')
      .insert({
        caregiver_id: caregiverId,
        booking_id: bookingId,
        metric: 'job_completed',
        delta: pointsDelta,
        reason,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (ledgerError) throw ledgerError;

    // Get current summary
    const { data: summary, error: summaryError } = await supabase
      .from('caregiver_points_summary')
      .select('*')
      .eq('caregiver_id', caregiverId)
      .single();

    let newTotal = pointsDelta;
    let tier = determineTier(newTotal);

    if (summary) {
      newTotal = (summary.total_points || 0) + pointsDelta;
      tier = determineTier(newTotal);

      // Update summary
      const { error: updateError } = await supabase
        .from('caregiver_points_summary')
        .update({
          total_points: newTotal,
          tier,
          jobs_completed: (summary.jobs_completed || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('caregiver_id', caregiverId);

      if (updateError) throw updateError;
    } else {
      // Create new summary
      const { error: insertError } = await supabase
        .from('caregiver_points_summary')
        .insert({
          caregiver_id: caregiverId,
          total_points: newTotal,
          tier,
          jobs_completed: 1,
          rolling_avg_rating: rating,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) throw insertError;
    }

    // Update caregiver tier in main table
    await supabase
      .from('caregiver')
      .update({ tier, updated_at: new Date().toISOString() })
      .eq('id', caregiverId);

    console.log('✅ Points awarded:', { caregiverId, delta: pointsDelta, newTotal, tier });

    return {
      success: true,
      delta: pointsDelta,
      newTotal,
      tier,
      ledgerEntry
    };
  } catch (error) {
    console.error('❌ Failed to award points:', error);
    throw error;
  }
}

/**
 * Get caregiver points summary
 */
async function getCaregiverPoints(caregiverId) {
  try {
    const { data: summary, error } = await supabase
      .from('caregiver_points_summary')
      .select('*')
      .eq('caregiver_id', caregiverId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    const { data: recent } = await supabase
      .from('caregiver_points_ledger')
      .select('metric, delta, reason, created_at')
      .eq('caregiver_id', caregiverId)
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      totalPoints: summary?.total_points || 0,
      tier: summary?.tier || 'Bronze',
      jobsCompleted: summary?.jobs_completed || 0,
      recent: recent || []
    };
  } catch (error) {
    console.error('Failed to get caregiver points:', error);
    throw error;
  }
}

module.exports = { awardPoints, getCaregiverPoints, calculatePoints, determineTier };

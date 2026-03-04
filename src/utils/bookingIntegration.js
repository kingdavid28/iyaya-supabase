import { pointsService } from '../services/points';
import { solanaService } from '../services/solana';

// Add this to your existing booking completion flow
export async function handleBookingCompletion(booking, rating) {
  try {
    // Award points based on booking completion
    const metrics = {
      rating: rating || 5,
      completionRate: 1.0, // Completed successfully
      punctuality: booking.started_on_time ? 1.0 : 0.5,
      compliance: booking.caregiver.verified ? 1.0 : 0.8
    };

    const pointsAwarded = await pointsService.awardPoints(
      booking.caregiver_id,
      booking.id,
      metrics,
      `Booking completed with ${rating}-star rating`
    );

    console.log(`Awarded ${pointsAwarded} points to caregiver ${booking.caregiver_id}`);

    // Update booking status
    await supabaseService.bookings.updateBookingStatus(booking.id, 'completed');

    return { success: true, pointsAwarded };
  } catch (error) {
    console.error('Error completing booking:', error);
    return { success: false, error: error.message };
  }
}

// Add to caregiver profile display
export function getCaregiverTierInfo(totalPoints) {
  const tier = pointsService.getTier(totalPoints);
  const benefits = {
    Bronze: 'Basic visibility',
    Silver: 'Priority listing',
    Gold: 'Reduced fees (-1%)',
    Platinum: 'Bonus payouts + featured badge'
  };

  return {
    tier,
    benefits: benefits[tier],
    nextTier: getNextTierInfo(totalPoints)
  };
}

function getNextTierInfo(points) {
  if (points < 100) return { tier: 'Silver', pointsNeeded: 100 - points };
  if (points < 250) return { tier: 'Gold', pointsNeeded: 250 - points };
  if (points < 500) return { tier: 'Platinum', pointsNeeded: 500 - points };
  return null;
}
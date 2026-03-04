import { supabaseService } from './supabase';

class PointsService {
  calculatePoints(metrics) {
    const { rating = 0, completionRate = 0, punctuality = 0, compliance = 0 } = metrics;
    
    const score = (
      0.4 * (rating / 5) +           // Quality (40%)
      0.3 * completionRate +         // Reliability (30%) 
      0.2 * compliance +             // Compliance (20%)
      0.1 * punctuality              // Engagement (10%)
    );
    
    return Math.floor(score * 100); // Scale to 0-100 points
  }

  async awardPoints(caregiverId, bookingId, metrics, reason) {
    const points = this.calculatePoints(metrics);
    
    if (points <= 0) return;

    // Add to ledger
    await supabaseService.client
      .from('caregiver_points_ledger')
      .insert({
        caregiver_id: caregiverId,
        booking_id: bookingId,
        delta: points,
        reason: reason || 'Booking completion'
      });

    // Update total points
    const { data: current } = await supabaseService.client
      .from('caregiver')
      .select('total_points')
      .eq('id', caregiverId)
      .single();

    await supabaseService.client
      .from('caregiver')
      .update({ total_points: (current?.total_points || 0) + points })
      .eq('id', caregiverId);

    return points;
  }

  getTier(totalPoints) {
    if (totalPoints >= 500) return 'Platinum';
    if (totalPoints >= 250) return 'Gold';
    if (totalPoints >= 100) return 'Silver';
    return 'Bronze';
  }

  async getPointsHistory(caregiverId) {
    const { data } = await supabaseService.client
      .from('caregiver_points_ledger')
      .select('*')
      .eq('caregiver_id', caregiverId)
      .order('created_at', { ascending: false });

    return data || [];
  }
}

export const pointsService = new PointsService();
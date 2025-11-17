import { supabaseService } from './supabase';

class RatingService {
  // Submit a rating for a caregiver
  async rateCaregiver(caregiverId, bookingId, rating, review = '') {
    try {
      const user = await supabaseService.user._getCurrentUser();
      if (!user) throw new Error('Authentication required');
      
      const reviewData = {
        booking_id: bookingId,
        reviewer_id: user.id,
        reviewee_id: caregiverId,
        rating,
        comment: review.trim()
      };
      
      return await supabaseService.reviews.createReview(reviewData);
    } catch (error) {
      console.error('Error rating caregiver:', error);
      throw error;
    }
  }

  // Submit a rating for a parent
  async rateParent(parentId, bookingId, rating, review = '') {
    try {
      const user = await supabaseService.user._getCurrentUser();
      if (!user) throw new Error('Authentication required');
      
      const reviewData = {
        booking_id: bookingId,
        reviewer_id: user.id,
        reviewee_id: parentId,
        rating,
        comment: review.trim()
      };
      
      return await supabaseService.reviews.createReview(reviewData);
    } catch (error) {
      console.error('Error rating parent:', error);
      throw error;
    }
  }

  // Get ratings for a caregiver
  async getCaregiverRatings(caregiverId, page = 1, limit = 10) {
    try {
      return await supabaseService.reviews.getReviews(caregiverId, limit);
    } catch (error) {
      console.error('Error fetching caregiver ratings:', error);
      throw error;
    }
  }

  // Get ratings for a parent
  async getParentRatings(parentId, page = 1, limit = 10) {
    try {
      return await supabaseService.reviews.getReviews(parentId, limit);
    } catch (error) {
      console.error('Error fetching parent ratings:', error);
      throw error;
    }
  }

  // Get rating summary for a user
  async getRatingSummary(userId, userType = 'caregiver') {
    try {
      const reviews = await supabaseService.reviews.getReviews(userId);
      if (!reviews || reviews.length === 0) {
        return { averageRating: 0, totalRatings: 0 };
      }
      
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;
      
      return { averageRating, totalRatings: reviews.length };
    } catch (error) {
      console.error('Error fetching rating summary:', error);
      return { averageRating: 0, totalRatings: 0 };
    }
  }

  // Check if user can rate a booking
  async canRate(bookingId) {
    try {
      const user = await supabaseService.user._getCurrentUser();
      if (!user) return false;
      
      // Check if booking exists and user is part of it
      const booking = await supabaseService.bookings.getBookingById(bookingId, user.id);
      if (!booking) return false;
      
      // Check if booking is completed
      return booking.status === 'completed';
    } catch (error) {
      console.error('Error checking rating eligibility:', error);
      return false;
    }
  }

  // Get existing rating for a booking
  async getBookingRating(bookingId) {
    try {
      const user = await supabaseService.user._getCurrentUser();
      if (!user) return null;
      
      const reviews = await supabaseService.reviews.getReviews(user.id);
      return reviews.find(review => review.booking_id === bookingId) || null;
    } catch (error) {
      console.error('Error fetching booking rating:', error);
      return null;
    }
  }
}

export default new RatingService();
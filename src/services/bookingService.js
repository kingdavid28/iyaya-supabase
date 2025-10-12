import { API_BASE_URL } from '../config/api';
import { getAuthToken } from '../utils/auth';
import { logger } from '../utils/logger';

// Note: This service now uses Supabase for most operations
// but maintains the same interface for backward compatibility

/**
 * Booking Service
 * Handles all booking-related API calls
 */

class BookingService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/bookings`;
  }

  async makeRequest(endpoint, options = {}) {
    try {
      const token = await getAuthToken();
      const url = `${this.baseURL}${endpoint}`;
      
      const config = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        ...options,
      };

      if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
      }

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      logger.error('BookingService request failed:', { endpoint, error: error.message });
      throw error;
    }
  }

  // Get all bookings for current user
  async getBookings(filters = {}) {
    try {
      // Import supabaseService dynamically to avoid circular imports
      const { supabaseService } = await import('./supabase');
      
      const user = await supabaseService.user._getCurrentUser();
      if (!user) {
        console.warn('⚠️ User not authenticated in getBookings');
        return [];
      }
      
      // Get user profile to determine role
      const profile = await supabaseService.user.getProfile(user.id);
      const role = profile?.role || user.user_metadata?.role || 'parent';
      
      console.log('📋 Fetching bookings for user:', user.id, 'role:', role);
      const bookings = await supabaseService.bookings.getMyBookings(user.id, role);
      
      console.log('📋 BookingService - Fetched bookings:', bookings?.length || 0);
      if (bookings && bookings.length > 0) {
        console.log('📋 BookingService - First booking structure:', bookings[0]);
      }
      
      return bookings || [];
    } catch (error) {
      logger.error('Get bookings failed:', error);
      console.error('❌ Get bookings error details:', error.message);
      return [];
    }
  }

  // Get a specific booking by ID
  async getBookingById(bookingId) {
    try {
      // Import supabaseService dynamically to avoid circular imports
      const { supabaseService } = await import('./supabase');
      
      const user = await supabaseService.user._getCurrentUser();
      if (!user) {
        console.warn('⚠️ User not authenticated in getBookingById');
        return null;
      }
      
      console.log('📋 Fetching booking by ID:', bookingId, 'for user:', user.id);
      const booking = await supabaseService.bookings.getBookingById(bookingId, user.id);
      
      return booking;
    } catch (error) {
      logger.error('Get booking by ID failed:', error);
      console.error('❌ Get booking by ID error details:', error.message);
      return null;
    }
  }

  // Create a new booking
  async createBooking(bookingData) {
    try {
      // Import supabaseService dynamically to avoid circular imports
      const { supabaseService } = await import('./supabase');
      
      console.log('📝 Creating booking with data:', bookingData);
      const result = await supabaseService.bookings.createBooking(bookingData);
      console.log('✅ Booking created successfully:', result);
      
      return result;
    } catch (error) {
      logger.error('Create booking failed:', error);
      console.error('❌ Booking creation error details:', error.message);
      throw new Error(error.message || 'Failed to create booking');
    }
  }

  // Update booking status
  async updateBookingStatus(bookingId, status, feedback = null) {
    try {
      // Import supabaseService dynamically to avoid circular imports
      const { supabaseService } = await import('./supabase');
      
      console.log('📝 Updating booking status:', bookingId, 'to:', status);
      const result = await supabaseService.bookings.updateBookingStatus(bookingId, status);
      console.log('✅ Booking status updated successfully:', result);
      
      return result;
    } catch (error) {
      logger.error('Update booking status failed:', error);
      console.error('❌ Update booking status error details:', error.message);
      throw new Error(error.message || 'Failed to update booking status');
    }
  }

  // Cancel a booking
  async cancelBooking(bookingId, reason) {
    try {
      // Import supabaseService dynamically to avoid circular imports
      const { supabaseService } = await import('./supabase');
      
      console.log('📝 Cancelling booking:', bookingId, 'reason:', reason);
      const result = await supabaseService.bookings.updateBookingStatus(bookingId, 'cancelled');
      console.log('✅ Booking cancelled successfully:', result);
      
      return result;
    } catch (error) {
      logger.error('Cancel booking failed:', error);
      console.error('❌ Cancel booking error details:', error.message);
      throw new Error(error.message || 'Failed to cancel booking');
    }
  }

  // Upload payment proof
  async uploadPaymentProof(bookingId, paymentData) {
    try {
      // Import supabaseService dynamically to avoid circular imports
      const { supabaseService } = await import('./supabase');
      
      console.log('📝 Uploading payment proof for booking:', bookingId);
      
      let paymentProofUrl;
      if (paymentData.imageBase64) {
        // Upload image to storage first
        paymentProofUrl = await supabaseService.storage.uploadPaymentProofImage(bookingId, paymentData.imageBase64);
      } else {
        // Direct payment proof data
        const result = await supabaseService.bookings.uploadPaymentProof(bookingId, paymentData);
        paymentProofUrl = result.payment_proof;
      }
      
      console.log('✅ Payment proof uploaded successfully:', paymentProofUrl);
      return { url: paymentProofUrl };
    } catch (error) {
      logger.error('Upload payment proof failed:', error);
      console.error('❌ Upload payment proof error details:', error.message);
      throw new Error(error.message || 'Failed to upload payment proof');
    }
  }

  // Update booking status (for caregiver actions)
  async updateStatus(bookingId, status) {
    try {
      return await this.updateBookingStatus(bookingId, status);
    } catch (error) {
      logger.error('Update booking status failed:', error);
      throw new Error('Failed to update booking status');
    }
  }

  // Get booking statistics
  async getBookingStats() {
    try {
      const response = await this.makeRequest('/stats');
      return response.data;
    } catch (error) {
      logger.error('Get booking stats failed:', error);
      throw new Error('Failed to load booking statistics');
    }
  }

  // Get available time slots for a caregiver
  async getAvailableSlots(caregiverId, date) {
    try {
      const response = await this.makeRequest(`/available-slots/${caregiverId}?date=${date}`);
      return response.data;
    } catch (error) {
      logger.error('Get available slots failed:', error);
      throw new Error('Failed to load available time slots');
    }
  }

  // Check for booking conflicts
  async checkConflicts(bookingData) {
    try {
      const response = await this.makeRequest('/check-conflicts', {
        method: 'POST',
        body: bookingData,
      });
      return response.data;
    } catch (error) {
      logger.error('Check conflicts failed:', error);
      throw new Error('Failed to check booking conflicts');
    }
  }
}

export default new BookingService();

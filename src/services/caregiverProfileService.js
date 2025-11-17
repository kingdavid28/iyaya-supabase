import { supabaseService } from './supabase';
import { supabase } from '../config/supabase';

export const caregiverProfileService = {
  // Create a new caregiver profile
  async createProfile(profileData) {
    try {
      const user = await supabaseService.user._getCurrentUser();
      if (!user) throw new Error('No authenticated user');

      // Use new Supabase service to update profile with caregiver role
      const updatedProfile = await supabaseService.user.updateProfile(user.id, {
        name: profileData.name,
        phone: profileData.phone,
        profile_image: profileData.profileImage,
        role: 'caregiver',
        bio: profileData.bio,
        address: profileData.address,
        skills: profileData.skills,
        experience: profileData.experience,
        hourly_rate: profileData.hourlyRate,
        certifications: profileData.certifications,
        availability: profileData.availability
      });

      return { data: updatedProfile };
    } catch (error) {
      console.error('Error creating caregiver profile:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(error.message || 'Failed to create caregiver profile');
    }
  },

  // Update existing caregiver profile
  async updateProfile(profileData) {
    try {
      const user = await supabaseService.user._getCurrentUser();
      if (!user) throw new Error('No authenticated user');

      // Use new Supabase service for profile update
      const updatedProfile = await supabaseService.user.updateProfile(user.id, {
        name: profileData.name,
        phone: profileData.phone,
        profile_image: profileData.profileImage,
        bio: profileData.bio,
        address: profileData.address,
        skills: profileData.skills,
        experience: profileData.experience,
        hourly_rate: profileData.hourlyRate,
        certifications: profileData.certifications,
        availability: profileData.availability
      });

      return { data: updatedProfile };
    } catch (error) {
      console.error('Error updating caregiver profile:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(error.message || 'Failed to update caregiver profile');
    }
  },

  // Get caregiver profile by user ID
  async getProfile(userId = null) {
    try {
      // Use new Supabase service
      const profile = await supabaseService.user.getProfile(userId);
      return { data: profile };
    } catch (error) {
      console.error('Error getting caregiver profile:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      return { data: null, error };
    }
  },

  // Get all caregiver profiles (for browsing)
  async getAllProfiles(filters = {}) {
    try {
      const caregivers = await supabaseService.user.getCaregivers(filters);
      return { data: caregivers };
    } catch (error) {
      console.error('Error getting caregiver profiles:', error);
  
      let query = supabase.from('users').select('*').eq('role', 'caregiver');
      if (filters.location) {
        query = query.ilike('address', `%${filters.location}%`);
      }
  
      const { data, error: fallbackError } = await query;
      if (fallbackError) throw fallbackError;
      return { data };
    }

  },

  // Check if user has a caregiver profile
  async hasProfile(userId = null) {
    try {
      const profile = await supabaseService.user.getProfile(userId);
      return !!profile && profile.role === 'caregiver';
    } catch (error) {
      console.error('Error checking caregiver profile:', error);
      return false;
    }
  },

  // Update profile rating (now handled by review service)
  async updateRating(userId, newRating) {
    try {
      // Use new Supabase service to update user rating
      const updatedProfile = await supabaseService.user.updateProfile(userId, {
        rating: newRating
      });
      return { data: updatedProfile };
    } catch (error) {
      console.error('Error updating caregiver rating:', error);
      throw error;
    }
  },

  // Add review to caregiver (now uses review service)
  async addReview(caregiverUserId, review) {
    try {
      const user = await supabaseService.user._getCurrentUser();
      if (!user) throw new Error('Authentication required');
      
      const reviewData = {
        reviewer_id: user.id,
        reviewee_id: caregiverUserId,
        rating: review.rating,
        comment: review.comment || review.text,
        booking_id: review.bookingId
      };
      
      const createdReview = await supabaseService.reviews.createReview(reviewData);
      return { data: createdReview };
    } catch (error) {
      console.error('Error adding review:', error);
      throw error;
    }
  }
};

export default caregiverProfileService;
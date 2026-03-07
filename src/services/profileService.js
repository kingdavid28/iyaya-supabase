import { API_CONFIG } from '../config/constants';
import { errorHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import { tokenManager } from '../utils/tokenManager';

/**
 * Profile Service - Legacy wrapper for Supabase services
 * Maintains backward compatibility while using new Supabase architecture
 */
class ProfileService {

  constructor() {
    // This service now uses SupabaseService directly, no need for REST endpoint
    console.log('🔗 ProfileService using SupabaseService (direct database access)');
    console.log('🔗 API_CONFIG:', API_CONFIG);
    console.log('🔗 EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);
  }

  /**
   * Get user profile
   */
  async getProfile(token) {
    try {
      const { supabaseService } = await import('./supabase');
      const user = await supabaseService.user._getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      
      const profile = await supabaseService.user.getProfile(user.id);
      logger.info('Profile fetched successfully');
      return profile;
    } catch (error) {
      logger.error('Get profile error:', error);
      throw errorHandler.process(error);
    }
  }

  /**
   * Get fresh token from Firebase
   */
  async getFreshToken() {
    return await tokenManager.getValidToken(true); // Force refresh
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData, token) {
    try {
      const { supabaseService } = await import('./supabase');
      const user = await supabaseService.user._getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      
      console.log('📤 Profile data:', JSON.stringify(profileData, null, 2));
      const result = await supabaseService.user.updateProfile(user.id, profileData);
      logger.info('Profile updated successfully');
      return result;
    } catch (error) {
      console.error('❌ Profile update error details:', error.message);
      logger.error('Update profile error:', error);
      throw errorHandler.process(error);
    }
  }

  /**
   * Update profile image
   */
  async updateProfileImage(imageBase64, token) {
    try {
      // Validate image size first
      const sizeInBytes = (imageBase64.length * 3) / 4;
      const sizeInMB = sizeInBytes / (1024 * 1024);
      
      if (sizeInMB > 2) {
        throw new Error('Image too large. Please select a smaller image.');
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/upload-profile-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageBase64 }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile image');
      }

      logger.info('Profile image updated successfully');
      return data.data;

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Network request timed out');
      }
      logger.error('Update profile image error:', error);
      throw errorHandler.process(error);
    }
  }

  /**
   * Update children information (for parents)
   */
  async updateChildren(children, token) {
    try {
      const { supabaseService } = await import('./supabase');
      const user = await supabaseService.user._getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      
      // Update children using children service
      const results = [];
      for (const child of children) {
        if (child.id) {
          results.push(await supabaseService.children.updateChild(child.id, child));
        } else {
          results.push(await supabaseService.children.addChild(user.id, child));
        }
      }
      
      logger.info('Children information updated successfully');
      return results;
    } catch (error) {
      logger.error('Update children error:', error);
      throw errorHandler.process(error);
    }
  }

  /**
   * Get caregiver availability
   */
  async getAvailability(token) {
    try {
      const response = await fetch(`${this.baseURL}/availability`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch availability');
      }

      logger.info('Availability fetched successfully');
      return data.data;

    } catch (error) {
      logger.error('Get availability error:', error);
      throw errorHandler.process(error);
    }
  }

  /**
   * Update caregiver availability
   */
  async updateAvailability(availability, token) {
    try {
      // Try with provided token first
      let authToken = token;
      
      const makeRequest = async (authToken) => {
        return await fetch(`${this.baseURL}/availability`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ availability }),
        });
      };

      let response = await makeRequest(authToken);
      
      // If 401, try to refresh token and retry
      if (response.status === 401) {
        logger.info('Token expired, attempting to refresh...');
        const freshToken = await this.getFreshToken();
        
        if (freshToken) {
          authToken = freshToken;
          response = await makeRequest(authToken);
        }
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update availability');
      }

      logger.info('Availability updated successfully');
      return data.data;

    } catch (error) {
      logger.error('Update availability error:', error);
      throw errorHandler.process(error);
    }
  }

  /**
   * Get caregiver profile (uses /api/caregivers/profile endpoint)
   */
  async getCaregiverProfile(token) {
    try {
      let authToken = token || await this.getFreshToken();
      const caregiverUrl = `${API_CONFIG.BASE_URL}/caregivers/profile`;
      
      console.log('🔗 Getting caregiver profile from:', caregiverUrl);
      
      const response = await fetch(caregiverUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('📥 Caregiver profile response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch caregiver profile');
      }

      logger.info('Caregiver profile fetched successfully');
      return data.caregiver;

    } catch (error) {
      logger.error('Get caregiver profile error:', error);
      throw errorHandler.process(error);
    }
  }

  /**
   * Update caregiver profile (uses /api/caregivers/profile endpoint)
   */
  async updateCaregiverProfile(profileData, token) {
    try {
      let authToken = token || await this.getFreshToken();
      const caregiverUrl = `${API_CONFIG.BASE_URL}/caregivers/profile`;
      
      console.log('🔄 Updating caregiver profile at:', caregiverUrl);
      console.log('📤 Profile data:', JSON.stringify(profileData, null, 2));
      
      const response = await fetch(caregiverUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData),
      });
      
      const data = await response.json();
      console.log('📥 Update response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update caregiver profile');
      }

      logger.info('Caregiver profile updated successfully');
      return data.caregiver;

    } catch (error) {
      logger.error('Update caregiver profile error:', error);
      throw errorHandler.process(error);
    }
  }
}

export const profileService = new ProfileService();
export default profileService;

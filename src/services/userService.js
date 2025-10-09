// Legacy userService - now redirects to Supabase services
// This file is kept for backward compatibility but no longer uses old API
import { logger } from "../utils/logger"

class UserService {
  // Create/Upsert profile for the authenticated user
  async createProfile(userId, profile) {
    throw new Error('Use Supabase services instead - old backend is deprecated');
  }

  // Update children for parent user
  async updateChildren(children, userId) {
    throw new Error('Use Supabase childrenAPI instead - old backend is deprecated');
  }

  // Profile Management
  async getProfile(userId, forceRefresh = false) {
    throw new Error('Use AuthContext.getUserProfile instead - old backend is deprecated');
  }

  async updateProfile(userId, updates) {
    throw new Error('Use Supabase services instead - old backend is deprecated');
  }

  // Preferences
  async updatePreferences(userId, preferences) {
    try {
      if (!userId) {
        throw new Error('User ID is required')
      }
      
      if (!preferences || typeof preferences !== 'object') {
        throw new Error('Preferences data must be an object')
      }
      
      // Validate notification preferences
      if (preferences.notifications) {
        const notificationPrefs = preferences.notifications
        if (typeof notificationPrefs !== 'object') {
          throw new Error('Notification preferences must be an object')
        }
        
        // Validate notification types
        const validNotificationTypes = ['email', 'push', 'sms']
        Object.entries(notificationPrefs).forEach(([type, value]) => {
          if (!validNotificationTypes.includes(type)) {
            throw new Error(`Invalid notification type: ${type}`)
          }
          if (typeof value !== 'boolean') {
            throw new Error(`Notification preference for ${type} must be a boolean`)
          }
        })
      }
      
      // Validate language preference
      if (preferences.language && typeof preferences.language !== 'string') {
        throw new Error('Language preference must be a string')
      }
      
      // Validate theme preference
      const validThemes = ['light', 'dark', 'system']
      if (preferences.theme && !validThemes.includes(preferences.theme)) {
        throw new Error(`Theme must be one of: ${validThemes.join(', ')}`)
      }

      logger.info(`Updating preferences for user: ${userId}`)
      const result = await api.put(`/users/${userId}/preferences`, preferences)

      // Note: Cache invalidation removed to prevent circular dependencies
      logger.info('Preferences updated successfully');

      return result
    } catch (error) {
      logger.error("Failed to update preferences:", error)
      throw error
    }
  }

  async getPreferences(userId) {
    try {
      const cacheKey = `preferences:${userId}`
      // Note: Cache functionality removed to prevent circular dependencies
      logger.info(`Fetching preferences for user: ${userId}`)
      const preferences = await api.get(`/users/${userId}/preferences`)

      // Note: Cache functionality removed to prevent circular dependencies
      logger.info('Preferences fetched successfully');

      return preferences
    } catch (error) {
      logger.error("Failed to get preferences:", error)
      throw error
    }
  }

  // Availability
  async updateAvailability(userId, availability) {
    try {
      if (!availability || typeof availability !== 'object') {
        throw new Error('Invalid availability data')
      }

      // Basic validation of availability object
      const requiredFields = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      for (const day of requiredFields) {
        if (availability[day] === undefined) {
          throw new Error(`Missing availability for ${day}`)
        }
      }

      logger.info(`Updating availability for user: ${userId}`)
      const result = await api.put(`/users/${userId}/availability`, availability)

      logger.info('Availability updated successfully');

      return result
    } catch (error) {
      logger.error("Failed to update availability:", error)
      throw error
    }
  }

  // Profile Image Upload
  async uploadProfileImage(userId, imageUri) {
    try {
      if (!imageUri) {
        throw new Error('No image provided')
      }

      logger.info(`Uploading profile image for user: ${userId}`)
      
      // Create form data
      const formData = new FormData()
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg', // or get from file
        name: 'profile.jpg'
      })

      const result = await api.post(`/users/${userId}/profile-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      })

      // Note: Cache invalidation removed to prevent circular dependencies
      logger.info('Profile image uploaded successfully');

      return result
    } catch (error) {
      logger.error("Failed to upload profile image:", error)
      throw error
    }
  }

  // Search Nannies
  async searchNannies(filters = {}, page = 1, limit = 10) {
    try {
      // Create cache key based on filters
      const cacheKey = `caregivers:${JSON.stringify(filters)}:${page}:${limit}`
      // Note: Cache functionality removed to prevent circular dependencies
      logger.info('Searching caregivers with filters:', filters)

      // Build query string from filters
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      })

      const result = await api.get(`/caregivers?${queryParams}`)

      // Note: Cache functionality removed to prevent circular dependencies
      logger.info('Caregivers search completed successfully');

      return result
    } catch (error) {
      logger.error("Failed to search caregivers:", error)
      throw error
    }
  }
}

export const userService = new UserService()

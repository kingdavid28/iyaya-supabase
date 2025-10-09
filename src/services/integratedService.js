// Integrated Service Layer - Combines all services with caching and error handling
import { apiService } from './apiService';
import { userService } from './userService';
import { messagingService } from './MessagingService';
import bookingService from './bookingService';
import { authService } from './authService';
import { logger } from '../utils/logger';
import { SERVICE_CONFIG } from '../config/serviceConfig';
import { handleServiceError, withRetry } from '../utils/serviceIntegration';

class IntegratedService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = SERVICE_CONFIG.CACHE.DEFAULT_TTL;
    this.retryConfig = SERVICE_CONFIG.RETRY;
  }

  // Unified error handling using service integration utilities
  handleError(error, operation) {
    return handleServiceError(error, operation);
  }

  // Cached API calls with retry mechanism
  async getCachedData(key, fetchFn, ttl = this.cacheTimeout) {
    if (!SERVICE_CONFIG.FEATURES.ENABLE_CACHING) {
      return await withRetry(fetchFn, this.retryConfig.MAX_ATTEMPTS, this.retryConfig.BASE_DELAY);
    }
    
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    
    try {
      const data = await withRetry(fetchFn, this.retryConfig.MAX_ATTEMPTS, this.retryConfig.BASE_DELAY);
      this.cache.set(key, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      this.handleError(error, `Cache fetch for ${key}`);
    }
  }

  // Caregiver operations with caching
  async searchCaregivers(filters = {}) {
    const cacheKey = `caregivers:${JSON.stringify(filters)}`;
    
    return this.getCachedData(cacheKey, async () => {
      try {
        return await userService.searchNannies(filters);
      } catch (error) {
        // Fallback to API service
        return await apiService.get('/caregivers', { params: filters });
      }
    });
  }

  // Messaging with real-time support
  async startConversation(caregiverId, caregiverName, initialMessage) {
    try {
      const conversation = await messagingService.startConversation(
        caregiverId,
        caregiverName,
        'caregiver',
        initialMessage
      );
      
      // Clear conversations cache
      this.cache.delete('conversations');
      
      return conversation;
    } catch (error) {
      this.handleError(error, 'Start conversation');
    }
  }

  async getConversations() {
    return this.getCachedData('conversations', async () => {
      return await messagingService.getConversations();
    }, 2 * 60 * 1000); // 2 minutes cache
  }

  // Booking operations
  async createBooking(bookingData) {
    try {
      // Check conflicts first
      const conflicts = await bookingService.checkConflicts(bookingData);
      
      if (conflicts.length > 0) {
        throw new Error('Time slot conflicts detected. Please choose a different time.');
      }
      
      const booking = await bookingService.createBooking(bookingData);
      
      // Clear bookings cache
      this.cache.delete('bookings');
      
      return booking;
    } catch (error) {
      this.handleError(error, 'Create booking');
    }
  }

  async getBookings() {
    return this.getCachedData('bookings', async () => {
      return await bookingService.getBookings();
    });
  }

  // Profile operations
  async updateProfile(profileData) {
    try {
      const updated = await userService.updateProfile(null, profileData);
      
      // Clear profile cache
      this.cache.delete('profile');
      
      return updated;
    } catch (error) {
      this.handleError(error, 'Update profile');
    }
  }

  async getProfile() {
    return this.getCachedData('profile', async () => {
      return await userService.getProfile();
    });
  }

  // Cache management
  clearCache(pattern = null) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Health check
  async healthCheck() {
    try {
      await apiService.get('/health');
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  }
}

export const integratedService = new IntegratedService();
export default integratedService;
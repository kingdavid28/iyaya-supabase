// Enhanced Consolidated Services - Best practices from all services combined
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/constants';
import { logger } from '../utils/logger';
import { errorHandler } from '../shared/utils/errorHandler';
import { tokenManager } from '../utils/tokenManager';
import { firebaseMessagingService } from './firebaseMessagingService';
import { firebaseAuthService } from './firebaseAuthService';

// Dynamic API URL from environment
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL
  ? `${process.env.EXPO_PUBLIC_API_URL}/api`
  : 'http://192.168.1.10:5000/api';

console.log('🔗 API URL:', API_BASE_URL);

// Network monitoring (from apiService.js)
let isConnected = true;
try {
  const NetInfo = require('@react-native-netinfo/netinfo').default;
  NetInfo?.addEventListener((state) => {
    isConnected = state.isConnected;
  });
} catch (error) {
  // NetInfo not available
}

class EnhancedAPIService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.cache = new Map();
    this.requestQueue = [];
    this.isRefreshing = false;
  }

  // Enhanced request method with fallback support
  async requestWithFallback(endpoint, fallbackData, options = {}) {
    try {
      return await this.request(endpoint, options);
    } catch (error) {
      // Log the error but don't throw - return fallback data instead
      console.warn(`API Error for ${endpoint}, using fallback data:`, error.message);
      logger.warn(`Using fallback data for ${endpoint}:`, error.message);

      // Return fallback data structure that matches expected API response
      if (Array.isArray(fallbackData)) {
        return { data: fallbackData, success: true };
      }
      return { data: fallbackData, success: true, ...fallbackData };
    }
  }

  // Enhanced request method with all best practices
  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      body,
      headers = {},
      useAuth = true,
      retries = 2,
      cache = false,
      cacheKey = null,
      timeout = 8000,
      validateToken = true
    } = options;

    // Network check (from apiService.js)
    if (!isConnected) {
      throw new Error('No internet connection available');
    }

    // Check cache first (from apiService.js + integratedService.js)
    if (cache && cacheKey && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) { // 5 minutes
        return cached.data;
      }
    }

    const url = `${this.baseURL}${endpoint}`;
    let attempt = 0;

    while (attempt <= retries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const config = {
          method,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...headers
          }
        };

        // Enhanced auth handling (from multiple services)
        if (useAuth) {
          const token = await this.getValidToken(validateToken);
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }

        // Add body for non-GET requests
        if (body && method !== 'GET') {
          config.body = JSON.stringify(body);
        }

        const response = await fetch(url, config);
        clearTimeout(timeoutId);

        // Handle different response types
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        if (!response.ok) {
          // Enhanced error handling for 401 (from apiService.js)
          if (response.status === 401 && useAuth) {
            return this.handleUnauthorized(endpoint, options);
          }

          // Create detailed error with backend response info
          const errorMessage = data?.message || data?.error || `HTTP ${response.status}`;
          const error = new Error(errorMessage);
          error.status = response.status;
          error.statusCode = response.status;
          error.response = { status: response.status, data };
          error.details = data?.details;
          throw error;
        }

        // Cache successful responses
        if (cache && cacheKey) {
          this.cache.set(cacheKey, { data, timestamp: Date.now() });
        }

        logger.info(`API Success: ${method} ${endpoint}`);
        return data;

      } catch (error) {
        attempt++;

        // Handle timeout errors specifically
        if (error.name === 'AbortError') {
          logger.error(`Request timeout after ${timeout}ms: ${method} ${endpoint}`);
          error.code = 'NETWORK_ERROR';
        } else {
          logger.error(`API Error (attempt ${attempt}): ${method} ${endpoint}`, error.message);
        }

        if (attempt > retries) {
          throw errorHandler.process(error);
        }

        // Exponential backoff with jitter (from apiService.js)
        const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 100, 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Enhanced token management using TokenManager
  async getValidToken(validate = true) {
    return await tokenManager.getValidToken(false);
  }

  // Handle 401 unauthorized with token refresh (from apiService.js)
  async handleUnauthorized(endpoint, options) {
    if (this.isRefreshing) {
      return this.addToQueue(endpoint, options);
    }

    this.isRefreshing = true;
    
    try {
      // Try to refresh token first
      const freshToken = await tokenManager.getValidToken(true);
      
      if (freshToken) {
        // Retry the original request with fresh token
        const retryOptions = {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${freshToken}`
          }
        };
        
        return await this.request(endpoint, retryOptions);
      } else {
        // No valid token available, clear auth data
        await this.clearAuthData();
        throw new Error('Authentication required. Please log in again.');
      }
    } finally {
      this.isRefreshing = false;
    }
  }

  // Queue management for concurrent requests (from apiService.js)
  addToQueue(endpoint, options) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ resolve, reject, endpoint, options });
    });
  }

  // Clear auth data (from authService.js)
  async clearAuthData() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.USER_EMAIL,
        '@shim_id_token'
      ]);
    } catch (error) {
      logger.error('Error clearing auth data:', error.message);
    }
  }

  // Enhanced Auth operations (consolidated from authService.js + firebaseAuthService.js)
  auth = {
    login: async (credentials) => {
      const result = await this.request('/auth/login', {
        method: 'POST',
        body: credentials,
        useAuth: false,
        timeout: 15000
      });
      
      // Store token if successful
      if (result.token) {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, result.token);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, credentials.email);
      }
      
      return result;
    },

    register: async (userData) => {
      const result = await this.request('/auth/register', {
        method: 'POST',
        body: userData,
        useAuth: false,
        timeout: 15000
      });
      
      // Store token if successful and no verification required
      if (result.token && !result.requiresVerification) {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, result.token);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, userData.email);
      }
      
      return result;
    },

    getProfile: (userId = null) => {
      // Check if user is authenticated first
      try {
        const currentUser = firebaseAuthService?.getCurrentUser();
        if (!currentUser) {
          console.log('No authenticated user - skipping profile fetch');
          return Promise.resolve({ data: null });
        }
      } catch (error) {
        console.warn('Error checking authentication:', error.message);
        return Promise.resolve({ data: null });
      }

      // For current user profile, userId is not needed
      return this.request('/auth/profile', {
        cache: true,
        cacheKey: 'user-profile',
        timeout: 5000,
        retries: 1
      });
    },

    updateProfile: (data) => {
      this.clearCache('profile');
      return this.request('/auth/profile', {
        method: 'PUT',
        body: data
      });
    },

    uploadProfileImage: (imageBase64, mimeType) => {
      // Validate image size (from profileService.js)
      const sizeInBytes = (imageBase64.length * 3) / 4;
      const sizeInMB = sizeInBytes / (1024 * 1024);
      
      if (sizeInMB > 2) {
        throw new Error('Image too large. Please select a smaller image.');
      }
      
      this.clearCache('profile');
      return this.request('/auth/upload-profile-image', {
        method: 'POST',
        body: { imageBase64, mimeType },
        timeout: 30000 // Longer timeout for uploads
      });
    },

    uploadProfileImageBase64: (imageBase64, mimeType) => {
      // Alias for backward compatibility
      return this.auth.uploadProfileImage(imageBase64, mimeType);
    },

    resetPassword: (email) => this.request('/auth/reset-password', {
      method: 'POST',
      body: { email },
      useAuth: false
    }),

    logout: async () => {
      await this.clearAuthData();
      this.clearCache();
    }
  };

  // Enhanced Caregiver operations (from caregiversAPI + userService.js)
  caregivers = {
    getProfile: () => this.request('/caregivers/profile', {
      cache: true,
      cacheKey: 'caregiver-profile',
      retries: 1,
      timeout: 10000
    }),

    getMyProfile: () => this.request('/caregivers/profile', {
      cache: true,
      cacheKey: 'caregiver-profile',
      retries: 1,
      timeout: 10000
    }),

    updateProfile: (data) => {
      this.clearCache('caregiver');
      return this.request('/caregivers/profile', {
        method: 'PUT',
        body: data,
        timeout: 30000
      });
    },

    updateMyProfile: (data) => {
      this.clearCache('caregiver');
      return this.request('/caregivers/profile', {
        method: 'PUT',
        body: data,
        timeout: 30000
      });
    },

    createProfile: (data) => this.request('/caregivers/profile', {
      method: 'POST',
      body: data,
      timeout: 30000
    }),

    getAll: (filters = {}) => {
      // Ensure we only get users with caregiver role
      const caregiverFilters = { ...filters, role: 'caregiver' };
      const cacheKey = `caregivers:${JSON.stringify(caregiverFilters)}`;
      const queryParams = new URLSearchParams(caregiverFilters).toString();
      const endpoint = queryParams ? `/caregivers?${queryParams}` : '/caregivers?role=caregiver';
      
      return this.request(endpoint, {
        cache: true,
        cacheKey
      });
    },

    search: (filters = {}, page = 1, limit = 10) => {
      // Ensure we only search users with caregiver role
      const searchParams = { ...filters, page, limit, role: 'caregiver' };
      const cacheKey = `caregivers-search:${JSON.stringify(searchParams)}`;
      const queryParams = new URLSearchParams(searchParams).toString();
      
      return this.request(`/caregivers?${queryParams}`, {
        cache: true,
        cacheKey
      });
    },

    requestBackgroundCheck: (data) => {
      return this.request('/caregivers/background-check', {
        method: 'POST',
        body: data
      });
    }
  };

  // Enhanced Jobs operations (from jobService.js + jobsAPI)
  jobs = {
    getAvailable: (filters = {}) => {
      const cacheKey = `jobs:${JSON.stringify(filters)}`;
      const queryParams = new URLSearchParams(filters).toString();
      const endpoint = queryParams ? `/jobs?${queryParams}` : '/jobs';

      return this.request(endpoint, {
        cache: true,
        cacheKey
      });
    },

    getMy: (page = 1, limit = 10) => {
      return this.requestWithFallback(`/jobs/my?page=${page}&limit=${limit}`, {
        jobs: [],
        total: 0,
        page: 1,
        limit: 10
      });
    },
    getMyJobs: (page = 1, limit = 10) => {
      return this.requestWithFallback(`/jobs/my?page=${page}&limit=${limit}`, {
        jobs: [],
        total: 0,
        page: 1,
        limit: 10
      });
    }, // Backward compatibility

    getById: (jobId) => this.request(`/jobs/${jobId}`, {
      cache: true,
      cacheKey: `job:${jobId}`
    }),

    create: (jobData) => {
      this.clearCache('jobs');
      return this.request('/jobs', {
        method: 'POST',
        body: jobData
      });
    },

    update: (jobId, jobData) => {
      this.clearCache('jobs');
      this.cache.delete(`job:${jobId}`);
      return this.request(`/jobs/${jobId}`, {
        method: 'PUT',
        body: jobData
      });
    },

    delete: async (jobId) => {
      try {
        this.clearCache('jobs');
        this.cache.delete(`job:${jobId}`);
        const result = await this.request(`/jobs/${jobId}`, {
          method: 'DELETE'
        });
        return result;
      } catch (error) {
        logger.error(`Job deletion failed for ID ${jobId}:`, error.message);
        throw error;
      }
    },

    search: (query, filters = {}) => {
      const searchParams = { search: query, ...filters };
      const queryString = new URLSearchParams(searchParams).toString();
      return this.request(`/jobs?${queryString}`);
    },

    getApplications: (jobId, page = 1, limit = 10) => {
      return this.request(`/jobs/${jobId}/applications?page=${page}&limit=${limit}`);
    }
  };

  // Enhanced Applications operations
  applications = {
    getMy: () => this.request('/applications/my'),

    apply: (applicationData) => {
      this.clearCache('applications');
      // POST requests should not retry on duplicate key errors
      return this.request('/applications', {
        method: 'POST',
        body: applicationData,
        retries: 0 // No retries for application creation to avoid duplicate errors
      });
    },

    getById: (applicationId) => this.request(`/applications/${applicationId}`),

    updateStatus: (applicationId, status) => {
      this.clearCache('applications');
      return this.request(`/applications/${applicationId}/status`, {
        method: 'PATCH',
        body: { status }
      });
    },

    getForJob: (jobId, page = 1, limit = 10) => {
      return this.request(`/applications/job/${jobId}?page=${page}&limit=${limit}`);
    }
  };

  // Enhanced Bookings operations (from bookingService.js)
  bookings = {
    getMy: (filters = {}) => {
      const queryParams = new URLSearchParams(filters).toString();
      const endpoint = queryParams ? `/bookings/my?${queryParams}` : '/bookings/my';
      return this.requestWithFallback(endpoint, {
        bookings: [],
        total: 0,
        page: 1,
        limit: 10
      });
    },

    getById: (bookingId) => this.request(`/bookings/${bookingId}`),

    create: (bookingData) => {
      this.clearCache('bookings');
      // POST requests should not retry on duplicate key errors
      return this.request('/bookings', {
        method: 'POST',
        body: bookingData,
        retries: 0 // No retries for booking creation to avoid duplicate errors
      });
    },

    updateStatus: (bookingId, status, feedback = null) => {
      this.clearCache('bookings');
      return this.request(`/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: { status, feedback }
      });
    },

    cancel: (bookingId, reason) => {
      this.clearCache('bookings');
      return this.request(`/bookings/${bookingId}`, {
        method: 'DELETE',
        body: { reason }
      });
    },

    uploadPaymentProof: (bookingId, imageBase64, mimeType) => {
      return this.request(`/bookings/${bookingId}/payment-proof`, {
        method: 'POST',
        body: { imageBase64, mimeType },
        timeout: 30000
      });
    },

    getStats: () => this.request('/bookings/stats', {
      cache: true,
      cacheKey: 'booking-stats'
    }),

    getAvailableSlots: (caregiverId, date) => {
      return this.request(`/bookings/available-slots/${caregiverId}?date=${date}`);
    },

    checkConflicts: (bookingData) => {
      return this.request('/bookings/check-conflicts', {
        method: 'POST',
        body: bookingData
      });
    }
  };

  // Enhanced Children operations (from childrenAPI + userService.js)
  children = {
    getMy: () => this.requestWithFallback('/children', []),
    getMyChildren: () => this.requestWithFallback('/children', []), // Backward compatibility

    create: (childData) => {
      // Create a deep copy to avoid mutating the original
      const processedData = JSON.parse(JSON.stringify(childData));

      try {
        // Validate and process child data
        this.validateChildData(processedData);
      } catch (error) {
        console.error('Child validation error:', error);
        // Ensure allergies is always an array even if validation fails
        processedData.allergies = [];
      }

      this.clearCache('children');
      // POST requests should not retry on duplicate key errors
      return this.request('/children', {
        method: 'POST',
        body: processedData,
        retries: 0 // No retries for child creation to avoid duplicate errors
      });
    },

    update: (childId, childData) => {
      // Create a deep copy to avoid mutating the original
      const processedData = JSON.parse(JSON.stringify(childData));

      try {
        // Validate and process child data
        this.validateChildData(processedData);
      } catch (error) {
        console.error('Child validation error:', error);
        // Ensure allergies is always an array even if validation fails
        processedData.allergies = [];
      }

      this.clearCache('children');
      return this.request(`/children/${childId}`, {
        method: 'PUT',
        body: processedData
      });
    },

    delete: (childId) => {
      this.clearCache('children');
      return this.request(`/children/${childId}`, {
        method: 'DELETE'
      });
    }
  };

  // Child data validation (from userService.js)
  validateChildData(childData) {
    if (!childData.name || typeof childData.name !== 'string' || !childData.name.trim()) {
      throw new Error('Child name is required');
    }
    
    // Ensure name is trimmed
    childData.name = childData.name.trim();
    
    // Convert age to number if it's a string
    if (typeof childData.age === 'string') {
      childData.age = parseInt(childData.age, 10);
    }
    
    if (typeof childData.age !== 'number' || isNaN(childData.age) || childData.age < 0 || childData.age > 18) {
      throw new Error('Child must have a valid age between 0 and 18');
    }
    
    // Handle allergies - ALWAYS ensure it's a string for backend compatibility
    try {
      if (childData.allergies === undefined || childData.allergies === null) {
        childData.allergies = '';
      } else if (Array.isArray(childData.allergies)) {
        // Convert array to comma-separated string
        childData.allergies = childData.allergies.filter(a => a && a.trim()).join(', ');
      } else if (typeof childData.allergies !== 'string') {
        // Convert other types to string
        childData.allergies = String(childData.allergies).trim();
      } else {
        // Already a string, just trim it
        childData.allergies = childData.allergies.trim();
      }
    } catch (error) {
      // If any error occurs during conversion, just set to empty string
      childData.allergies = '';
    }
    
    // Ensure preferences is a string
    if (childData.preferences === undefined || childData.preferences === null) {
      childData.preferences = '';
    } else if (typeof childData.preferences !== 'string') {
      childData.preferences = String(childData.preferences).trim();
    } else {
      childData.preferences = childData.preferences.trim();
    }
  }

  // Enhanced Messaging operations
  messaging = {
    getConversations: async () => {
      try {
        return await this.request('/messages/conversations');
      } catch (error) {
        console.warn('Conversations API error:', error.message);
        return { data: [] };
      }
    },

    getMessages: async (conversationId, params = {}) => {
      if (!conversationId) {
        return { data: { messages: [] } };
      }
      
      // Block blacklisted conversation
      if (conversationId === '68cba4e4e585e8eeb3ac21b9') {
        console.log('Blocking API call for blacklisted conversation:', conversationId);
        return { data: { messages: [] } };
      }
      
      try {
        const { page = 1, limit = 50 } = params;
        return await this.request(`/messages/conversation/${conversationId}?page=${page}&limit=${limit}`);
      } catch (error) {
        console.warn('Messages API error:', error.message);
        return { data: { messages: [] } };
      }
    },

    sendMessage: async (messageData) => {
      try {
        // Create Firebase connection before sending message
        const currentUser = await this.request('/auth/profile');
        const currentUserId = currentUser?.id || currentUser?._id;

        if (currentUserId && messageData.recipientId && currentUserId !== messageData.recipientId) {
          try {
            console.log('🔗 Creating Firebase connection for message send:', { userId: currentUserId, recipientId: messageData.recipientId });
            await firebaseMessagingService.createConnection(currentUserId, messageData.recipientId);
            console.log('✅ Firebase connection created for message');
          } catch (connectionError) {
            console.warn('⚠️ Failed to create Firebase connection for message:', connectionError.message);
            // Continue with sending message even if connection creation fails
          }
        }

        return await this.request('/messages', {
          method: 'POST',
          body: messageData
        });
      } catch (error) {
        console.error('Send message error:', error.message);
        throw error;
      }
    },

    startConversation: async (recipientId, recipientName, recipientRole, initialMessage) => {
      try {
        // Create Firebase connection before starting conversation
        const currentUser = await this.request('/auth/profile');
        const currentUserId = currentUser?.id || currentUser?._id;

        if (currentUserId && recipientId && currentUserId !== recipientId) {
          try {
            console.log('🔗 Creating Firebase connection for conversation start:', { userId: currentUserId, recipientId });
            await firebaseMessagingService.createConnection(currentUserId, recipientId);
            console.log('✅ Firebase connection created for conversation');
          } catch (connectionError) {
            console.warn('⚠️ Failed to create Firebase connection for conversation:', connectionError.message);
            // Continue with starting conversation even if connection creation fails
          }
        }

        return await this.request('/messages/start', {
          method: 'POST',
          body: { recipientId, initialMessage }
        });
      } catch (error) {
        console.error('Start conversation error:', error.message);
        throw error;
      }
    },

    markAsRead: async (conversationId) => {
      if (!conversationId) return true;
      
      try {
        await this.request(`/messages/conversation/${conversationId}/read`, {
          method: 'POST'
        });
        return true;
      } catch (error) {
        console.warn('Mark as read error:', error.message);
        return false;
      }
    }
  };

  // Enhanced Settings operations (from settingsService.js)
  settings = {
    getProfile: () => {
      // Check if user is authenticated first
      try {
        const currentUser = firebaseAuthService?.getCurrentUser();
        if (!currentUser) {
          console.log('No authenticated user - skipping profile fetch');
          return Promise.resolve({ data: null });
        }
      } catch (error) {
        console.warn('Error checking authentication:', error.message);
        return Promise.resolve({ data: null });
      }

      return this.request('/auth/profile');
    },
    
    updateProfile: (data) => this.request('/auth/profile', {
      method: 'PUT',
      body: data
    }),
    
    getPrivacySettings: () => this.request('/privacy/settings'),
    
    updatePrivacySettings: (data) => this.request('/privacy/settings', {
      method: 'PUT',
      body: data
    }),
    
    getNotificationSettings: () => this.request('/notifications/settings'),
    
    updateNotificationSettings: (data) => this.request('/notifications/settings', {
      method: 'PUT',
      body: data
    }),
    
    exportUserData: () => this.request('/data/export', { method: 'POST' }),
    
    deleteUserData: () => this.request('/data/all', { method: 'DELETE' })
  };

  // Rating operations (from ratingService.js)
  ratings = {
    rateCaregiver: (caregiverId, bookingId, rating, review = '') => {
      return this.request('/ratings/caregiver', {
        method: 'POST',
        body: { caregiverId, bookingId, rating, review: review.trim() }
      });
    },

    rateParent: (parentId, bookingId, rating, review = '') => {
      return this.request('/ratings/parent', {
        method: 'POST',
        body: { parentId, bookingId, rating, review: review.trim() }
      });
    },

    getCaregiverRatings: (caregiverId, page = 1, limit = 10) => {
      return this.request(`/ratings/caregiver/${caregiverId}?page=${page}&limit=${limit}`);
    },

    getRatingSummary: (userId, role = 'caregiver') => {
      return this.request(`/ratings/summary/${userId}?role=${role}`);
    }
  };

  // Notification operations
  notifications = {
    getNotifications: async () => {
      try {
        return await this.request('/notifications', {
          cache: true,
          cacheKey: 'notifications'
        });
      } catch (error) {
        console.warn('Notifications API error:', error.message);
        return { data: [] };
      }
    },
    
    getAll: () => this.request('/notifications', {
      cache: true,
      cacheKey: 'notifications'
    }),
    
    markAsRead: (notificationId) => {
      this.clearCache('notifications');
      return this.request(`/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });
    },
    
    markAllAsRead: () => {
      this.clearCache('notifications');
      return this.request('/notifications/read-all', {
        method: 'PATCH'
      });
    },
    
    requestPermissions: async () => {
      logger.info('Notification permissions granted (stub)');
      return true;
    },
    
    schedule: async (title, body, data = {}) => {
      logger.info('Notification scheduled (stub):', { title, body, data });
    },
    
    init: async () => {
      logger.info('Notifications initialized (stub)');
      return 'expo-go-stub-token';
    }
  };

  // Enhanced cache management (from apiService.js + integratedService.js)
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

  // Get cached data with TTL check
  getCachedData(key, ttl = 300000) {
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      if (Date.now() - cached.timestamp < ttl) {
        return cached.data;
      }
      this.cache.delete(key);
    }
    return null;
  }

  // Set cached data
  setCachedData(key, data, ttl = 300000) {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  // Health check
  async healthCheck() {
    try {
      await this.request('/health', { useAuth: false, timeout: 5000 });
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  }
}

// Create singleton instance
export const apiService = new EnhancedAPIService();

// Export individual services for backward compatibility
export const authAPI = apiService.auth;
export const caregiversAPI = apiService.caregivers;
export const jobsAPI = apiService.jobs;
export const applicationsAPI = apiService.applications;
export const bookingsAPI = apiService.bookings;
export const childrenAPI = apiService.children;
export const messagingAPI = apiService.messaging;
export const messagingService = apiService.messaging;
export const settingsService = apiService.settings;
export const ratingsService = apiService.ratings;
export const notificationService = apiService.notifications;
export const notificationsAPI = apiService.notifications;

// Export the EnhancedAPIService class itself
export { EnhancedAPIService };

// Legacy compatibility exports
export const uploadsAPI = {
  base64Upload: apiService.auth.uploadProfileImage,
  uploadDocument: apiService.auth.uploadProfileImage
};

// Privacy API (stub implementation)
export const privacyAPI = {
  getPrivacySettings: () => ({ data: null }),
  getPendingRequests: () => ({ data: [] }),
  getPrivacyNotifications: () => ({ data: [] }),
  updatePrivacySettings: () => ({ success: true }),
  requestInformation: () => ({ success: true }),
  respondToRequest: () => ({ success: true }),
  grantPermission: () => ({ success: true }),
  revokePermission: () => ({ success: true }),
  markNotificationAsRead: () => ({ success: true })
};

// Export utilities
export const getCurrentAPIURL = () => API_BASE_URL;
export const getCurrentSocketURL = () => API_BASE_URL.replace('/api', '');

// Legacy compatibility - export API_BASE_URL for direct access
export { API_BASE_URL };

// services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, ERROR_CODES } from '../config/constants';
import { logger } from '../utils/logger';
import { authService } from './authService';
import { tokenManager } from '../utils/tokenManager';

// Make NetInfo optional for web compatibility
let NetInfo;
try {
  NetInfo = require('@react-native-netinfo/netinfo').default;
} catch (error) {
  // NetInfo not available, will handle gracefully
  NetInfo = null;
}

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api',
      timeout: API_CONFIG.TIMEOUT?.DEFAULT || 10000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // Add connection validation
    this.isConnected = true;
    this.setupNetworkMonitoring();
    this.setupInterceptors();
    this.requestQueue = [];
    this.isRefreshing = false;
  }

  // Add network monitoring
  setupNetworkMonitoring() {
    if (NetInfo) {
      NetInfo.addEventListener((state) => {
        this.isConnected = state.isConnected;
        logger.debug(
          `Network status changed: ${state.isConnected ? 'Connected' : 'Disconnected'}`
        );
      });
    }
  }

  redirectToLogin() {
    // Clear auth data
    authService.clearAuthData();

    // Navigate to login screen if we're in a component
    if (typeof window !== 'undefined') {
      // Using window.location for web
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?session_expired=true';
      }
    } else {
      // For React Native, you might use a navigation service
      console.log('Please implement navigation to login screen');
    }
  }

  setupInterceptors() {
    // Request Interceptor with token management
    this.client.interceptors.request.use(
      async (config) => {
        // Add auth token if not present
        if (!config.headers.Authorization) {
          try {
            const token = await tokenManager.getValidToken();
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
          } catch (error) {
            console.warn('Failed to get token for request:', error.message);
          }
        }

        // Set request-specific timeout
        config.timeout = config.timeout || API_CONFIG.TIMEOUT?.DEFAULT || 10000;

        // Set retry configuration
        config.metadata = {
          ...config.metadata,
          requestId: this.generateRequestId(),
          startTime: Date.now(),
          retryCount: 0,
          maxRetries: config.maxRetries || API_CONFIG.RETRY?.MAX_ATTEMPTS || 3,
        };

        return config;
      },
      (error) => {
        logger.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response Interceptor with enhanced error handling
    this.client.interceptors.response.use(
      (response) => {
        // Log successful response
        const { config, status, data } = response;
        const responseTime = Date.now() - (config.metadata?.startTime || 0);

        logger.info(
          `[${config.method?.toUpperCase() || 'UNKNOWN'}] ${config.url} - ${status} (${responseTime}ms)`,
          { response: data }
        );

        return response;
      },
      async (error) => {
        const { config, response } = error;

        // Handle timeout errors
        if (
          error.code === 'ECONNABORTED' &&
          error.message.includes('timeout')
        ) {
          logger.error(`⏰ Request timeout after ${config.timeout}ms:`, {
            url: config.url,
            method: config.method,
          });

          // Check if we should retry
          if (config.metadata?.retryCount < config.metadata?.maxRetries) {
            config.metadata.retryCount++;
            logger.info(
              `🔄 Retrying request (attempt ${config.metadata.retryCount}/${config.metadata.maxRetries})`
            );

            // Increase timeout for retry
            config.timeout = config.timeout * 1.5; // Increase timeout by 50%

            // Add delay before retry
            const delay = this.calculateRetryDelay(config.metadata.retryCount);
            await this.sleep(delay);

            return this.client(config);
          }
        }

        // Log error
        if (config) {
          const responseTime = Date.now() - (config.metadata?.startTime || 0);
          logger.error(
            `[${config.method?.toUpperCase() || 'UNKNOWN'}] ${config.url} - ${response?.status || 'NO_RESPONSE'} (${responseTime}ms)`,
            {
              error: error.message,
              response: response?.data,
              stack: error.stack,
            }
          );
        }

        // Handle 401 Unauthorized
        if (response?.status === 401) {
          // If we're already trying to refresh, don't try again
          if (config._retry) {
            tokenManager.clearCache();
            this.redirectToLogin();
            return Promise.reject(error);
          }

          // Try to refresh token
          try {
            const token = await tokenManager.getValidToken(true); // Force refresh
            if (token) {
              // Update auth header and retry the request
              config.headers.Authorization = `Bearer ${token}`;
              config._retry = true;
              return this.client(config);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            tokenManager.clearCache();
            this.redirectToLogin();
          }
        }

        // Handle token refresh queue
        if (error.response?.status === 401 && !config._retry) {
          if (this.isRefreshing) {
            return this.addToQueue(config);
          }

          config._retry = true;
          this.isRefreshing = true;

          try {
            await authService.refreshToken();
            // Process all queued requests with the new token
            this.processQueue(null);
            return this.client(config);
          } catch (refreshError) {
            this.processQueue(refreshError);
            await authService.logout();
            throw refreshError;
          } finally {
            this.isRefreshing = false;
          }
        }

        const processedError = this.processError(error);
        logger.error('API Error:', processedError);

        return Promise.reject(processedError);
      }
    );
  }

  // Enhanced retry logic
  calculateRetryDelay(attempt) {
    const baseDelay = API_CONFIG.RETRY?.DELAY || 300;
    const maxDelay = API_CONFIG.RETRY?.MAX_DELAY || 5000;
    const jitter = Math.random() * (API_CONFIG.RETRY?.JITTER || 100);

    return Math.min(baseDelay * Math.pow(2, attempt) + jitter, maxDelay);
  }

  // Request Methods
  async get(url, config = {}) {
    return this.request('GET', url, null, config);
  }

  async post(url, data, config = {}) {
    return this.request('POST', url, data, config);
  }

  async put(url, data, config = {}) {
    return this.request('PUT', url, data, config);
  }

  async patch(url, data, config = {}) {
    return this.request('PATCH', url, data, config);
  }

  async delete(url, config = {}) {
    return this.request('DELETE', url, null, config);
  }

  // Update request method with connection check
  async request(method, url, data, config = {}) {
    // Check connection before making request
    if (!this.isConnected) {
      throw this.createError(
        ERROR_CODES.NETWORK_ERROR,
        'No internet connection available'
      );
    }

    // Set appropriate timeout based on request type
    const timeout = this.getTimeoutForRequest(url, config);

    const requestConfig = {
      ...config,
      method,
      url,
      data,
      timeout,
      metadata: {
        maxRetries:
          config.maxRetries ||
          (url.includes('/auth/') ? 1 : API_CONFIG.RETRY?.MAX_ATTEMPTS || 3),
      },
    };

    try {
      const response = await this.client(requestConfig);
      return response.data;
    } catch (error) {
      if (this.isTimeoutError(error)) {
        logger.error(`Request timed out after ${timeout}ms:`, {
          url,
          method,
          attempt: config.metadata?.retryCount || 1,
        });
      }
      throw this.processError(error);
    }
  }

  // Add helper methods for timeout handling
  getTimeoutForRequest(url, config) {
    if (config.timeout) return config.timeout;

    if (url.includes('/auth/')) {
      return API_CONFIG.TIMEOUT?.AUTH || 10000;
    }
    if (url.includes('/upload/')) {
      return API_CONFIG.TIMEOUT?.UPLOAD || 30000;
    }
    return API_CONFIG.TIMEOUT?.DEFAULT || 10000;
  }

  isTimeoutError(error) {
    return (
      error.code === 'ECONNABORTED' ||
      error.message?.includes('timeout') ||
      error.message?.includes('Network request failed')
    );
  }

  // Upload Methods
  async uploadFile(url, file, onProgress) {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.type,
        name: file.name || 'upload.jpg',
      });

      const response = await this.client.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          onProgress?.(Math.round(progress));
        },
      });

      return response.data;
    } catch (error) {
      throw this.processError(error);
    }
  }

  // Token Refresh Queue
  addToQueue(request) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ resolve, reject, request });
    });
  }

  processQueue(error) {
    this.requestQueue.forEach(({ resolve, reject, request }) => {
      if (error) {
        reject(error);
      } else {
        resolve(this.client(request));
      }
    });

    this.requestQueue = [];
  }

  // Error Processing
  processError(error) {
    // Check if it's a server response error
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.response.statusText;
      
      return {
        code: this.getErrorCode(status),
        message,
        status,
        data: error.response.data,
        originalError: error,
      };
    }
    
    // Check if it's a network error
    if (error.message && error.message.includes('Network Error')) {
      return {
        code: ERROR_CODES.NETWORK_ERROR,
        message: 'Network connection error',
        originalError: error,
      };
    }
    
    // Check if it's a timeout error
    if (error.code === 'ECONNABORTED') {
      return {
        code: ERROR_CODES.TIMEOUT_ERROR,
        message: 'Request timeout',
        originalError: error,
      };
    }
    
    // Unknown error
    return {
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: error.message || 'An unexpected error occurred',
      originalError: error,
    };
  }

  getErrorCode(status) {
    if (status === 401) {
      return ERROR_CODES.UNAUTHORIZED;
    } else if (status === 403) {
      return ERROR_CODES.FORBIDDEN;
    } else if (status === 404) {
      return ERROR_CODES.NOT_FOUND;
    } else if (status >= 400 && status < 500) {
      return ERROR_CODES.VALIDATION_ERROR;
    } else if (status >= 500) {
      return ERROR_CODES.SERVER_ERROR;
    }
    return ERROR_CODES.UNKNOWN_ERROR;
  }

  createError(code, message) {
    return { code, message };
  }

  // Utility Methods
  generateRequestId() {
    return Math.random().toString(36).substr(2, 9);
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Cache Methods
  async getCachedData(key) {
    try {
      const cached = await AsyncStorage.getItem(`cache:${key}`);
      if (cached) {
        const { data, timestamp, ttl } = JSON.parse(cached);
        if (Date.now() - timestamp < ttl) {
          return data;
        }
      }
      return null;
    } catch (error) {
      logger.error('Cache read error:', error);
      return null;
    }
  }

  async setCachedData(key, data, ttl = 300000) {
    // 5 minutes default
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      await AsyncStorage.setItem(`cache:${key}`, JSON.stringify(cacheData));
    } catch (error) {
      logger.error('Cache write error:', error);
    }
  }

  async clearCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith('cache:'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }
}

export const apiService = new ApiService();
export { apiService as api }; // Export as 'api' for backward compatibility

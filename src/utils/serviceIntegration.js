// Service Integration Utilities
// Provides helper functions for service integration and error handling

import { apiService } from '../services/apiService';
import { authService } from '../services/authService';
import { logger } from './logger';

export class ServiceIntegrationError extends Error {
  constructor(message, code, originalError) {
    super(message);
    this.name = 'ServiceIntegrationError';
    this.code = code;
    this.originalError = originalError;
  }
}

// Standardized error handling
export const handleServiceError = (error, operation) => {
  logger.error(`Service error in ${operation}:`, error);
  
  // Network errors
  if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network')) {
    throw new ServiceIntegrationError(
      'Network connection failed. Please check your internet connection.',
      'NETWORK_ERROR',
      error
    );
  }
  
  // Authentication errors
  if (error.code === 'UNAUTHORIZED' || error.status === 401) {
    authService.logout();
    throw new ServiceIntegrationError(
      'Session expired. Please log in again.',
      'AUTH_ERROR',
      error
    );
  }
  
  // Rate limiting
  if (error.status === 429) {
    throw new ServiceIntegrationError(
      'Too many requests. Please try again in a moment.',
      'RATE_LIMIT',
      error
    );
  }
  
  // Server errors
  if (error.status >= 500) {
    throw new ServiceIntegrationError(
      'Server error. Please try again later.',
      'SERVER_ERROR',
      error
    );
  }
  
  // Default error
  throw new ServiceIntegrationError(
    error.message || 'An unexpected error occurred.',
    'UNKNOWN_ERROR',
    error
  );
};

// Retry mechanism with exponential backoff
export const withRetry = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error.code === 'AUTH_ERROR' || error.status === 401 || error.status === 403) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      logger.info(`Retrying operation in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Cache management utilities
export const createCacheKey = (prefix, params = {}) => {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {});
  
  return `${prefix}:${JSON.stringify(sortedParams)}`;
};

// Service health check
export const checkServiceHealth = async () => {
  try {
    const health = await apiService.get('/health');
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      details: health
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
};

// Fallback data providers
export const getFallbackCaregivers = () => [
  {
    id: 'fallback-1',
    name: 'Sample Caregiver',
    rating: 4.5,
    reviewCount: 0,
    hourlyRate: 300,
    location: 'Location not available',
    skills: ['Child Care'],
    experience: { years: 1, months: 0 },
    availability: { days: [] },
    ageCareRanges: []
  }
];

export const getFallbackBookings = () => [];

export const getFallbackMessages = () => [];

// Service integration status
export const getServiceStatus = () => {
  return {
    apiService: apiService ? 'available' : 'unavailable',
    authService: authService ? 'available' : 'unavailable',
    timestamp: new Date().toISOString()
  };
};

export default {
  ServiceIntegrationError,
  handleServiceError,
  withRetry,
  createCacheKey,
  checkServiceHealth,
  getFallbackCaregivers,
  getFallbackBookings,
  getFallbackMessages,
  getServiceStatus
};
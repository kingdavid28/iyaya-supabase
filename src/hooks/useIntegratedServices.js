// Custom hook for integrated services
import { useState, useEffect, useCallback } from 'react';
import integratedService from '../services/integratedService';
import { handleServiceError, withRetry } from '../utils/serviceIntegration';

export const useIntegratedServices = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cache, setCache] = useState(new Map());

  // Generic service call with error handling and caching
  const callService = useCallback(async (serviceMethod, cacheKey = null, ...args) => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      if (cacheKey && cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        if (Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes
          return cached.data;
        }
      }

      // Call service with retry
      const result = await withRetry(() => serviceMethod(...args));

      // Cache result
      if (cacheKey) {
        setCache(prev => new Map(prev).set(cacheKey, {
          data: result,
          timestamp: Date.now()
        }));
      }

      return result;
    } catch (err) {
      const processedError = handleServiceError(err, serviceMethod.name);
      setError(processedError);
      throw processedError;
    } finally {
      setLoading(false);
    }
  }, [cache]);

  // Caregiver operations
  const searchCaregivers = useCallback((filters = {}) => {
    const cacheKey = `caregivers:${JSON.stringify(filters)}`;
    return callService(integratedService.searchCaregivers.bind(integratedService), cacheKey, filters);
  }, [callService]);

  // Messaging operations
  const startConversation = useCallback((caregiverId, caregiverName, message) => {
    return callService(
      integratedService.startConversation.bind(integratedService),
      null,
      caregiverId,
      caregiverName,
      message
    );
  }, [callService]);

  const getConversations = useCallback(() => {
    return callService(
      integratedService.getConversations.bind(integratedService),
      'conversations'
    );
  }, [callService]);

  // Booking operations
  const createBooking = useCallback((bookingData) => {
    return callService(
      integratedService.createBooking.bind(integratedService),
      null,
      bookingData
    );
  }, [callService]);

  const getBookings = useCallback(() => {
    return callService(
      integratedService.getBookings.bind(integratedService),
      'bookings'
    );
  }, [callService]);

  // Profile operations
  const updateProfile = useCallback((profileData) => {
    return callService(
      integratedService.updateProfile.bind(integratedService),
      null,
      profileData
    );
  }, [callService]);

  const getProfile = useCallback(() => {
    return callService(
      integratedService.getProfile.bind(integratedService),
      'profile'
    );
  }, [callService]);

  // Cache management
  const clearCache = useCallback((pattern = null) => {
    if (pattern) {
      setCache(prev => {
        const newCache = new Map();
        for (const [key, value] of prev) {
          if (!key.includes(pattern)) {
            newCache.set(key, value);
          }
        }
        return newCache;
      });
    } else {
      setCache(new Map());
    }
    
    // Also clear integrated service cache
    integratedService.clearCache(pattern);
  }, []);

  // Health check
  const healthCheck = useCallback(() => {
    return callService(integratedService.healthCheck.bind(integratedService));
  }, [callService]);

  return {
    loading,
    error,
    searchCaregivers,
    startConversation,
    getConversations,
    createBooking,
    getBookings,
    updateProfile,
    getProfile,
    clearCache,
    healthCheck
  };
};

export default useIntegratedServices;
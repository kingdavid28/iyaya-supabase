// Service Configuration
// Centralized configuration for all services

export const SERVICE_CONFIG = {
  // Cache settings
  CACHE: {
    DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
    PROFILE_TTL: 10 * 60 * 1000, // 10 minutes
    CONVERSATIONS_TTL: 2 * 60 * 1000, // 2 minutes
    CAREGIVERS_TTL: 5 * 60 * 1000, // 5 minutes
    BOOKINGS_TTL: 3 * 60 * 1000, // 3 minutes
  },

  // Retry settings
  RETRY: {
    MAX_ATTEMPTS: 3,
    BASE_DELAY: 1000, // 1 second
    MAX_DELAY: 10000, // 10 seconds
    EXPONENTIAL_BASE: 2,
  },

  // Error handling
  ERRORS: {
    NETWORK_TIMEOUT: 10000, // 10 seconds
    RETRY_STATUS_CODES: [408, 429, 500, 502, 503, 504],
    NO_RETRY_CODES: [400, 401, 403, 404, 422],
  },

  // Service endpoints
  ENDPOINTS: {
    HEALTH: '/health',
    CAREGIVERS: '/caregivers',
    BOOKINGS: '/bookings',
    MESSAGES: '/messages',
    PROFILE: '/profile',
    AUTH: '/auth',
  },

  // Feature flags
  FEATURES: {
    ENABLE_CACHING: true,
    ENABLE_RETRY: true,
    ENABLE_FALLBACK: true,
    ENABLE_OFFLINE_MODE: false,
    ENABLE_REAL_TIME: true,
  },

  // Performance settings
  PERFORMANCE: {
    BATCH_SIZE: 20,
    DEBOUNCE_DELAY: 300,
    THROTTLE_DELAY: 1000,
  },
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'development') {
  SERVICE_CONFIG.CACHE.DEFAULT_TTL = 1 * 60 * 1000; // 1 minute in dev
  SERVICE_CONFIG.RETRY.MAX_ATTEMPTS = 2; // Fewer retries in dev
}

if (process.env.NODE_ENV === 'production') {
  SERVICE_CONFIG.ERRORS.NETWORK_TIMEOUT = 15000; // Longer timeout in prod
  SERVICE_CONFIG.RETRY.MAX_ATTEMPTS = 5; // More retries in prod
}

export default SERVICE_CONFIG;
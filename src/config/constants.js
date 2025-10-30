// Environment detection - handle both Expo and web environments
let __DEV__ = false;
try {
  __DEV__ = process.env.NODE_ENV === "development";
} catch (error) {
  __DEV__ = true; // Default to development mode
}

// Supabase configuration is handled in src/config/supabase.js

export { __DEV__ };
export const __PROD__ = !__DEV__;

// Compute a cross-platform API base URL that works for Expo Web, Android emulator, iOS simulator, and physical devices.
const getBaseHost = () => {
  try {
    // 1) Environment variable takes priority
    const envUrl = process.env?.EXPO_PUBLIC_API_URL || process.env?.REACT_APP_API_URL;
    if (envUrl) {
      const cleaned = envUrl.replace(/\/$/, "").replace(/\/api$/i, "");
      return { mode: "env", url: cleaned };
    }

    // 2) Platform-specific defaults
    try {
      const rn = require("react-native");
      const platform = rn?.Platform?.OS;
      if (platform === "android") {
        return { mode: "android-emulator", url: "http://10.0.2.2:5000" };
      }
      if (platform === "ios") {
        return { mode: "ios-simulator", url: "http://localhost:5000" };
      }
    } catch (_) {
      // Ignore require errors for react-native in web environments
    }

    // 3) Web fallback
    if (typeof window !== "undefined") {
      return { mode: "web", url: "http://localhost:5000" };
    }

    // 4) Default fallback
    return { mode: "fallback", url: "http://localhost:5000" };
  } catch (error) {
    console.error("Error determining base host:", error);
    return { mode: "error-fallback", url: "http://localhost:5000" };
  }
};

const baseHost = getBaseHost();
if (__DEV__) {
  console.log('🔗 Base host configuration:', baseHost);
}

// API Configuration with enhanced timeout and retry settings
export const API_CONFIG = {
  BASE_URL: baseHost.url + "/api", // Use computed baseHost
  TIMEOUT: {
    DEFAULT: 8000, // 8 seconds default
    AUTH: 12000, // 12 seconds for auth
    REGISTER: 15000, // 15 seconds for registration
    UPLOAD: 30000, // 30 seconds for uploads
    EXTENDED: 20000, // 20 seconds for complex operations
  },
  RETRY: {
    MAX_ATTEMPTS: 2,
    DELAY: 1000, // Start with 1 second
    MAX_DELAY: 3000, // Max 3 seconds between retries
    JITTER: 300,
    STATUS_CODES: [408, 429, 500, 502, 503, 504],
    METHODS: ["GET", "POST", "PUT", "DELETE"], // Methods to retry
  },
  CONNECTION: {
    CHECK_URL: "/health", // Health check endpoint
    CHECK_TIMEOUT: 3000, // 3 second timeout for health check
    CHECK_INTERVAL: 30000, // Check every 30 seconds
    RECONNECT_ATTEMPTS: 3, // Number of reconnection attempts
  },
};

// Add connection states
export const CONNECTION_STATES = {
  CHECKING: "CHECKING",
  CONNECTED: "CONNECTED",
  DISCONNECTED: "DISCONNECTED",
  RECONNECTING: "RECONNECTING",
};

// Update error codes
export const ERROR_CODES = {
  NETWORK_ERROR: "NETWORK_ERROR",
  AUTH_ERROR: "AUTH_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  PERMISSION_ERROR: "PERMISSION_ERROR",
  SERVER_ERROR: "SERVER_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
  API_TIMEOUT: "API_TIMEOUT",
  API_CONNECTION: "API_CONNECTION",
  API_NETWORK: "API_NETWORK",
  RETRY_FAILED: "RETRY_FAILED",
  REQUEST_ABORTED: "REQUEST_ABORTED",
  TIMEOUT: {
    DEFAULT: "TIMEOUT_ERROR",
    AUTH: "AUTH_TIMEOUT",
    NETWORK: "NETWORK_TIMEOUT",
    SERVER: "SERVER_TIMEOUT",
  },
  CONNECTION: {
    REFUSED: "ECONNREFUSED",
    RESET: "ECONNRESET",
    TIMEOUT: "ETIMEDOUT",
    NETWORK_CHANGED: "NETWORK_CHANGED",
  },
};

// Debug configuration
export const DEBUG_CONFIG = {
  ENABLED: __DEV__,
  LOG_LEVEL: __DEV__ ? "debug" : "error",
  API_LOGGING: __DEV__,
  SHOW_TIMEOUTS: __DEV__,
  RETRY_LOGGING: __DEV__,
};

// Request priority levels
export const REQUEST_PRIORITY = {
  HIGH: {
    timeout: API_CONFIG.TIMEOUT.EXTENDED,
    retries: API_CONFIG.RETRY.MAX_ATTEMPTS,
  },
  NORMAL: {
    timeout: API_CONFIG.TIMEOUT.DEFAULT,
    retries: 2,
  },
  LOW: {
    timeout: API_CONFIG.TIMEOUT.DEFAULT,
    retries: 1,
  },
};

// Helper function to calculate retry delay with exponential backoff
export const calculateRetryDelay = (attempt) => {
  const baseDelay = API_CONFIG.RETRY.DELAY;
  const maxDelay = API_CONFIG.RETRY.MAX_DELAY;
  const jitter = Math.random() * API_CONFIG.RETRY.JITTER;

  const delay = Math.min(baseDelay * Math.pow(2, attempt) + jitter, maxDelay);

  return delay;
};

// Theme Colors
export const COLORS = {
  primary: "#6366f1",
  secondary: "#8b5cf6",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
  light: "#f8fafc",
  dark: "#1e293b",
  background: "#ffffff",
  text: "#000000",
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },
};

// App Configuration
export const APP_CONFIG = {
  NAME: "Iyaya",
  VERSION: "1.0.0",
  BUILD_NUMBER: "1",
};

// Feature Flags
export const FEATURES = {
  PUSH_NOTIFICATIONS: true,
  REAL_TIME_CHAT: true,
  BACKGROUND_CHECKS: true,
  PAYMENT_INTEGRATION: false,
  PROFILE_VERIFICATION: true,
  PORTFOLIO_GALLERY: true,
  AVAILABILITY_CALENDAR: true,
  EMERGENCY_CONTACTS: true,
};

// Validation Rules
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[\d\s\-()]+$/,
  PASSWORD_MIN_LENGTH: 6,
  NAME_MIN_LENGTH: 2,
  BIO_MAX_LENGTH: 500,
  HOURLY_RATE_MIN: 200,
  HOURLY_RATE_MAX: 2000,
  // Childcare-specific validation
  EXPERIENCE_MIN_MONTHS: 6,
  EXPERIENCE_MAX_YEARS: 50,
  AGE_CARE_RANGES: {
    INFANT: { min: 0, max: 12, label: "Infants (0-12 months)" },
    TODDLER: { min: 13, max: 36, label: "Toddlers (1-3 years)" },
    PRESCHOOL: { min: 37, max: 60, label: "Preschoolers (3-5 years)" },
    SCHOOL_AGE: { min: 61, max: 144, label: "School Age (5-12 years)" },
    TEEN: { min: 145, max: 216, label: "Teenagers (12-18 years)" },
  },
  REQUIRED_CERTIFICATIONS: ["CPR", "First Aid"],
  PORTFOLIO_MAX_IMAGES: 10,
  PORTFOLIO_MAX_SIZE_MB: 5,
  EMERGENCY_CONTACTS_MIN: 1,
  EMERGENCY_CONTACTS_MAX: 3,
  TIMEOUTS: {
    FORM_SUBMIT: 8000, // Form submission timeout
    FILE_UPLOAD: 30000, // File upload timeout
    API_RESPONSE: 5000, // API response validation timeout
  },
};

// Currency Configuration
export const CURRENCY = {
  SYMBOL: "₱",
  CODE: "PHP",
  NAME: "Philippine Peso",
  DECIMAL_PLACES: 2,
};

// Storage Keys
export const STORAGE_KEYS = {
  USER_TOKEN: "@iyaya:userToken",
  USER_PROFILE: "@iyaya:userProfile",
  ONBOARDING_COMPLETE: "@iyaya:onboardingComplete",
  PUSH_TOKEN: "@iyaya:pushToken",
  THEME_PREFERENCE: "@iyaya:themePreference",
  LANGUAGE_PREFERENCE: "@iyaya:languagePreference",
  // Keys used by AuthService (ensure they exist to avoid undefined warnings)
  AUTH_TOKEN: "@auth_token",
  USER_EMAIL: "@user_email",
};

// Add network detection
export const NETWORK = {
  RETRY_DELAY: 1000, // 1 second between retries
  MAX_RETRIES: 3, // Maximum retry attempts
  TIMEOUT_INCREMENT: 1.5, // Increase timeout by 50% each retry
  CHECK_INTERVAL: 10000, // Check network every 10 seconds
  CONNECTION_TYPES: {
    WIFI: "WIFI",
    CELLULAR: "CELLULAR",
    NONE: "NONE",
  },
};

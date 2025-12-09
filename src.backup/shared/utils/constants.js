// App-wide constants
export const APP_CONFIG = {
  NAME: 'Iyaya',
  VERSION: '1.0.0',
  SUPPORT_EMAIL: 'support@iyaya.com',
};

// API Configuration
export const API_CONFIG = {
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// User Roles
export const USER_ROLES = {
  PARENT: 'parent',
  CAREGIVER: 'caregiver',
  ADMIN: 'admin',
};

// Booking Status
export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Application Status
export const APPLICATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
};

// Message Types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  SYSTEM: 'system',
};

// Validation Rules
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  BIO_MAX_LENGTH: 500,
  HOURLY_RATE_MIN: 10,
  HOURLY_RATE_MAX: 100,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[\d\s\-()]{10,}$/,
};

// Screen Names (for navigation)
export const SCREENS = {
  WELCOME: 'Welcome',
  PARENT_AUTH: 'ParentAuth',
  CAREGIVER_AUTH: 'CaregiverAuth',
  PARENT_DASHBOARD: 'ParentDashboard',
  CAREGIVER_DASHBOARD: 'CaregiverDashboard',
  PROFILE: 'Profile',
  MESSAGES: 'Messages',
  CHAT: 'Chat',
  BOOKINGS: 'Bookings',
};

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@iyaya_auth_token',
  USER_DATA: '@iyaya_user_data',
  ONBOARDING_COMPLETED: '@iyaya_onboarding_completed',
  THEME_PREFERENCE: '@iyaya_theme_preference',
};

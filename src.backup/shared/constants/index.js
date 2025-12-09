// App constants
export const APP_CONFIG = {
  NAME: 'Iyaya',
  VERSION: '1.0.0',
  ENVIRONMENT: __DEV__ ? 'development' : 'production'
};

// UI constants
export const SCREEN_PADDING = 16;
export const CARD_MARGIN = 8;
export const BORDER_RADIUS = 8;

// Animation constants
export const ANIMATION_DURATION = 300;
export const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150
};

// Validation constants
export const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[+]?[1-9][\d]{0,15}$/,
  MIN_PASSWORD_LENGTH: 6
};
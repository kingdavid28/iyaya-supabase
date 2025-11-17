// utils/index.js - Centralized utility exports
export * from './auth';
export * from './errorHandler';
export * from './logger';
export * from './notificationUtils';
export * from './validation';

// Re-export commonly used utilities
export { default as errorHandler } from './errorHandler';
export { default as logger } from './logger';

export const sanitizeImageUri = (uri) => {
  if (typeof uri !== 'string') return null;
  const trimmed = uri.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (lower === 'null' || lower === 'undefined' || lower === 'false') {
    return null;
  }

  return trimmed;
};

// Export utility functions that might be used across the app
export const formatDate = (date) => {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return '';
  }
};

export const formatTime = (time) => {
  if (!time) return '';
  try {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch {
    return time;
  }
};

export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₱0';
  return `₱${Number(amount).toLocaleString()}`;
};

export const generateId = () => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};
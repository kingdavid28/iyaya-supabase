// Date utilities
export const formatDate = (date, format = 'short') => {
  if (!date) return 'Date not specified';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date';
  
  const options = format === 'short' 
    ? { month: 'short', day: 'numeric' }
    : { year: 'numeric', month: 'short', day: 'numeric' };
  
  return d.toLocaleDateString(undefined, options);
};

export const formatTime = (time) => {
  if (!time) return 'Time not specified';
  return time;
};

export const formatTimeRange = (startTime, endTime) => {
  if (!startTime || !endTime) return 'Time not specified';
  return `${startTime} - ${endTime}`;
};

// Text utilities
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

export const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Validation utilities
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone) => {
  const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Safe getters
export const safeGet = (obj, path, defaultValue = null) => {
  try {
    return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue;
  } catch {
    return defaultValue;
  }
};
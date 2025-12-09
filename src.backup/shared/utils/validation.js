import { VALIDATION } from '../../config/constants';

/**
 * Comprehensive validation utility functions
 * Consolidated from validation.js and validator.js
 * Single source of truth for all validation logic
 */

export const validators = {
  // Email validation
  email: (email) => {
    if (!email) return 'Email is required';
    if (!VALIDATION.EMAIL_REGEX?.test(email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  // Password validation - Production ready
  password: (password) => {
    if (!password) return 'Password is required';
    if (password.length < 12) {
      return 'Password must be at least 12 characters';
    }
    
    // Strong password requirements
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!hasUpper) return 'Password must contain at least one uppercase letter';
    if (!hasLower) return 'Password must contain at least one lowercase letter';
    if (!hasNumber) return 'Password must contain at least one number';
    if (!hasSymbol) return 'Password must contain at least one symbol';
    
    return null;
  },

  // Name validation
  name: (name) => {
    if (!name) return 'Name is required';
    if (name.trim().length < VALIDATION.NAME_MIN_LENGTH) {
      return `Name must be at least ${VALIDATION.NAME_MIN_LENGTH} characters`;
    }
    if (name.length > VALIDATION.NAME_MAX_LENGTH) {
      return `Name cannot exceed ${VALIDATION.NAME_MAX_LENGTH} characters`;
    }
    // Check for valid characters (letters, spaces, hyphens, apostrophes)
    if (!/^[a-zA-Z\s\-']+$/.test(name)) {
      return 'Name can only contain letters, spaces, hyphens, and apostrophes';
    }
    return null;
  },

  // Phone validation
  phone: (phone) => {
    if (!phone) return 'Phone number is required';
    const digitsOnly = phone.replace(/\D/g, '');
    if (!VALIDATION.PHONE_REGEX?.test(phone) && (!/^\+?[\d\s\-()]{10,}$/.test(phone) || digitsOnly.length < 10)) {
      return 'Please enter a valid phone number (minimum 10 digits)';
    }
    return null;
  },

  // Required field validation
  required: (value, fieldName = 'This field') => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return `${fieldName} is required`;
    }
    return null;
  },

  // Hourly rate validation
  hourlyRate: (rate) => {
    if (!rate) return 'Hourly rate is required';
    const numRate = parseFloat(rate);
    if (isNaN(numRate)) return 'Please enter a valid hourly rate';
    if (numRate < VALIDATION.HOURLY_RATE_MIN) {
      return `Hourly rate must be at least ₱${VALIDATION.HOURLY_RATE_MIN}`;
    }
    if (numRate > VALIDATION.HOURLY_RATE_MAX) {
      return `Hourly rate cannot exceed ₱${VALIDATION.HOURLY_RATE_MAX}`;
    }
    return null;
  },

  // Bio validation
  bio: (bio) => {
    if (bio && bio.length > VALIDATION.BIO_MAX_LENGTH) {
      return `Bio cannot exceed ${VALIDATION.BIO_MAX_LENGTH} characters`;
    }
    return null;
  },

  // Age validation
  age: (age) => {
    if (!age) return 'Age is required';
    const numAge = parseInt(age);
    if (isNaN(numAge)) return 'Please enter a valid age';
    if (numAge < 18) return 'You must be at least 18 years old';
    if (numAge > 100) return 'Please enter a valid age';
    return null;
  },

  // Date validation
  date: (date, fieldName = 'Date') => {
    if (!date) return `${fieldName} is required`;
    const dateObj = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isNaN(dateObj.getTime())) return `Invalid ${fieldName.toLowerCase()}`;
    if (dateObj < today) return `${fieldName} cannot be in the past`;
    return null;
  },

  // Time validation
  time: (time, fieldName = 'Time') => {
    if (!time) return `${fieldName} is required`;
    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
      return `Invalid ${fieldName.toLowerCase()} format. Use HH:MM format`;
    }
    return null;
  },

  // Rating validation
  rating: (rating) => {
    if (rating === undefined || rating === null) return 'Rating is required';
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return 'Rating must be between 1 and 5 stars';
    }
    return null;
  },

  // Comment validation
  comment: (comment, minLength = 10, maxLength = 500) => {
    if (!comment || comment.trim().length < minLength) {
      return `Comment must be at least ${minLength} characters long`;
    }
    if (comment.length > maxLength) {
      return `Comment must be less than ${maxLength} characters`;
    }
    return null;
  },

  // File validation for images
  imageFile: (file) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(file.type)) {
      return 'Only JPEG, PNG, and WebP images are allowed';
    }
    if (file.size > maxSize) {
      return 'Image size must be less than 5MB';
    }
    return null;
  },

  // File validation for documents
  documentFile: (file) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(file.type)) {
      return 'Only PDF, JPEG, and PNG files are allowed';
    }
    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }
    return null;
  },
};

/**
 * Validate multiple fields at once
 * @param {Object} data - Object with field values
 * @param {Object} rules - Object with validation rules for each field
 * @returns {Object} - Object with errors for each field
 */
export const validateForm = (data, rules) => {
  const errors = {};

  Object.keys(rules).forEach(field => {
    const value = data[field];
    const fieldRules = Array.isArray(rules[field]) ? rules[field] : [rules[field]];

    for (const rule of fieldRules) {
      const error = rule(value);
      if (error) {
        errors[field] = error;
        break; // Stop at first error for this field
      }
    }
  });

  return errors;
};

/**
 * Check if form has any errors
 * @param {Object} errors - Errors object from validateForm
 * @returns {boolean} - True if form is valid (no errors)
 */
export const isFormValid = (errors) => {
  return Object.keys(errors).length === 0;
};

/**
 * Utility functions for data sanitization
 */
export const sanitize = {
  string: (str) => {
    if (!str) return '';
    return str.trim().replace(/[<>]/g, '');
  },
  
  email: (email) => {
    if (!email) return '';
    return email.toLowerCase().trim();
  },
  
  phone: (phone) => {
    if (!phone) return '';
    return phone.replace(/[^\d+\-()\s]/g, '');
  },
};

/**
 * Common validation rule sets
 */
export const validationRules = {
  // User registration
  userRegistration: {
    name: validators.name,
    email: validators.email,
    password: validators.password,
    phone: validators.phone,
  },

  // User login
  userLogin: {
    email: validators.email,
    password: (value) => validators.required(value, 'Password'),
  },

  // Caregiver profile
  caregiverProfile: {
    name: validators.name,
    email: validators.email,
    phone: validators.phone,
    age: validators.age,
    hourlyRate: validators.hourlyRate,
    bio: validators.bio,
  },

  // Parent profile
  parentProfile: {
    name: validators.name,
    email: validators.email,
    phone: validators.phone,
  },

  // Booking validation
  booking: {
    startTime: validators.time,
    endTime: validators.time,
    date: validators.date,
    children: validators.required,
  },

  // Review validation
  review: {
    rating: validators.rating,
    comment: validators.comment,
  },
};

// Legacy class-based validator for backward compatibility
export class Validator {
  validateEmail(email) {
    const error = validators.email(email);
    if (error) throw new Error(error);
    return true;
  }

  validatePassword(password) {
    const error = validators.password(password);
    if (error) throw new Error(error);
    return true;
  }

  validateName(name) {
    const error = validators.name(name);
    if (error) throw new Error(error);
    return true;
  }

  validatePhone(phone) {
    const error = validators.phone(phone);
    if (error) throw new Error(error);
    return true;
  }

  sanitizeString(str) {
    return sanitize.string(str);
  }

  sanitizeEmail(email) {
    return sanitize.email(email);
  }

  sanitizePhone(phone) {
    return sanitize.phone(phone);
  }
}

export const validator = new Validator();

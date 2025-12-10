import { Platform } from 'react-native';

// Vercel Analytics utilities
let analytics = null;

if (Platform.OS === 'web' && process.env.NODE_ENV === 'production') {
  try {
    const { track } = require('@vercel/analytics');
    analytics = { track };
  } catch (error) {
    console.warn('Vercel Analytics not available:', error.message);
  }
}

// Analytics tracking functions
export const trackEvent = (eventName, properties = {}) => {
  if (Platform.OS === 'web' && analytics?.track) {
    try {
      analytics.track(eventName, properties);
      console.log('Analytics event tracked:', eventName, properties);
    } catch (error) {
      console.warn('Failed to track analytics event:', error.message);
    }
  }
};

// Common events for the Iyaya app
export const trackUserRegistration = (userType) => {
  trackEvent('user_registration', { user_type: userType });
};

export const trackUserLogin = (userType) => {
  trackEvent('user_login', { user_type: userType });
};

export const trackProfileView = (profileType) => {
  trackEvent('profile_view', { profile_type: profileType });
};

export const trackBookingCreated = (serviceType, bookingData = {}) => {
  trackEvent('booking_created', { 
    service_type: serviceType,
    ...bookingData
  });
};

export const trackSearchPerformed = (searchType, searchData = {}) => {
  trackEvent('search_performed', { 
    search_type: searchType,
    ...searchData
  });
};

export default {
  trackEvent,
  trackUserRegistration,
  trackUserLogin,
  trackProfileView,
  trackBookingCreated,
  trackSearchPerformed
};
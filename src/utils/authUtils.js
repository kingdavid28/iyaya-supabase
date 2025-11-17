import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/constants';

/**
 * Check if user is currently authenticated
 * @returns {Promise<boolean>} True if user has valid auth token
 */
export const isAuthenticated = async () => {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    return !!token;
  } catch (error) {
    console.error('Error checking authentication status:', error);
    return false;
  }
};

/**
 * Get current auth token
 * @returns {Promise<string|null>} Auth token or null if not authenticated
 */
export const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

/**
 * Clear authentication data
 * @returns {Promise<void>}
 */
export const clearAuth = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

/**
 * Check if API call requires authentication
 * @param {string} url - API endpoint URL
 * @returns {boolean} True if endpoint requires authentication
 */
export const requiresAuth = (url) => {
  const protectedEndpoints = [
    '/privacy/',
    '/bookings/',
    '/applications/',
    '/auth/profile',
    '/caregivers/profile',
    '/messages/'
  ];
  
  return protectedEndpoints.some(endpoint => url?.includes(endpoint));
};

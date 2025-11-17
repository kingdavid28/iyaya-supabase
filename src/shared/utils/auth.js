import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper function to validate JWT format
const isValidJWT = (token) => {
  if (!token || typeof token !== 'string') return false;
  
  // JWT should have 3 parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  // Each part should be base64 encoded (basic check)
  try {
    for (const part of parts) {
      if (!part || part.length === 0) return false;
      // Check if it's valid base64-like string
      if (!/^[A-Za-z0-9_-]+$/.test(part)) return false;
    }
    return true;
  } catch {
    return false;
  }
};

export const getAuthToken = async () => {
  try {
    const { STORAGE_KEYS } = await import('../config/constants');
    
    const tokenKeys = [STORAGE_KEYS.AUTH_TOKEN, 'authToken', 'token', 'userToken', 'accessToken', 'jwt'];
    
    for (const key of tokenKeys) {
      const token = await AsyncStorage.getItem(key);
      if (token) {
        // Validate token format before returning
        if (isValidJWT(token)) {
          console.log(`Found valid token with key: ${key}`);
          return token;
        } else {
          console.warn(`Invalid JWT format found with key: ${key}, removing...`);
          await AsyncStorage.removeItem(key);
        }
      }
    }
    
    console.warn('No valid auth token found in AsyncStorage');
    return null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export const setAuthToken = async (token) => {
  try {
    if (!token || !isValidJWT(token)) {
      console.error('Attempted to store invalid JWT token');
      return false;
    }
    
    const { STORAGE_KEYS } = await import('../config/constants');
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    return true;
  } catch (error) {
    console.error('Error setting auth token:', error);
    return false;
  }
};

export const removeAuthToken = async () => {
  try {
    const { STORAGE_KEYS } = await import('../config/constants');
    // Remove all possible token keys to ensure cleanup
    const tokenKeys = [STORAGE_KEYS.AUTH_TOKEN, 'authToken', 'token', 'userToken', 'accessToken', 'jwt'];
    await AsyncStorage.multiRemove(tokenKeys);
  } catch (error) {
    console.error('Error removing auth token:', error);
  }
};

// Clear all auth-related data
export const clearAuthData = async () => {
  try {
    const { STORAGE_KEYS } = await import('../config/constants');
    const keysToRemove = [
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_PROFILE,
      STORAGE_KEYS.USER_TOKEN,
      'authToken',
      'token', 
      'userToken',
      'accessToken',
      'jwt'
    ];
    await AsyncStorage.multiRemove(keysToRemove);
    console.log('All auth data cleared');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

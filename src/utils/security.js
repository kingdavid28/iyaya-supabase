import AsyncStorage from '@react-native-async-storage/async-storage';

export const security = {
  async storeToken(token, refreshToken) {
    try {
      await AsyncStorage.setItem('@auth_token', token);
      if (refreshToken) {
        await AsyncStorage.setItem('@refresh_token', refreshToken);
      }
      return true;
    } catch (error) {
      console.error('Error storing token:', error);
      return false;
    }
  },

  async getToken() {
    try {
      return await AsyncStorage.getItem('@auth_token');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  async clearTokens() {
    try {
      await AsyncStorage.multiRemove(['@auth_token', '@refresh_token']);
      return true;
    } catch (error) {
      console.error('Error clearing tokens:', error);
      return false;
    }
  },

  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  },

  validateFileUpload(file, allowedTypes = ['image/jpeg', 'image/png']) {
    if (!file || !file.type) return { valid: false, error: 'Invalid file' };
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not allowed' };
    }
    return { valid: true };
  },

  generateSecureId(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  isTokenExpired(token) {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }
};
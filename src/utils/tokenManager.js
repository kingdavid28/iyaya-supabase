import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { STORAGE_KEYS } from '../config/constants';
import { performanceMonitor } from './performanceMonitor';

class TokenManager {
  constructor() {
    this.tokenCache = null;
    this.tokenPromise = null;
    this.lastRefresh = 0;
    this.REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes
  }

  async getValidToken(forceRefresh = false) {
    const now = Date.now();
    
    // Return cached token if recent and not forcing refresh
    if (!forceRefresh && this.tokenCache && (now - this.lastRefresh) < this.REFRESH_THRESHOLD) {
      console.log('💾 Valid token obtained and stored');
      return this.tokenCache;
    }

    // If already refreshing, wait for that promise
    if (this.tokenPromise) {
      return this.tokenPromise;
    }

    // Start token refresh
    this.tokenPromise = this._refreshToken();
    
    try {
      const token = await this.tokenPromise;
      this.tokenCache = token;
      this.lastRefresh = now;
      console.log('💾 Valid token obtained and stored');
      return token;
    } finally {
      this.tokenPromise = null;
    }
  }

  async _refreshToken() {
    console.log('🔄 Getting Supabase token, force refresh: false');
    performanceMonitor.trackTokenRefresh();
    performanceMonitor.startTimer('token-refresh');
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        console.log('No authenticated user - returning null silently');
        performanceMonitor.endTimer('token-refresh');
        return null;
      }

      const token = session.access_token;
      
      if (token) {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      }
      
      performanceMonitor.endTimer('token-refresh');
      return token;
    } catch (error) {
      console.warn('Token refresh failed:', error.message);
      performanceMonitor.endTimer('token-refresh');
      this.clearCache();
      return null;
    }
  }

  clearCache() {
    this.tokenCache = null;
    this.tokenPromise = null;
    this.lastRefresh = 0;
  }

  async logout() {
    this.clearCache();
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  }
}

export const tokenManager = new TokenManager();
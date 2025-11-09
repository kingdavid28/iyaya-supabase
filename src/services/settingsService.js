import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, STORAGE_KEYS } from '../config/constants';
import { supabaseService } from './supabase';

const API_BASE_URL = API_CONFIG.BASE_URL;

class SettingsService {
  async getAuthHeaders() {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async makeRequest(endpoint, options = {}) {
    try {
      const headers = await this.getAuthHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers,
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.log(`Settings API error for ${endpoint}:`, error.message);
      return this.getMockData(endpoint);
    }
  }

  getMockData(endpoint) {
    const mockData = {
      '/auth/profile': { name: 'User', email: 'user@example.com', phone: '', profileVisibility: 'public' },
      '/privacy/settings': { profileVisibility: true, showOnlineStatus: true, allowDirectMessages: true, showRatings: true, dataSharing: false },
      '/notifications/settings': { pushNotifications: true, emailNotifications: true, smsNotifications: false, bookingReminders: true, messageNotifications: true, marketingEmails: false, quietHours: { enabled: false, startTime: '22:00', endTime: '08:00' } },
      '/payments/settings': { defaultPaymentMethod: 'card', autoPayments: false, savePaymentInfo: true, receiveReceipts: true },
      '/data/usage': { profile: [{ name: 'User Profile', email: 'user@example.com', status: 'Active' }], jobs: [], bookings: [], applications: [] },
    };
    return mockData[endpoint] || {};
  }

  // Profile Settings
  async getProfile() {
    try {
      const profile = await supabaseService.user.getProfile();
      return profile || this.getMockData('/auth/profile');
    } catch (error) {
      console.log('Settings profile error:', error.message);
      return this.getMockData('/auth/profile');
    }
  }

  async updateProfile(data) {
    try {
      const user = await supabaseService.user._getCurrentUser();
      if (!user) throw new Error('Authentication required');

      const updatedProfile = await supabaseService.user.updateProfile(user.id, data);
      return updatedProfile;
    } catch (error) {
      console.log('Settings update profile error:', error.message);
      return this.makeRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    }
  }

  // Privacy Settings
  async getPrivacySettings(userId = null) {
    try {
      return await supabaseService.getPrivacySettings(userId);
    } catch (error) {
      console.log('Settings privacy fetch error:', error.message);
      return { data: this.getMockData('/privacy/settings') };
    }
  }

  async updatePrivacySettings(data, userId = null) {
    try {
      return await supabaseService.updatePrivacySettings(userId, data);
    } catch (error) {
      console.log('Settings privacy update error:', error.message);
      return { success: false, error };
    }
  }

  // Information Requests
  async getPendingRequests() {
    console.warn('settingsService.getPendingRequests is deprecated. Use the privacy context via usePrivacy().');
    return {
      success: true,
      data: [],
      requests: []
    };
  }

  async getSentRequests() {
    console.warn('settingsService.getSentRequests is deprecated. Use the privacy context via usePrivacy().');
    return {
      success: true,
      data: [],
      requests: []
    };
  }

  async respondToRequest() {
    console.warn('settingsService.respondToRequest is deprecated. Use the privacy context via usePrivacy().');
    return {
      success: false,
      message: 'Information request responses must be handled through the privacy context.'
    };
  }

  async requestInformation({ targetUserId, requestedFields, reason }) {
    try {
      const response = await this.makeRequest('/api/privacy/request', {
        method: 'POST',
        body: JSON.stringify({
          targetUserId,
          requestedFields,
          reason
        }),
      });

      return {
        success: true,
        data: response.data,
        ...response
      };
    } catch (error) {
      console.error('Error creating information request:', error);
      return {
        success: false,
        message: error.message || 'Failed to create information request'
      };
    }
  }

  // Notification Settings
  async getNotificationSettings() {
    return this.makeRequest('/notifications/settings');
  }

  async updateNotificationSettings(data) {
    return this.makeRequest('/notifications/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Payment Settings
  async getPaymentSettings() {
    return this.makeRequest('/payments/settings');
  }

  async updatePaymentSettings(data) {
    return this.makeRequest('/payments/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Data Management
  async exportUserData() {
    return this.makeRequest('/data/export', { method: 'POST' });
  }

  async deleteUserData() {
    return this.makeRequest('/data/all', { method: 'DELETE' });
  }

  async getDataUsage() {
    return this.makeRequest('/data/usage');
  }
}

export const settingsService = new SettingsService();

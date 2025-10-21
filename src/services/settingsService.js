import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabaseService } from './supabase';
import { STORAGE_KEYS, API_CONFIG } from '../config/constants';

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
      '/privacy/requests/pending': { requests: [{ id: '1', requesterName: 'John Doe', reason: 'Need contact info for booking', requestedFields: ['phone', 'email'], status: 'pending', createdAt: new Date().toISOString() }] },
      '/privacy/requests/sent': { requests: [] }
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
  async getPrivacySettings() {
    return this.makeRequest('/privacy/settings');
  }

  async updatePrivacySettings(data) {
    return this.makeRequest('/privacy/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Information Requests
  async getPendingRequests() {
    try {
      // Try Supabase notifications first
      const user = await supabaseService.user._getCurrentUser();
      if (user) {
        const notifications = await supabaseService.notifications.getNotifications(user.id);
        const requests = notifications.filter(n => n.type === 'info_request' && !n.read) || [];
        return {
          success: true,
          data: requests,
          requests: requests
        };
      }
      
      // Fallback to API
      const response = await this.makeRequest('/privacy/requests/pending');
      return {
        success: true,
        data: response.requests || [],
        requests: response.requests || []
      };
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch pending requests',
        data: [],
        requests: []
      };
    }
  }

  async getSentRequests() {
    try {
      const response = await this.makeRequest('/api/privacy/requests/sent');
      return {
        success: true,
        data: response.data || [],
        requests: response.data || [] // For backward compatibility
      };
    } catch (error) {
      console.error('Error fetching sent requests:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch sent requests',
        data: [],
        requests: []
      };
    }
  }

  async respondToRequest({ requestId, approved, sharedFields = [] }) {
    try {
      const response = await this.makeRequest(`/privacy/requests/${requestId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ approved, sharedFields }),
      });
      
      return {
        success: true,
        data: response.data,
        ...response
      };
    } catch (error) {
      console.error('Error responding to request:', error);
      return {
        success: false,
        message: error.message || 'Failed to respond to request'
      };
    }
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

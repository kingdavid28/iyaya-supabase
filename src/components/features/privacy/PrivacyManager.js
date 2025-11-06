import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { privacyAPI } from '../../../config/api';
import { informationRequestService } from '../../../services/supabase';
import { tokenManager } from '../../../utils/tokenManager';
import { getFilteredProfileData } from './ProfileDataManager';

// Helper function to check authentication
const isAuthenticated = async () => {
  try {
    const token = await tokenManager.getValidToken(false);
    return !!token;
  } catch (error) {
    return false;
  }
};

// Data classification levels - moved here to avoid circular dependency
const DATA_LEVELS = {
  PUBLIC: 'public',        // Always visible (name, general location, email)
  PRIVATE: 'private',      // Requires explicit sharing (phone, full address)
  SENSITIVE: 'sensitive'   // Requires approval (medical, financial, emergency contacts)
};

// Data classification mapping - moved here to avoid circular dependency
const dataClassification = {
  // Public - always visible
  name: DATA_LEVELS.PUBLIC,
  email: DATA_LEVELS.PUBLIC,
  bio: DATA_LEVELS.PUBLIC,
  experience: DATA_LEVELS.PUBLIC,
  skills: DATA_LEVELS.PUBLIC,
  certifications: DATA_LEVELS.PUBLIC,
  hourlyRate: DATA_LEVELS.PUBLIC,

  // Private - requires privacy setting
  phone: DATA_LEVELS.PRIVATE,
  address: DATA_LEVELS.PRIVATE,

  // Sensitive - requires approval
  emergencyContact: DATA_LEVELS.SENSITIVE,
  medicalInfo: DATA_LEVELS.SENSITIVE,
  allergies: DATA_LEVELS.SENSITIVE,
  behaviorNotes: DATA_LEVELS.SENSITIVE,
  financialInfo: DATA_LEVELS.SENSITIVE
};

const PrivacyContext = createContext();

export const usePrivacy = () => {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return context;
};

export const PrivacyProvider = ({ children }) => {
  // Use local data classification instead of importing from ProfileDataManager
  const [privacySettings, setPrivacySettings] = useState({
    sharePhone: false,
    shareAddress: false,
    shareEmergencyContact: false,
    shareChildMedicalInfo: false,
    shareChildAllergies: false,
    shareChildBehaviorNotes: false,
    shareFinancialInfo: false,
    autoApproveBasicInfo: true,
  });

  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadPrivacySettings = async () => {
    setLoading(true);
    try {
      // Check if user is authenticated first
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        console.warn('User not authenticated - skipping privacy settings load');
        return;
      }

      const response = await privacyAPI.getPrivacySettings();
      if (response?.data) {
        setPrivacySettings(response.data);
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
      // If 401 error, user might not be authenticated - use default settings
      if (error.response?.status === 401 || error.message === 'Authentication required') {
        console.warn('Privacy settings unavailable - using defaults');
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const updatePrivacySetting = async (setting, value) => {
    try {
      const updatedSettings = { ...privacySettings, [setting]: value };
      setPrivacySettings(updatedSettings);

      await privacyAPI.updatePrivacySettings(updatedSettings);
      return true;
    } catch (error) {
      console.error('Error updating privacy setting:', error);
      return false;
    }
  };

  const requestInformation = async (targetUserId, requestedFields, reason) => {
    try {
      const request = await informationRequestService.createRequest({
        targetId: targetUserId,
        requestedFields,
        reason,
      });

      if (request?.id) {
        setSentRequests(prev => [request, ...prev]);
        Alert.alert('Request Sent', 'Your information request has been sent and is pending approval.');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error requesting information:', error);
      Alert.alert('Error', error?.message || 'Failed to send information request.');
      return false;
    }
  };

  const respondToRequest = async (requestId, approved, sharedFields = [], expiresIn = null) => {
    try {
      const updated = await informationRequestService.respondToRequest({
        requestId,
        approved,
        sharedFields,
        expiresAt: expiresIn,
      });

      if (updated?.id) {
        setPendingRequests(prev => prev.filter(req => req.id !== requestId));
        setSentRequests(prev =>
          prev.map(req => (req.id === requestId ? updated : req))
        );

        const notification = {
          id: Date.now(),
          type: 'info_request_response',
          message: approved ? 'Information request approved' : 'Information request denied',
          timestamp: new Date().toISOString(),
        };
        setNotifications(prev => [notification, ...prev]);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error responding to request:', error);
      Alert.alert('Error', error?.message || 'Failed to respond to request.');
      return false;
    }
  };

  const getVisibleData = async (userData, viewerUserId, targetUserId, viewerType = 'caregiver') => {
    // Use ProfileDataManager for consistent data filtering
    if (targetUserId && viewerUserId) {
      return await getFilteredProfileData(targetUserId, viewerUserId, viewerType);
    }

    // Fallback to local filtering if no user IDs provided
    const visibleData = {};

    Object.keys(userData).forEach(field => {
      const classification = dataClassification[field];

      if (classification === DATA_LEVELS.PUBLIC) {
        // Always visible
        visibleData[field] = userData[field];
      } else if (classification === DATA_LEVELS.PRIVATE) {
        // Check privacy settings
        const settingKey = `share${field.charAt(0).toUpperCase() + field.slice(1)}`;
        if (privacySettings[settingKey]) {
          visibleData[field] = userData[field];
        } else {
          visibleData[field] = '[Private - Request Access]';
        }
      } else if (classification === DATA_LEVELS.SENSITIVE) {
        // Sensitive data requires explicit permission
        visibleData[field] = '[Sensitive - Requires Explicit Permission]';
      }
    });

    return visibleData;
  };

  const grantUserPermission = async (targetUserId, viewerUserId, fields, expiresIn = null) => {
    try {
      const response = await privacyAPI.grantPermission(targetUserId, viewerUserId, fields, expiresIn);
      if (response?.success) {
        Alert.alert('Permission Granted', 'Data access has been granted successfully.');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error granting permission:', error);
      Alert.alert('Error', 'Failed to grant permission.');
      return false;
    }
  };

  const revokeUserPermission = async (targetUserId, viewerUserId, fields = null) => {
    try {
      const response = await privacyAPI.revokePermission(targetUserId, viewerUserId, fields);
      if (response?.success) {
        Alert.alert('Permission Revoked', 'Data access has been revoked successfully.');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error revoking permission:', error);
      Alert.alert('Error', 'Failed to revoke permission.');
      return false;
    }
  };

  const loadPendingRequests = async () => {
    setLoading(true);
    try {
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        console.warn('User not authenticated - skipping pending requests load');
        setPendingRequests([]);
        return;
      }

      const requests = await informationRequestService.getPendingRequests();
      setPendingRequests(Array.isArray(requests) ? requests : []);
    } catch (error) {
      console.error('Error loading pending requests:', error);
      Alert.alert('Error', error?.message || 'Failed to load pending requests.');
    } finally {
      setLoading(false);
    }
  };

  const loadSentRequests = async () => {
    setLoading(true);
    try {
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        console.warn('User not authenticated - skipping sent requests load');
        setSentRequests([]);
        return;
      }

      const requests = await informationRequestService.getSentRequests();
      setSentRequests(Array.isArray(requests) ? requests : []);
    } catch (error) {
      console.error('Error loading sent requests:', error);
      Alert.alert('Error', error?.message || 'Failed to load sent requests.');
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Check if user is authenticated first
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        console.warn('User not authenticated - skipping notifications load');
        return;
      }

      const response = await privacyAPI.getPrivacyNotifications();
      if (response?.data) {
        setNotifications(response.data);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      // If 401 error, user might not be authenticated - skip loading
      if (error.response?.status === 401 || error.message === 'Authentication required') {
        console.warn('Privacy notifications unavailable - user not authenticated');
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await privacyAPI.markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId
            ? { ...notif, read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  useEffect(() => {
    loadPrivacySettings();
    loadPendingRequests();
    loadSentRequests();
    loadNotifications();
  }, []);

  const value = {
    privacySettings,
    pendingRequests,
    notifications,
    sentRequests,
    loading,
    DATA_LEVELS,
    dataClassification,
    updatePrivacySetting,
    requestInformation,
    respondToRequest,
    getVisibleData,
    grantUserPermission,
    revokeUserPermission,
    loadPendingRequests,
    loadSentRequests,
    markNotificationAsRead,
  };

  return (
    <PrivacyContext.Provider value={value}>
      {children}
    </PrivacyContext.Provider>
  );
};

export default PrivacyProvider;

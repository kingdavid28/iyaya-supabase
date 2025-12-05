import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
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

  const loadPrivacySettings = useCallback(async () => {
    try {
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
      console.warn('Error loading privacy settings:', error);
      // Use default settings on error
    }
  }, []);

  const updatePrivacySetting = useCallback(async (setting, value) => {
    try {
      const updatedSettings = { ...privacySettings, [setting]: value };
      setPrivacySettings(updatedSettings);

      await privacyAPI.updatePrivacySettings(updatedSettings);
      return true;
    } catch (error) {
      console.error('Error updating privacy setting:', error);
      return false;
    }
  }, [privacySettings]);

  const ALLOWED_REQUEST_FIELDS = [
    'phone',
    'address',
    'profile_image',
    'portfolio',
    'availability',
    'languages',
    'emergency_contacts',
    'documents',
    'background_check',
    'age_care_ranges',
    'emergency_contact',
    'child_medical_info',
    'child_allergies',
    'child_behavior_notes',
    'financial_info'
  ];

  const normalizeRequestedField = (field) => {
    if (!field) return null;
    const trimmed = String(field).trim();
    if (!trimmed) return null;

    const lower = trimmed.toLowerCase();
    if (ALLOWED_REQUEST_FIELDS.includes(lower)) {
      return lower;
    }

    const snake = trimmed
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/\s+/g, '_')
      .replace(/__+/g, '_')
      .toLowerCase();

    return ALLOWED_REQUEST_FIELDS.includes(snake) ? snake : null;
  };

  const requestInformation = useCallback(async (targetUserId, requestedFields, reason, options = {}) => {
    try {
      const normalizedFields = Array.from(
        new Set(
          (Array.isArray(requestedFields) ? requestedFields : [])
            .map(normalizeRequestedField)
            .filter(Boolean)
        )
      );

      if (!normalizedFields.length) {
        Alert.alert(
          'Unavailable fields',
          'The selected information cannot be requested right now. Please choose different items.'
        );
        return false;
      }

      console.log('Requested fields →', normalizedFields);

      const normalizedTargetId = typeof targetUserId === 'string'
        ? targetUserId.trim()
        : targetUserId != null
          ? String(targetUserId).trim()
          : '';

      if (!normalizedTargetId || normalizedTargetId === 'sample') {
        Alert.alert(
          'Invalid recipient',
          'We need a valid user to send your request. Please choose a real profile before submitting.'
        );
        return false;
      }

      const currentUser = await tokenManager.getUser?.();
      const currentUserId = currentUser?.id || currentUser?.userId || null;

      if (currentUserId && normalizedTargetId === String(currentUserId)) {
        Alert.alert(
          'Unavailable recipient',
          'You cannot request private information from your own profile.'
        );
        return false;
      }

      const { allowedTargetIds } = options || {};
      if (Array.isArray(allowedTargetIds) && allowedTargetIds.length > 0) {
        const normalizedAllowedTargets = allowedTargetIds
          .map((id) => (id != null ? String(id).trim() : ''))
          .filter((id) => id.length > 0);

        if (!normalizedAllowedTargets.includes(normalizedTargetId)) {
          Alert.alert(
            'Unavailable recipient',
            'You can only request information from families connected through your bookings or job applications.'
          );
          return false;
        }
      }

      const request = await informationRequestService.createRequest({
        targetId: normalizedTargetId,
        requestedFields: normalizedFields,
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
  }, []);

  const respondToRequest = useCallback(async (requestId, approved, sharedFields = [], expiresIn = null) => {
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
      if (error?.code === '23505') {
        console.warn('Duplicate permission detected, treating as already approved.', error);
        setPendingRequests(prev => prev.filter(req => req.id !== requestId));
        Alert.alert('Already shared', 'You have already granted access to this information.');
        return true;
      }

      console.error('Error responding to request:', error);
      Alert.alert('Error', error?.message || 'Failed to respond to request.');
      return false;
    }
  }, []);

  const getVisibleData = useCallback(async (userData, viewerUserId, targetUserId, viewerType = 'caregiver') => {
    if (targetUserId && viewerUserId) {
      return await getFilteredProfileData(targetUserId, viewerUserId, viewerType);
    }

    const visibleData = {};

    Object.keys(userData).forEach(field => {
      const classification = dataClassification[field];

      if (classification === DATA_LEVELS.PUBLIC) {
        visibleData[field] = userData[field];
      } else if (classification === DATA_LEVELS.PRIVATE) {
        const settingKey = `share${field.charAt(0).toUpperCase() + field.slice(1)}`;
        if (privacySettings[settingKey]) {
          visibleData[field] = userData[field];
        } else {
          visibleData[field] = '[Private - Request Access]';
        }
      } else if (classification === DATA_LEVELS.SENSITIVE) {
        visibleData[field] = '[Sensitive - Requires Explicit Permission]';
      }
    });

    return visibleData;
  }, [privacySettings]);

  const getSharedProfileForViewer = useCallback(async (targetUserId, viewerUserId, options = {}) => {
    try {
      return await privacyAPI.getSharedProfileForViewer(targetUserId, viewerUserId, options);
    } catch (error) {
      console.error('Error fetching shared profile for viewer:', error);
      return null;
    }
  }, []);

  const grantUserPermission = useCallback(async (targetUserId, viewerUserId, fields, expiresIn = null) => {
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
  }, []);

  const revokeUserPermission = useCallback(async (targetUserId, viewerUserId, fields = null) => {
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
  }, []);

  const loadPendingRequests = useCallback(async () => {
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
      console.warn('Error loading pending requests:', error);
      setPendingRequests([]);
      // Don't show alert on startup errors
    }
  }, []);

  const loadSentRequests = useCallback(async () => {
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
      console.warn('Error loading sent requests:', error);
      setSentRequests([]);
      // Don't show alert on startup errors
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
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
      console.warn('Error loading notifications:', error);
      // Silently fail on startup
    }
  }, []);

  const markNotificationAsRead = useCallback(async (notificationId) => {
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
  }, []);

  // Only load data when user is authenticated
  useEffect(() => {
    const loadDataWhenReady = async () => {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        loadPrivacySettings();
        loadPendingRequests();
        loadSentRequests();
        loadNotifications();
      }
    };
    
    // Delay initial load to avoid startup race conditions
    const timer = setTimeout(loadDataWhenReady, 1000);
    return () => clearTimeout(timer);
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
    getSharedProfileForViewer,
  };

  return (
    <PrivacyContext.Provider value={value}>
      {children}
    </PrivacyContext.Provider>
  );
};

export default PrivacyProvider;

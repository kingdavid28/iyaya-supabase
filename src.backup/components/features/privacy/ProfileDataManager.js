import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { caregiversAPI, authAPI, privacyAPI } from '../../../config/api';
import { tokenManager } from '../../../utils/tokenManager';

// Helper function to check authentication
const isAuthenticated = async () => {
  try {
    const token = await tokenManager.getValidToken(false);
    return !!token;
  } catch (error) {
    return false;
  }
};

// Data classification levels from existing system
const DATA_LEVELS = {
  PUBLIC: 'public',        // Always visible (name, general location, email)
  PRIVATE: 'private',      // Requires explicit sharing (phone, full address)
  SENSITIVE: 'sensitive'   // Requires approval (medical, financial, emergency contacts)
};

// Reuse existing profile field classification
const dataClassification = {
  // Public - always visible (from EditCaregiverProfile.js)
  name: DATA_LEVELS.PUBLIC,
  email: DATA_LEVELS.PUBLIC,
  bio: DATA_LEVELS.PUBLIC,
  experience: DATA_LEVELS.PUBLIC,
  skills: DATA_LEVELS.PUBLIC,
  certifications: DATA_LEVELS.PUBLIC,
  hourlyRate: DATA_LEVELS.PUBLIC,

  // Private - requires privacy setting (from EnhancedCaregiverProfileWizard.js)
  phone: DATA_LEVELS.PRIVATE,
  address: DATA_LEVELS.PRIVATE,
  profileImage: DATA_LEVELS.PRIVATE,
  portfolio: DATA_LEVELS.PRIVATE,
  availability: DATA_LEVELS.PRIVATE,
  languages: DATA_LEVELS.PRIVATE,

  // Sensitive - requires explicit approval
  emergencyContacts: DATA_LEVELS.SENSITIVE,
  documents: DATA_LEVELS.SENSITIVE,
  backgroundCheck: DATA_LEVELS.SENSITIVE,
  ageCareRanges: DATA_LEVELS.SENSITIVE,
};

// Get filtered data based on privacy settings and permissions
export const getFilteredProfileData = async (targetUserId, viewerUserId, viewerType = 'caregiver', profileData = {}) => {
  try {
    // Check if user is authenticated first
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      console.warn('User not authenticated - returning basic profile data only');
      // Return only public data when not authenticated
      const publicData = {};
      Object.keys(profileData).forEach(field => {
        if (dataClassification[field] === DATA_LEVELS.PUBLIC) {
          publicData[field] = profileData[field];
        }
      });
      return publicData;
    }

    // Get privacy settings for the target user
    const privacySettings = await privacyAPI.getPrivacySettings(targetUserId);
    // Get specific permissions granted to this viewer
    const userPermissions = await privacyAPI.getUserPermissions(targetUserId, viewerUserId);

    const filteredData = {};

    Object.keys(profileData).forEach(field => {
      const classification = dataClassification[field];

      if (classification === DATA_LEVELS.PUBLIC) {
        // Always visible to everyone
        filteredData[field] = profileData[field];
      } else if (classification === DATA_LEVELS.PRIVATE) {
        // Check if viewer has specific permission for this field
        const hasPermission = userPermissions?.permissions?.includes(field) ||
                             userPermissions?.permissions?.includes('all_private');

        if (hasPermission) {
          filteredData[field] = profileData[field];
        } else {
          // Check general privacy settings as fallback
          const settingKey = `share${field.charAt(0).toUpperCase() + field.slice(1)}`;
          if (privacySettings?.data?.[settingKey]) {
            filteredData[field] = profileData[field];
          } else {
            filteredData[field] = '[Private - Request Access]';
          }
        }
      } else if (classification === DATA_LEVELS.SENSITIVE) {
        // Sensitive data requires explicit permission from target user to specific viewer
        const hasSensitivePermission = userPermissions?.permissions?.includes(field) ||
                                     userPermissions?.permissions?.includes('all_sensitive') ||
                                     userPermissions?.sensitiveFields?.includes(field);

        if (hasSensitivePermission && userPermissions?.grantedTo === viewerUserId) {
          filteredData[field] = profileData[field];
        } else {
          filteredData[field] = '[Sensitive - Requires Explicit Permission]';
        }
      }
    });

    return filteredData;
  } catch (error) {
    console.error('Error filtering profile data:', error);
    return profileData; // Return full data on error for safety
  }
};

const ProfileDataContext = createContext();

export const useProfileData = () => {
  const context = useContext(ProfileDataContext);
  if (!context) {
    throw new Error('useProfileData must be used within a ProfileDataProvider');
  }
  return context;
};

export const ProfileDataProvider = ({ children }) => {
  const [profileData, setProfileData] = useState({});
  const [loading, setLoading] = useState(false);

  // Load profile data using existing API methods
  const loadProfileData = async (userType = 'caregiver', userId = null) => {
    try {
      setLoading(true);
      let response;

      if (userType === 'caregiver') {
        // Use existing caregiver profile API from EditCaregiverProfile.js
        response = await caregiversAPI.getMyProfile();
        const profileData = response?.caregiver || response?.data?.caregiver || response?.provider || response || {};
        
        setProfileData({
          // Basic info (always visible)
          name: profileData.name || profileData.fullName || '',
          email: profileData.email || profileData.userId?.email || '',
          bio: profileData.bio || profileData.about || '',
          experience: profileData.experience?.years ?? profileData.experience ?? '',
          hourlyRate: profileData.hourlyRate ?? profileData.rate ?? '',
          skills: Array.isArray(profileData.skills) ? profileData.skills : [],
          certifications: Array.isArray(profileData.certifications) ? profileData.certifications : [],
          
          // Private info (controlled sharing)
          phone: profileData.phone || profileData.contactNumber || '',
          profileImage: profileData.profileImage || profileData.avatar || '',
          address: profileData.address || {},
          portfolio: profileData.portfolio || { images: [], videos: [] },
          availability: profileData.availability || {},
          languages: profileData.languages || [],
          
          // Sensitive info (requires approval)
          emergencyContacts: profileData.emergencyContacts || [],
          documents: profileData.documents || [],
          backgroundCheck: profileData.backgroundCheck || {},
          ageCareRanges: profileData.ageCareRanges || [],
        });
      } else if (userType === 'parent') {
        // Use existing parent profile API
        response = await authAPI.getProfile();
        const profileData = response?.data || response || {};
        
        setProfileData({
          // Basic info (always visible)
          name: profileData.name || '',
          email: profileData.email || '',
          
          // Private info (controlled sharing)
          phone: profileData.phone || profileData.contact || '',
          profileImage: profileData.profileImage || profileData.avatar || '',
          location: profileData.location || '',
          
          // Sensitive info (requires approval)
          emergencyContact: profileData.emergencyContact || '',
          childMedicalInfo: profileData.childMedicalInfo || '',
          childAllergies: profileData.childAllergies || '',
          childBehaviorNotes: profileData.childBehaviorNotes || '',
          financialInfo: profileData.financialInfo || '',
        });
      }
      
      return profileData;
    } catch (error) {
      console.error('Error loading profile data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Update profile data using existing update methods
  const updateProfileData = async (updates, userType = 'caregiver') => {
    try {
      setLoading(true);
      let response;

      if (userType === 'caregiver') {
        // Use existing caregiver update API from EditCaregiverProfile.js
        const payload = {
          name: updates.name,
          email: updates.email,
          phone: updates.phone,
          bio: updates.bio,
          experience: Number(updates.experience) || 0,
          hourlyRate: Number(updates.hourlyRate) || undefined,
          skills: Array.isArray(updates.skills) ? updates.skills : [],
          certifications: Array.isArray(updates.certifications) ? updates.certifications : [],
          profileImage: updates.profileImage || undefined,
        };

        response = await caregiversAPI.updateMyProfile(payload);
      } else if (userType === 'parent') {
        // Use existing parent update API
        response = await authAPI.updateProfile(updates);
      }

      // Update local state
      setProfileData(prev => ({ ...prev, ...updates }));
      return response;
    } catch (error) {
      console.error('Error updating profile data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Get filtered data based on privacy settings and permissions
  const getFilteredProfileDataInternal = async (targetUserId, viewerUserId, viewerType = 'caregiver') => {
    return await getFilteredProfileData(targetUserId, viewerUserId, viewerType, profileData);
  };

  // Upload profile image using existing method
  const uploadProfileImage = async (imageUri, mimeType = 'image/jpeg') => {
    try {
      setLoading(true);

      // Use existing image upload from EditCaregiverProfile.js
      const response = await authAPI.uploadProfileImageBase64(imageUri, mimeType);
      const imageUrl = response?.data?.url || response?.url;

      if (imageUrl) {
        // Update profile data with new image
        await updateProfileData({ profileImage: imageUrl });
        return imageUrl;
      }

      throw new Error('Failed to get image URL from response');
    } catch (error) {
      console.error('Error uploading profile image:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    profileData,
    loading,
    dataClassification,
    DATA_LEVELS,
    loadProfileData,
    updateProfileData,
    getFilteredProfileData: getFilteredProfileDataInternal,
    uploadProfileImage,
  };

  return (
    <ProfileDataContext.Provider value={value}>
      {children}
    </ProfileDataContext.Provider>
  );
};

export default ProfileDataProvider;

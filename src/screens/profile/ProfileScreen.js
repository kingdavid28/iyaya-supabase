import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useTheme, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { userService } from '../../services/userService';
import { authAPI } from '../../services';
import ProfileForm from '../../components/forms/ProfileForm';
import { useAuth } from '../../contexts/AuthContext';
import { tokenManager } from '../../utils/tokenManager';
import {
  ProfileHeaderSkeleton,
  ProfileCardSkeleton
} from '../../components/profile/ProfileSkeletons';
import { trackProfileView, trackEvent } from '../../utils/analytics';

const ProfileScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [initialValues, setInitialValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    skills: [],
    rating: 0,
    documents: {
      id: '',
      policeClearance: '',
      resume: ''
    },
    verificationStatus: 'unverified'
  });

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Track profile view
        trackProfileView(user?.role || 'unknown');
        
        const profile = await userService.getProfile(user.uid);
        setInitialValues(prev => ({
          ...prev,
          ...profile,
          documents: {
            id: profile?.documents?.id || '',
            policeClearance: profile?.documents?.policeClearance || '',
            resume: profile?.documents?.resume || ''
          },
          skills: profile?.skills || [],
          verificationStatus: profile?.verificationStatus || 'unverified'
        }));
      } catch (error) {
        console.error('Failed to load profile:', error);
        Alert.alert('Error', 'Failed to load profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user.uid]);

  const handleSubmit = async (formData) => {
    try {
      setLoading(true);
      console.log('Updating profile with data:', formData);
      
      // Get fresh Firebase token
      const token = await tokenManager.getValidToken(true);
      if (token) {
        console.log('✅ Fresh token obtained');
      } else {
        console.error('❌ Failed to get valid token');
        throw new Error('Authentication required. Please log in again.');
      }
      
      // Prepare the profile data for update
      const profileData = {
        name: `${formData.firstName} ${formData.middleInitial ? formData.middleInitial + '. ' : ''}${formData.lastName}`.trim(),
        contact: formData.phone,
        location: formData.location ? 
          (typeof formData.location === 'string' ? formData.location : 
           `${formData.location.city || ''}, ${formData.location.state || ''}, ${formData.location.country || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',')) 
          : '',
        ...formData,
        updatedAt: new Date().toISOString()
      };
      
      // If verification status is changing to pending, update it
      if (formData.documents?.id && formData.documents?.policeClearance) {
        profileData.verificationStatus = 'pending';
      }
      
      // Use authAPI.updateProfile which handles token refresh automatically
      const result = await authAPI.updateProfile(profileData);
      console.log('✅ Profile update result:', result);
      
      // Track profile update
      trackEvent('profile_updated', {
        user_role: user?.role,
        verification_status: profileData.verificationStatus,
        has_documents: !!(formData.documents?.id && formData.documents?.policeClearance),
        skills_count: formData.skills?.length || 0
      });
      
      Alert.alert(
        'Success',
        profileData.verificationStatus === 'pending' 
          ? 'Profile updated and submitted for verification!' 
          : 'Profile updated successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('❌ Profile update failed:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to update profile. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading && !initialValues.firstName) {
    return (
      <ScrollView
        style={styles.skeletonContainer}
        contentContainerStyle={styles.skeletonContent}
      >
        <ProfileHeaderSkeleton />
        <ProfileCardSkeleton lines={4} />
        <ProfileCardSkeleton lines={5} />
        <ProfileCardSkeleton lines={2} />
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ProfileForm 
        onSubmit={handleSubmit}
        initialValues={initialValues}
        isCaregiver={user.role === 'caregiver'}
      />
      
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});

export default ProfileScreen;

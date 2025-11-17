import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, TextInput } from 'react-native-paper';
import ProfileImage from '../components/ui/feedback/ProfileImage';
import { getCurrentAPIURL } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { supabaseService } from '../services/supabase';
import { processImageForUpload } from '../utils/imageUtils';
import { getCurrentDeviceLocation } from '../utils/locationUtils';

const ParentProfile = ({ navigation }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', location: '', profileImage: '' });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);

      // Retry logic for network errors
      let retries = 3;
      let lastError;

      while (retries > 0) {
        try {
          const result = await supabaseService.getProfile(user?.id || user?.uid);
          const profileData = result?.data || result;
          if (!profileData) {
            throw new Error('No profile data received');
          }
          setProfile(profileData);

          // Initialize edit form with current data
          // Initialize edit form with current data - will be processed by getImageUrl later
          const currentImage = profileData.profile_image || profileData.profileImage || profileData.avatar || profileData.imageUrl || user?.profileImage || user?.avatar || '';
          setEditForm({
            name: profileData.name || user?.name || '',
            phone: typeof profileData.phone === 'string' ? profileData.phone : '',
            location: typeof profileData.location === 'string' ? profileData.location : (profileData.location?.street || profileData.address || ''),
            profileImage: currentImage
          });
          return;
        } catch (error) {
          lastError = error;
          retries--;

          if (error.code === 'NETWORK_ERROR' && retries > 0) {
            console.log(`Network error loading profile, retrying... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          throw error;
        }
      }

      throw lastError;
    } catch (error) {
      console.error('Failed to load profile:', error);

      // Use fallback data from user context if available
      if (user) {
        const fallbackProfile = {
          name: user.name || '',
          email: user.email || '',
          phone: '',
          location: '',
          profileImage: ''
        };
        setProfile(fallbackProfile);
        const currentImage = fallbackProfile.profile_image || fallbackProfile.profileImage || user?.profileImage || user?.avatar || '';
        setEditForm({
          name: fallbackProfile.name,
          phone: typeof fallbackProfile.phone === 'string' ? fallbackProfile.phone : '',
          location: typeof fallbackProfile.location === 'string' ? fallbackProfile.location : '',
          profileImage: currentImage
        });
      }

      let errorMessage = 'Failed to load profile. Please try again.';
      if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network connection failed. Using cached data if available.';
      }

      Alert.alert('Connection Issue', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleProfileImageUpload = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType?.Images || 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        setUploading(true);
        const asset = result.assets[0];

        let uploadPayload;
        try {
          const processed = await processImageForUpload(asset.uri, {
            maxWidth: 1024,
            maxHeight: 1024,
            compress: 0.8,
          });
          uploadPayload = processed.base64;
        } catch (processingError) {
          console.warn('Failed to process image before upload, falling back to original asset.', processingError);
          if (asset.base64) {
            uploadPayload = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
          } else {
            throw new Error('Image data not available');
          }
        }

        const response = await supabaseService.uploadProfileImage(user?.id || user?.uid, uploadPayload);
        console.log('Upload response:', response);

        // Handle different response structures
        let imageUrl = null;
        if (response?.data?.url) {
          imageUrl = response.data.url;
        } else if (response?.url) {
          imageUrl = response.url;
        } else if (response?.imageUrl) {
          imageUrl = response.imageUrl;
        } else if (response?.data?.imageUrl) {
          imageUrl = response.data.imageUrl;
        } else if (response?.data?.profileImage) {
          imageUrl = response.data.profileImage;
        } else if (typeof response === 'string') {
          imageUrl = response;
        }

        if (imageUrl) {
          setEditForm(prev => ({ ...prev, profileImage: imageUrl }));
        } else {
          console.error('No image URL in response:', response);
          throw new Error('No image URL returned from server');
        }
      }
    } catch (error) {
      console.error('Profile image upload failed:', error);
      Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  }, []);

  const handleSaveProfile = useCallback(async () => {
    if (!editForm.name.trim()) {
      Alert.alert('Validation Error', 'Name is required.');
      return;
    }

    try {
      setSaving(true);
      const updateData = {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        address: editForm.location.trim(),
        profile_image: editForm.profileImage
      };

      console.log('ParentProfile updating with:', updateData);

      // Retry logic for network errors
      let retries = 3;
      let lastError;

      while (retries > 0) {
        try {
          const result = await supabaseService.updateProfile(user?.id || user?.uid, updateData);
          console.log('ParentProfile update result:', result);
          // Update profile with both server data and our sent data since server doesn't return address
          setProfile(prev => ({
            ...prev,
            ...updateData,
            ...(result?.data || result || {})
          }));
          setEditModalVisible(false);
          Alert.alert('Success', 'Profile updated successfully!');
          return;
        } catch (error) {
          lastError = error;
          retries--;

          if (error.code === 'NETWORK_ERROR' && retries > 0) {
            console.log(`Network error, retrying... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          throw error;
        }
      }

      throw lastError;
    } catch (error) {
      console.error('Failed to update profile:', error);

      let errorMessage = 'Failed to update profile. Please try again.';
      if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network connection failed. Please check your internet connection and try again.';
      }

      Alert.alert('Update Failed', errorMessage);
    } finally {
      setSaving(false);
    }
  }, [editForm]);

  // GPS Location functionality
  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);

      const locationData = await getCurrentDeviceLocation();

      if (locationData && locationData.address) {
        const formattedAddress = `${locationData.address.street || ''} ${locationData.address.city || ''} ${locationData.address.province || ''}`.trim();
        setEditForm(prev => ({ ...prev, location: formattedAddress }));
        Alert.alert('Success', 'Location updated successfully');
      }
    } catch (error) {
      console.error('Location fetch failed:', error);
      Alert.alert('Location Error', error.message || 'Failed to get current location. Please try again.');
    } finally {
      setLocationLoading(false);
    }
  };

  // Helper function to get properly formatted image URL
  const getImageUrl = useCallback((imageUrl) => {
    if (!imageUrl || imageUrl.trim() === '' || imageUrl === 'null') {
      return null;
    }

    // Handle base64 data URLs
    if (imageUrl.startsWith('data:')) {
      return imageUrl;
    }

    // Handle full URLs
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }

    // Handle relative URLs - prepend base URL
    const baseUrl = getCurrentAPIURL().replace('/api', '');
    if (imageUrl.startsWith('/')) {
      return `${baseUrl}${imageUrl}`.replace(/([^:])\/\//g, '$1/');
    } else {
      return `${baseUrl}/uploads/${imageUrl}`.replace(/([^:])\/\//g, '$1/');
    }
  }, []);

  const handleEditPress = useCallback(() => {
    // Get the current profile image from multiple possible sources
    const currentImage = getImageUrl(profile?.profile_image || profile?.profileImage || profile?.avatar || profile?.imageUrl || user?.profileImage || user?.avatar || '');

    setEditForm({
      name: profile?.name || user?.name || '',
      phone: typeof profile?.phone === 'string' ? profile?.phone : '',
      location: typeof profile?.location === 'string' ? profile?.location : (profile?.location?.street || profile?.address || ''),
      profileImage: currentImage
    });
    setEditModalVisible(true);
  }, [profile, user, getImageUrl]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.emptyContainer}>
        <Text>Profile not found</Text>
        <Button onPress={() => navigation.goBack()}>Go Back</Button>
      </View>
    );
  }

  // Helper function to safely render text values
  const safeText = (value, fallback = 'Not provided') => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return value || fallback;
    if (typeof value === 'object') {
      // Handle object cases
      if (value.street) return value.street;
      if (value.address) return value.address;
      return fallback;
    }
    return String(value) || fallback;
  };

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <Card style={styles.headerCard}>
        <Card.Content style={styles.headerContent}>
          <ProfileImage
            imageUrl={getImageUrl(profile.profile_image || profile.profileImage || profile.avatar || profile.imageUrl)}
            size={100}
            style={styles.avatar}
            defaultIconSize={50}
            borderColor="#3b82f6"
            resizeMode="cover"
          />
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{safeText(profile.name || user?.name, 'No name')}</Text>
            <Text style={styles.email}>{safeText(profile.email || user?.email, 'No email')}</Text>
            <Text style={styles.role}>Parent</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Contact Info */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.infoItem}>
            <Ionicons name="mail" size={20} color="#db2777" />
            <Text style={styles.infoText}>{safeText(profile.email || user?.email)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="call" size={20} color="#db2777" />
            <Text style={styles.infoText}>{safeText(profile.phone)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="location" size={20} color="#db2777" />
            <Text style={styles.infoText}>{safeText(profile.location || profile.address)}</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Account Info */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.infoItem}>
            <Ionicons name="person" size={20} color="#db2777" />
            <Text style={styles.infoText}>Role: Parent</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="calendar" size={20} color="#db2777" />
            <Text style={styles.infoText}>
              Member since: {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <View style={styles.buttonRow}>
          <Button
            mode="contained"
            onPress={handleEditPress}
            style={styles.editButton}
            icon="pencil"
          >
            Edit Profile
          </Button>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeIconButton}
          >
            <Ionicons name="close" size={24} color="#db2777" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        onRequestClose={() => !saving && setEditModalVisible(false)}
        transparent
        animationType="slide"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity
                  onPress={() => !saving && setEditModalVisible(false)}
                  style={styles.closeButton}
                  disabled={saving}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Profile Picture Section */}
              <View style={styles.photoSection}>
                <TouchableOpacity
                  onPress={handleProfileImageUpload}
                  disabled={uploading || saving}
                  style={styles.photoContainer}
                  activeOpacity={0.7}
                >
                  <View style={styles.imageWrapper}>
                    {uploading ? (
                      <View style={styles.uploadingContainer}>
                        <ActivityIndicator size="large" color="#db2777" />
                        <Text style={styles.uploadingText}>Uploading...</Text>
                      </View>
                    ) : editForm.profileImage ? (
                      <>
                        <ProfileImage
                          imageUrl={getImageUrl(editForm.profileImage)}
                          size={120}
                          style={styles.profileImageEdit}
                          defaultIconSize={60}
                          resizeMode="cover"
                        />
                        <View style={styles.imageOverlay}>
                          <Ionicons name="camera" size={20} color="white" />
                        </View>
                      </>
                    ) : (
                      <View style={styles.placeholderContainer}>
                        <Ionicons name="camera" size={32} color="#db2777" />
                        <Text style={styles.placeholderText}>Add Photo</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {/* Form Fields */}
              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <TextInput
                    value={editForm.name}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
                    style={[styles.textInput, !editForm.name.trim() && styles.inputError]}
                    placeholder="Enter your full name"
                    disabled={saving}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <TextInput
                    value={editForm.phone}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, phone: text }))}
                    style={styles.textInput}
                    placeholder="Enter your phone number"
                    keyboardType="phone-pad"
                    disabled={saving}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.locationHeader}>
                    <Text style={styles.inputLabel}>Location</Text>
                    <TouchableOpacity
                      onPress={getCurrentLocation}
                      disabled={locationLoading || saving}
                      style={styles.gpsButton}
                    >
                      {locationLoading ? (
                        <ActivityIndicator size="small" color="#db2777" />
                      ) : (
                        <Ionicons name="location" size={16} color="#db2777" />
                      )}
                      <Text style={styles.gpsButtonText}>
                        {locationLoading ? 'Getting...' : 'Use GPS'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    value={editForm.location}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, location: text }))}
                    style={styles.textInput}
                    placeholder="Enter your location or use GPS"
                    disabled={saving}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            </ScrollView>

            {/* Fixed Bottom Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.cancelButtonNew}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveProfile}
                style={[styles.saveButtonNew, (!editForm.name.trim() || saving) && styles.saveButtonDisabled]}
                disabled={!editForm.name.trim() || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
    padding: 16,
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#db2777',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: '#db2777',
    fontWeight: '500',
  },
  card: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#db2777',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  actionButtons: {
    padding: 16,
  },
  editButton: {
    backgroundColor: '#db2777',
    marginBottom: 16,
    flex: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginBottom: 30,
    maxHeight: '90%',
    minHeight: '60%',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  photoContainer: {
    position: 'relative',
  },
  imageWrapper: {
    position: 'relative',
  },
  profileImageEdit: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f8f9fa',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#db2777',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  placeholderContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: '#db2777',
    marginTop: 4,
    fontWeight: '500',
  },
  uploadingContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#db2777',
  },
  uploadingText: {
    fontSize: 12,
    color: '#db2777',
    marginTop: 8,
    fontWeight: '500',
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#1f2937',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#ffffff',
    gap: 12,
  },
  cancelButtonNew: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButtonNew: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#db2777',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  closeIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#db2777',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fdf2f8',
    borderWidth: 1,
    borderColor: '#f3e8ff',
  },
  gpsButtonText: {
    fontSize: 12,
    color: '#db2777',
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default ParentProfile;
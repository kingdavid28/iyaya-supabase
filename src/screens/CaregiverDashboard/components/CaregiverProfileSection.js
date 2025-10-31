import React from 'react';
import { View, Text, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProfileImage from '../../../components/ui/feedback/ProfileImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../../contexts/AuthContext';
import { calculateAge } from '../../../utils/dateUtils';
import { useNavigation } from '@react-navigation/native';
const CaregiverProfileSection = ({ profile, activeTab }) => {
  const { user } = useAuth();
  const navigation = useNavigation();
  
  const displayName = profile?.name || user?.name;
  const displayLocation = profile?.location || profile?.address || user?.address || 'Location not set';

  const handleEditProfile = () => {
    navigation.navigate('EnhancedCaregiverProfileWizard', {
      isEdit: true,
      existingProfile: profile
    });
  };

  if (Platform.OS === 'web' || activeTab !== 'dashboard') {
    return null;
  }

  return (
    <View style={styles.profileContainer}>
      <LinearGradient
        colors={["#f8fafc", "#f1f5f9"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.profileCard}
      >
        <View style={styles.profileContent}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditProfile}
          >
            <Ionicons name="pencil" size={16} color="#3b82f6" />
          </TouchableOpacity>
          <View style={styles.leftSection}>
            <ProfileImage
              imageUrl={profile?.profile_image || profile?.imageUrl || profile?.profileImage || profile?.image || profile?.photoUrl || user?.profileImage || user?.avatar}
              size={120}
              style={styles.profileImageContainer}
              borderColor="#3b82f6"
              defaultIconSize={40}
            />
            <Text style={styles.welcomeText}>
              {displayName ? `Welcome back, ${displayName}! 👋` : 'Welcome back! 👋'}
            </Text>
            <View style={styles.profileDetails}>
              <Text style={styles.profileDetailText}>📧 {user?.email || 'No email'}</Text>
              {(profile?.phone || profile?.contact_phone) && (
              <Text style={styles.profileDetailText}>📱 {String(profile.phone || profile.contact_phone)}</Text>
              )}
              <Text style={styles.profileDetailText}>📍 {displayLocation}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = {
  profileContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  profileCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  editButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
  leftSection: {
    alignItems: 'center',
    flex: 1,
  },
  profileImageContainer: {
    marginBottom: 12,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#3b82f6',
  },
  defaultProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 3,
    borderColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    lineHeight: 24,
    textAlign: 'center',
  },
  profileDetails: {
    gap: 4,
    alignItems: 'center',
  },
  profileDetailText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    lineHeight: 20,
  },

};

export default CaregiverProfileSection;
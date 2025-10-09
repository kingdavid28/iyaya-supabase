import React from 'react';
import { View, Text, Platform, TouchableOpacity } from 'react-native';
import { X, Edit2 } from 'lucide-react-native';
import ProfileImage from '../../../components/ui/feedback/ProfileImage';
import { LinearGradient } from 'expo-linear-gradient';
import { getCurrentSocketURL } from '../../../config/api';
import { useAuth } from '../../../contexts/AuthContext';
import { calculateAge, formatBirthDate } from '../../../utils/dateUtils';

const MobileProfileSection = ({ greetingName, profileImage, profileContact, profileLocation, activeTab, userData, onClose, navigation }) => {
  const { user } = useAuth();
  

  
  // Use userData prop if available, fallback to user context
  const profileData = userData || user;
  
  const userAge = profileData?.birthDate ? calculateAge(profileData.birthDate) : null;
  const fullName = profileData?.name || profileData?.displayName || greetingName;
  const displayName = profileData?.firstName && profileData?.lastName 
    ? `${profileData.firstName} ${profileData.middleInitial ? profileData.middleInitial + '. ' : ''}${profileData.lastName}`.trim()
    : fullName;
  
  // Get the most current profile image - prioritize profileImage prop which comes from parent dashboard state
  const currentProfileImage = profileImage || profileData?.profileImage || profileData?.profile_image || profileData?.avatar || profileData?.imageUrl;
  
  console.log('🖼️ MobileProfileSection - Profile image sources:', {
    profileImage,
    'profileData?.profileImage': profileData?.profileImage,
    'profileData?.profile_image': profileData?.profile_image,
    'profileData?.avatar': profileData?.avatar,
    'profileData?.imageUrl': profileData?.imageUrl,
    currentProfileImage
  });


  // Only render on mobile platforms
  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <View style={styles.mobileProfileContainer}>
      <LinearGradient
        colors={["#f8fafc", "#f1f5f9"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.mobileProfileCard}
      >
        <View style={styles.mobileProfileHeader}>
          <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('ParentProfile')}>
            <Edit2 size={18} color="#db2777" />
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={18} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.mobileProfileContent}>
          <View style={styles.mobileLeftSection}>
            <ProfileImage 
              imageUrl={currentProfileImage}
              size={80}
              borderColor="#db2777"
              style={styles.mobileProfileImageContainer}
            />
            <Text style={styles.mobileWelcomeText}>
              {displayName ? `Welcome back, ${displayName}! 👋` : 'Welcome back! 👋'}
            </Text>
            <View style={styles.mobileProfileDetails}>
              {userAge && typeof userAge === 'number' && (
                <Text style={styles.mobileProfileDetailText}>🎂 {userAge} years old</Text>
              )}
              <Text style={styles.mobileProfileDetailText}>📧 {String(profileData?.email || profileContact || 'No email')}</Text>
              {profileData?.phone && (
                <Text style={styles.mobileProfileDetailText}>📱 {String(profileData.phone)}</Text>
              )}
              <Text style={styles.mobileProfileDetailText}>📍 {String(profileLocation || profileData?.location || profileData?.address || 'Location not set')}</Text>
              {profileData?.role === 'caregiver' && profileData?.caregiverProfile?.hourlyRate && (
                <Text style={styles.mobileProfileDetailText}>💰 ₱{profileData.caregiverProfile.hourlyRate}/hr</Text>
              )}
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = {
  mobileProfileContainer: {
    paddingHorizontal: 1,
    paddingVertical: 5,
    backgroundColor: 'transparent',
  },
  mobileProfileHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  editButton: {
    width: 36,
    height: 36,
    minWidth: 36,
    minHeight: 36,
    maxWidth: 36,
    maxHeight: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(219, 39, 119, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  closeButton: {
    width: 36,
    height: 36,
    minWidth: 36,
    minHeight: 36,
    maxWidth: 36,
    maxHeight: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mobileProfileCard: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  mobileProfileContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mobileLeftSection: {
    alignItems: 'center',
    flex: 1,
  },
  mobileProfileImageContainer: {
    marginBottom: 12,
  },
  mobileProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#db2777',
  },
  mobileDefaultProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 3,
    borderColor: '#db2777',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileProfileInfo: {
    flex: 1,
  },
  mobileWelcomeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    lineHeight: 24,
    textAlign: 'center',
  },
  mobileProfileDetails: {
    gap: 4,
    alignItems: 'center',
  },
  mobileProfileDetailText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    lineHeight: 20,
  },
};

export default MobileProfileSection;

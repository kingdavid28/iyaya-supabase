import { LinearGradient } from 'expo-linear-gradient';
import { Edit2, X } from 'lucide-react-native';
import React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import ProfileImage from '../../../components/ui/feedback/ProfileImage';
import { useAuth } from '../../../contexts/AuthContext';
import { calculateAge } from '../../../utils/dateUtils';

const MobileProfileSection = ({ greetingName, profileImage, profileContact, profileLocation, activeTab, userData, onClose, navigation }) => {
  const { user, getUserProfile } = useAuth();
  const [profileData, setProfileData] = React.useState(userData || user);

  React.useEffect(() => {
    const fetchProfile = async () => {
      if (!userData && user?.id) {
        try {
          const freshProfile = await getUserProfile();
          if (freshProfile) {
            setProfileData({ ...user, ...freshProfile });
          }
        } catch (error) {
          console.warn('Failed to fetch fresh profile:', error);
        }
      }
    };

    fetchProfile();
  }, [user?.id, userData, getUserProfile]);

  React.useEffect(() => {
    if (userData) {
      setProfileData(userData);
    }
  }, [userData]);

  console.log('📱 MobileProfileSection - Profile data:', {
    hasUserData: !!userData,
    hasUser: !!user,
    profileDataKeys: profileData ? Object.keys(profileData) : [],
    name: profileData?.name,
    firstName: profileData?.firstName || profileData?.first_name,
    lastName: profileData?.lastName || profileData?.last_name,
    email: profileData?.email,
    role: profileData?.role
  });

  const userAge = profileData?.birthDate || profileData?.birth_date ? calculateAge(profileData.birthDate || profileData.birth_date) : null;
  const fullName = profileData?.name || profileData?.displayName || greetingName;
  const displayName = profileData?.firstName || profileData?.first_name || profileData?.lastName || profileData?.last_name
    ? `${profileData.firstName || profileData.first_name || ''} ${profileData.middleInitial ? profileData.middleInitial + '. ' : ''}${profileData.lastName || profileData.last_name || ''}`.trim()
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
              size={120}
              borderColor="#db2777"
              style={styles.mobileProfileImageContainer}
              resizeMode="cover"
            />
            <Text style={styles.mobileWelcomeText}>
              {displayName ? `Welcome back, ${displayName}! 👋` : 'Welcome back! 👋'}
            </Text>
            <View style={styles.mobileProfileDetails}>
              {userAge && typeof userAge === 'number' && (
                <Text style={styles.mobileProfileDetailText}>🎂 {userAge} years old</Text>
              )}
              <Text style={styles.mobileProfileDetailText}>📧 {String(profileData?.email || profileContact || 'No email')}</Text>
              {(profileData?.phone || profileData?.contact_phone) && (
                <Text style={styles.mobileProfileDetailText}>📱 {String(profileData.phone || profileData.contact_phone)}</Text>
              )}
              <Text style={styles.mobileProfileDetailText}>📍 {String(profileLocation || profileData?.location || profileData?.address || 'Location not set')}</Text>
              {profileData?.role === 'parent' && profileData?.children?.length > 0 && (
                <Text style={styles.mobileProfileDetailText}>👶 {profileData.children.length} child{profileData.children.length > 1 ? 'ren' : ''}</Text>
              )}
              {profileData?.role === 'caregiver' && (profileData?.hourlyRate || profileData?.hourly_rate) && (
                <Text style={styles.mobileProfileDetailText}>💰 ₱{profileData.hourlyRate || profileData.hourly_rate}/hr</Text>
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

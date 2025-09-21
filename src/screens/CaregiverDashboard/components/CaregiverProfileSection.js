import React from 'react';
import { View, Text, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProfileImage from '../../../components/ui/feedback/ProfileImage';
import { LinearGradient } from 'expo-linear-gradient';
import { getCurrentSocketURL } from '../../../config/api';
import { useAuth } from '../../../contexts/AuthContext';
import { calculateAge } from '../../../utils/dateUtils';
import { __DEV__ } from '../../../config/constants';
import { useNavigation } from '@react-navigation/native';

const CaregiverProfileSection = ({ profile, activeTab }) => {
  const { user } = useAuth();
  const navigation = useNavigation();
  
  const userAge = user?.birthDate ? calculateAge(user.birthDate) : null;
  const caregiverName = profile?.name || user?.name;
  const displayName = caregiverName;

  const handleEditProfile = () => {
    navigation.navigate('EnhancedCaregiverProfileWizard', { 
      isEdit: true, 
      existingProfile: profile 
    });
  };



  // Only render on mobile platforms and Dashboard tab
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
              imageUrl={profile?.imageUrl || profile?.profileImage || profile?.image || profile?.photoUrl}
              size={80}
              style={styles.profileImageContainer}
            />
            <Text style={styles.welcomeText}>
              {displayName ? `Welcome back, ${displayName}! 👋` : 'Welcome back! 👋'}
            </Text>
            <View style={styles.profileDetails}>
              {userAge ? (
                <Text style={styles.profileDetailText}>🎂 {userAge} years old</Text>
              ) : null}
              <Text style={styles.profileDetailText}>📧 {user?.email || 'No email'}</Text>
              {user?.phone ? (
                <Text style={styles.profileDetailText}>📱 {user.phone}</Text>
              ) : null}
              <Text style={styles.profileDetailText}>📍 {profile?.location || (profile?.address ? `${profile.address.city || ''}${profile.address.city && profile.address.province ? ', ' : ''}${profile.address.province || ''}` : user?.address?.street || 'Location not set')}</Text>
              {profile?.hourlyRate ? (
                <Text style={styles.profileDetailText}>💰 ₱{profile.hourlyRate}/hr</Text>
              ) : null}
              {profile?.experience ? (
                <Text style={styles.profileDetailText}>
                  ⭐ {typeof profile.experience === 'object' 
                    ? `${profile.experience.years || 0} years experience` 
                    : profile.experience}
                </Text>
              ) : null}
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
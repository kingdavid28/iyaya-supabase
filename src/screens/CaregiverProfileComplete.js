import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
// Removed old import - using updated Supabase service
import { getCurrentSocketURL } from '../config/api';
import { supabase } from '../config/supabase';

const CaregiverProfileComplete = ({ navigation, route }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = async () => {
    if (!user?.id) {
      console.log('❌ No user ID available');
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔄 Loading profile for user:', user.id);
      
      // Get user data from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      console.log('👤 User data:', userData);
      console.log('❌ User error:', userError);
      
      if (userError) throw userError;
      
      // Get caregiver profile data from caregiver_profiles table
      const { data: caregiverData, error: caregiverError } = await supabase
        .from('caregiver_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      console.log('👨‍💼 Caregiver data:', caregiverData);
      console.log('❌ Caregiver error:', caregiverError);
      
      // The issue is that EnhancedCaregiverProfileWizard saves complex data but it's not being stored properly
      // Let's check if the data exists in any format and extract it
      
      // Try to get complex data from any available source
      const getComplexData = (field) => {
        // Check caregiver_profiles table first
        if (caregiverData?.[field] && Array.isArray(caregiverData[field]) && caregiverData[field].length > 0) {
          return caregiverData[field];
        }
        // Check snake_case version
        const snakeField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (caregiverData?.[snakeField] && Array.isArray(caregiverData[snakeField]) && caregiverData[snakeField].length > 0) {
          return caregiverData[snakeField];
        }
        // Check users table
        if (userData?.[field] && Array.isArray(userData[field]) && userData[field].length > 0) {
          return userData[field];
        }
        if (userData?.[snakeField] && Array.isArray(userData[snakeField]) && userData[snakeField].length > 0) {
          return userData[snakeField];
        }
        return [];
      };
      
      const combinedProfile = {
        // Basic info from users table
        name: userData?.name,
        bio: userData?.bio,
        profileImage: userData?.profile_image,
        skills: userData?.skills || [],
        hourlyRate: userData?.hourly_rate,
        
        // Experience from caregiver_profiles table (preferred) or users table (fallback)
        experience: caregiverData?.experience ? 
          (typeof caregiverData.experience === 'string' ? 
            { description: caregiverData.experience } : 
            caregiverData.experience
          ) : 
          { description: userData?.experience },
        
        // Complex data with comprehensive fallback
        certifications: getComplexData('certifications'),
        availability: caregiverData?.availability || userData?.availability || { days: [] },
        ageCareRanges: getComplexData('ageCareRanges'),
        emergencyContacts: getComplexData('emergencyContacts'),
        backgroundCheckStatus: caregiverData?.background_check_status
      };
      
      console.log('📊 Combined profile data:', combinedProfile);
      setProfile(combinedProfile);
    } catch (error) {
      console.error('❌ Profile load error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const getCompletionPercentage = () => {
    if (!profile) return 0;
    let completed = 0;
    const total = 10;
    
    if (profile.name) completed++;
    if (profile.bio) completed++;
    if (profile.profileImage) completed++;
    if (profile.skills?.length > 0) completed++;
    if (profile.experience?.description) completed++;
    if (profile.hourlyRate) completed++;
    if (profile.certifications?.length > 0) completed++;
    if (profile.availability?.days?.length > 0) completed++;
    if (profile.emergencyContacts?.length > 0) completed++;
    if (profile.ageCareRanges?.length > 0) completed++;
    
    return Math.round((completed / total) * 100);
  };

  const ProfileSection = ({ title, children, icon, isComplete = true }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={20} color={isComplete ? '#4CAF50' : '#FF9800'} />
        <Text style={styles.sectionTitle}>{title}</Text>
        {!isComplete && <Ionicons name="warning" size={16} color="#FF9800" />}
      </View>
      {children}
    </View>
  );

  const BestPracticesTip = ({ tip }) => (
    <View style={styles.tipContainer}>
      <Ionicons name="bulb" size={16} color="#2196F3" />
      <Text style={styles.tipText}>{tip}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  const completionPercentage = getCompletionPercentage();

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate('EnhancedCaregiverProfileWizard', { isEdit: true, existingProfile: profile })} style={styles.editButton}>
          <Ionicons name="create" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>

      {/* Profile Completion */}
      <View style={styles.completionCard}>
        <Text style={styles.completionTitle}>Profile Completion</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${completionPercentage}%` }]} />
        </View>
        <Text style={styles.completionText}>{completionPercentage}% Complete</Text>
        {completionPercentage < 100 && (
          <BestPracticesTip tip="Complete your profile to increase visibility and trust with families" />
        )}
      </View>

      {/* Basic Information */}
      <ProfileSection 
        title="Basic Information" 
        icon="person" 
        isComplete={profile?.name && profile?.bio && profile?.profileImage}
      >
        <View style={styles.basicInfo}>
          <View style={styles.profileImageContainer}>
            {profile?.profileImage ? (
              <Image 
                source={{ 
                  uri: profile.profileImage.startsWith('/') 
                    ? `${getCurrentSocketURL() || ''}${profile.profileImage}` 
                    : profile.profileImage
                }}
                style={styles.profileImage}
                onError={() => console.log('Profile image load error')}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="person" size={40} color="#9CA3AF" />
              </View>
            )}
          </View>
          <View style={styles.basicDetails}>
            <Text style={styles.name}>{profile?.name || 'Add your name'}</Text>
            <Text style={styles.bio}>{profile?.bio || 'Add a professional bio'}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.rating}>{profile?.rating || '0.0'} ({profile?.reviewCount || 0} reviews)</Text>
            </View>
          </View>
        </View>
        {(!profile?.name || !profile?.bio) && (
          <BestPracticesTip tip="Add a professional photo and compelling bio to make a great first impression" />
        )}
      </ProfileSection>

      {/* Skills & Experience */}
      <ProfileSection 
        title="Skills & Experience" 
        icon="school" 
        isComplete={profile?.skills?.length > 0 && profile?.experience?.description}
      >
        <View style={styles.skillsContainer}>
          <Text style={styles.subTitle}>Skills</Text>
          <View style={styles.skillsList}>
            {profile?.skills?.map((skill, index) => (
              <View key={index} style={styles.skillTag}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            )) || <Text style={styles.emptyText}>No skills added</Text>}
          </View>
        </View>
        
        <View style={styles.experienceContainer}>
          <Text style={styles.subTitle}>Experience</Text>
          {profile?.experience?.years || profile?.experience?.months ? (
            <Text style={styles.experienceText}>
              {profile.experience.years || 0} years, {profile.experience.months || 0} months
            </Text>
          ) : null}
          <Text style={styles.experienceDescription}>
            {profile?.experience?.description || 'Add your experience description'}
          </Text>
        </View>
        
        {(!profile?.skills?.length || !profile?.experience?.description) && (
          <BestPracticesTip tip="Highlight specific childcare skills and detailed experience to stand out" />
        )}
      </ProfileSection>

      {/* Rates & Availability */}
      <ProfileSection 
        title="Rates & Availability" 
        icon="time" 
        isComplete={profile?.hourlyRate && profile?.availability?.days?.length > 0}
      >
        <View style={styles.ratesContainer}>
          <Text style={styles.subTitle}>Hourly Rate</Text>
          <Text style={styles.hourlyRate}>₱{profile?.hourlyRate || '0'}/hour</Text>
        </View>
        
        <View style={styles.availabilityContainer}>
          <Text style={styles.subTitle}>Available Days</Text>
          <View style={styles.daysList}>
            {profile?.availability?.days?.map((day, index) => (
              <View key={index} style={styles.dayTag}>
                <Text style={styles.dayText}>{day}</Text>
              </View>
            )) || <Text style={styles.emptyText}>No availability set</Text>}
          </View>
        </View>
        
        {(!profile?.hourlyRate || !profile?.availability?.days?.length) && (
          <BestPracticesTip tip="Set competitive rates and clear availability to get more bookings" />
        )}
      </ProfileSection>

      {/* Age Care Ranges */}
      <ProfileSection 
        title="Age Care Specialization" 
        icon="heart" 
        isComplete={profile?.ageCareRanges?.length > 0}
      >
        <View style={styles.ageRangesList}>
          {profile?.ageCareRanges?.map((range, index) => (
            <View key={index} style={styles.ageRangeTag}>
              <Text style={styles.ageRangeText}>{range}</Text>
            </View>
          )) || <Text style={styles.emptyText}>No age ranges specified</Text>}
        </View>
        
        {!profile?.ageCareRanges?.length && (
          <BestPracticesTip tip="Specify age ranges you're comfortable with to match with suitable families" />
        )}
      </ProfileSection>

      {/* Certifications */}
      <ProfileSection 
        title="Certifications" 
        icon="ribbon" 
        isComplete={profile?.certifications?.length > 0}
      >
        {profile?.certifications?.length > 0 ? (
          profile.certifications.map((cert, index) => (
            <View key={index} style={styles.certificationItem}>
              <View style={styles.certificationHeader}>
                <Text style={styles.certificationName}>
                  {typeof cert === 'string' ? cert : (cert?.name || cert)}
                </Text>
                {cert?.verified && <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />}
              </View>
              {cert?.issuedBy && <Text style={styles.certificationIssuer}>Issued by: {cert.issuedBy}</Text>}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No certifications added</Text>
        )}
        
        <BestPracticesTip tip="Add relevant certifications like First Aid, CPR, or childcare training to build trust" />
      </ProfileSection>

      {/* Emergency Contacts */}
      <ProfileSection 
        title="Emergency Contacts" 
        icon="call" 
        isComplete={profile?.emergencyContacts?.length > 0}
      >
        {profile?.emergencyContacts?.length > 0 ? (
          profile.emergencyContacts.map((contact, index) => (
            <View key={index} style={styles.contactItem}>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Text style={styles.contactRelation}>{contact.relationship}</Text>
              <Text style={styles.contactPhone}>{contact.phone}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No emergency contacts added</Text>
        )}
        
        {!profile?.emergencyContacts?.length && (
          <BestPracticesTip tip="Add emergency contacts to provide families with peace of mind" />
        )}
      </ProfileSection>

      {/* Best Practices Summary */}
      <View style={styles.bestPracticesCard}>
        <Text style={styles.bestPracticesTitle}>Profile Best Practices</Text>
        <BestPracticesTip tip="Upload a professional, smiling photo" />
        <BestPracticesTip tip="Write a detailed bio highlighting your passion for childcare" />
        <BestPracticesTip tip="List specific skills and certifications" />
        <BestPracticesTip tip="Set competitive and fair hourly rates" />
        <BestPracticesTip tip="Keep your availability updated" />
        <BestPracticesTip tip="Respond to messages promptly" />
        <BestPracticesTip tip="Maintain a 4.5+ star rating" />
      </View>
    </ScrollView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    padding: 8,
  },
  completionCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  completionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  completionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
  },
  basicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  basicDetails: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  subTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  skillsContainer: {
    marginBottom: 16,
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillTag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    margin: 2,
  },
  skillText: {
    fontSize: 12,
    color: '#1976d2',
  },
  experienceContainer: {
    marginBottom: 16,
  },
  experienceText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  experienceDescription: {
    fontSize: 14,
    color: '#666',
  },
  ratesContainer: {
    marginBottom: 16,
  },
  hourlyRate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  availabilityContainer: {
    marginBottom: 16,
  },
  daysList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayTag: {
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    margin: 2,
  },
  dayText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  ageRangesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  ageRangeTag: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    margin: 2,
  },
  ageRangeText: {
    fontSize: 12,
    color: '#f57c00',
  },
  certificationItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  certificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  certificationName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  certificationIssuer: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  contactItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  contactRelation: {
    fontSize: 12,
    color: '#666',
  },
  contactPhone: {
    fontSize: 12,
    color: '#2196F3',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#1976d2',
    marginLeft: 8,
    flex: 1,
  },
  bestPracticesCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  bestPracticesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
};

export default CaregiverProfileComplete;
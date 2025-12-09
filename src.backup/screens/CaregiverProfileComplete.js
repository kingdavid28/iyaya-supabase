import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Ionicons } from '@expo/vector-icons';
import {
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
// Removed old import - using updated Supabase service
import RatingsReviewsModal from '../components/ui/modals/RatingsReviewsModal';
import { getCurrentSocketURL } from '../config/api';
import { supabase } from '../config/supabase';
import { reviewService } from '../services';
import {
  PORTFOLIO_CATEGORY_LABELS,
  formatDateDisplay,
  normalizeDocumentEntry,
  normalizePortfolio,
  parseJsonSafe
} from '../utils/profileAssets';
import { normalizeCaregiverReviewsForList } from '../utils/reviews';
import { getRatingStats } from './CaregiverDashboard/utils';

const CaregiverProfileComplete = ({ navigation, route }) => {
  const { user } = useAuth();
  const { caregiverId } = route.params || {};
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRatingsModal, setShowRatingsModal] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);

  // Use caregiverId from params if viewing another caregiver, otherwise use current user
  const profileUserId = caregiverId || user?.id;
  const isViewingOwnProfile = !caregiverId || caregiverId === user?.id;

  const loadProfile = async () => {
    if (!profileUserId) {
      console.log(' No user ID available');
      return;
    }

    try {
      setLoading(true);
      console.log(' Loading profile for user:', profileUserId);

      const parseNullableArray = (rawValue, fallback = []) => {
        if (!rawValue && rawValue !== 0) {
          return fallback;
        }

        const resolved = parseJsonSafe(rawValue);

        if (Array.isArray(resolved)) {
          return resolved;
        }

        if (resolved && typeof resolved === 'object') {
          return resolved;
        }

        return fallback;
      };

      const parseNullableObject = (rawValue, fallback = {}) => {
        if (!rawValue && rawValue !== 0) {
          return fallback;
        }

        const resolved = parseJsonSafe(rawValue);
        if (resolved && typeof resolved === 'object' && !Array.isArray(resolved)) {
          return resolved;
        }

        return fallback;
      };

      const coerceDocument = (doc, index = 0) => normalizeDocumentEntry(doc, index);

      const coercePortfolioImage = (item, index = 0) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const resolvedCategory = item.category || 'other';
        const normalizedCategory = PORTFOLIO_CATEGORY_LABELS[resolvedCategory] ? resolvedCategory : 'other';

        return {
          id: item.id || `${resolvedCategory}-${index}`,
          url: item.url || item.imageUrl || null,
          caption: item.caption || item.description || '',
          category: normalizedCategory,
          categoryLabel: PORTFOLIO_CATEGORY_LABELS[normalizedCategory],
          uploadedAt: formatDateDisplay(item.uploadedAt || item.created_at || item.createdAt),
        };
      };

      const coercePortfolio = (rawPortfolio) => normalizePortfolio(rawPortfolio);

      const coerceName = (userRow) => {
        if (userRow?.name) {
          return userRow.name;
        }

        const first = userRow?.first_name || userRow?.firstName;
        const last = userRow?.last_name || userRow?.lastName;
        const candidate = `${first || ''} ${last || ''}`.trim();
        if (candidate) {
          return candidate;
        }

        if (userRow?.email) {
          return userRow.email.split('@')[0];
        }

        return 'Caregiver';
      };

      const coerceExperience = (rawExperience, fallbackDescription) => {
        if (!rawExperience) {
          return { description: fallbackDescription || '' };
        }

        if (typeof rawExperience === 'string') {
          return { description: rawExperience };
        }

        const resolved = parseNullableObject(rawExperience, {});
        return {
          years: resolved.years || 0,
          months: resolved.months || 0,
          description: resolved.description || fallbackDescription || '',
        };
      };

      // Get user data from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', profileUserId)
        .maybeSingle();

      console.log(' User data:', userData);
      console.log(' User error:', userError);

      if (userError) throw userError;

      // Get caregiver profile data from caregiver_profiles table
      const { data: caregiverData, error: caregiverError } = await supabase
        .from('caregiver_profiles')
        .select('*')
        .eq('user_id', profileUserId)
        .maybeSingle();

      console.log(' Caregiver data:', caregiverData);
      console.log(' Caregiver error:', caregiverError);

      if (caregiverError && caregiverError.code !== 'PGRST116') {
        throw caregiverError;
      }

      const userAddress = parseNullableObject(userData?.address, {});
      const caregiverAddress = parseNullableObject(caregiverData?.address, {});

      const availability = parseNullableObject(
        caregiverData?.availability || userData?.availability,
        { days: [] }
      );

      const combinedProfile = {
        name: coerceName(userData),
        bio: userData?.bio || caregiverData?.bio || '',
        profileImage: userData?.profile_image || userData?.profileImage || caregiverData?.profileImage || null,
        skills: parseNullableArray(caregiverData?.skills || userData?.skills, []),
        hourlyRate: caregiverData?.hourly_rate ?? userData?.hourly_rate ?? null,
        certifications: parseNullableArray(caregiverData?.certifications || userData?.certifications, [])
          .map((cert, index) => {
            if (!cert || typeof cert !== 'object') {
              return cert;
            }
            return {
              ...cert,
              id: cert.id || `cert-${index}`,
              name: cert.name || cert.title || cert.label || 'Certification',
              issuedBy: cert.issuedBy || cert.issuer || cert.organization || null,
              issuedOn: formatDateDisplay(cert.issuedOn || cert.issueDate || cert.issued_at),
              expiresOn: formatDateDisplay(cert.expiresOn || cert.expirationDate || cert.expiryDate),
              verified: Boolean(cert.verified || cert.isVerified || cert.status === 'verified'),
            };
          })
          .filter(Boolean),
        availability,
        ageCareRanges: parseNullableArray(caregiverData?.age_care_ranges || caregiverData?.ageCareRanges || userData?.ageCareRanges, []),
        emergencyContacts: parseNullableArray(caregiverData?.emergency_contacts || caregiverData?.emergencyContacts || userData?.emergencyContacts, [])
          .map((contact, index) => {
            if (!contact || typeof contact !== 'object') {
              return null;
            }
            return {
              id: contact.id || `contact-${index}`,
              name: contact.name || 'Emergency Contact',
              relationship: contact.relationship || contact.relation || 'Relationship not specified',
              phone: contact.phone || contact.phoneNumber || 'No phone provided',
              email: contact.email || null,
            };
          })
          .filter(Boolean),
        backgroundCheckStatus: caregiverData?.background_check_status || caregiverData?.backgroundCheckStatus || null,
        experience: coerceExperience(
          caregiverData?.experience || caregiverData?.experience_details,
          userData?.experience
        ),
        documents: parseNullableArray(caregiverData?.documents || caregiverData?.legal_documents, [])
          .map(coerceDocument)
          .filter(Boolean),
        portfolio: coercePortfolio(caregiverData?.portfolio || userData?.portfolio),
        education: caregiverData?.education || userData?.education || null,
        languages: parseNullableArray(caregiverData?.languages || userData?.languages, []),
        address: {
          street: caregiverAddress.street || caregiverAddress.addressLine1 || userAddress.street || '',
          city: caregiverAddress.city || userAddress.city || '',
          province: caregiverAddress.province || caregiverAddress.state || userAddress.province || '',
          zipCode: caregiverAddress.zipCode || caregiverAddress.zipcode || userAddress.zipCode || '',
          country: caregiverAddress.country || userAddress.country || 'Philippines',
        },
      };

      console.log(' Combined profile data:', combinedProfile);
      setProfile(combinedProfile);
    } catch (error) {
      console.error(' Profile load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = useCallback(async () => {
    if (!profileUserId) {
      return;
    }

    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const data = await reviewService.getReviews(profileUserId, 30, 0);
      const normalized = normalizeCaregiverReviewsForList(Array.isArray(data) ? data : []);
      setReviews(normalized);
    } catch (error) {
      console.error('Failed to load caregiver reviews:', error);
      setReviews([]);
      setReviewsError(error?.message || 'Unable to load reviews right now.');
    } finally {
      setReviewsLoading(false);
    }
  }, [profileUserId]);

  useEffect(() => {
    loadProfile();
  }, [profileUserId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    if (showRatingsModal && !reviewsLoading && reviews.length === 0) {
      loadReviews();
    }
  }, [showRatingsModal, reviews.length, reviewsLoading, loadReviews]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const openRatingsModal = useCallback(() => {
    setShowRatingsModal(true);
  }, []);

  const closeRatingsModal = useCallback(() => {
    setShowRatingsModal(false);
  }, []);

  const ratingStats = useMemo(() => {
    if (reviews.length) {
      const total = reviews.reduce((sum, review) => sum + Number(review?.rating ?? 0), 0);
      const average = reviews.length ? total / reviews.length : 0;
      const ratingDisplay = average > 0 ? average.toFixed(1) : '—';
      const subtitle = reviews.length === 1 ? '1 review' : `${reviews.length} reviews`;
      return {
        rating: average,
        ratingDisplay,
        reviewCount: reviews.length,
        subtitle,
        ctaLabel: 'See feedback'
      };
    }

    return getRatingStats({
      rating: profile?.rating,
      reviewCount: profile?.reviewCount,
      reviews: profile?.reviews
    });
  }, [reviews, profile?.rating, profile?.reviewCount, profile?.reviews]);

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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isViewingOwnProfile ? 'My Profile' : 'Caregiver Profile'}</Text>
        {isViewingOwnProfile && (
          <TouchableOpacity
            onPress={() => navigation.navigate('EnhancedCaregiverProfileWizard', { isEdit: true, existingProfile: profile })}
            style={styles.editButton}
          >
            <Ionicons name="create" size={24} color="#2196F3" />
          </TouchableOpacity>
        )}
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

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
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
              <TouchableOpacity
                style={styles.ratingContainer}
                onPress={openRatingsModal}
                accessibilityRole="button"
                accessibilityLabel="View ratings and reviews"
                accessibilityHint="Opens your ratings and reviews"
                activeOpacity={0.7}
              >
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text style={styles.ratingValueText}>{ratingStats.ratingDisplay}</Text>
                </View>
                <View style={styles.ratingMeta}>
                  <Text style={styles.ratingSubtitle}>{ratingStats.subtitle}</Text>
                  <View style={styles.ratingCTA}>
                    <Text style={styles.ratingCTALabel}>{ratingStats.ctaLabel}</Text>
                    <Ionicons name="chevron-forward" size={14} color="#1D4ED8" />
                  </View>
                </View>
              </TouchableOpacity>
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

      <RatingsReviewsModal
        visible={showRatingsModal}
        onClose={closeRatingsModal}
        caregiverId={profileUserId}
        caregiverName={profile?.name || user?.name}
        currentUserId={user?.id}
        reviews={reviews}
        loading={reviewsLoading}
        error={reviewsError}
        onPreload={loadReviews}
      />
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    marginTop: 30,
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
    gap: 12,
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFF7ED',
  },
  ratingValueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C2410C',
  },
  ratingMeta: {
    flex: 1,
  },
  ratingSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  ratingCTA: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingCTALabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
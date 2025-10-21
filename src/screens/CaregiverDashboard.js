import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from "expo-linear-gradient"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Alert, Dimensions, Image, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View, FlatList } from "react-native"
import { Button, Card, Chip } from "react-native-paper"
import Toast from "../components/ui/feedback/Toast"
import { supabaseService } from '../services/supabase'
import { reviewService } from '../services/supabase/reviewService'
import { useAuth } from "../contexts/AuthContext"
import { useNotificationCounts } from '../hooks/useNotificationCounts';
import { usePrivacy } from '../components/features/privacy/PrivacyManager';
import { useHighlightRequest } from '../hooks/useHighlightRequest';
import { SettingsModal } from '../components/ui/modals/SettingsModal';

import { 
  EmptyState, 
  StatusBadge, 
  ModalWrapper, 
  Card as SharedCard, 
  Button as SharedButton,
  FormInput,
  QuickStat, 
  QuickAction,
  formatDate
} from '../shared/ui';

import {
  authAPI,
  jobsAPI,
  applicationsAPI,
  bookingsAPI,
  childrenAPI,
  getCurrentAPIURL,
  getCurrentSocketURL
} from '../services';

import { styles } from './styles/CaregiverDashboard.styles';
import { useCaregiverDashboard } from '../hooks/useCaregiverDashboard';
import CaregiverProfileSection from './CaregiverDashboard/components/CaregiverProfileSection';
import { PrivacyNotificationModal } from '../components/ui/modals/PrivacyNotificationModal';
import { RequestInfoModal } from '../shared/ui/modals/RequestInfoModal';
import { BookingDetailsModal } from '../shared/ui/modals/BookingDetailsModal';
import { ReviewForm } from '../components/forms/ReviewForm';
import JobsTab, { CaregiverJobCard } from './CaregiverDashboard/JobsTab';
import BookingsTab from './CaregiverDashboard/BookingsTab';
import ApplicationsTab from './CaregiverDashboard/ApplicationsTab';
import MessagesTab from './CaregiverDashboard/components/MessagesTab';
import NotificationsTab from './CaregiverDashboard/components/NotificationsTab';
import ReviewList from '../components/features/profile/ReviewList';
import { useNavigation, useRoute } from '@react-navigation/native';
import { normalizeCaregiverReviewsForList } from '../utils/reviews';
import RatingsReviewsModal from '../components/ui/modals/RatingsReviewsModal';
import {
  SkeletonCard,
  SkeletonBlock,
  SkeletonCircle,
  SkeletonPill
} from '../components/common/SkeletonPlaceholder';

function ApplicationCard({ application, onViewDetails, onMessage }) {
  const navigation = useNavigation();
  const job = application.job || {};


  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {        
      case 'pending': return '#F59E0B';
      case 'accepted': return '#10B981';  
      case 'rejected': return '#EF4444';
      case 'withdrawn': return '#6B7280'; 
      default: return '#9CA3AF';
    }   
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'rejected': return 'Rejected';
      case 'withdrawn': return 'Withdrawn';
      default: return status || 'Unknown';
    }
  };

  const resolveChildrenSummary = () => {
    if (job.childrenSummary) return job.childrenSummary;
    if (Array.isArray(job.children) && job.children.length) {
      const ages = job.childrenAges ? ` (${job.childrenAges})` : '';
      return `${job.children.length} child${job.children.length > 1 ? 'ren' : ''}${ages}`;
    }
    if (job.childrenCount) {
      const ages = job.childrenAges ? ` (${job.childrenAges})` : '';
      return `${job.childrenCount} child${job.childrenCount > 1 ? 'ren' : ''}${ages}`;
    }
    return 'Child details available';
  };

  const resolveSchedule = () => {
    if (job.schedule) return job.schedule;
    if (job.workingHours) return job.workingHours;
    if (job.time) return job.time;
    if (job.startTime && job.endTime) return `${job.startTime} - ${job.endTime}`;
    if (job.start_time && job.end_time) return `${job.start_time} - ${job.end_time}`;
    return 'Schedule to be discussed';
  };

  const appliedDate = application.appliedDate || application.applied_at;
  const formattedAppliedDate = appliedDate ? new Date(appliedDate).toLocaleDateString() : null;

  const detailItems = [
    {
      icon: 'people',
      text: resolveChildrenSummary(),
      backgroundColor: '#F8FAFC',
      color: '#374151'
    },
    {
      icon: 'cash',
      text: `₱${application.hourlyRate || job.hourly_rate || job.hourlyRate || job.rate || 0}/hr`,
      backgroundColor: '#F0FDF4',
      color: '#047857'
    },
    job.location || job.address ? {
      icon: 'location',
      text: job.location || job.address,
      backgroundColor: '#FEF7FF',
      color: '#7C3AED'
    } : null,
    {
      icon: 'time',
      text: resolveSchedule(),
      backgroundColor: '#FFF7ED',
      color: '#EA580C'
    },
    formattedAppliedDate ? {
      icon: 'calendar',
      text: `Applied ${formattedAppliedDate}`,
      backgroundColor: '#E0F2FE',
      color: '#0EA5E9'
    } : null,
  ].filter(Boolean);

  return (
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      marginVertical: 8,
      marginHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
      overflow: 'hidden',
      minHeight: 280
    }}>
      {/* Header with gradient */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 16,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '700',
              color: '#FFFFFF',
              marginBottom: 4
            }} numberOfLines={1}>
              {application.jobTitle || application.job?.title || 'Job Application'}
            </Text>
            <Text style={{
              fontSize: 14,
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: '500'
            }}>
              {application.family || application.job?.family || application.job?.parentName || 'Family'}
            </Text>
          </View>
          <View style={{
            backgroundColor: getStatusColor(application.status),
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            marginLeft: 12,
          }}>
            <Text style={{
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: '600',
            }}>
              {getStatusText(application.status)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Content */}
      <View style={{ padding: 16, flex: 1 }}>
        <View style={{ gap: 10, marginBottom: 18 }}>
          {detailItems.map((item, index) => (
            <View
              key={`${item.icon}-${index}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: item.backgroundColor,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 16,
              }}
            >
              <Ionicons name={item.icon} size={16} color={item.color} />
              <Text
                style={{
                  marginLeft: 10,
                  fontSize: 13,
                  color: item.color,
                  fontWeight: '500',
                  flex: 1,
                  lineHeight: 18,
                }}
                numberOfLines={2}
              >
                {item.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Job Details */}
        {job?.description && (
          <View style={{
            backgroundColor: '#F9FAFB',
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
          }}>
            <Text style={{
              fontSize: 12,
              color: '#6B7280',
              fontWeight: '600',
              marginBottom: 4,
            }}>
              Job Description:
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#374151',
              lineHeight: 20,
            }} numberOfLines={3}>
              {job.description}
            </Text>
          </View>
        )}

        {/* Cover Letter Preview */}
        {(application.coverLetter || application.message) && (
          <View style={{
            backgroundColor: '#F0F9FF',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
          }}>
            <Text style={{
              fontSize: 12,
              color: '#0369A1',
              fontWeight: '600',
              marginBottom: 4,
            }}>
              Your Message:
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#0C4A6E',
              lineHeight: 20,
            }} numberOfLines={3}>
              {application.coverLetter || application.message || 'No message provided'}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 'auto' }}>
          <Pressable
            onPress={() => {
              if (!onViewDetails) return;
              const enriched = {
                ...application,
                coverLetter: application.coverLetter || application.message || '',
                message: application.message || application.coverLetter || '',
                job: {
                  ...job,
                  title: job.title || application.jobTitle || application.job_title,
                  description: job.description || application.job?.description,
                  location: job.location || job.address || application.location,
                  schedule: resolveSchedule(),
                  childrenSummary: resolveChildrenSummary(),
                  hourlyRate: application.hourlyRate || job.hourly_rate || job.hourlyRate || job.rate,
                  appliedDate: formattedAppliedDate,
                },
              };
              onViewDetails(enriched);
            }}
            style={{
              flex: 1,
              backgroundColor: '#F8FAFC',
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 12,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#CBD5E1'
            }}
          >
            <Text style={{
              color: '#475569',
              fontSize: 14,
              fontWeight: '600'
            }}>
              Details
            </Text>
          </Pressable>

          {application.status === 'accepted' && (
            <Pressable
              onPress={() => onMessage && onMessage(application)}
              style={{
                flex: 1,
                backgroundColor: '#3B82F6',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                alignItems: 'center',
                shadowColor: '#3B82F6',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3
              }}
            >
              <Text style={{
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: '600'
              }}>
                Message
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  )
}

function BookingCard({ booking, onMessage, onViewDetails, onConfirmAttendance }) {
  const handleLocationPress = () => {
    if (booking.location) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.location)}`;
      Linking.openURL(mapsUrl).catch(err => {
        console.error('Error opening maps:', err);
        Alert.alert('Error', 'Could not open maps. Please check if you have a maps app installed.');
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'confirmed': return '#10B981';
      case 'completed': return '#3B82F6';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'pending': return '#FEF3C7';
      case 'confirmed': return '#D1FAE5';
      case 'completed': return '#DBEAFE';
      case 'cancelled': return '#FEE2E2';
      default: return '#F3F4F6';
    }
  };

  return (
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      marginVertical: 8,
      marginHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: 1,
      borderColor: '#F1F5F9'
    }}>
      {/* Header with gradient */}
      <LinearGradient
        colors={['#F8FAFC', '#F1F5F9']}
        style={{
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#E2E8F0'
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '700',
              color: '#1E293B',
              marginBottom: 4
            }} numberOfLines={1}>
              {booking.family || 'Family'}
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#64748B',
              fontWeight: '500'
            }}>
              {formatDate(booking.date)}
            </Text>
          </View>
          <View style={{
            backgroundColor: getStatusBgColor(booking.status),
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: getStatusColor(booking.status) + '20'
          }}>
            <Text style={{
              color: getStatusColor(booking.status),
              fontSize: 12,
              fontWeight: '600',
              textTransform: 'capitalize'
            }}>
              {booking.status}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Content */}
      <View style={{ padding: 16 }}>
        {/* Details Grid */}
        <View style={{ 
          flexDirection: 'row', 
          flexWrap: 'wrap',
          marginBottom: 16
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F8FAFC',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
            marginRight: 8,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: '#E2E8F0'
          }}>
            <Ionicons name="time" size={16} color="#3B82F6" />
            <Text style={{
              marginLeft: 6,
              fontSize: 13,
              color: '#475569',
              fontWeight: '500'
            }}>
              {booking.time || 'Time TBD'}
            </Text>
          </View>

          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F8FAFC',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
            marginRight: 8,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: '#E2E8F0'
          }}>
            <Ionicons name="people" size={16} color="#10B981" />
            <Text style={{
              marginLeft: 6,
              fontSize: 13,
              color: '#475569',
              fontWeight: '500'
            }}>
              {booking.children || 1} {(booking.children || 1) === 1 ? 'child' : 'children'}
            </Text>
          </View>

          {booking.hourlyRate && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F0FDF4',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 12,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: '#BBF7D0'
            }}>
              <Ionicons name="cash" size={16} color="#059669" />
              <Text style={{
                marginLeft: 6,
                fontSize: 13,
                color: '#059669',
                fontWeight: '600'
              }}>
                ₱{booking.hourlyRate}/hr
              </Text>
            </View>
          )}
        </View>

        {/* Location */}
        {booking.location && (
          <Pressable 
            onPress={handleLocationPress}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FEF7FF',
              padding: 12,
              borderRadius: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#E9D5FF'
            }}
          >
            <Ionicons name="location" size={18} color="#7C3AED" />
            <Text style={{
              flex: 1,
              marginLeft: 8,
              fontSize: 14,
              color: '#581C87',
              fontWeight: '500'
            }} numberOfLines={1}>
              {booking.location}
            </Text>
            <Ionicons name="open-outline" size={16} color="#7C3AED" />
          </Pressable>
        )}

        {/* Actions */}
        {(booking.status === 'pending' || booking.status === 'confirmed') && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {booking.status === 'pending' && (
              <Pressable
                onPress={() => onConfirmAttendance && onConfirmAttendance(booking)}
                style={{
                  flex: 1,
                  backgroundColor: '#10B981',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  shadowColor: '#10B981',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3
                }}
              >
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: '600'
                }}>
                  Confirm
                </Text>
              </Pressable>
            )}

            {booking.status === 'confirmed' && (
              <Pressable
                onPress={() => onMessage && onMessage(booking)}
                style={{
                  flex: 1,
                  backgroundColor: '#3B82F6',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  alignItems: 'center',
                  shadowColor: '#3B82F6',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3
                }}
              >
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: '600'
                }}>
                  Message
                </Text>
              </Pressable>
            )}
          </View>
        )}

      </View>
    </View>
  )
}

export const getRatingStats = (profile) => {
  const rawProfileRating = Number(profile?.rating)
  const profileRating = Number.isFinite(rawProfileRating) ? rawProfileRating : 0
  const rawReviewCount = Number.isFinite(Number(profile?.reviewCount))
    ? Number(profile?.reviewCount)
    : Number.isFinite(Number(profile?.reviews))
      ? Number(profile?.reviews)
      : 0
  const profileReviewCount = Math.max(0, rawReviewCount)
  const ratingStatValue = profileReviewCount > 0 ? profileRating.toFixed(1) : "—"
  const ratingStatSubtitle = profileReviewCount === 0
    ? "No reviews yet"
    : profileReviewCount === 1
      ? "1 review"
      : `${profileReviewCount} reviews`
  const ratingStatCTA = profileReviewCount > 0 ? "See feedback" : "Build reputation"

  return {
    rating: profileRating,
    ratingDisplay: ratingStatValue,
    reviewCount: profileReviewCount,
    subtitle: ratingStatSubtitle,
    ctaLabel: ratingStatCTA
  }
}

const CaregiverDashboard = () => {
  const navigation = useNavigation()
  const route = useRoute()
  const { user, signOut } = useAuth()
  const { width } = Dimensions.get("window");
  const isTablet = width >= 768
  const isAndroid = Platform.OS === 'android'
  const sectionHorizontalPadding = 16
  const gridGap = 16
  const columns = isTablet ? 2 : (isAndroid ? 1 : 2)
  const containerWidth = width - sectionHorizontalPadding * 1
  const gridCardWidth = Math.floor((containerWidth - gridGap * (columns - 1)) / columns)
  const gridCardHeight = isAndroid ? undefined : 280
  
  const {
    activeTab, setActiveTab,
    profile, setProfile,
    jobs, applications, setApplications, bookings,
    jobsLoading,
    loadProfile, fetchJobs, fetchApplications, fetchBookings
  } = useCaregiverDashboard();
  const { pendingRequests } = usePrivacy();
  const { counts: notificationCounts } = useNotificationCounts();
  
  // Debug notification counts
  console.log('🔔 CaregiverDashboard notification counts:', notificationCounts);
  
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false)
  const [profileName, setProfileName] = useState("Ana Dela Cruz")
  const [profileHourlyRate, setProfileHourlyRate] = useState("25")
  const [profileExperience, setProfileExperience] = useState("5+ years")
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [showBookingDetails, setShowBookingDetails] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const [showJobApplication, setShowJobApplication] = useState(false)
  const [showJobDetails, setShowJobDetails] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [showApplicationDetails, setShowApplicationDetails] = useState(false)
  const [applicationSubmitting, setApplicationSubmitting] = useState(false)
  const [applicationForm, setApplicationForm] = useState({ coverLetter: '', proposedRate: '' })
  
  // Add these new state variables for reviews
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [refreshingReviews, setRefreshingReviews] = useState(false);
  const [reviewsFilter, setReviewsFilter] = useState('all');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [highlightRequestSending, setHighlightRequestSending] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' })
  const showToast = (message, type = 'success') => setToast({ visible: true, message, type })
  const [refreshing, setRefreshing] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadProfile(),
        fetchJobs(),
        fetchApplications(),
        fetchBookings(),
        fetchCaregiverReviews({ showSkeleton: false })
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchApplications, fetchBookings, fetchCaregiverReviews, fetchJobs, loadProfile]);

  const fetchCaregiverReviews = useCallback(async ({ showSkeleton = true } = {}) => {
    if (!user?.id) return;

    if (showSkeleton) {
      setReviewsLoading(true);
    }

    try {
      const data = await reviewService.getReviews(user.id, 50, 0);
      setReviews(normalizeCaregiverReviewsForList(data || []));
    } catch (error) {
      console.warn('Failed to fetch caregiver reviews:', error);
      setReviews([]);
    } finally {
      if (showSkeleton) {
        setReviewsLoading(false);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setInitialLoading(false);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        await Promise.all([
          loadProfile(),
          fetchJobs(),
          fetchApplications(),
          fetchBookings(),
          fetchCaregiverReviews({ showSkeleton: true })
        ]);
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [fetchApplications, fetchBookings, fetchCaregiverReviews, fetchJobs, loadProfile, user?.id]);

  const refreshCaregiverReviews = useCallback(async () => {
    if (!user?.id || refreshingReviews) return;
    setRefreshingReviews(true);
    try {
      await fetchCaregiverReviews({ showSkeleton: false });
    } catch (error) {
      console.warn('Caregiver review refresh failed:', error);
    } finally {
      setRefreshingReviews(false);
    }
  }, [fetchCaregiverReviews, refreshingReviews, user?.id]);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHighlightRequestModal, setShowHighlightRequestModal] = useState(false);
  const [selectedFamilyForHighlight, setSelectedFamilyForHighlight] = useState(null);
  const [showRatingsModal, setShowRatingsModal] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const openRatingsModal = useCallback(() => {
    setShowRatingsModal(true);
  }, []);

  const closeRatingsModal = useCallback(() => {
    setShowRatingsModal(false);
  }, []);

  const preloadCaregiverReviews = useCallback(async () => {
    await fetchCaregiverReviews({ showSkeleton: false });
  }, [fetchCaregiverReviews]);

  const recentHighlightFamilies = useMemo(() => {
    const combined = [...(bookings || []), ...(applications || [])];
    const uniqueMap = new Map();

    combined.forEach((item, index) => {
      const familyName = item.family || item.parentName || 'Family';
      const familyId = item.parentId || item.userId || item.createdBy || item.familyId || item.id;
      const key = String(familyId ?? `${familyName}-${index}`);

      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, {
          key,
          id: familyId ?? key,
          name: familyName,
          type: item.status ? 'booking' : 'application',
          iconName: item.status ? 'calendar' : 'document-text-outline',
          statusLabel: item.status ? `Recent booking (${item.status})` : 'Job application',
        });
      }
    });

    return Array.from(uniqueMap.values()).slice(0, 10);
  }, [bookings, applications]);

  const openEditProfileModal = () => {
    try {
      setProfileName(profile?.name || '')
      setProfileHourlyRate(String(profile?.hourlyRate ?? ''))
      setProfileExperience(profile?.experience || '')
    } catch (error) {
      console.warn('Profile modal error:', error);
    }
    setEditProfileModalVisible(true)
  }

  useEffect(() => {
    const refreshProfileParam = route?.params?.refreshProfile;
    if (!refreshProfileParam) return;

    console.log('🔄 CaregiverDashboard - Force refresh triggered by route params');
    loadProfile();

    if (navigation?.setParams) {
      navigation.setParams({ refreshProfile: undefined });
    }
  }, [route?.params?.refreshProfile, loadProfile]);

  const handleJobApplication = (job) => {
    if (!job || (!job.id && !job._id)) {
      showToast('Invalid job data. Please refresh and try again.', 'error');
      return;
    }
    setSelectedJob(job)
    setApplicationForm({ coverLetter: '', proposedRate: '' })
    setShowJobApplication(true)
  }

  const handleViewJob = (job) => {
    console.log('📋 Viewing job:', job);
    console.log('📋 Job data keys:', Object.keys(job || {}));
    setSelectedJob(job)
    setShowJobDetails(true)
  }

  const handleViewApplication = application => {
    if (!application) return;

    const job = application.job || {};
    const baseRate = application.hourlyRateLabel
      || (typeof application.hourlyRate === 'number' ? `₱${application.hourlyRate}/hr` : null)
      || (typeof job.hourly_rate === 'number' ? `₱${job.hourly_rate}/hr` : null)
      || (typeof job.hourlyRate === 'number' ? `₱${job.hourlyRate}/hr` : null)
      || null;

    const proposedRate = application.proposedRateLabel
      || (typeof application.proposedRate === 'number' ? `₱${application.proposedRate}/hr` : null);

    const mergedJob = {
      ...job,
      title: job.title || application.jobTitle,
      family: job.family || job.familyName || application.family,
      location: job.location || application.location,
      schedule: application.schedule || job.schedule || job.time,
      hourlyRateLabel: baseRate,
      proposedRateLabel: proposedRate,
      childrenSummary: application.childrenSummary
        || job.childrenSummary
        || (Array.isArray(job.children) && job.children.length
          ? `${job.children.length} child${job.children.length > 1 ? 'ren' : ''}`
          : null)
        || (typeof job.childrenCount === 'number'
          ? `${job.childrenCount} child${job.childrenCount > 1 ? 'ren' : ''}`
          : null)
        || application.childrenSummary,
    };

    setSelectedApplication({
      ...application,
      job: mergedJob,
      baseRateLabel: baseRate,
      proposedRateLabel: proposedRate,
      message: application.message || application.coverLetter || '',
    });
    setShowApplicationDetails(true);
  };

  const navigateToMessagesTab = useCallback((targetParent) => {
    setActiveTab('messages');

    if (!targetParent?.id) {
      console.warn('navigateToMessagesTab called without parent ID');
      return;
    }

    navigation.navigate('Chat', {
      userId: user?.id,
      userType: 'caregiver',
      targetUserId: targetParent.id,
      targetUserName: targetParent.name || targetParent.parentName || targetParent.family || 'Parent',
      targetUserType: 'parent'
    });

    showToast(`Opening messages with ${targetParent.name || 'the family'}…`, 'success');
  }, [navigation, setActiveTab, showToast, user?.id]);

  const handleMessageFamily = useCallback((application) => {
    if (!application) {
      showToast('Unable to load application details.', 'error');
      return;
    }

    const parent = application.family || application.parent || application.parentInfo || {};
    const parentId = parent.id || application.parent_id || application.parentId;

    if (!parentId) {
      showToast('Missing family contact. Try opening the booking instead.', 'error');
      return;
    }

    setShowApplicationDetails(false);
    navigateToMessagesTab({ id: parentId, name: parent.name || application.familyName || 'Parent' });
  }, [navigateToMessagesTab, showToast]);

  const handleBookingMessage = useCallback((booking) => {
    const parentId = booking?.parentId
      || booking?.clientId?.id
      || booking?.clientId?._id
      || booking?.clientId;

    const parentName = booking?.family
      || booking?.parentName
      || booking?.clientId?.name
      || 'Parent';

    if (!parentId) {
      showToast('Unable to identify parent account for this booking', 'error');
      return;
    }

    navigateToMessagesTab({ id: parentId, name: parentName });
  }, [navigateToMessagesTab, showToast]);

  const handleConfirmAttendance = async (booking) => {
    try {
      await supabaseService.bookings.updateBookingStatus(
        booking.id,
        'confirmed'
      );

      showToast('Attendance confirmed successfully!', 'success');
      fetchBookings(); // Refresh bookings list
    } catch (error) {
      console.error('Confirm attendance failed:', error);
      showToast('Failed to confirm attendance. Please try again.', 'error');
    }
  }

  const handleCompleteBooking = async (booking) => {
    if (!booking?.id) return;
    try {
      await supabaseService.bookings.updateBookingStatus(booking.id, 'completed');
      showToast('Booking marked as completed!', 'success');
      setShowBookingDetails(false);
      fetchBookings();
    } catch (error) {
      console.error('Complete booking failed:', error);
      showToast('Failed to complete booking. Please try again.', 'error');
    }
  }

  const handleCancelBooking = async (booking) => {
    if (!booking?.id) return;
    try {
      await supabaseService.bookings.updateBookingStatus(booking.id, 'cancelled');
      showToast('Booking cancelled.', 'success');
      setShowBookingDetails(false);
      fetchBookings();
    } catch (error) {
      console.error('Cancel booking failed:', error);
      showToast('Failed to cancel booking. Please try again.', 'error');
    }
  }

  const handleGetDirections = (booking) => {
    const destination = booking?.address || booking?.location;
    if (!destination) {
      showToast('No address available for this booking.', 'info');
      return;
    }

    try {
      const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(destination)}`;
      Linking.openURL(mapsUrl);
    } catch (error) {
      console.error('Get directions failed:', error);
      Alert.alert('Error', 'Unable to open maps');
    }
  }

  // Sort reviews for display (newest first) - using a safer variable name to avoid potential conflicts
  const reviewsSorted = useMemo(() => {
    if (!Array.isArray(reviews)) {
      return [];
    }

    return [...reviews].sort((a, b) => {
      const dateA = new Date(a?.createdAt || a?.created_at || a?.created_at?.seconds * 1000 || 0);
      const dateB = new Date(b?.createdAt || b?.created_at || b?.created_at?.seconds * 1000 || 0);
      return dateB - dateA;
    });
  }, [reviews]);

  const handleRequestHighlight = useHighlightRequest({
    userId: user?.id,
    reviews: reviewsSorted,
    onStart: () => setHighlightRequestSending(true),
    onComplete: ({ targetParentName, success }) => {
      setHighlightRequestSending(false);
      if (success) {
        showToast(`Highlight request sent to ${targetParentName || 'the family'}.`, 'success');
        setShowHighlightRequestModal(false);
        setSelectedFamilyForHighlight(null);
      }
    },
    onError: (message) => {
      setHighlightRequestSending(false);
      showToast(message, 'error');
    },
    onInfo: (message) => showToast(message, 'info'),
    onNavigateToChat: navigateToMessagesTab
  });

  // Wrapper function for general highlight requests (no specific parent) - shows modal to select family
  const handleGeneralHighlightRequest = useCallback(() => {
    setShowHighlightRequestModal(true);
  }, []);

  // Handle highlight request after family is selected
  const handleSendHighlightRequest = useCallback(async (targetParentId, targetParentName) => {
    if (!targetParentId || !targetParentName) {
      showToast('Please select a family to send the highlight request to.', 'error');
      return;
    }

    const result = await handleRequestHighlight(targetParentId, targetParentName);
    if (!result) {
      console.log('Highlight request did not complete successfully.');
    }
  }, [handleRequestHighlight, showToast]);

  const handleApplicationSubmit = async ({ jobId, jobTitle, family, coverLetter, proposedRate }) => {
    // Validate job ID
    if (!jobId) {
      showToast('Invalid job ID. Please try again.', 'error');
      return;
    }

    // Check for duplicate applications
    const existingApplication = applications.find(app => 
      (app.jobId || app.job_id || app.job?.id || app.job?._id) === jobId
    );
    
    if (existingApplication) {
      showToast('You have already applied to this job', 'error');
      return;
    }

    const matchedJob = jobs.find((j) => (j.id || j._id) === jobId)

    try {
      setApplicationSubmitting(true)

      console.log('Submitting application with jobId:', jobId);
      const response = await supabaseService.applications.applyToJob(
        jobId,
        user.id,
        coverLetter || ''
      );

      if (response) {
        // Create Firebase connection between caregiver and job poster (parent)
        const parentId = matchedJob?.parentId || matchedJob?.userId || matchedJob?.createdBy;

        if (parentId && parentId !== user?.id) {
          try {
            console.log('🔗 Creating Supabase conversation for application:', { caregiverId: user.id, parentId });
            await supabaseService.messaging.getOrCreateConversation(user.id, parentId);
            console.log('✅ Supabase conversation created successfully');
          } catch (connectionError) {
            console.warn('⚠️ Failed to create Supabase conversation:', connectionError.message);
            // Don't fail the application if conversation creation fails
          }
        }

        const newApplication = {
          id: response.id || Date.now(),
          job_id: jobId,
          jobId,
          jobTitle,
          family,
          status: "pending",
          appliedDate: new Date().toISOString(),
          applied_at: new Date().toISOString(),
          hourlyRate: proposedRate || (matchedJob ? matchedJob.hourlyRate : undefined),
          coverLetter: coverLetter,
          message: coverLetter
        }

        // Add to local state immediately for instant UI update
        setApplications(prev => [newApplication, ...prev]);

        // Refresh from server to get latest data
        setTimeout(() => {
          fetchApplications();
        }, 500);

        showToast('Application submitted successfully!', 'success')
        setShowJobApplication(false)
        setSelectedJob(null)
        setApplicationForm({ coverLetter: '', proposedRate: '' })
        setActiveTab("applications")
      }
    } catch (error) {
      console.error('Application submission failed:', error)
      let errorMessage = 'Failed to submit application. Please try again.';

      if (error.message?.includes('Validation failed')) {
        errorMessage = 'Invalid job ID. Please try refreshing the jobs list.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      showToast(errorMessage, 'error')
    } finally {
      setApplicationSubmitting(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      console.log('💾 Saving profile from dashboard...');
      const isCaregiver = ['caregiver'].includes(String(user?.role || '').toLowerCase())
      const numericRate = Number(profileHourlyRate)
      const payload = {
        name: profileName,
        hourlyRate: Number.isFinite(numericRate) ? numericRate : undefined,
        rate: Number.isFinite(numericRate) ? numericRate : undefined,
        experience: profileExperience,
        previousVersion: {
          name: profile?.name,
          hourlyRate: profile?.hourlyRate,
          experience: profile?.experience,
          updatedAt: new Date().toISOString()
        }
      }
      
      console.log('💾 Dashboard payload:', payload);
      
      if (isCaregiver) {
        await supabaseService.user.updateProfile(user.id, payload);
      } else {
        await supabaseService.user.updateProfile(user.id, { name: payload.name });
      }
      
      await loadProfile()
      
      showToast('Profile changes saved.', 'success')
      setEditProfileModalVisible(false)
    } catch (e) {
      console.error('💾 Save profile failed:', e?.message || e)
      Alert.alert('Save failed', e?.message || 'Could not save profile. Please try again.')
    }
  }

  const renderEditProfileModal = () => (
    <ModalWrapper 
      visible={editProfileModalVisible} 
      onClose={() => setEditProfileModalVisible(false)}
    >
      <SharedCard style={styles.editProfileModal}>
          <Text style={styles.editProfileTitle}>Quick Edit Profile</Text>
          <Text style={styles.editProfileSubtitle}>For full profile editing, use the Complete Profile button</Text>
          <FormInput
            label="Name"
            value={profileName}
            onChangeText={setProfileName}
          />
          <FormInput
            label="Hourly Rate (₱)"
            value={profileHourlyRate}
            onChangeText={setProfileHourlyRate}
            keyboardType="numeric"
          />
          <FormInput
            label="Experience (months)"
            value={profileExperience}
            onChangeText={setProfileExperience}
            keyboardType="numeric"
          />
          <SharedButton
            title="Save Changes"
            onPress={handleSaveProfile}
            style={{ marginBottom: 8 }}
          />
          <SharedButton
            title="Cancel"
            variant="secondary"
            onPress={() => setEditProfileModalVisible(false)}
          />
      </SharedCard>
    </ModalWrapper>
  )

  const renderToast = () => (
    <Toast
      visible={toast.visible}
      message={toast.message}
      type={toast.type}
      onHide={() => setToast((t) => ({ ...t, visible: false }))}
    />
  )

  const renderTopNav = () => {
    const pendingRequestsCount = pendingRequests?.length || 0;
    const totalUnread = notificationCounts.notifications + pendingRequestsCount;
    
    const tabs = [
      { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
      { id: 'jobs', label: 'Jobs', icon: 'briefcase', badgeCount: notificationCounts.jobs },
      { id: 'applications', label: 'Applications', icon: 'document-text' },
      { id: 'bookings', label: 'Bookings', icon: 'calendar', badgeCount: notificationCounts.bookings },
      { id: 'messages', label: 'Messages', icon: 'chatbubbles', badgeCount: notificationCounts.messages },
      { id: 'reviews', label: 'Reviews', icon: 'star', badgeCount: notificationCounts.reviews },
      { 
        id: 'notifications', 
        label: 'Notifications', 
        icon: 'notifications',
        badgeCount: totalUnread
      },
    ];
    
    // Debug tab badge counts
    console.log('📊 Tab badge counts:', {
      jobs: notificationCounts.jobs,
      bookings: notificationCounts.bookings,
      messages: notificationCounts.messages,
      reviews: notificationCounts.reviews,
      notifications: totalUnread
    });
    
    return (
      <View style={styles.navContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.navScroll}
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            const onPress = () => {
              setActiveTab(tab.id);
              if (tab.id === 'jobs') {
                fetchJobs();
              } else if (tab.id === 'applications') {
                fetchApplications();
              }
            };
            const iconColor = active ? '#3b83f5' : '#6B7280';
            return (
              <Pressable
                key={tab.id}
                onPress={onPress}
                style={[styles.navTab, active ? styles.navTabActive : null]}
              >
                <View style={{ position: 'relative' }}>
                  <Ionicons name={tab.icon} size={18} color={iconColor} />
                  {tab.badgeCount > 0 ? (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>
                        {tab.badgeCount > 99 ? '99+' : tab.badgeCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.navTabText, active ? styles.navTabTextActive : null]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  const averageRating = useMemo(() => {
    if (!reviewsSorted.length) return '—';
    const total = reviewsSorted.reduce((sum, review) => sum + (review.rating || 0), 0);
    return (total / reviewsSorted.length).toFixed(1);
  }, [reviewsSorted]);

  const ratingDistribution = useMemo(() => {
    const buckets = [5, 4, 3, 2, 1].map(rating => ({ rating, count: 0 }));
    const bucketMap = buckets.reduce((acc, item) => {
      acc[item.rating] = item;
      return acc;
    }, {});

    reviewsSorted.forEach(review => {
      const bucket = bucketMap[Math.round(review?.rating || 0)];
      if (bucket) {
        bucket.count += 1;
      }
    });

    return buckets;
  }, [reviewsSorted]);

  const totalReviews = reviewsSorted.length;

  const fiveStarShare = useMemo(() => {
    if (!totalReviews) return 0;
    const fiveStarBucket = ratingDistribution.find(bucket => bucket.rating === 5);
    return Math.round(((fiveStarBucket?.count || 0) / totalReviews) * 100);
  }, [ratingDistribution, totalReviews]);

  const commentShare = useMemo(() => {
    if (!totalReviews) return 0;
    const withComments = reviewsSorted.filter(review => review?.comment?.trim()).length;
    return Math.round((withComments / totalReviews) * 100);
  }, [reviewsSorted, totalReviews]);

  const reviewFilters = useMemo(() => ([
    { id: 'all', label: 'All highlights' },
    { id: 'recent', label: 'Latest' },
    { id: 'positive', label: '4★ & up' },
    { id: 'with-notes', label: 'With stories' },
    { id: 'needs-attention', label: 'Needs follow-up' },
  ]), []);

  const { ratingDisplay, subtitle: ratingStatSubtitle, ctaLabel: ratingStatCTA } = getRatingStats(profile);

  const filteredReviews = useMemo(() => {
    switch (reviewsFilter) {
      case 'recent':
        return reviewsSorted.slice(0, 6);
      case 'positive':
        return reviewsSorted.filter(review => (review?.rating || 0) >= 4);
      case 'with-notes':
        return reviewsSorted.filter(review => review?.comment?.trim());
      case 'needs-attention':
        return reviewsSorted.filter(review => (review?.rating || 0) > 0 && (review?.rating || 0) <= 3);
      default:
        return reviewsSorted;
    }
  }, [reviewsSorted, reviewsFilter]);

  const reviewSummaryItems = useMemo(() => ([
    {
      id: 'total',
      label: 'Highlights collected',
      value: String(totalReviews || 0),
      icon: 'people-circle-outline',
      accent: '#1D4ED8',
    },
    {
      id: 'five-star',
      label: '5★ share',
      value: totalReviews ? `${fiveStarShare}%` : '—',
      icon: 'star-outline',
      accent: '#F59E0B',
    },
    {
      id: 'stories',
      label: 'Reviews with notes',
      value: totalReviews ? `${commentShare}%` : '—',
      icon: 'chatbubble-ellipses-outline',
      accent: '#10B981',
    },
  ]), [commentShare, fiveStarShare, totalReviews]);

  const reviewsEmptyComponent = useMemo(() => {
    if (reviewsLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading highlights...</Text>
        </View>
      );
    }

    const hasReviews = !!totalReviews;

    return (
      <View style={styles.reviewsEmptyCard}>
        <Ionicons name={hasReviews ? 'search-outline' : 'sparkles-outline'} size={32} color="#3B82F6" />
        <Text style={styles.reviewsEmptyTitle}>
          {hasReviews ? 'No highlights match this view' : 'No highlights yet'}
        </Text>
        <Text style={styles.reviewsEmptySubtitle}>
          {hasReviews
            ? 'Try a different filter or invite families to leave feedback.'
            : 'Once families share their experiences after bookings, their testimonials will appear here.'}
        </Text>
      </View>
    );
  }, [reviewsLoading, totalReviews]);

  const reviewsFooterComponent = useMemo(() => (
    <View style={styles.reviewsFooterCard}>
      <View style={styles.reviewsFooterContent}>
        <Ionicons name="sparkles-outline" size={24} color="#1D4ED8" />
        <View style={styles.reviewsFooterTextWrapper}>
          <Text style={styles.reviewsFooterTitle}>Keep the stories coming</Text>
          <Text style={styles.reviewsFooterSubtitle}>
            Follow up with recent families to capture their experience while it's still fresh.
          </Text>
        </View>
      </View>
      <Pressable
        style={[styles.reviewsFooterButton, highlightRequestSending && { opacity: 0.6 }]}
        onPress={handleGeneralHighlightRequest}
        disabled={highlightRequestSending}
      >
        <Ionicons name="mail-unread-outline" size={16} color="#FFFFFF" />
        <Text style={styles.reviewsFooterButtonText}>Request highlight</Text>
      </Pressable>
    </View>
  ), [handleGeneralHighlightRequest, highlightRequestSending]);

  const handleSelectReviewFilter = useCallback((filterId) => {
    setReviewsFilter(current => (current === filterId ? current : filterId));
  }, []);

  const reviewsHeaderComponent = (
    <View>
      <LinearGradient
        colors={["#1d4ed8", "#1e40af"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.reviewsHeroCard}
      >
        <View style={styles.reviewsHeroHeader}>
          <Pressable
            style={styles.reviewsHeroMetric}
            onPress={openRatingsModal}
            accessibilityRole="button"
            accessibilityLabel="View ratings and reviews"
          >
            <Text style={styles.reviewsHeroLabel}>Average rating</Text>
            <View style={styles.reviewsHeroValueRow}>
              <Text style={styles.reviewsHeroValue}>{averageRating}</Text>
              <Ionicons name="star" size={22} color="#FACC15" />
            </View>
            <Text style={styles.reviewsHeroHint}>Based on family-submitted highlights</Text>
          </Pressable>
          <Pressable
            onPress={handleGeneralHighlightRequest}
            style={[styles.reviewsHeroButton, highlightRequestSending && { opacity: 0.6 }]}
            disabled={highlightRequestSending}
          >
            <Ionicons name="sparkles-outline" size={8} color="#1D4ED8" />
            <Text style={styles.reviewsHeroButtonText}>Request highlight</Text>
          </Pressable>
        </View>

        <View style={styles.reviewsFilterRow}>
          {reviewFilters.map(filter => {
            const active = reviewsFilter === filter.id;
            return (
              <Pressable
                key={filter.id}
                style={[styles.reviewsFilterPill, active && styles.reviewsFilterPillActive]}
                onPress={() => handleSelectReviewFilter(filter.id)}
              >
                <Text style={[styles.reviewsFilterPillText, active && styles.reviewsFilterPillTextActive]}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>

      <View style={styles.reviewsSummaryGrid}>
        {reviewSummaryItems.map(item => (
          <View key={item.id} style={styles.reviewsSummaryCard}>
            <View style={[styles.reviewsSummaryIconWrap, { backgroundColor: `${item.accent}1A` }] }>
              <Ionicons name={item.icon} size={18} color={item.accent} />
            </View>
            <Text style={styles.reviewsSummaryLabel}>{item.label}</Text>
            <Text style={styles.reviewsSummaryMetric}>{item.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.reviewsBreakdownCard}>
        <Text style={styles.reviewsBreakdownTitle}>Rating distribution</Text>
        {ratingDistribution.map(bucket => {
          const percentage = totalReviews ? Math.round((bucket.count / totalReviews) * 100) : 0;
          return (
            <View key={bucket.rating} style={styles.reviewsBreakdownRow}>
              <Text style={styles.reviewsBreakdownLabel}>{`${bucket.rating}★`}</Text>
              <View style={styles.reviewsBreakdownBar}>
                <View
                  style={[
                    styles.reviewsBreakdownFill,
                    { width: `${Math.min(100, Math.max(bucket.count > 0 ? 12 : 0, percentage))}%` }
                  ]}
                />
              </View>
              <Text style={styles.reviewsBreakdownValue}>{bucket.count}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.reviewsContextBanner}>
        <Ionicons name="information-circle" size={18} color="#2563eb" />
        <Text style={styles.reviewsContextText}>
          Highlights are generated from verified family feedback. Reach out to families after successful bookings to grow your reputation.
        </Text>
      </View>
    </View>
  );

  const renderReviewsTab = () => (
    <View style={styles.reviewsContainer}>
      <View style={styles.reviewsCard}>
        <ReviewList
          reviews={filteredReviews}
          currentUserId={user?.id}
          refreshing={refreshingReviews}
          onRefresh={() => refreshCaregiverReviews()}
          onEditReview={(review) => {
            setSelectedReview(review);
            setShowReviewForm(true);
          }}
          ListHeaderComponent={reviewsHeaderComponent}
          ListFooterComponent={reviewsFooterComponent}
          ListEmptyComponent={reviewsEmptyComponent}
          contentContainerStyle={styles.reviewsListContent}
          useVirtualizedList={false}
        />
      </View>
    </View>
  );

  const handleCloseReviewModal = useCallback(() => {
    setShowReviewForm(false);
    setSelectedReview(null);
  }, []);

  const handleSubmitReview = useCallback(async ({ rating, comment }) => {
    if (!user?.id) {
      Alert.alert('Not signed in', 'Please sign in to submit a review.');
      return;
    }

    if (!selectedReview) {
      showToast('Reviews are added by families after bookings. You cannot post your own review.', 'info');
      return;
    }

    try {
      setReviewSubmitting(true);
      if (selectedReview) {
        await reviewService.updateReview(selectedReview.id, {
          rating,
          comment: comment?.trim() || ''
        });
      } else {
        await reviewService.createReview({
          reviewer_id: user.id,
          reviewee_id: user.id,
          rating,
          comment: comment?.trim() || ''
        });
      }

      await refreshCaregiverReviews();
      handleCloseReviewModal();
      showToast(selectedReview ? 'Review updated successfully' : 'Review submitted successfully', 'success');
    } catch (error) {
      console.error('Caregiver review submit failed:', error);
      showToast(error?.message || 'Failed to save review. Please try again.', 'error');
    } finally {
      setReviewSubmitting(false);
    }
  }, [handleCloseReviewModal, refreshCaregiverReviews, selectedReview, showToast, user?.id]);

  const renderHeader = () => {
    const pendingRequestsCount = pendingRequests?.length || 0;
    const totalUnread = notificationCounts.notifications + pendingRequestsCount;
    
    return (
      <View style={styles.parentLikeHeaderContainer}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.parentLikeHeaderGradient}
        >
          <View style={styles.headerTop}>
            <View style={[styles.logoContainer, { flexDirection: 'column', alignItems: 'center' }]}>
              <Image source={require('../../assets/icon.png')} style={[styles.logoImage, { marginBottom: 6 }]} />
              
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>I am a Caregiver</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <Pressable 
                style={styles.headerButton}
                onPress={() => setActiveTab('messages')}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FFFFFF" />
              </Pressable>
              
              <Pressable 
                style={[styles.headerButton, { position: 'relative' }]} 
                onPress={() => setShowNotifications(true)}
              >
                <Ionicons name="shield-outline" size={22} color="#FFFFFF" />
                {totalUnread > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {totalUnread > 9 ? '9+' : totalUnread}
                    </Text>
                  </View>
                )}
              </Pressable>
              
              <Pressable 
                style={styles.headerButton} 
                onPress={() => setShowRequestModal(true)}
              >
                <Ionicons name="mail-outline" size={22} color="#FFFFFF" />
              </Pressable>
              
              <Pressable 
                style={styles.headerButton} 
                onPress={() => setShowSettings(true)}
              >
                <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
              </Pressable>
              
              <Pressable 
                style={styles.headerButton} 
                onPress={() => {
                  try {
                    // Combine user data with profile data for complete profile view
                    const completeProfile = {
                      ...profile,
                      name: profile?.name || user?.name,
                      bio: profile?.bio || user?.bio,
                      profileImage: profile?.profileImage || profile?.profile_image || user?.profile_image,
                      skills: profile?.skills || user?.skills || [],
                      hourlyRate: profile?.hourlyRate || user?.hourly_rate,
                      experience: profile?.experience || { description: user?.experience },
                      certifications: profile?.certifications || user?.certifications || [],
                      availability: profile?.availability || user?.availability || { days: [] },
                      ageCareRanges: profile?.ageCareRanges || user?.ageCareRanges || [],
                      emergencyContacts: profile?.emergencyContacts || user?.emergencyContacts || []
                    };
                    
                    navigation.navigate('CaregiverProfileComplete', { 
                      profile: completeProfile 
                    });
                  } catch (error) {
                    console.error('Profile navigation error:', error);
                    Alert.alert('Navigation Error', 'Failed to open profile. Please try again.');
                  }
                }}
              >
                <Ionicons name="person-outline" size={22} color="#FFFFFF" />
              </Pressable>
              
              <Pressable 
                style={styles.headerButton} 
                onPress={async () => {
                  try {
                    console.log('🚪 Caregiver logout initiated...');
                    if (onLogout) {
                      console.log('Using onLogout prop');
                      await onLogout();
                    } else {
                      console.log('Using signOut from AuthContext');
                      await signOut();
                    }
                    console.log('✅ Logout completed');
                  } catch (error) {
                    console.error('❌ Logout error:', error);
                    Alert.alert('Logout Error', 'Failed to logout. Please try again.');
                  }
                }}
              >
                <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </LinearGradient>
      </View>
    )
  }

  return (
      <View style={styles.container}>
      {renderHeader()}
      {renderTopNav()}
      
      <View style={{ flex: 1 }}>
        {activeTab === "dashboard" && (
          initialLoading ? (
            <ScrollView contentContainerStyle={styles.dashboardSkeletonContainer}>
              <SkeletonCard style={styles.dashboardSkeletonSummaryCard}>
                <View style={styles.dashboardSkeletonSummaryRow}>
                  <SkeletonCircle size={64} />
                  <View style={styles.dashboardSkeletonSummaryInfo}>
                    <SkeletonBlock width="60%" height={18} />
                    <SkeletonBlock width="40%" height={14} style={{ marginTop: 6 }} />
                    <SkeletonPill width="45%" height={12} style={{ marginTop: 10 }} />
                  </View>
                </View>
              </SkeletonCard>

              <View style={styles.dashboardSkeletonStatsRow}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <SkeletonCard key={`stat-skeleton-${index}`} style={styles.dashboardSkeletonQuickStat}>
                    <SkeletonCircle size={36} />
                    <SkeletonBlock width="50%" height={16} style={{ marginTop: 12 }} />
                    <SkeletonPill width="70%" height={14} style={{ marginTop: 6 }} />
                  </SkeletonCard>
                ))}
              </View>

              <View style={styles.dashboardSkeletonActionsRow}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <SkeletonCard key={`action-skeleton-${index}`} style={styles.dashboardSkeletonAction}>
                    <SkeletonCircle size={32} />
                    <SkeletonBlock width="60%" height={14} style={{ marginTop: 8 }} />
                  </SkeletonCard>
                ))}
              </View>

              {Array.from({ length: 3 }).map((_, sectionIndex) => (
                <SkeletonCard key={`section-skeleton-${sectionIndex}`} style={styles.dashboardSkeletonSection}>
                  <SkeletonBlock width="50%" height={16} />
                  <SkeletonBlock width="30%" height={12} style={{ marginTop: 8 }} />
                  <View style={styles.dashboardSkeletonItems}>
                    {Array.from({ length: 2 }).map((_, itemIndex) => (
                      <View key={`section-skeleton-${sectionIndex}-item-${itemIndex}`} style={styles.dashboardSkeletonItem}>
                        <SkeletonCircle size={44} />
                        <View style={styles.dashboardSkeletonItemInfo}>
                          <SkeletonBlock width="70%" height={14} />
                          <SkeletonBlock width="50%" height={12} style={{ marginTop: 6 }} />
                        </View>
                      </View>
                    ))}
                  </View>
                </SkeletonCard>
              ))}
            </ScrollView>
          ) : (
            <ScrollView 
              style={styles.content}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#3B82F6']}
                  tintColor="#3B82F6"
                />
              }
            >
              <CaregiverProfileSection profile={profile} activeTab={activeTab} />

            <View style={styles.statsGrid}>
              <QuickStat
                icon="star"
                value={ratingDisplay}
                label="Rating"
                color="#F59E0B"
                bgColor="#FEF3C7"
                styles={styles}
                onPress={openRatingsModal}
                subtitle={ratingStatSubtitle}
                ctaLabel={ratingStatCTA}
                accessibilityHint="Shows detailed caregiver ratings and reviews"
              />
              <QuickStat
                icon="briefcase"
                value={profile?.completedJobs || "0"}
                label="Jobs Done"
                color="#10B981"
                bgColor="#D1FAE5"
                styles={styles}
              />
              <QuickStat
                icon="chatbubble"
                value={profile?.responseRate || "0%"}
                label="Response Rate"
                color="#3B82F6"
                bgColor="#DBEAFE"
                styles={styles}
              />
              <QuickStat
                icon="checkmark-circle"
                value={profile?.verification?.trustScore || "0"}
                label="Trust Score"
                color="#8B5CF6"
                bgColor="#EDE9FE"
                styles={styles}
              />
            </View>

            <View style={styles.actionGrid}>
              <QuickAction
                icon="search"
                label="Find Jobs"
                gradientColors={["#3B82F6", "#2563EB"]}
                onPress={() => {
                  setActiveTab('jobs')
                  fetchJobs()
                }}
                styles={styles}
              />
              <QuickAction
                icon="calendar"
                label="Bookings"
                gradientColors={["#22C55E", "#16A34A"]}
                onPress={() => setActiveTab('bookings')}
                styles={styles}
              />

              <QuickAction
                icon="document-text"
                label="Applications"
                gradientColors={["#fb7185", "#ef4444"]}
                onPress={() => setActiveTab('applications')}
                styles={styles}
              />
              <QuickAction
                icon="chatbubbles"
                label="Messages"
                gradientColors={["#8B5CF6", "#7C3AED"]}
                onPress={() => setActiveTab('messages')}
                styles={styles}
              />
            </View>



            <View style={styles.section}>
              <Card style={[styles.promotionCard, { backgroundColor: '#f0f9ff', borderColor: '#3b82f6' }]}>
                <Card.Content style={styles.promotionCardContent}>
                  <View style={styles.promotionHeader}>
                    <View style={styles.promotionIcon}>
                      <Ionicons name="star" size={20} color="#3b82f6" />
                    </View>
                    <View style={styles.promotionContent}>
                      <Text style={styles.promotionTitle}>Complete Your Enhanced Profile</Text>
                      <Text style={styles.promotionDescription}>
                        Add documents, certifications, and portfolio to get more bookings
                      </Text>
                    </View>
                  </View>
                  <Button
                    mode="contained"
                    onPress={() => {
                      try {
                        navigation.navigate('EnhancedCaregiverProfileWizard', { isEdit: true, existingProfile: profile });
                      } catch (error) {
                        console.error('Navigation error:', error);
                        Alert.alert('Navigation Error', 'Failed to open profile wizard. Please try again.');
                      }
                    }}
                    style={[styles.promotionButton, { backgroundColor: '#3b82f6' }]}
                    labelStyle={{ color: '#ffffff' }}
                    icon="arrow-right"
                  >
                    Complete Profile
                  </Button>
                </Card.Content>
              </Card>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recommended Jobs</Text>
                <Pressable onPress={() => setActiveTab('jobs')}>
                  <Text style={styles.seeAllText}>See All</Text>
                </Pressable>
              </View>
              {jobsLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text style={styles.loadingText}>Loading jobs...</Text>
                </View>
              ) : (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={styles.horizontalScroll}
                  contentContainerStyle={{
                    paddingLeft: 2,
                    paddingRight: 16,
                    paddingBottom: 8,
                    alignItems: 'stretch',
                  }}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  snapToInterval={isTablet ? 336 : 280}
                >
                  {(jobs || []).slice(0, 3).map((job, index) => {
                    const jobId = job?.id || job?._id;
                    const alreadyApplied = applications.some(
                      (app) => (app?.jobId || app?.job_id || app?.job?.id || app?.job?._id) === jobId
                    );
                    return (
                      <CaregiverJobCard
                        key={jobId || `job-${index}`}
                        job={job}
                        onApply={handleJobApplication}
                        onView={handleViewJob}
                        hasApplied={Boolean(alreadyApplied)}
                        style={{
                          width: isTablet ? 320 : 260,
                          marginRight: index < 2 ? 16 : 0,
                          marginLeft: index === 0 ? 2 : 0,
                          flexGrow: 0,
                        }}
                      />
                    );
                  })}
                </ScrollView>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Applications</Text>
                <Pressable onPress={() => setActiveTab("applications")}>
                  <Text style={styles.seeAllText}>View All</Text>
                </Pressable>
              </View>
              {(applications || []).slice(0, 2).map((application, index) => (
                <ApplicationCard 
                  key={application.id || index} 
                  application={application}
                  onViewDetails={handleViewApplication}
                  onMessage={handleMessageFamily}
                />
              ))}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
                <Pressable onPress={() => setActiveTab('bookings')}>
                  <Text style={styles.seeAllText}>See All</Text>
                </Pressable>
              </View>
              {(bookings || []).slice(0, 2).map((booking, index) => (
                <BookingCard
                  key={booking.id || index}
                  booking={booking}
                  onMessage={handleBookingMessage}
                  onConfirmAttendance={handleConfirmAttendance}
                />
              ))}
            </View>
            </ScrollView>
          )
        )}

        {activeTab === 'jobs' && (
          <JobsTab
            jobs={jobs}
            jobsLoading={jobsLoading}
            applications={applications}
            onRefresh={onRefresh}
            onJobApply={handleJobApplication}
            onJobView={handleViewJob}
            refreshing={refreshing}
            loading={jobsLoading}
          />
        )}

        {activeTab === "applications" && (
          console.log('🔍 Applications tab is active') ||
          <ApplicationsTab
            applications={applications}
            onViewJob={(job, application) => {
              // Merge job data with application data for complete view
              const completeJobData = {
                // Ensure all job fields are properly set
                id: job?.id || application?.job_id,
                _id: job?._id || application?.job_id,
                title: job?.title || application?.jobTitle || application?.job_title,
                description: job?.description || application?.job?.description,
                location: job?.location || application?.location,
                date: job?.date || application?.job?.date,
                start_time: job?.start_time || job?.startTime,
                end_time: job?.end_time || job?.endTime,
                hourly_rate: job?.hourly_rate || job?.hourlyRate || job?.rate,
                family: job?.family || job?.familyName || application?.family,
                children: job?.children || application?.job?.children,
                ...job,
                // Add application-specific data
                applicationData: {
                  proposedRate: application?.proposedRate || application?.proposed_rate,
                  coverLetter: application?.coverLetter || application?.message,
                  appliedDate: application?.applied_at || application?.appliedAt,
                  applicationStatus: application?.status,
                  applicationId: application?.id || application?._id
                }
              };
              handleViewJob(completeJobData);
            }}
            onWithdrawApplication={async (applicationId) => {
              try {
                await supabaseService.applications.updateApplicationStatus(applicationId, 'withdrawn');
                fetchApplications();
                showToast('Application withdrawn successfully', 'success');
              } catch (error) {
                console.error('Withdraw application failed:', error);
                showToast('Failed to withdraw application', 'error');
              }
            }}
            refreshing={refreshing}
            onRefresh={onRefresh}
            loading={jobsLoading}
          />
        )}

        {activeTab === "bookings" && (
          <BookingsTab
            bookings={bookings}
            onMessageFamily={handleBookingMessage}
            onConfirmBooking={handleConfirmAttendance}
            onViewDetails={(booking) => {
              setSelectedBooking(booking)
              setShowBookingDetails(true)
            }}
            refreshing={refreshing}
            onRefresh={onRefresh}
            loading={false}
          />
        )}

        {activeTab === 'messages' && (
          <MessagesTab
            navigation={navigation}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        )}

        {activeTab === 'reviews' && renderReviewsTab()}

        {activeTab === 'notifications' && (
          <NotificationsTab
            navigation={navigation}
            onNavigateTab={(tabId) => setActiveTab(tabId)}
            onRefresh={onRefresh}
          />
        )}

      </View>

      {showBookingDetails && selectedBooking && (
        <BookingDetailsModal
          visible={showBookingDetails}
          booking={selectedBooking}
          onClose={() => setShowBookingDetails(false)}
          onMessage={() => {
            setShowBookingDetails(false);
            handleBookingMessage(selectedBooking);
          }}
          onCompleteBooking={() => handleCompleteBooking(selectedBooking)}
          onCancelBooking={() => handleCancelBooking(selectedBooking)}
          onGetDirections={() => handleGetDirections(selectedBooking)}
          onConfirmAttendance={() => handleConfirmAttendance(selectedBooking)}
          colors={['#667eea', '#764ba2']}
          userType="caregiver"
        />
      )}

      {showJobApplication && selectedJob && (
        <Modal
          visible={showJobApplication}
          onRequestClose={() => {
            if (!applicationSubmitting) {
              setShowJobApplication(false)
              setSelectedJob(null)
              setApplicationForm({ coverLetter: '', proposedRate: '' })
            }
          }}
          transparent
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.applicationModal}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.applicationModalHeader}>
                  <Text style={styles.applicationModalTitle}>Apply to Job</Text>
                  <Pressable 
                    onPress={() => {
                      if (!applicationSubmitting) {
                        setShowJobApplication(false)
                        setSelectedJob(null)
                        setApplicationForm({ coverLetter: '', proposedRate: '' })
                      }
                    }}
                    style={styles.modalCloseButton}
                  >
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </Pressable>
                </View>
                
                <View style={styles.jobSummary}>
                  <Text style={styles.jobSummaryTitle}>{selectedJob.title}</Text>
                  <Text style={styles.jobSummaryFamily}>{selectedJob.family}</Text>
                  <Text style={styles.jobSummaryRate}>₱{selectedJob.hourlyRate}/hour</Text>
                </View>
                
                <View style={styles.applicationFormContainer}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Proposed Rate (Optional)</Text>
                    <TextInput
                      style={styles.applicationInput}
                      placeholder={`₱${selectedJob.hourlyRate}`}
                      value={applicationForm.proposedRate}
                      onChangeText={(text) => setApplicationForm(prev => ({ ...prev, proposedRate: text }))}
                      keyboardType="numeric"
                      editable={!applicationSubmitting}
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Cover Letter (Optional)</Text>
                    
                    <View style={styles.suggestedCoverLettersContainer}>
                      {[
                        'I am passionate about childcare and have experience working with children of all ages. I would love to help your family.',
                        'As a certified caregiver with first aid training, I prioritize safety while creating a fun and nurturing environment for children.',
                        'I have flexible availability and excellent references. I am committed to providing reliable and professional childcare services.'
                      ].map((suggestion, index) => {
                        const isSelected = applicationForm.coverLetter === suggestion;
                        return (
                          <Pressable
                            key={index}
                            style={[styles.coverLetterChip, isSelected && styles.coverLetterChipSelected]}
                            onPress={() => {
                              setApplicationForm(prev => ({
                                ...prev,
                                coverLetter: isSelected ? '' : suggestion
                              }));
                            }}
                          >
                            <Text style={[styles.coverLetterChipText, isSelected && styles.coverLetterChipTextSelected]}>
                              {suggestion.length > 50 ? `${suggestion.substring(0, 50)}...` : suggestion}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    
                    <TextInput
                      style={[styles.applicationInput, styles.applicationTextArea]}
                      placeholder="Tell the family why you're the perfect fit for this job..."
                      value={applicationForm.coverLetter}
                      onChangeText={(text) => setApplicationForm(prev => ({ ...prev, coverLetter: text }))}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      editable={!applicationSubmitting}
                    />
                  </View>
                </View>
                
                <View style={styles.applicationModalActions}>
                  <Button 
                    mode="outlined" 
                    onPress={() => {
                      if (!applicationSubmitting) {
                        setShowJobApplication(false)
                        setSelectedJob(null)
                        setApplicationForm({ coverLetter: '', proposedRate: '' })
                      }
                    }}
                    style={styles.cancelButton}
                    disabled={applicationSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() => handleApplicationSubmit({
                      jobId: selectedJob.id || selectedJob._id,
                      jobTitle: selectedJob.title,
                      family: selectedJob.family || selectedJob.familyName,
                      coverLetter: applicationForm.coverLetter,
                      proposedRate: applicationForm.proposedRate
                    })}
                    style={styles.submitButton}
                    loading={applicationSubmitting}
                    disabled={applicationSubmitting}
                  >
                    {applicationSubmitting ? 'Submitting...' : 'Submit Application'}
                  </Button>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      <RatingsReviewsModal
        visible={showRatingsModal}
        onClose={closeRatingsModal}
        caregiverId={user?.id}
        caregiverName={profile?.name || user?.name}
        currentUserId={user?.id}
        onPreload={preloadCaregiverReviews}
      />

      {showApplicationDetails && selectedApplication && (
        <Modal
          visible={showApplicationDetails}
          onRequestClose={() => setShowApplicationDetails(false)}
          transparent
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.applicationModal}>
              <View style={styles.applicationModalHeader}>
                <Text style={styles.applicationModalTitle}>Application Details</Text>
                <Pressable 
                  onPress={() => setShowApplicationDetails(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </Pressable>
              </View>
              
              <ScrollView style={styles.applicationFormContainer}>
                <View style={styles.jobSummary}>
                  <Text style={styles.jobSummaryTitle} numberOfLines={2}>
                    {selectedApplication.job?.title || selectedApplication.jobTitle || 'Childcare Position'}
                  </Text>
                  <Text style={styles.jobSummaryFamily} numberOfLines={1}>
                    {selectedApplication.job?.family || selectedApplication.family || 'Family'}
                  </Text>
                  <StatusBadge status={selectedApplication.status} />
                </View>
                
                <View style={styles.applicationDetails}>
                  {selectedApplication.job?.appliedDate || selectedApplication.appliedDate ? (
                    <View style={styles.applicationDetailRow}>
                      <Ionicons name="calendar" size={18} color="#6B7280" />
                      <Text style={styles.applicationDetailText}>
                        Applied: {new Date(selectedApplication.job?.appliedDate || selectedApplication.appliedDate).toLocaleDateString()}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.applicationDetailRow}>
                    <Ionicons name="calendar" size={18} color="#6B7280" />
                    <Text style={styles.applicationDetailText}>
                      Schedule: {selectedApplication.job?.schedule || 'Schedule to be discussed'}
                    </Text>
                  </View>
                  <View style={styles.applicationDetailRow}>
                    <Ionicons name="cash" size={18} color="#6B7280" />
                    <Text style={styles.applicationDetailText}>
                      ₱{selectedApplication.job?.hourlyRate || selectedApplication.hourlyRate || 0}/hr
                    </Text>
                  </View>
                  {(selectedApplication.job?.childrenSummary || selectedApplication.childrenSummary) && (
                    <View style={styles.applicationDetailRow}>
                      <Ionicons name="people" size={18} color="#6B7280" />
                      <Text style={styles.applicationDetailText}>
                        {selectedApplication.job?.childrenSummary || selectedApplication.childrenSummary}
                      </Text>
                    </View>
                  )}
                  {(selectedApplication.job?.location || selectedApplication.location) && (
                    <View style={styles.applicationDetailRow}>
                      <Ionicons name="location" size={18} color="#6B7280" />
                      <Text style={styles.applicationDetailText}>
                        {selectedApplication.job?.location || selectedApplication.location}
                      </Text>
                    </View>
                  )}
                  {selectedApplication.proposedRate && (
                    <View style={styles.applicationDetailRow}>
                      <Ionicons name="trending-up" size={18} color="#6B7280" />
                      <Text style={styles.applicationDetailText}>
                        Proposed Rate: ₱{selectedApplication.proposedRate}/hr
                      </Text>
                    </View>
                  )}
                  {(selectedApplication.coverLetter || selectedApplication.message) && (
                    <View style={{ marginTop: 16 }}>
                      <Text style={styles.inputLabel}>Message</Text>
                      <View style={styles.coverLetterDisplay}>
                        <Text style={styles.coverLetterText}>
                          {selectedApplication.coverLetter || selectedApplication.message}
                        </Text>
                      </View>
                    </View>
                  )}
                  {selectedApplication.job?.description && (
                    <View style={{ marginTop: 16 }}>
                      <Text style={styles.inputLabel}>Job Description</Text>
                      <View style={styles.coverLetterDisplay}>
                        <Text style={styles.coverLetterText}>{selectedApplication.job.description}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>
              
              <View style={styles.applicationModalActions}>
                <Button 
                  mode="outlined" 
                  onPress={() => setShowApplicationDetails(false)}
                  style={styles.cancelButton}
                >
                  Close
                </Button>
                {selectedApplication.status === 'accepted' && (
                  <Button 
                    mode="contained" 
                    style={styles.submitButton}
                    onPress={() => handleMessageFamily(selectedApplication)}
                  >
                    Message Family
                  </Button>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {showJobDetails && selectedJob && (
        <Modal
          visible={showJobDetails}
          onRequestClose={() => {
            setShowJobDetails(false)
            setSelectedJob(null)
          }}
          transparent
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.jobDetailsModal, { height: '50%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.jobDetailsContent}>
                <View style={styles.jobDetailsHeader}>
                  <Text style={styles.jobDetailsTitle}>{String(selectedJob.title || 'Childcare Position')}</Text>
                  <Text style={styles.jobDetailsFamily}>{String(selectedJob.family || selectedJob.familyName || 'Family')}</Text>
                  {selectedJob.urgent && (
                    <View style={styles.urgentBadge}>
                      <Text style={styles.urgentText}>URGENT</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.jobDetailsInfo}>
                  <View style={styles.jobDetailsRow}>
                    <Ionicons name="location" size={16} color="#6B7280" />
                    <Text style={styles.jobDetailsText}>{selectedJob.location || 'Location not specified'}</Text>
                  </View>
                  <View style={styles.jobDetailsRow}>
                    <Ionicons name="calendar" size={16} color="#6B7280" />
                    <Text style={styles.jobDetailsText}>{selectedJob.date ? new Date(selectedJob.date).toLocaleDateString() : 'Date not specified'}</Text>
                  </View>
                  <View style={styles.jobDetailsRow}>
                    <Ionicons name="time" size={16} color="#6B7280" />
                    <Text style={styles.jobDetailsText}>
                      {selectedJob.start_time || selectedJob.startTime || 'Start time'} - {selectedJob.end_time || selectedJob.endTime || 'End time'}
                    </Text>
                  </View>
                  <View style={styles.jobDetailsRow}>
                    <Ionicons name="cash" size={16} color="#059669" />
                    <Text style={[styles.jobDetailsText, { color: '#059669', fontWeight: '600' }]}>₱{selectedJob.hourly_rate || selectedJob.hourlyRate || 0}/hr (Job Rate)</Text>
                  </View>
                  {selectedJob.applicationData?.proposedRate && selectedJob.applicationData.proposedRate !== (selectedJob.hourly_rate || selectedJob.hourlyRate) && (
                    <View style={styles.jobDetailsRow}>
                      <Ionicons name="trending-up" size={16} color="#3B82F6" />
                      <Text style={[styles.jobDetailsText, { color: '#3B82F6', fontWeight: '600' }]}>₱{selectedJob.applicationData.proposedRate}/hr (Your Proposed Rate)</Text>
                    </View>
                  )}
                  {selectedJob.children?.length > 0 && (
                    <View style={styles.jobDetailsRow}>
                      <Ionicons name="people" size={16} color="#6B7280" />
                      <Text style={styles.jobDetailsText}>
                        {selectedJob.children.length} child{selectedJob.children.length > 1 ? 'ren' : ''}
                        {selectedJob.children.map(child => ` ${child.name} (${child.age})`).join(', ')}
                      </Text>
                    </View>
                  )}
                  {selectedJob.users?.email && (
                    <View style={styles.jobDetailsRow}>
                      <Ionicons name="mail" size={16} color="#6B7280" />
                      <Text style={styles.jobDetailsText}>{selectedJob.users.email}</Text>
                    </View>
                  )}
                  {selectedJob.users?.phone && (
                    <View style={styles.jobDetailsRow}>
                      <Ionicons name="call" size={16} color="#6B7280" />
                      <Text style={styles.jobDetailsText}>{selectedJob.users.phone}</Text>
                    </View>
                  )}
                </View>
                
                {selectedJob.description && (
                  <View style={styles.jobDetailsSection}>
                    <Text style={styles.jobDetailsSectionTitle}>Job Description</Text>
                    <Text style={styles.jobDetailsDescription}>{String(selectedJob.description)}</Text>
                  </View>
                )}
                
                {selectedJob.children?.length > 0 && (
                  <View style={styles.jobDetailsSection}>
                    <Text style={styles.jobDetailsSectionTitle}>Children Information</Text>
                    {selectedJob.children.map((child, index) => (
                      <View key={index} style={styles.applicationStatusCard}>
                        <Text style={styles.applicationStatusText}>{child.name} - Age {child.age}</Text>
                        {child.allergies && (
                          <Text style={styles.coverLetterText}>Allergies: {child.allergies}</Text>
                        )}
                        {child.preferences && (
                          <Text style={styles.coverLetterText}>Notes: {child.preferences}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
                
                {Array.isArray(selectedJob.requirements) && selectedJob.requirements.length > 0 && (
                  <View style={styles.jobDetailsRequirements}>
                    <Text style={styles.jobDetailsRequirementsTitle}>Requirements</Text>
                    {selectedJob.requirements.map((req, idx) => (
                      <View key={idx} style={styles.jobDetailsRequirementRow}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={styles.jobDetailsRequirementText}>{String(req)}</Text>
                      </View>
                    ))}
                  </View>
                )}
                
                {/* Application Status */}
                {(() => {
                  // Check if this job view is from applications tab (has applicationData)
                  const applicationData = selectedJob?.applicationData;
                  
                  // Fallback to finding application in applications array
                  const application = applicationData || applications.find(app => 
                    (app.jobId || app.job_id || app.job?.id || app.job?._id) === (selectedJob.id || selectedJob._id)
                  );
                  
                  if (application || applicationData) {
                    const appData = applicationData || application;
                    return (
                      <View style={styles.jobDetailsSection}>
                        <Text style={styles.jobDetailsSectionTitle}>Your Application</Text>
                        <View style={styles.applicationStatusCard}>
                          <View style={styles.applicationStatusHeader}>
                            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                            <Text style={styles.applicationStatusText}>
                              Applied on {new Date(appData.appliedDate || appData.applied_at || Date.now()).toLocaleDateString()}
                            </Text>
                          </View>
                          <Text style={styles.applicationStatusLabel}>
                            Status: {appData.applicationStatus || appData.status || 'Pending'}
                          </Text>
                          
                          {appData.proposedRate && (
                            <View style={styles.coverLetterPreview}>
                              <Text style={styles.coverLetterLabel}>Your Proposed Rate:</Text>
                              <Text style={styles.applicationStatusText}>₱{appData.proposedRate}/hr</Text>
                            </View>
                          )}
                          
                          {(appData.coverLetter || appData.message) && (
                            <View style={styles.coverLetterPreview}>
                              <Text style={styles.coverLetterLabel}>Your Message:</Text>
                              <Text style={styles.coverLetterText}>{appData.coverLetter || appData.message}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  }
                  return null;
                })()}
                
                <View style={styles.jobDetailsActions}>
                  <Button 
                    mode="contained" 
                    onPress={() => { setShowJobDetails(false); setSelectedJob(null) }}
                    style={styles.jobDetailsCloseButton}
                    labelStyle={{ fontSize: 14 }}
                  >
                    Close
                  </Button>
                </View>
              </View>
            </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {renderToast()}
      
      <PrivacyNotificationModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        requests={pendingRequests}
      />
      
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        user={user}
        userType={user?.role || 'caregiver'}
        colors={{ primary: '#3B82F6' }}
      />
      
      <RequestInfoModal
        visible={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        targetUser={{ id: 'sample', name: 'Parent' }}
        colors={{ primary: '#3B82F6' }}
      />
      
      <Modal
        visible={showReviewForm}
        animationType="slide"
        onRequestClose={handleCloseReviewModal}
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.applicationModal, { maxHeight: '80%' }]}
          >
            <ReviewForm
              onSubmit={handleSubmitReview}
              onCancel={handleCloseReviewModal}
              initialRating={selectedReview?.rating || 0}
              initialComment={selectedReview?.comment || ''}
              submitLabel={selectedReview ? 'Update Review' : 'Submit Review'}
              heading={selectedReview ? 'Update Your Feedback' : 'Share Your Experience'}
              enableImageUpload={false}
            />
            {reviewSubmitting && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.loadingText}>Saving review...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        user={user}
        userType="caregiver"
        colors={{ primary: '#3B82F6' }}
      />

      {/* Request Info Modal */}
      <RequestInfoModal
        visible={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        targetUser={user}
        onSuccess={() => {
          setShowRequestModal(false);
          showToast('Request sent successfully!', 'success');
        }}
      />

      {/* Highlight Request Modal */}
      <Modal
        visible={showHighlightRequestModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowHighlightRequestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.highlightModalCard}>
            <View style={styles.highlightModalHeader}>
              <View style={styles.highlightModalTitleRow}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={styles.highlightModalTitle}>Request a Highlight</Text>
                  <Text style={styles.highlightModalSubtitle}>
                    Choose a family you've recently worked with to ask for a highlight on your profile.
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setShowHighlightRequestModal(false);
                    setSelectedFamilyForHighlight(null);
                  }}
                  style={styles.highlightCloseButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close highlight request"
                >
                  <Ionicons name="close" size={22} color="#4B5563" />
                </Pressable>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.highlightBody}
              contentContainerStyle={styles.highlightBodyContent}
            >
              <View style={styles.highlightSection}>
                <Text style={styles.highlightSectionTitle}>Recent Families</Text>
                <Text style={styles.highlightSectionDescription}>
                  Highlights help families understand why others loved working with you. Select a recent booking or application below.
                </Text>

                <View style={styles.highlightFamiliesList}>
                  {recentHighlightFamilies.map((item, index) => {
                    const isSelected = selectedFamilyForHighlight?.key === item.key;
                    const isLast = index === recentHighlightFamilies.length - 1;

                    const handleSelectFamily = () => {
                      if (isSelected) {
                        setSelectedFamilyForHighlight(null);
                      } else {
                        setSelectedFamilyForHighlight({
                          key: item.key,
                          id: item.id,
                          name: item.name,
                          type: item.type,
                        });
                      }
                    };

                    return (
                      <Pressable
                        key={item.key}
                        style={[
                          styles.highlightFamilyItem,
                          isSelected && styles.highlightFamilySelected,
                          isLast && styles.highlightFamilyItemLast,
                        ]}
                        onPress={handleSelectFamily}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        android_ripple={{ color: 'rgba(99,102,241,0.12)' }}
                      >
                        <View style={styles.highlightFamilyRow}>
                          <View style={styles.highlightFamilyInfo}>
                            <View style={styles.highlightFamilyIconWrap}>
                              <Ionicons
                                name={item.iconName}
                                size={20}
                                color={isSelected ? '#4338CA' : '#6366F1'}
                              />
                            </View>
                            <View style={styles.highlightFamilyText}>
                              <Text style={styles.highlightFamilyName}>{item.name}</Text>
                              <Text style={styles.highlightFamilyMeta}>{item.statusLabel}</Text>
                            </View>
                          </View>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={22} color="#4338CA" />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}

                  {recentHighlightFamilies.length === 0 && (
                    <View style={styles.highlightEmptyState}>
                      <View style={styles.highlightEmptyIcon}>
                        <Ionicons name="sparkles-outline" size={28} color="#9CA3AF" />
                      </View>
                      <Text style={styles.highlightEmptyTitle}>No families available yet</Text>
                      <Text style={styles.highlightEmptySubtitle}>
                        Once you complete bookings or engage with families, they will appear here so you can request a highlight.
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.highlightSection}>
                <View style={styles.highlightHintBox}>
                  <Ionicons name="information-circle-outline" size={18} color="#6366F1" style={styles.highlightHintIcon} />
                  <Text style={styles.highlightHintText}>
                    Families receive a friendly message summarizing why highlights matter. You can add a personal note after selecting a family.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.highlightFooter}>
              <View style={styles.highlightFooterActions}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setShowHighlightRequestModal(false);
                    setSelectedFamilyForHighlight(null);
                  }}
                  style={[styles.highlightSecondaryButton, styles.highlightActionButton]}
                  labelStyle={styles.highlightSecondaryLabel}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={() => {
                    if (selectedFamilyForHighlight) {
                      handleSendHighlightRequest(
                        selectedFamilyForHighlight.id,
                        selectedFamilyForHighlight.name
                      );
                    } else {
                      showToast('Please select a family first', 'error');
                    }
                  }}
                  style={[styles.highlightPrimaryButton, styles.highlightActionButton]}
                  loading={highlightRequestSending}
                  disabled={highlightRequestSending || !selectedFamilyForHighlight}
                >
                  <View style={styles.highlightPrimaryContent}>
                    <Ionicons name="send" size={18} color="#FFFFFF" />
                    <Text style={styles.highlightPrimaryText}>
                      {highlightRequestSending ? 'Sending…' : 'Send Request'}
                    </Text>
                  </View>
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      </View>
  );
}

export default CaregiverDashboard;
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, Modal, Platform, Pressable, Linking as RNLinking, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { Button } from "react-native-paper";
import Toast from "../components/ui/feedback/Toast";
import { SettingsModal } from '../components/ui/modals/SettingsModal';
import { useAuth } from "../contexts/AuthContext";
import { useHighlightRequest } from '../hooks/useHighlightRequest';
import { useNotificationCounts } from '../hooks/useNotificationCounts';
import { supabaseService } from '../services/supabase';
import { contractService } from '../services/supabase/contractService';
import { reviewService } from '../services/supabase/reviewService';
import CaregiverDashboardHeader from './CaregiverDashboard/CaregiverDashboardHeader';
import CaregiverReviewsTab from './CaregiverDashboard/CaregiverReviewsTab';

import {
  FormInput,
  ModalWrapper,
  QuickAction,
  QuickStat,
  Button as SharedButton,
  Card as SharedCard,
  StatusBadge,
} from '../shared/ui';
import {
  buildJobScheduleLabel,
  formatPeso,
  getRatingStats
} from './CaregiverDashboard/utils';

import ContractModal from '../components/modals/ContractModal';
import { useCaregiverDashboard } from '../hooks/useCaregiverDashboard';
import { RequestInfoModal } from '../shared/ui/modals';
import { BookingDetailsModal } from '../shared/ui/modals/BookingDetailsModal';
import { normalizeCaregiverReviewsForList } from '../utils/reviews';
import ApplicationsTab from './CaregiverDashboard/ApplicationsTab';
import CaregiverBookingsTabWithModal from './CaregiverDashboard/BookingsTab';
import CaregiverProfileSection from './CaregiverDashboard/components/CaregiverProfileSection';
import MessagesTab from './CaregiverDashboard/components/MessagesTab';
import NotificationsTab from './CaregiverDashboard/components/NotificationsTab';
import JobsTab, { CaregiverJobCard } from './CaregiverDashboard/JobsTab';
import { styles } from './styles/CaregiverDashboard.styles';
// Lines 27-42 - Added usePrivacy import
import { usePrivacy } from '../components/features/privacy/PrivacyManager'; // 
import PrivacyNotificationModal from '../components/features/privacy/PrivacyNotificationModal';
import { ReviewForm } from '../components/forms/ReviewForm';
import RatingsReviewsModal from '../components/ui/modals/RatingsReviewsModal';

// =============================================================================
// SKELETON COMPONENTS
// =============================================================================

const SkeletonCard = ({ children, style }) => (
  <View style={[styles.dashboardSkeletonCard, style]}>
    {children}
  </View>
);

const SkeletonCircle = ({ size }) => (
  <View style={[styles.dashboardSkeletonCircle, { width: size, height: size }]} />
);

const SkeletonBlock = ({ width, height, style }) => (
  <View style={[styles.dashboardSkeletonBlock, { width, height }, style]} />
);

const SkeletonPill = ({ width, height, style }) => (
  <View style={[styles.dashboardSkeletonPill, { width, height }, style]} />
);

// =============================================================================
// REUSABLE COMPONENTS
// =============================================================================

const CaregiverDashboard = () => {
  const navigation = useNavigation()
  const route = useRoute()
  const { user, signOut } = useAuth()
  const onLogout = route?.params?.onLogout
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
    jobs, applications, setApplications, bookings, contracts,
    jobsLoading,
    loadProfile, fetchJobs, fetchApplications, fetchContracts, fetchBookings
  } = useCaregiverDashboard();
  const { pendingRequests } = usePrivacy();
  const { counts: notificationCounts } = useNotificationCounts();

  // Debug notification counts
  console.log(' CaregiverDashboard notification counts:', notificationCounts);

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
  const [pendingContractToOpen, setPendingContractToOpen] = useState(null)
  const [contractModalVisible, setContractModalVisible] = useState(false)
  const [selectedContract, setSelectedContract] = useState(null)
  const [selectedContractBooking, setSelectedContractBooking] = useState(null)
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
  const [requestInfoTarget, setRequestInfoTarget] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Add missing handleGetDirections function
  const handleGetDirections = (booking) => {
    if (booking?.location) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.location)}`;
      Linking.openURL(mapsUrl).catch(err => {
        console.error('Error opening maps:', err);
        Alert.alert('Error', 'Could not open maps. Please check if you have a maps app installed.');
      });
    }
  };

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
  }, [loadProfile, fetchJobs, fetchApplications, fetchBookings, fetchCaregiverReviews]);

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

  const requestInfoTargets = useMemo(() => {
    const unique = new Map();
    const registerTarget = (rawId, name, avatar = null) => {
      const normalizedId = rawId ? String(rawId).trim() : '';
      if (!normalizedId || unique.has(normalizedId)) {
        return;
      }
      unique.set(normalizedId, {
        id: normalizedId,
        name: name || 'Family',
        avatar,
      });
    };

    (bookings || []).forEach((booking = {}) => {
      const client = booking.clientId;
      const parentId =
        booking.parentId ||
        (typeof client === 'object' ? client?.id || client?._id : client) ||
        booking.createdBy ||
        booking.familyId ||
        booking.parent?.id ||
        booking.parent_id;

      const parentName =
        booking.family ||
        booking.parentName ||
        (typeof client === 'object' ? client?.name || client?.fullName : null) ||
        booking.parent?.name ||
        'Family';

      const avatar =
        (typeof client === 'object' && (client?.avatar || client?.profileImage)) ||
        booking.parent?.avatar ||
        booking.parent?.profileImage ||
        null;

      registerTarget(parentId, parentName, avatar);
    });

    (applications || []).forEach((application = {}) => {
      const parent =
        application.parent ||
        application.parentInfo ||
        application.parentProfile ||
        {};

      const parentId =
        parent.id ||
        application.parent_id ||
        application.parentId ||
        application.userId ||
        application.createdBy;

      const parentName =
        parent.name ||
        parent.fullName ||
        application.family ||
        application.familyName ||
        application.parentName ||
        'Family';

      const avatar = parent.avatar || parent.profileImage || null;

      registerTarget(parentId, parentName, avatar);
    });

    return Array.from(unique.values());
  }, [applications, bookings]);

  useEffect(() => {
    if (!requestInfoTargets.length) {
      setRequestInfoTarget(null);
      return;
    }

    setRequestInfoTarget((previous) => {
      if (previous?.id && requestInfoTargets.some((target) => target.id === previous.id)) {
        return previous;
      }
      return requestInfoTargets[0];
    });
  }, [requestInfoTargets]);

  const handleOpenRequestInfoModal = useCallback(() => {
    if (!requestInfoTargets.length) {
      showToast('No families available yet. Connect with families through bookings or applications first.', 'info');
      return;
    }

    setRequestInfoTarget((previous) => {
      if (previous?.id && requestInfoTargets.some((target) => target.id === previous.id)) {
        return previous;
      }
      return requestInfoTargets[0];
    });
    setShowRequestModal(true);
  }, [requestInfoTargets, showToast]);

  const handleCloseRequestInfoModal = useCallback(() => {
    setShowRequestModal(false);
  }, []);

  const handleRequestInfoTargetChange = useCallback((target) => {
    if (!target?.id) {
      return;
    }
    setRequestInfoTarget(target);
  }, []);

  const handleRequestInfoSuccess = useCallback((target) => {
    setShowRequestModal(false);
    showToast(`Request sent to ${target?.name || 'the family'}!`, 'success');
  }, [showToast]);

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

    console.log(' CaregiverDashboard - Force refresh triggered by route params');
    loadProfile();

    if (navigation?.setParams) {
      navigation.setParams({ refreshProfile: undefined });
    }
  }, [route?.params?.refreshProfile, loadProfile, navigation]);

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
    console.log(' Viewing job:', job);
    console.log(' Job data keys:', Object.keys(job || {}));
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
        {
          message: coverLetter || '',
          proposedRate,
        }
      );

      if (response) {
        // Create Firebase connection between caregiver and job poster (parent)
        const parentId = matchedJob?.parentId || matchedJob?.userId || matchedJob?.createdBy;

        if (parentId && parentId !== user?.id) {
          try {
            console.log(' Creating Supabase conversation for application:', { caregiverId: user.id, parentId });
            await supabaseService.messaging.getOrCreateConversation(user.id, parentId);
            console.log(' Supabase conversation created successfully');
          } catch (connectionError) {
            console.warn(' Failed to create Supabase conversation:', connectionError.message);
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
      console.log(' Saving profile from dashboard...');
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

      console.log(' Dashboard payload:', payload);

      if (isCaregiver) {
        await supabaseService.user.updateProfile(user.id, payload);
      } else {
        await supabaseService.user.updateProfile(user.id, { name: payload.name });
      }

      await loadProfile()

      showToast('Profile changes saved.', 'success')
      setEditProfileModalVisible(false)
    } catch (e) {
      console.error(' Save profile failed:', e?.message || e)
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

  const handleOpenContractFromApplication = useCallback(async ({ contractId, bookingId }) => {
    if (!contractId) {
      Alert.alert('Contract unavailable', 'This application does not have an associated contract yet.');
      return;
    }

    try {
      const [contractData, bookingData] = await Promise.all([
        contractService.getContractById(contractId),
        bookingId ? supabaseService.bookings.getBookingById(bookingId, user?.id) : null
      ]);

      if (!contractData) {
        Alert.alert('Contract unavailable', 'We could not load the contract. Please refresh and try again.');
        return;
      }

      setSelectedContract(contractData);
      setSelectedContractBooking(bookingData || null);
      setContractModalVisible(true);
    } catch (error) {
      console.error(' Failed to open caregiver contract from applications tab:', error);
      Alert.alert('Error', 'Failed to open contract. Please try again.');
    }
  }, [user?.id]);

  const handleCloseContractModal = useCallback(() => {
    setContractModalVisible(false);
    setSelectedContract(null);
    setSelectedContractBooking(null);
  }, []);

  const handleContractSignFromModal = useCallback(async ({ signature, acknowledged }) => {
    if (!selectedContract) {
      return;
    }

    try {
      const contractRecord = await contractService.getContractById(selectedContract.id);
      if (!contractRecord) {
        Alert.alert('Contract unavailable', 'This contract could not be found. Please refresh and try again.');
        handleCloseContractModal();
        return;
      }

      try {
        await contractService.signContract(contractRecord.id, 'caregiver', {
          signature,
          signatureHash: btoa(signature),
          ipAddress: null,
          acknowledged
        });
      } catch (error) {
        if (error?.code === 'CONTRACT_NOT_FOUND') {
          Alert.alert('Contract unavailable', 'This contract could not be found. Please refresh and try again.');
          handleCloseContractModal();
          return;
        }

        if (error?.code === 'CONTRACT_ACTIVE_CONFLICT') {
          Alert.alert(
            'Contract already active',
            'There is already an active contract for this booking. Please view or sign that contract instead.'
          );
          handleCloseContractModal();
          await Promise.all([
            fetchApplications?.(),
            fetchContracts?.(),
            fetchBookings?.()
          ]);
          return;
        }

        throw error;
      }

      Alert.alert('Success', 'Contract signed successfully!');
      handleCloseContractModal();
      await Promise.all([
        fetchApplications?.(),
        fetchContracts?.(),
        fetchBookings?.()
      ]);
    } catch (error) {
      console.error('Error signing caregiver contract:', error);
      Alert.alert('Error', error?.message || 'Failed to sign contract. Please try again.');
    }
  }, [fetchApplications, fetchBookings, fetchContracts, handleCloseContractModal, selectedContract]);

  const handleResendContract = useCallback(async (contract) => {
    if (!contract?.id) return;

    try {
      await contractService.resendContract(contract.id, user?.id);
      Alert.alert('Success', 'Contract reminder sent!');
    } catch (error) {
      console.error('Error resending caregiver contract:', error);
      Alert.alert('Error', 'Failed to send reminder. Please try again.');
    }
  }, [user?.id]);

  const handleDownloadContractPdf = useCallback(async (contract) => {
    if (!contract?.id) return;

    try {
      const result = await contractService.generateContractPdf(contract.id, { autoDownload: true });

      if (!result?.uri && !result?.url) {
        throw new Error('Download did not return a file location.');
      }

      const fileUri = result.uri || result.url;
      const isLocalFile = typeof fileUri === 'string' && fileUri.startsWith('file://');

      let handled = false;

      if (isLocalFile) {
        if (Platform.OS === 'android') {
          Alert.alert('Downloaded', `PDF saved at:\n${fileUri}`);
          handled = true;
        } else if (Platform.OS === 'ios') {
          Alert.alert('Downloaded', 'PDF saved. Open it through the Files app.');
          handled = true;
        }
      } else {
        try {
          if (WebBrowser?.openBrowserAsync && Platform.OS !== 'web') {
            await WebBrowser.openBrowserAsync(fileUri, { presentationStyle: 'automatic' });
            handled = true;
          }
        } catch (browserError) {
          console.warn('Failed to open contract PDF in in-app browser:', browserError);
        }

        if (!handled) {
          try {
            await RNLinking.openURL(fileUri);
            handled = true;
          } catch (linkError) {
            console.warn('Failed to open contract PDF URL:', linkError);
          }
        }
      }

      if (!handled) {
        Alert.alert('Download complete', `PDF available at:\n${fileUri}`);
      }
    } catch (error) {
      console.error('Error downloading caregiver contract PDF:', error);
      Alert.alert('Download failed', error instanceof Error ? error.message : String(error));
    }
  }, []);

  const renderTopNav = () => {
    const pendingRequestsCount = pendingRequests?.length || 0;
    const totalUnread = notificationCounts.notifications + pendingRequestsCount;

    const tabs = [
      { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
      { id: 'jobs', label: 'Jobs', icon: 'briefcase', badgeCount: notificationCounts.jobs },
      { id: 'applications', label: 'Applications', icon: 'document-text' },
      { id: 'bookings', label: 'Bookings', icon: 'calendar', badgeCount: notificationCounts.bookings },
      { id: 'messages', label: 'Messages', icon: 'chatbubble-ellipses-outline', badgeCount: notificationCounts.messages },
      { id: 'reviews', label: 'Reviews', icon: 'star', badgeCount: notificationCounts.reviews },
      { id: 'notifications', label: 'Notifications', icon: 'notifications-outline', badgeCount: totalUnread },
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

  const {
    completedJobsCount,
    completedJobsSubtitle,
    trustScoreValue,
    trustScoreSubtitle,
  } = useMemo(() => {
    const jobsCount = Number(profile?.completedJobs ?? 0);

    const jobsSubtitle = jobsCount === 0
      ? 'No jobs completed yet'
      : jobsCount === 1
        ? '1 job completed'
        : `${jobsCount} jobs completed`;

    const rawTrustScore =
      profile?.verification?.trustScore ??
      profile?.trustScore ??
      0;

    const trustScoreValue = Number(rawTrustScore) || 0;
    const trustScoreSubtitle =
      trustScoreValue > 0 ? 'Verified trust score' : 'Build your trust score';

    return {
      completedJobsCount: jobsCount,
      completedJobsSubtitle: jobsSubtitle,
      trustScoreValue,
      trustScoreSubtitle,
    };
  }, [profile]);

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
            onPress={handleOpenRatings}
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
            <View style={[styles.reviewsSummaryIconWrap, { backgroundColor: `${item.accent}1A` }]}>
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

  const handleOpenRatings = useCallback(async () => {
    await preloadCaregiverReviews();
    setShowRatingsModal(true);
  }, [preloadCaregiverReviews]);

  return (
    <Fragment>
      <View style={styles.container}>
        <CaregiverDashboardHeader
          notificationCounts={notificationCounts}
          pendingRequests={pendingRequests}
          onNavigateMessages={() => setActiveTab('messages')}
          onOpenPrivacyRequests={() => setShowNotifications(true)}
          onNavigateNotifications={() => setActiveTab('notifications')}
          onOpenRequestModal={handleOpenRequestInfoModal}
          requestInfoDisabled={!requestInfoTargets.length}
          onOpenSettings={() => setShowSettings(true)}
          onNavigateProfile={() => {
            try {
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
                profile: completeProfile,
              });
            } catch (error) {
              console.error('Profile navigation error:', error);
              Alert.alert('Navigation Error', 'Failed to open profile. Please try again.');
            }
          }}
          onLogout={async () => {
            console.log('🚪 Caregiver logout initiated…');
            if (onLogout) {
              await onLogout();
            } else {
              await signOut();
            }
            console.log('✅ Logout completed');
          }}
        />
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
                    subtitle={ratingStatSubtitle}
                    ctaLabel={ratingStatCTA}
                    accessibilityHint="Shows detailed caregiver ratings and reviews"
                    onPress={handleOpenRatings}
                    showArrow
                  />
                  <QuickStat
                    icon="briefcase"
                    value={String(completedJobsCount)}
                    label="Jobs Done"
                    color="#10B981"
                    bgColor="#D1FAE5"
                    styles={styles}
                    subtitle={completedJobsSubtitle}
                    showTrend={completedJobsCount > 0}
                  />
                  <QuickStat
                    icon="chatbubble"
                    value={profile?.responseRate || "0%"}
                    label="Response Rate"
                    color="#3B82F6"
                    bgColor="#DBEAFE"
                    styles={styles}
                    showTrend={Number.parseInt(String(profile?.responseRate || '0').replace(/[^\d]/g, ''), 10) > 0}
                  />
                  <QuickStat
                    icon="checkmark-circle"
                    value={trustScoreValue > 0 ? String(trustScoreValue) : '—'}
                    label="Trust Score"
                    color="#8B5CF6"
                    bgColor="#EDE9FE"
                    styles={styles}
                    subtitle={trustScoreSubtitle}
                    showBadge={profile?.verification?.verified}
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
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.enhancedProfileCard}
                  >
                    <View style={styles.enhancedProfileContent}>
                      <View style={styles.enhancedProfileHeader}>
                        <View style={styles.enhancedProfileIcon}>
                          <Ionicons name="sparkles" size={24} color="#FFFFFF" />
                        </View>
                        <View style={styles.enhancedProfileText}>
                          <Text style={styles.enhancedProfileTitle}>Complete Your Enhanced Profile</Text>
                          <Text style={styles.enhancedProfileDescription}>
                            Add documents, certifications, and portfolio to stand out and get more bookings
                          </Text>
                        </View>
                      </View>
                      <Pressable
                        style={styles.enhancedProfileButton}
                        onPress={() => {
                          try {
                            navigation.navigate('EnhancedCaregiverProfileWizard', {
                              isEdit: true,
                              existingProfile: profile,
                            });
                          } catch (error) {
                            console.error('Navigation error:', error);
                            Alert.alert('Navigation Error', 'Failed to open profile wizard. Please try again.');
                          }
                        }}
                      >
                        <Text style={styles.enhancedProfileButtonText}>Complete Profile</Text>
                        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  </LinearGradient>
                </View>

                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionHeaderMain}>
                      <Ionicons name="briefcase" size={20} color="#1F2937" />
                      <Text style={styles.sectionTitle}>Recommended Jobs</Text>
                    </View>
                    <Pressable
                      style={styles.seeAllButton}
                      onPress={() => setActiveTab('jobs')}
                    >
                      <Text style={styles.seeAllText}>See All</Text>
                      <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
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
                    <View style={styles.sectionHeaderMain}>
                      <Ionicons name="document-text" size={20} color="#1F2937" />
                      <Text style={styles.sectionTitle}>Recent Applications</Text>
                    </View>
                    <Pressable
                      style={styles.seeAllButton}
                      onPress={() => setActiveTab("applications")}
                    >
                      <Text style={styles.seeAllText}>View All</Text>
                      <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
                    </Pressable>
                  </View>
                  {(applications || []).slice(0, 2).map((application, index) => (
                    <View key={application.id || index} style={styles.enhancedApplicationCard}>
                      <View style={styles.applicationCardHeader}>
                        <View style={styles.applicationCardMain}>
                          <Text style={styles.applicationCardTitle} numberOfLines={1}>
                            {application.jobTitle || application.job?.title || 'Childcare Position'}
                          </Text>
                          <Text style={styles.applicationCardFamily}>
                            {application.family || application.job?.family || 'Family'}
                          </Text>
                        </View>
                        <StatusBadge
                          status={application.status}
                          style={styles.applicationStatusBadge}
                        />
                      </View>

                      <View style={styles.applicationCardDetails}>
                        <View style={styles.applicationDetailItem}>
                          <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                          <Text style={styles.applicationDetailTextInline}>
                            Applied {application.appliedDate ? new Date(application.appliedDate).toLocaleDateString() : 'Recently'}
                          </Text>
                        </View>
                        {application.proposedRate && (
                          <View style={styles.applicationDetailItem}>
                            <Ionicons name="cash-outline" size={14} color="#6B7280" />
                            <Text style={styles.applicationDetailTextInline}>
                              ₱{application.proposedRate}/hr
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.applicationCardActions}>
                        <Pressable
                          style={styles.secondaryButton}
                          onPress={() => handleViewApplication(application)}
                        >
                          <Text style={styles.secondaryButtonText}>View Details</Text>
                        </Pressable>
                        <Pressable
                          style={[
                            styles.primaryButton,
                            application.status !== 'accepted' && styles.primaryButtonDisabled,
                          ]}
                          onPress={() => handleMessageFamily(application)}
                          disabled={application.status !== 'accepted'}
                        >
                          <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" />
                          <Text style={styles.primaryButtonText}>Message</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionHeaderMain}>
                      <Ionicons name="calendar" size={20} color="#1F2937" />
                      <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
                    </View>
                    <Pressable
                      style={styles.seeAllButton}
                      onPress={() => setActiveTab('bookings')}
                    >
                      <Text style={styles.seeAllText}>See All</Text>
                      <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
                    </Pressable>
                  </View>
                  {(bookings || []).slice(0, 2).map((booking, index) => {
                    const bookingId = booking?.id || booking?._id;
                    const status = String(booking?.status || 'Unknown');
                    const statusLower = status.toLowerCase();
                    const familyName = booking?.family || booking?.familyName || 'Family';
                    const bookingDate = booking?.date ? new Date(booking.date).toLocaleDateString() : 'Date TBD';
                    const startTime = booking?.start_time || booking?.startTime;
                    const endTime = booking?.end_time || booking?.endTime;
                    const formattedTime = booking?.time ||
                      (startTime && endTime ? `${startTime} - ${endTime}` : startTime || endTime || 'Time TBD');
                    const childrenCount = booking?.children || booking?.numberOfChildren || booking?.childrenCount;
                    const childrenLabel = `${childrenCount || 1} ${(childrenCount || 1) === 1 ? 'child' : 'children'}`;
                    const locationLabel = booking?.location || booking?.address;
                    const hourlyRate = booking?.hourlyRate || booking?.hourly_rate;
                    const rateLabel = hourlyRate ? `${formatPeso(hourlyRate)}/hr` : null;

                    return (
                      <View key={bookingId || index} style={styles.dashboardBookingCard}>
                        <LinearGradient
                          colors={['#667eea', '#764ba2']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.dashboardBookingHeader}
                        >
                          <View style={styles.dashboardBookingHeaderContent}>
                            <View style={styles.dashboardBookingTitleContainer}>
                              <Text style={styles.dashboardBookingTitle} numberOfLines={1}>
                                {familyName}
                              </Text>
                              <Text style={styles.dashboardBookingSubtitle}>{bookingDate}</Text>
                            </View>
                            <View
                              style={[styles.dashboardBookingStatusBadge, styles[`dashboardBookingStatus_${statusLower}`]]}
                            >
                              <Text style={styles.dashboardBookingStatusText}>{status}</Text>
                            </View>
                          </View>
                        </LinearGradient>

                        <View style={styles.dashboardBookingContent}>
                          <View style={styles.dashboardBookingMetaRow}>
                            <View style={styles.dashboardBookingMetaChip}>
                              <Ionicons name="time-outline" size={14} color="#2563EB" />
                              <Text style={styles.dashboardBookingMetaText}>{formattedTime}</Text>
                            </View>
                            <View style={styles.dashboardBookingMetaChip}>
                              <Ionicons name="people-outline" size={14} color="#10B981" />
                              <Text style={styles.dashboardBookingMetaText}>{childrenLabel}</Text>
                            </View>
                            {rateLabel ? (
                              <View style={styles.dashboardBookingMetaChip}>
                                <Ionicons name="cash-outline" size={14} color="#059669" />
                                <Text style={styles.dashboardBookingMetaText}>{rateLabel}</Text>
                              </View>
                            ) : null}
                          </View>

                          {locationLabel ? (
                            <Pressable
                              style={styles.dashboardBookingLocation}
                              onPress={() => handleGetDirections(booking)}
                            >
                              <Ionicons name="location-outline" size={16} color="#7C3AED" />
                              <Text style={styles.dashboardBookingLocationText} numberOfLines={1}>
                                {locationLabel}
                              </Text>
                              <Ionicons name="open-outline" size={16} color="#7C3AED" />
                            </Pressable>
                          ) : null}

                          <View style={styles.dashboardBookingActions}>
                            <Pressable
                              style={styles.dashboardBookingSecondaryButton}
                              onPress={() => {
                                setSelectedBooking(booking);
                                setShowBookingDetails(true);
                              }}
                            >
                              <Ionicons name="eye-outline" size={16} color="#1F2937" />
                              <Text style={styles.dashboardBookingSecondaryText}>Details</Text>
                            </Pressable>
                            <Pressable
                              style={styles.dashboardBookingPrimaryButton}
                              onPress={() => handleBookingMessage(booking)}
                            >
                              <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" />
                              <Text style={styles.dashboardBookingPrimaryText}>Message</Text>
                            </Pressable>
                          </View>

                          {statusLower === 'pending' ? (
                            <Pressable
                              style={styles.dashboardBookingConfirmButton}
                              onPress={() => handleConfirmAttendance(booking)}
                            >
                              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                              <Text style={styles.dashboardBookingConfirmText}>Confirm Attendance</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
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
              bookings={bookings}
              onOpenContract={handleOpenContractFromApplication}
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
            <CaregiverBookingsTabWithModal
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
              pendingContract={pendingContractToOpen}
              onPendingContractHandled={() => setPendingContractToOpen(null)}
              currentUserId={user?.id || null}
            />
          )}

          {activeTab === 'messages' && (
            <MessagesTab
              navigation={navigation}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          )}

          {activeTab === 'reviews' && (
            <CaregiverReviewsTab
              reviews={reviewsSorted}
              loading={reviewsLoading}
              refreshing={refreshingReviews}
              currentUserId={user?.id}
              onRefresh={refreshCaregiverReviews}
              onEditReview={(review) => {
                setSelectedReview(review);
                setShowReviewForm(true);
              }}
              onOpenRatings={handleOpenRatings}
              onRequestHighlight={handleGeneralHighlightRequest}
              highlightRequestSending={highlightRequestSending}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsTab
              navigation={navigation}
              onNavigateTab={async (tabId, payload) => {
                setActiveTab(tabId)

                if (!payload) {
                  return
                }

                if (payload.openPrivacyRequests) {
                  setShowNotifications(true)
                  return
                }

                if (payload.contractId) {
                  const opened = await openContractFromNotification({
                    contractId: payload.contractId,
                    bookingId: payload.bookingId,
                    source: 'notification-tab',
                  });

                  if (!opened) {
                    console.warn('⚠️ Contract navigation from notification did not succeed');
                  }

                  return;
                }

                const notificationData = payload.data || {}
                const deepLink = payload.deepLink || notificationData.bookingDeepLink

                if (deepLink?.tab === 'bookings' && deepLink?.params?.bookingId) {
                  try {
                    const bookingDetails = await supabaseService.bookings.getBookingById(
                      deepLink.params.bookingId,
                      user?.id
                    )

                    if (bookingDetails) {
                      setSelectedBooking(bookingDetails)
                      setShowBookingDetails(true)
                      return
                    }
                  } catch (error) {
                    console.warn('⚠️ Failed to load booking from notification:', error)
                  }
                }

                if (deepLink?.screen && navigation?.navigate) {
                  requestAnimationFrame(() => {
                    navigation.navigate(deepLink.screen, deepLink.params || {})
                  })
                }
              }}
              onRefresh={onRefresh}
            />
          )}

        </View>
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

      {showApplicationDetails && selectedApplication && (() => {
        const jobDetails = selectedApplication.job || {};
        const jobTitle = jobDetails.title || selectedApplication.jobTitle || 'Childcare Position';
        const familyLabel = jobDetails.family || selectedApplication.family || jobDetails.parentName || 'Family';
        const appliedDateRaw = jobDetails.appliedDate || selectedApplication.appliedDate;
        const appliedDateLabel = appliedDateRaw ? new Date(appliedDateRaw).toLocaleDateString() : null;
        const scheduleLabel = jobDetails.schedule
          || jobDetails.workingHours
          || jobDetails.time
          || (jobDetails.startTime && jobDetails.endTime ? `${jobDetails.startTime} - ${jobDetails.endTime}` : null)
          || (jobDetails.start_time && jobDetails.end_time ? `${jobDetails.start_time} - ${jobDetails.end_time}` : null)
          || 'Schedule to be discussed';
        const resolvePesoLabel = (value) => {
          if (value === null || value === undefined || value === '') return null;
          const numeric = Number(value);
          if (Number.isFinite(numeric)) {
            return `₱${numeric.toLocaleString('en-PH', { minimumFractionDigits: 0 })}/hr`;
          }
          return typeof value === 'string' ? value : null;
        };
        const jobRateLabel = resolvePesoLabel(
          jobDetails.hourlyRate ?? jobDetails.hourly_rate ?? jobDetails.rate ?? selectedApplication.hourlyRate
        );
        const proposedRateLabel = resolvePesoLabel(selectedApplication.proposedRate);
        const locationLabel = jobDetails.location || selectedApplication.location || jobDetails.address;
        const childrenSummaryLabel =
          jobDetails.childrenSummary ||
          selectedApplication.childrenSummary ||
          (Array.isArray(jobDetails.children) && jobDetails.children.length
            ? `${jobDetails.children.length} child${jobDetails.children.length > 1 ? 'ren' : ''}`
            : null)
          || (typeof jobDetails.childrenCount === 'number'
            ? `${jobDetails.childrenCount} child${jobDetails.childrenCount > 1 ? 'ren' : ''}`
            : null)
          || selectedApplication.childrenSummary;
        const messageBody = selectedApplication.coverLetter || selectedApplication.message;
        const descriptionBody = jobDetails.description;
        const requirementTags = Array.isArray(jobDetails.requirements)
          ? jobDetails.requirements.filter(Boolean)
          : [];
        const statusLower = String(selectedApplication.status || '').toLowerCase();
        const canMessageFamily = statusLower === 'accepted';
        const infoTiles = [
          scheduleLabel && { icon: 'time-outline', label: 'Schedule', value: scheduleLabel },
          jobRateLabel && { icon: 'cash-outline', label: 'Job Rate', value: jobRateLabel },
          proposedRateLabel && { icon: 'trending-up-outline', label: 'Your Proposed Rate', value: proposedRateLabel },
          childrenSummaryLabel && { icon: 'people-outline', label: 'Children', value: childrenSummaryLabel },
        ].filter(Boolean);
        const metaChips = [
          locationLabel && { icon: 'location-outline', text: locationLabel },
          appliedDateLabel && { icon: 'calendar-outline', text: `Applied ${appliedDateLabel}` },
        ].filter(Boolean);

        return (
          <Modal
            visible={showApplicationDetails}
            onRequestClose={() => setShowApplicationDetails(false)}
            transparent
            animationType="slide"
          >
            <View style={styles.modalOverlay}>
              <View style={styles.applicationModal}>
                <LinearGradient
                  colors={['#4F46E5', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.applicationHeroGradient}
                >
                  <View style={styles.applicationHeroTopRow}>
                    <View style={styles.applicationHeroContent}>
                      <Text style={styles.applicationHeroTitle} numberOfLines={2}>{String(jobTitle)}</Text>
                      <Text style={styles.applicationHeroSubtitle} numberOfLines={1}>{String(familyLabel)}</Text>

                      {metaChips.length > 0 && (
                        <View style={styles.applicationHeroMetaRow}>
                          {metaChips.map((chip, index) => (
                            <View key={`application-meta-${index}`} style={styles.applicationHeroMetaPill}>
                              <Ionicons name={chip.icon} size={14} color="#E0E7FF" />
                              <Text style={styles.applicationHeroMetaText}>{String(chip.text)}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>

                    <StatusBadge
                      status={selectedApplication.status}
                      showIcon
                      style={styles.applicationStatusBadge}
                    />
                  </View>
                </LinearGradient>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.applicationModalScroll}
                >
                  <View style={styles.applicationModalBody}>
                    {infoTiles.length > 0 && (
                      <View style={styles.applicationInfoGrid}>
                        {infoTiles.map((tile, index) => (
                          <View key={`application-info-${index}`} style={styles.applicationInfoTile}>
                            <Ionicons name={tile.icon} size={18} color="#4338CA" />
                            <Text style={styles.applicationInfoLabel}>{tile.label}</Text>
                            <Text style={styles.applicationInfoValue}>{String(tile.value)}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {messageBody && (
                      <View style={styles.applicationSection}>
                        <Text style={styles.applicationSectionTitle}>Your Message</Text>
                        <View style={styles.applicationSectionCard}>
                          <Text style={styles.applicationSectionCardText}>{String(messageBody)}</Text>
                        </View>
                      </View>
                    )}

                    {descriptionBody && (
                      <View style={styles.applicationSection}>
                        <Text style={styles.applicationSectionTitle}>Job Description</Text>
                        <View style={styles.applicationSectionCard}>
                          <Text style={styles.applicationSectionCardText}>{String(descriptionBody)}</Text>
                        </View>
                      </View>
                    )}

                    {requirementTags.length > 0 && (
                      <View style={styles.applicationSection}>
                        <Text style={styles.applicationSectionTitle}>Requirements</Text>
                        <View style={styles.applicationTagList}>
                          {requirementTags.map((req, index) => (
                            <View key={`application-tag-${index}`} style={styles.applicationTagChip}>
                              <Text style={styles.applicationTagChipText}>{String(req)}</Text>
                            </View>
                          ))}
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
                  <Button
                    mode="contained"
                    style={styles.submitButton}
                    onPress={() => {
                      if (!canMessageFamily) return;
                      setShowApplicationDetails(false);
                      handleMessageFamily(selectedApplication);
                    }}
                    disabled={!canMessageFamily}
                  >
                    {canMessageFamily ? 'Message Family' : 'Message Unavailable'}
                  </Button>
                </View>
              </View>
            </View>
          </Modal>
        );
      })()}

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
            <View style={styles.jobDetailsModal}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.jobDetailsContent}>
                  <View style={styles.jobDetailsHeader}>
                    <Text style={styles.jobDetailsTitle}>{String(selectedJob.title || 'Childcare Position')}</Text>
                    <Text style={styles.jobDetailsFamily}>{String(selectedJob.family || selectedJob.familyName || 'Family')}</Text>
                    {selectedJob.urgent && (
                      <View style={styles.jobDetailsPill}>
                        <Ionicons name="flash" color="#DC2626" size={14} />
                        <Text style={styles.jobDetailsPillText}>Urgent Need</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.jobDetailsInfo}>
                    <View style={styles.jobDetailsRow}>
                      <View style={styles.jobDetailsIcon}>
                        <Ionicons name="location" size={16} color="#1D4ED8" />
                      </View>
                      <Text style={styles.jobDetailsText}>{selectedJob.location || 'Location not specified'}</Text>
                    </View>
                    <View style={styles.jobDetailsRow}>
                      <View style={styles.jobDetailsIcon}>
                        <Ionicons name="calendar" size={16} color="#1D4ED8" />
                      </View>
                      <Text style={styles.jobDetailsText}>{selectedJob.date ? new Date(selectedJob.date).toLocaleDateString() : 'Date not specified'}</Text>
                    </View>
                    {(() => {
                      const scheduleLabel = buildJobScheduleLabel(selectedJob);
                      if (!scheduleLabel) return null;
                      return (
                        <View style={styles.jobDetailsRow}>
                          <View style={styles.jobDetailsIcon}>
                            <Ionicons name="time" size={16} color="#1D4ED8" />
                          </View>
                          <Text style={styles.jobDetailsText}>{scheduleLabel}</Text>
                        </View>
                      );
                    })()}
                    <View style={styles.jobDetailsRow}>
                      <View style={styles.jobDetailsIcon}>
                        <Ionicons name="cash" size={16} color="#059669" />
                      </View>
                      <Text style={[styles.jobDetailsText, { color: '#047857', fontWeight: '600' }]}> {formatPeso(selectedJob.hourly_rate || selectedJob.hourlyRate || 0)}/hr</Text>
                    </View>
                    {selectedJob.applicationData?.proposedRate && selectedJob.applicationData.proposedRate !== (selectedJob.hourly_rate || selectedJob.hourlyRate) && (
                      <View style={styles.jobDetailsRow}>
                        <View style={styles.jobDetailsIcon}>
                          <Ionicons name="trending-up" size={16} color="#3B82F6" />
                        </View>
                        <Text style={[styles.jobDetailsText, { color: '#3B82F6', fontWeight: '600' }]}>
                          {formatPeso(selectedJob.applicationData.proposedRate)}/hr (Your proposed rate)
                        </Text>
                      </View>
                    )}
                    {(() => {
                      const rawSchedule = buildJobScheduleLabel({
                        workingHours: selectedJob.applicationData?.schedule,
                        start_time: selectedJob.applicationData?.start_time,
                        end_time: selectedJob.applicationData?.end_time,
                        startTime: selectedJob.applicationData?.startTime,
                        endTime: selectedJob.applicationData?.endTime,
                      });
                      if (!rawSchedule) return null;
                      return (
                        <View style={styles.jobDetailsRow}>
                          <View style={styles.jobDetailsIcon}>
                            <Ionicons name="calendar-outline" size={16} color="#0EA5E9" />
                          </View>
                          <Text style={[styles.jobDetailsText, { color: '#0EA5E9' }]}>
                            {rawSchedule}
                          </Text>
                        </View>
                      );
                    })()}
                    {selectedJob.children?.length > 0 && (
                      <View style={styles.jobDetailsRow}>
                        <View style={styles.jobDetailsIcon}>
                          <Ionicons name="people" size={16} color="#1D4ED8" />
                        </View>
                        <Text style={styles.jobDetailsText}>
                          {selectedJob.children.length} child{selectedJob.children.length > 1 ? 'ren' : ''}
                          {selectedJob.children.map((child) => ` ${child.name} (${child.age})`).join(', ')}
                        </Text>
                      </View>
                    )}
                    {selectedJob.users?.email && (
                      <View style={styles.jobDetailsRow}>
                        <View style={styles.jobDetailsIcon}>
                          <Ionicons name="mail" size={16} color="#1D4ED8" />
                        </View>
                        <Text style={styles.jobDetailsText}>{selectedJob.users.email}</Text>
                      </View>
                    )}
                    {selectedJob.users?.phone && (
                      <View style={styles.jobDetailsRow}>
                        <View style={styles.jobDetailsIcon}>
                          <Ionicons name="call" size={16} color="#1D4ED8" />
                        </View>
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
                      <View style={styles.jobDetailsPillRow}>
                        {selectedJob.children.map((child, index) => (
                          <View key={index} style={styles.jobDetailsPill}>
                            <Ionicons name="person" size={14} color="#4338CA" />
                            <Text style={styles.jobDetailsPillText}>{child.name} · {child.age} yrs</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {Array.isArray(selectedJob.requirements) && selectedJob.requirements.length > 0 && (
                    <View style={styles.jobDetailsRequirements}>
                      <Text style={styles.jobDetailsRequirementsTitle}>Key Requirements</Text>
                      {selectedJob.requirements.map((req, idx) => (
                        <View key={idx} style={styles.jobDetailsRequirementRow}>
                          <Ionicons name="checkmark-circle" size={18} color="#10B981" />
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
                      onPress={() => { setShowJobDetails(false); setSelectedJob(null); }}
                      style={styles.jobDetailsPrimaryButton}
                      labelStyle={styles.jobDetailsPrimaryLabel}
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

      <RatingsReviewsModal
        visible={showRatingsModal}
        onClose={closeRatingsModal}
        caregiverId={user?.id}
        caregiverName={profile?.name || user?.name}
        currentUserId={user?.id}
        onPreload={preloadCaregiverReviews}
      />

      <PrivacyNotificationModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        requests={pendingRequests}
        subtitle="Manage requests for your personal information as a caregiver"
        emptyStateTitle="No privacy requests from parents"
        emptyStateMessage="You're all caught up—no pending caregiver requests."
      />

      <RequestInfoModal
        visible={showRequestModal}
        onClose={handleCloseRequestInfoModal}
        targetUser={requestInfoTarget}
        availableTargets={requestInfoTargets}
        onTargetChange={handleRequestInfoTargetChange}
        onSuccess={handleRequestInfoSuccess}
        userType="caregiver"
      />

      <Modal
        visible={showReviewForm}
        animationType="slide"
        onRequestClose={handleCloseReviewModal}
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.applicationModal, { maxHeight: '80%' }]}>
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
      {ContractModal && contractModalVisible && selectedContract && (
        <ContractModal
          visible={contractModalVisible}
          onClose={handleCloseContractModal}
          contract={selectedContract}
          booking={selectedContractBooking}
          viewerRole="caregiver"
          onSign={handleContractSignFromModal}
          onResend={handleResendContract}
          onDownloadPdf={handleDownloadContractPdf}
        />
      )}
    </Fragment>
  );
}

export default CaregiverDashboard;
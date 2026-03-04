import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from 'expo-linking';
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
import { WalletManagementTab } from './CaregiverDashboard/WalletManagementTab';
import { styles } from './styles/CaregiverDashboard.styles';

// Theme context import
import { useThemeContext } from '../contexts/ThemeContext';
import { StyleSheet } from 'react-native';

// Lines 27-42 - Added usePrivacy import
import { usePrivacy } from '../components/features/privacy/PrivacyManager';
import PrivacyNotificationModal from '../components/features/privacy/PrivacyNotificationModal';
// Import components directly instead of lazy loading to avoid bundle issues
import { SolanaPayment } from '../components/SolanaPayment';
import { WalletSetup } from '../components/WalletSetupSecure';
import ReviewForm from '../components/forms/ReviewForm';
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
  // Add theme context
  const { theme, isDark } = useThemeContext();

  // Create dynamic styles
  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      backgroundColor: theme.colors.background,
    },
    dashboardSkeletonContainer: {
      backgroundColor: theme.colors.background,
      paddingBottom: 20,
    },
    dashboardSkeletonCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    },
    dashboardSkeletonBlock: {
      backgroundColor: isDark ? theme.colors.surfaceVariant : '#E5E7EB',
    },
    dashboardSkeletonCircle: {
      backgroundColor: isDark ? theme.colors.surfaceVariant : '#E5E7EB',
    },
    dashboardSkeletonPill: {
      backgroundColor: isDark ? theme.colors.surfaceVariant : '#E5E7EB',
    },

    // Header styles
    headerContainer: {
      backgroundColor: theme.colors.surface,
      borderBottomColor: theme.colors.border,
    },
    headerText: {
      color: theme.colors.text,
    },
    headerSubtext: {
      color: theme.colors.textSecondary,
    },

    // Section styles
    section: {
      backgroundColor: theme.colors.background,
    },
    sectionHeader: {
      borderBottomColor: theme.colors.border,
    },
    sectionTitle: {
      color: theme.colors.text,
    },
    seeAllText: {
      color: theme.colors.primary,
    },

    // Application card styles
    enhancedApplicationCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.shadow || '#000000',
    },
    applicationCardTitle: {
      color: theme.colors.text,
    },
    applicationCardFamily: {
      color: theme.colors.textSecondary,
    },
    applicationDetailTextInline: {
      color: theme.colors.textSecondary,
    },

    // Booking card styles
    dashboardBookingCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.shadow || '#000000',
    },
    dashboardBookingLocationText: {
      color: theme.colors.textSecondary,
    },

    // Text styles
    textPrimary: {
      color: theme.colors.text,
    },
    textSecondary: {
      color: theme.colors.textSecondary,
    },

    // Button styles
    primaryButton: {
      backgroundColor: theme.colors.primary,
    },
    primaryButtonText: {
      color: theme.colors.onPrimary || '#FFFFFF',
    },
    primaryButtonDisabled: {
      backgroundColor: theme.colors.surfaceVariant,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderColor: theme.colors.border,
    },
    secondaryButtonText: {
      color: theme.colors.text,
    },
    dashboardBookingSecondaryButton: {
      backgroundColor: 'transparent',
      borderColor: theme.colors.border,
    },
    dashboardBookingSecondaryText: {
      color: theme.colors.text,
    },
    dashboardBookingPrimaryButton: {
      backgroundColor: theme.colors.primary,
    },
    dashboardBookingPrimaryText: {
      color: theme.colors.onPrimary || '#FFFFFF',
    },
    dashboardBookingConfirmButton: {
      backgroundColor: theme.colors.success,
    },
    dashboardBookingConfirmText: {
      color: theme.colors.onSuccess || '#FFFFFF',
    },

    // Modal styles
    modalOverlay: {
      backgroundColor: theme.colors.modalOverlay || 'rgba(0, 0, 0, 0.5)',
    },
    applicationModal: {
      backgroundColor: theme.colors.surface,
    },
    modalCloseButton: {
      backgroundColor: theme.colors.surfaceVariant,
    },

    // Input styles
    applicationInput: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      color: theme.colors.text,
    },
    applicationTextArea: {
      color: theme.colors.text,
    },
    inputLabel: {
      color: theme.colors.text,
    },
    suggestedCoverLettersContainer: {
      backgroundColor: theme.colors.surfaceVariant,
    },
    coverLetterChip: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    },
    coverLetterChipText: {
      color: theme.colors.textSecondary,
    },
    coverLetterChipSelected: {
      backgroundColor: theme.colors.primary + '20',
      borderColor: theme.colors.primary,
    },
    coverLetterChipTextSelected: {
      color: theme.colors.primary,
    },

    // Tab styles
    navContainer: {
      backgroundColor: theme.colors.surface,
      borderBottomColor: theme.colors.border,
    },
    navTab: {
      backgroundColor: theme.colors.surface,
    },
    navTabActive: {
      backgroundColor: theme.colors.primary + '15',
      borderBottomColor: theme.colors.primary,
    },
    navTabText: {
      color: theme.colors.text,
    },
    navTabTextActive: {
      color: theme.colors.primary,
    },

    // Notification badge
    notificationBadge: {
      backgroundColor: theme.colors.error,
    },
    notificationBadgeText: {
      color: theme.colors.onError || '#FFFFFF',
    },

    // Loading indicators
    loadingContainer: {
      backgroundColor: theme.colors.surface,
    },
    loadingText: {
      color: theme.colors.textSecondary,
    },

    // Job details modal
    jobDetailsModal: {
      backgroundColor: theme.colors.surface,
    },
    jobDetailsContent: {
      backgroundColor: theme.colors.surface,
    },
    jobDetailsHeader: {
      borderBottomColor: theme.colors.border,
    },
    jobDetailsTitle: {
      color: theme.colors.text,
    },
    jobDetailsFamily: {
      color: theme.colors.textSecondary,
    },
    jobDetailsText: {
      color: theme.colors.text,
    },
    jobDetailsDescription: {
      color: theme.colors.textSecondary,
    },
    jobDetailsSectionTitle: {
      color: theme.colors.text,
    },
    jobDetailsPillText: {
      color: theme.colors.textSecondary,
    },
    jobDetailsRequirementsTitle: {
      color: theme.colors.text,
    },
    jobDetailsRequirementText: {
      color: theme.colors.text,
    },

    // Highlight modal
    highlightModalCard: {
      backgroundColor: theme.colors.surface,
    },
    highlightModalTitle: {
      color: theme.colors.text,
    },
    highlightModalSubtitle: {
      color: theme.colors.textSecondary,
    },
    highlightSectionTitle: {
      color: theme.colors.text,
    },
    highlightSectionDescription: {
      color: theme.colors.textSecondary,
    },
    highlightFamilyName: {
      color: theme.colors.text,
    },
    highlightFamilyMeta: {
      color: theme.colors.textSecondary,
    },
    highlightHintText: {
      color: theme.colors.text,
    },
    highlightEmptyTitle: {
      color: theme.colors.text,
    },
    highlightEmptySubtitle: {
      color: theme.colors.textSecondary,
    },

    // Review styles
    reviewsContainer: {
      backgroundColor: theme.colors.background,
    },
    reviewsCard: {
      backgroundColor: theme.colors.surface,
    },
    reviewsEmptyCard: {
      backgroundColor: theme.colors.surfaceVariant,
    },
    reviewsEmptyTitle: {
      color: theme.colors.text,
    },
    reviewsEmptySubtitle: {
      color: theme.colors.textSecondary,
    },

  }), [theme, isDark]);

  // Merge with existing styles
  const mergedStyles = useMemo(() => {
    // Deep merge function
    const deepMerge = (target, source) => {
      const output = { ...target };

      for (const key in source) {
        if (source.hasOwnProperty(key)) {
          if (source[key] instanceof Object && key in target) {
            output[key] = deepMerge(target[key], source[key]);
          } else {
            output[key] = source[key];
          }
        }
      }

      return output;
    };

    return deepMerge(styles, dynamicStyles);
  }, [styles, dynamicStyles]);

  // Theme-aware icon colors
  const iconColors = useMemo(() => ({
    primary: theme.colors.primary,
    secondary: theme.colors.textSecondary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
    info: theme.colors.info,
  }), [theme]);

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

  const closeRatingsModal = useCallback(() => {
    setShowRatingsModal(false);
  }, []);

  const preloadCaregiverReviews = useCallback(async () => {
    await fetchCaregiverReviews({ showSkeleton: false });
  }, [fetchCaregiverReviews]);

  const handleOpenRatings = useCallback(async () => {
    await preloadCaregiverReviews();
    setShowRatingsModal(true);
  }, [preloadCaregiverReviews]);

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
        <Text style={[mergedStyles.textPrimary, styles.editProfileTitle]}>Quick Edit Profile</Text>
        <Text style={[mergedStyles.textSecondary, styles.editProfileSubtitle]}>For full profile editing, use the Complete Profile button</Text>
        <FormInput
          label="Name"
          value={profileName}
          onChangeText={setProfileName}
          theme={theme}
        />
        <FormInput
          label="Hourly Rate (₱)"
          value={profileHourlyRate}
          onChangeText={setProfileHourlyRate}
          keyboardType="numeric"
          theme={theme}
        />
        <FormInput
          label="Experience (months)"
          value={profileExperience}
          onChangeText={setProfileExperience}
          keyboardType="numeric"
          theme={theme}
        />
        <SharedButton
          title="Save Changes"
          onPress={handleSaveProfile}
          style={{ marginBottom: 8 }}
          theme={theme}
        />
        <SharedButton
          title="Cancel"
          variant="secondary"
          onPress={() => setEditProfileModalVisible(false)}
          theme={theme}
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
      theme={theme}
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
      { id: 'profile', label: 'Profile', icon: 'person' },
      { id: 'jobs', label: 'Jobs', icon: 'briefcase', badgeCount: notificationCounts.jobs },
      { id: 'applications', label: 'Applications', icon: 'document-text' },
      { id: 'bookings', label: 'Bookings', icon: 'calendar', badgeCount: notificationCounts.bookings },
      { id: 'messages', label: 'Messages', icon: 'chatbubble-ellipses-outline', badgeCount: notificationCounts.messages },
      { id: 'wallet', label: 'Wallet', icon: 'wallet' },
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
      <View style={mergedStyles.navContainer}>
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
            const iconColor = active ? theme.colors.primary : theme.colors.textSecondary;
            return (
              <Pressable
                key={tab.id}
                onPress={onPress}
                style={[mergedStyles.navTab, active ? mergedStyles.navTabActive : null]}
              >
                <View style={{ position: 'relative' }}>
                  <Ionicons name={tab.icon} size={18} color={iconColor} />
                  {tab.badgeCount > 0 ? (
                    <View style={mergedStyles.notificationBadge}>
                      <Text style={mergedStyles.notificationBadgeText}>
                        {tab.badgeCount > 99 ? '99+' : tab.badgeCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[mergedStyles.navTabText, active ? mergedStyles.navTabTextActive : null]}>
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
        <View style={mergedStyles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={mergedStyles.loadingText}>Loading highlights...</Text>
        </View>
      );
    }

    const hasReviews = !!totalReviews;

    return (
      <View style={mergedStyles.reviewsEmptyCard}>
        <Ionicons name={hasReviews ? 'search-outline' : 'sparkles-outline'} size={32} color={theme.colors.primary} />
        <Text style={mergedStyles.reviewsEmptyTitle}>
          {hasReviews ? 'No highlights match this view' : 'No highlights yet'}
        </Text>
        <Text style={mergedStyles.reviewsEmptySubtitle}>
          {hasReviews
            ? 'Try a different filter or invite families to leave feedback.'
            : 'Once families share their experiences after bookings, their testimonials will appear here.'}
        </Text>
      </View>
    );
  }, [reviewsLoading, totalReviews, theme, mergedStyles]);

  const reviewsFooterComponent = useMemo(() => (
    <View style={[mergedStyles.reviewsFooterCard, { backgroundColor: theme.colors.surfaceVariant }]}>
      <View style={styles.reviewsFooterContent}>
        <Ionicons name="sparkles-outline" size={24} color={theme.colors.primary} />
        <View style={styles.reviewsFooterTextWrapper}>
          <Text style={[mergedStyles.reviewsFooterTitle, { color: theme.colors.text }]}>Keep the stories coming</Text>
          <Text style={[mergedStyles.reviewsFooterSubtitle, { color: theme.colors.textSecondary }]}>
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
  ), [handleGeneralHighlightRequest, highlightRequestSending, theme, mergedStyles]);

  const handleSelectReviewFilter = useCallback((filterId) => {
    setReviewsFilter(current => (current === filterId ? current : filterId));
  }, []);

  const reviewsHeaderComponent = (
    <View>
      <LinearGradient
        colors={isDark ? ["#1e40af", "#1e3a8a"] : ["#1d4ed8", "#1e40af"]}
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
          <View key={item.id} style={[mergedStyles.reviewsSummaryCard, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.reviewsSummaryIconWrap, { backgroundColor: `${item.accent}1A` }]}>
              <Ionicons name={item.icon} size={18} color={item.accent} />
            </View>
            <Text style={[mergedStyles.reviewsSummaryLabel, { color: theme.colors.textSecondary }]}>{item.label}</Text>
            <Text style={[mergedStyles.reviewsSummaryMetric, { color: theme.colors.text }]}>{item.value}</Text>
          </View>
        ))}
      </View>

      <View style={[mergedStyles.reviewsBreakdownCard, { backgroundColor: theme.colors.surface }]}>
        <Text style={[mergedStyles.reviewsBreakdownTitle, { color: theme.colors.text }]}>Rating distribution</Text>
        {ratingDistribution.map(bucket => {
          const percentage = totalReviews ? Math.round((bucket.count / totalReviews) * 100) : 0;
          return (
            <View key={bucket.rating} style={styles.reviewsBreakdownRow}>
              <Text style={[mergedStyles.reviewsBreakdownLabel, { color: theme.colors.text }]}>{`${bucket.rating}★`}</Text>
              <View style={[mergedStyles.reviewsBreakdownBar, { backgroundColor: theme.colors.surfaceVariant }]}>
                <View
                  style={[
                    mergedStyles.reviewsBreakdownFill,
                    {
                      width: `${Math.min(100, Math.max(bucket.count > 0 ? 12 : 0, percentage))}%`,
                      backgroundColor: theme.colors.primary
                    }
                  ]}
                />
              </View>
              <Text style={[mergedStyles.reviewsBreakdownValue, { color: theme.colors.text }]}>{bucket.count}</Text>
            </View>
          );
        })}
      </View>

      <View style={[mergedStyles.reviewsContextBanner, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Ionicons name="information-circle" size={18} color={theme.colors.primary} />
        <Text style={[mergedStyles.reviewsContextText, { color: theme.colors.text }]}>
          Highlights are generated from verified family feedback. Reach out to families after successful bookings to grow your reputation.
        </Text>
      </View>
    </View>
  );

  const renderReviewsTab = () => (
    <View style={mergedStyles.reviewsContainer}>
      <View style={mergedStyles.reviewsCard}>
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
          theme={theme}
          isDark={isDark}
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

  return (
    <Fragment>
      <View style={mergedStyles.container}>
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
          theme={theme}
          isDark={isDark}
        />
        {renderTopNav()}

        <View style={{ flex: 1 }}>
          {activeTab === "dashboard" && (
            initialLoading ? (
              <ScrollView contentContainerStyle={mergedStyles.dashboardSkeletonContainer}>
                <SkeletonCard style={mergedStyles.dashboardSkeletonSummaryCard}>
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
                style={mergedStyles.content}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[theme.colors.primary]}
                    tintColor={theme.colors.primary}
                  />
                }
              >
                <CaregiverProfileSection profile={profile} activeTab={activeTab} theme={theme} />

                <View style={styles.statsGrid}>
                  <QuickStat
                    icon="star"
                    value={ratingDisplay}
                    label="Rating"
                    color={isDark ? '#FBBF24' : '#F59E0B'}
                    bgColor={isDark ? '#7c2d12' : '#FEF3C7'}
                    styles={mergedStyles}
                    subtitle={ratingStatSubtitle}
                    ctaLabel={ratingStatCTA}
                    accessibilityHint="Shows detailed caregiver ratings and reviews"
                    onPress={handleOpenRatings}
                    showArrow
                    theme={theme}
                  />
                  <QuickStat
                    icon="briefcase"
                    value={String(completedJobsCount)}
                    label="Jobs Done"
                    color={isDark ? '#34D399' : '#10B981'}
                    bgColor={isDark ? '#065f46' : '#D1FAE5'}
                    styles={mergedStyles}
                    subtitle={completedJobsSubtitle}
                    showTrend={completedJobsCount > 0}
                    theme={theme}
                  />
                  <QuickStat
                    icon="chatbubble"
                    value={profile?.responseRate || "0%"}
                    label="Response Rate"
                    color={isDark ? '#60A5FA' : '#3B82F6'}
                    bgColor={isDark ? '#1e40af' : '#DBEAFE'}
                    styles={mergedStyles}
                    showTrend={Number.parseInt(String(profile?.responseRate || '0').replace(/[^\d]/g, ''), 10) > 0}
                    theme={theme}
                  />
                  <QuickStat
                    icon="checkmark-circle"
                    value={trustScoreValue > 0 ? String(trustScoreValue) : '—'}
                    label="Trust Score"
                    color={isDark ? '#A78BFA' : '#8B5CF6'}
                    bgColor={isDark ? '#5b21b6' : '#EDE9FE'}
                    styles={mergedStyles}
                    subtitle={trustScoreSubtitle}
                    showBadge={profile?.verification?.verified}
                    theme={theme}
                  />
                </View>

                <View style={styles.actionGrid}>
                  <QuickAction
                    icon="search"
                    label="Find Jobs"
                    gradientColors={isDark ? ["#1e40af", "#1e3a8a"] : ["#3B82F6", "#2563EB"]}
                    onPress={() => {
                      setActiveTab('jobs')
                      fetchJobs()
                    }}
                    styles={mergedStyles}
                    theme={theme}
                  />
                  <QuickAction
                    icon="calendar"
                    label="Bookings"
                    gradientColors={isDark ? ["#065f46", "#047857"] : ["#22C55E", "#16A34A"]}
                    onPress={() => setActiveTab('bookings')}
                    styles={mergedStyles}
                    theme={theme}
                  />

                  <QuickAction
                    icon="document-text"
                    label="Applications"
                    gradientColors={isDark ? ["#9f1239", "#be123c"] : ["#fb7185", "#ef4444"]}
                    onPress={() => setActiveTab('applications')}
                    styles={mergedStyles}
                    theme={theme}
                  />
                  <QuickAction
                    icon="chatbubbles"
                    label="Messages"
                    gradientColors={isDark ? ["#6d28d9", "#5b21b6"] : ["#8B5CF6", "#7C3AED"]}
                    onPress={() => setActiveTab('messages')}
                    styles={mergedStyles}
                    theme={theme}
                  />
                </View>

                <View style={mergedStyles.section}>
                  <LinearGradient
                    colors={isDark ? ['#4c1d95', '#5b21b6'] : ['#667eea', '#764ba2']}
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

                {/* Wallet Setup */}
                <View style={mergedStyles.section}>
                  <LinearGradient
                    colors={isDark ? ["#047857", "#065f46"] : ["#10B981", "#059669"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.enhancedProfileCard}
                  >
                    <View style={styles.enhancedProfileContent}>
                      <View style={styles.enhancedProfileHeader}>
                        <View style={styles.enhancedProfileIcon}>
                          <Ionicons name="wallet" size={24} color="#FFFFFF" />
                        </View>
                        <View style={styles.enhancedProfileText}>
                          <Text style={styles.enhancedProfileTitle}>Solana Wallet Setup</Text>
                          <Text style={styles.enhancedProfileDescription}>
                            Configure your Solana wallet to receive payments in SOL or USDC
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={mergedStyles.walletSetupContainer}>
                      <WalletSetup theme={theme} />
                    </View>
                  </LinearGradient>
                </View>

                <View style={mergedStyles.section}>
                  <View style={[mergedStyles.sectionHeader, styles.sectionHeader]}>
                    <View style={styles.sectionHeaderMain}>
                      <Ionicons name="briefcase" size={20} color={theme.colors.text} />
                      <Text style={mergedStyles.sectionTitle}>Recommended Jobs</Text>
                    </View>
                    <Pressable
                      style={styles.seeAllButton}
                      onPress={() => setActiveTab('jobs')}
                    >
                      <Text style={mergedStyles.seeAllText}>See All</Text>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
                    </Pressable>
                  </View>
                  {jobsLoading ? (
                    <View style={mergedStyles.loadingContainer}>
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                      <Text style={mergedStyles.loadingText}>Loading jobs...</Text>
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
                            theme={theme}
                            isDark={isDark}
                          />
                        );
                      })}
                    </ScrollView>
                  )}
                </View>

                <View style={mergedStyles.section}>
                  <View style={[mergedStyles.sectionHeader, styles.sectionHeader]}>
                    <View style={styles.sectionHeaderMain}>
                      <Ionicons name="document-text" size={20} color={theme.colors.text} />
                      <Text style={mergedStyles.sectionTitle}>Recent Applications</Text>
                    </View>
                    <Pressable
                      style={styles.seeAllButton}
                      onPress={() => setActiveTab("applications")}
                    >
                      <Text style={mergedStyles.seeAllText}>View All</Text>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
                    </Pressable>
                  </View>
                  {(applications || []).slice(0, 2).map((application, index) => (
                    <View key={application.id || index} style={mergedStyles.enhancedApplicationCard}>
                      <View style={styles.applicationCardHeader}>
                        <View style={styles.applicationCardMain}>
                          <Text style={mergedStyles.applicationCardTitle} numberOfLines={1}>
                            {application.jobTitle || application.job?.title || 'Childcare Position'}
                          </Text>
                          <Text style={mergedStyles.applicationCardFamily}>
                            {application.family || application.job?.family || 'Family'}
                          </Text>
                        </View>
                        <StatusBadge
                          status={application.status}
                          style={styles.applicationStatusBadge}
                          theme={theme}
                        />
                      </View>

                      <View style={styles.applicationCardDetails}>
                        <View style={styles.applicationDetailItem}>
                          <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
                          <Text style={mergedStyles.applicationDetailTextInline}>
                            Applied {application.appliedDate ? new Date(application.appliedDate).toLocaleDateString() : 'Recently'}
                          </Text>
                        </View>
                        {application.proposedRate && (
                          <View style={styles.applicationDetailItem}>
                            <Ionicons name="cash-outline" size={14} color={theme.colors.textSecondary} />
                            <Text style={mergedStyles.applicationDetailTextInline}>
                              ₱{application.proposedRate}/hr
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.applicationCardActions}>
                        <Pressable
                          style={mergedStyles.secondaryButton}
                          onPress={() => handleViewApplication(application)}
                        >
                          <Text style={mergedStyles.secondaryButtonText}>View Details</Text>
                        </Pressable>
                        <Pressable
                          style={[
                            mergedStyles.primaryButton,
                            application.status !== 'accepted' && mergedStyles.primaryButtonDisabled,
                          ]}
                          onPress={() => handleMessageFamily(application)}
                          disabled={application.status !== 'accepted'}
                        >
                          <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" />
                          <Text style={mergedStyles.primaryButtonText}>Message</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={mergedStyles.section}>
                  <View style={[mergedStyles.sectionHeader, styles.sectionHeader]}>
                    <View style={styles.sectionHeaderMain}>
                      <Ionicons name="calendar" size={20} color={theme.colors.text} />
                      <Text style={mergedStyles.sectionTitle}>Upcoming Bookings</Text>
                    </View>
                    <Pressable
                      style={styles.seeAllButton}
                      onPress={() => setActiveTab('bookings')}
                    >
                      <Text style={mergedStyles.seeAllText}>See All</Text>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
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
                      <View key={bookingId || index} style={mergedStyles.dashboardBookingCard}>
                        <LinearGradient
                          colors={isDark ? ['#4c1d95', '#5b21b6'] : ['#667eea', '#764ba2']}
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
                              <Ionicons name="time-outline" size={14} color={isDark ? '#60A5FA' : '#2563EB'} />
                              <Text style={styles.dashboardBookingMetaText}>{formattedTime}</Text>
                            </View>
                            <View style={styles.dashboardBookingMetaChip}>
                              <Ionicons name="people-outline" size={14} color={isDark ? '#34D399' : '#10B981'} />
                              <Text style={styles.dashboardBookingMetaText}>{childrenLabel}</Text>
                            </View>
                            {rateLabel ? (
                              <View style={styles.dashboardBookingMetaChip}>
                                <Ionicons name="cash-outline" size={14} color={isDark ? '#10B981' : '#059669'} />
                                <Text style={styles.dashboardBookingMetaText}>{rateLabel}</Text>
                              </View>
                            ) : null}
                          </View>

                          {locationLabel ? (
                            <Pressable
                              style={styles.dashboardBookingLocation}
                              onPress={() => handleGetDirections(booking)}
                            >
                              <Ionicons name="location-outline" size={16} color={isDark ? '#A78BFA' : '#7C3AED'} />
                              <Text style={mergedStyles.dashboardBookingLocationText} numberOfLines={1}>
                                {locationLabel}
                              </Text>
                              <Ionicons name="open-outline" size={16} color={isDark ? '#A78BFA' : '#7C3AED'} />
                            </Pressable>
                          ) : null}

                          <View style={styles.dashboardBookingActions}>
                            <Pressable
                              style={mergedStyles.dashboardBookingSecondaryButton}
                              onPress={() => {
                                setSelectedBooking(booking);
                                setShowBookingDetails(true);
                              }}
                            >
                              <Ionicons name="eye-outline" size={16} color={theme.colors.text} />
                              <Text style={mergedStyles.dashboardBookingSecondaryText}>Details</Text>
                            </Pressable>
                            <Pressable
                              style={mergedStyles.dashboardBookingPrimaryButton}
                              onPress={() => handleBookingMessage(booking)}
                            >
                              <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" />
                              <Text style={mergedStyles.dashboardBookingPrimaryText}>Message</Text>
                            </Pressable>
                          </View>

                          {/* Demo Solana Payment */}
                          {statusLower === 'completed' && (
                            <View style={{ marginTop: 12, padding: 12, backgroundColor: theme.colors.surfaceVariant, borderRadius: 8 }}>
                              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.primary, marginBottom: 8 }}>Payment Demo</Text>
                              <SolanaPayment
                                booking={booking}
                                caregiver={{
                                  id: user?.id,
                                  name: profile?.name || 'Caregiver',
                                  solana_wallet_address: 'Demo123...abc',
                                  preferred_token: 'USDC'
                                }}
                                amount={hourlyRate || 25}
                                onPaymentComplete={(signature) => {
                                  showToast(`Demo payment completed! Signature: ${signature.substring(0, 20)}...`, 'success');
                                }}
                                theme={theme}
                              />
                            </View>
                          )}

                          {statusLower === 'pending' ? (
                            <Pressable
                              style={mergedStyles.dashboardBookingConfirmButton}
                              onPress={() => handleConfirmAttendance(booking)}
                            >
                              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                              <Text style={mergedStyles.dashboardBookingConfirmText}>Confirm Attendance</Text>
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
              theme={theme}
              isDark={isDark}
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
              theme={theme}
              isDark={isDark}
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
              theme={theme}
              isDark={isDark}
            />
          )}

          {activeTab === 'messages' && (
            <MessagesTab
              navigation={navigation}
              refreshing={refreshing}
              onRefresh={onRefresh}
              theme={theme}
              isDark={isDark}
            />
          )}

          {activeTab === 'profile' && (
            <ScrollView
              style={mergedStyles.content}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[theme.colors.primary]}
                  tintColor={theme.colors.primary}
                />
              }
            >
              <CaregiverProfileSection profile={profile} activeTab={activeTab} theme={theme} />
              
              <View style={mergedStyles.section}>
                <LinearGradient
                  colors={isDark ? ['#4c1d95', '#5b21b6'] : ['#667eea', '#764ba2']}
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
            </ScrollView>
          )}

          {activeTab === 'wallet' && (
            <WalletManagementTab
              refreshing={refreshing}
              onRefresh={onRefresh}
              theme={theme}
              isDark={isDark}
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
              theme={theme}
              isDark={isDark}
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
              theme={theme}
              isDark={isDark}
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
          colors={isDark ? ['#4c1d95', '#5b21b6'] : ['#667eea', '#764ba2']}
          userType="caregiver"
          theme={theme}
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
          <View style={mergedStyles.modalOverlay}>
            <View style={mergedStyles.applicationModal}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.applicationModalHeader}>
                  <Text style={[mergedStyles.applicationModalTitle, { color: theme.colors.text }]}>Apply to Job</Text>
                  <Pressable
                    onPress={() => {
                      if (!applicationSubmitting) {
                        setShowJobApplication(false)
                        setSelectedJob(null)
                        setApplicationForm({ coverLetter: '', proposedRate: '' })
                      }
                    }}
                    style={mergedStyles.modalCloseButton}
                  >
                    <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                  </Pressable>
                </View>

                <View style={styles.jobSummary}>
                  <Text style={[styles.jobSummaryTitle, { color: theme.colors.text }]}>{selectedJob.title}</Text>
                  <Text style={[styles.jobSummaryFamily, { color: theme.colors.textSecondary }]}>{selectedJob.family}</Text>
                  <Text style={[styles.jobSummaryRate, { color: theme.colors.primary }]}>₱{selectedJob.hourlyRate}/hour</Text>
                </View>

                <View style={styles.applicationFormContainer}>
                  <View style={styles.inputGroup}>
                    <Text style={mergedStyles.inputLabel}>Proposed Rate (Optional)</Text>
                    <TextInput
                      style={mergedStyles.applicationInput}
                      placeholder={`₱${selectedJob.hourlyRate}`}
                      value={applicationForm.proposedRate}
                      onChangeText={(text) => setApplicationForm(prev => ({ ...prev, proposedRate: text }))}
                      keyboardType="numeric"
                      editable={!applicationSubmitting}
                      placeholderTextColor={theme.colors.textSecondary}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={mergedStyles.inputLabel}>Cover Letter (Optional)</Text>

                    <View style={mergedStyles.suggestedCoverLettersContainer}>
                      {[
                        'I am passionate about childcare and have experience working with children of all ages. I would love to help your family.',
                        'As a certified caregiver with first aid training, I prioritize safety while creating a fun and nurturing environment for children.',
                        'I have flexible availability and excellent references. I am committed to providing reliable and professional childcare services.'
                      ].map((suggestion, index) => {
                        const isSelected = applicationForm.coverLetter === suggestion;
                        return (
                          <Pressable
                            key={index}
                            style={[mergedStyles.coverLetterChip, isSelected && mergedStyles.coverLetterChipSelected]}
                            onPress={() => {
                              setApplicationForm(prev => ({
                                ...prev,
                                coverLetter: isSelected ? '' : suggestion
                              }));
                            }}
                          >
                            <Text style={[mergedStyles.coverLetterChipText, isSelected && mergedStyles.coverLetterChipTextSelected]}>
                              {suggestion.length > 50 ? `${suggestion.substring(0, 50)}...` : suggestion}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <TextInput
                      style={[mergedStyles.applicationInput, mergedStyles.applicationTextArea]}
                      placeholder="Tell the family why you're the perfect fit for this job..."
                      value={applicationForm.coverLetter}
                      onChangeText={(text) => setApplicationForm(prev => ({ ...prev, coverLetter: text }))}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      editable={!applicationSubmitting}
                      placeholderTextColor={theme.colors.textSecondary}
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
                    textColor={theme.colors.text}
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
                    buttonColor={theme.colors.primary}
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
            <View style={mergedStyles.modalOverlay}>
              <View style={mergedStyles.applicationModal}>
                <LinearGradient
                  colors={isDark ? ['#3730a3', '#5b21b6'] : ['#4F46E5', '#7C3AED']}
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
                      theme={theme}
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
                          <View key={`application-info-${index}`} style={[styles.applicationInfoTile, { backgroundColor: theme.colors.surfaceVariant }]}>
                            <Ionicons name={tile.icon} size={18} color={theme.colors.primary} />
                            <Text style={[mergedStyles.applicationInfoLabel, { color: theme.colors.textSecondary }]}>{tile.label}</Text>
                            <Text style={[mergedStyles.applicationInfoValue, { color: theme.colors.text }]}>{String(tile.value)}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {messageBody && (
                      <View style={mergedStyles.applicationSection}>
                        <Text style={[mergedStyles.applicationSectionTitle, { color: theme.colors.text }]}>Your Message</Text>
                        <View style={[mergedStyles.applicationSectionCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                          <Text style={[mergedStyles.applicationSectionCardText, { color: theme.colors.text }]}>{String(messageBody)}</Text>
                        </View>
                      </View>
                    )}

                    {descriptionBody && (
                      <View style={mergedStyles.applicationSection}>
                        <Text style={[mergedStyles.applicationSectionTitle, { color: theme.colors.text }]}>Job Description</Text>
                        <View style={[mergedStyles.applicationSectionCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                          <Text style={[mergedStyles.applicationSectionCardText, { color: theme.colors.text }]}>{String(descriptionBody)}</Text>
                        </View>
                      </View>
                    )}

                    {requirementTags.length > 0 && (
                      <View style={mergedStyles.applicationSection}>
                        <Text style={[mergedStyles.applicationSectionTitle, { color: theme.colors.text }]}>Requirements</Text>
                        <View style={styles.applicationTagList}>
                          {requirementTags.map((req, index) => (
                            <View key={`application-tag-${index}`} style={[mergedStyles.applicationTagChip, { backgroundColor: theme.colors.surfaceVariant }]}>
                              <Text style={[mergedStyles.applicationTagChipText, { color: theme.colors.text }]}>{String(req)}</Text>
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
                    textColor={theme.colors.text}
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
                    buttonColor={theme.colors.primary}
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
          <View style={mergedStyles.modalOverlay}>
            <View style={mergedStyles.jobDetailsModal}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={mergedStyles.jobDetailsContent}>
                  <View style={mergedStyles.jobDetailsHeader}>
                    <Text style={mergedStyles.jobDetailsTitle}>{String(selectedJob.title || 'Childcare Position')}</Text>
                    <Text style={mergedStyles.jobDetailsFamily}>{String(selectedJob.family || selectedJob.familyName || 'Family')}</Text>
                    {selectedJob.urgent && (
                      <View style={[styles.jobDetailsPill, { backgroundColor: theme.colors.error + '20' }]}>
                        <Ionicons name="flash" color={theme.colors.error} size={14} />
                        <Text style={[mergedStyles.jobDetailsPillText, { color: theme.colors.error }]}>Urgent Need</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.jobDetailsInfo}>
                    <View style={styles.jobDetailsRow}>
                      <View style={styles.jobDetailsIcon}>
                        <Ionicons name="location" size={16} color={theme.colors.primary} />
                      </View>
                      <Text style={mergedStyles.jobDetailsText}>{selectedJob.location || 'Location not specified'}</Text>
                    </View>
                    <View style={styles.jobDetailsRow}>
                      <View style={styles.jobDetailsIcon}>
                        <Ionicons name="calendar" size={16} color={theme.colors.primary} />
                      </View>
                      <Text style={mergedStyles.jobDetailsText}>{selectedJob.date ? new Date(selectedJob.date).toLocaleDateString() : 'Date not specified'}</Text>
                    </View>
                    {(() => {
                      const scheduleLabel = buildJobScheduleLabel(selectedJob);
                      if (!scheduleLabel) return null;
                      return (
                        <View style={styles.jobDetailsRow}>
                          <View style={styles.jobDetailsIcon}>
                            <Ionicons name="time" size={16} color={theme.colors.primary} />
                          </View>
                          <Text style={mergedStyles.jobDetailsText}>{scheduleLabel}</Text>
                        </View>
                      );
                    })()}
                    <View style={styles.jobDetailsRow}>
                      <View style={styles.jobDetailsIcon}>
                        <Ionicons name="cash" size={16} color={theme.colors.success} />
                      </View>
                      <Text style={[mergedStyles.jobDetailsText, { color: theme.colors.success, fontWeight: '600' }]}> {formatPeso(selectedJob.hourly_rate || selectedJob.hourlyRate || 0)}/hr</Text>
                    </View>
                    {selectedJob.applicationData?.proposedRate && selectedJob.applicationData.proposedRate !== (selectedJob.hourly_rate || selectedJob.hourlyRate) && (
                      <View style={styles.jobDetailsRow}>
                        <View style={styles.jobDetailsIcon}>
                          <Ionicons name="trending-up" size={16} color={theme.colors.info} />
                        </View>
                        <Text style={[mergedStyles.jobDetailsText, { color: theme.colors.info, fontWeight: '600' }]}>
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
                            <Ionicons name="calendar-outline" size={16} color={theme.colors.info} />
                          </View>
                          <Text style={[mergedStyles.jobDetailsText, { color: theme.colors.info }]}>
                            {rawSchedule}
                          </Text>
                        </View>
                      );
                    })()}
                    {selectedJob.children?.length > 0 && (
                      <View style={styles.jobDetailsRow}>
                        <View style={styles.jobDetailsIcon}>
                          <Ionicons name="people" size={16} color={theme.colors.primary} />
                        </View>
                        <Text style={mergedStyles.jobDetailsText}>
                          {selectedJob.children.length} child{selectedJob.children.length > 1 ? 'ren' : ''}
                          {selectedJob.children.map((child) => ` ${child.name} (${child.age})`).join(', ')}
                        </Text>
                      </View>
                    )}
                    {selectedJob.users?.email && (
                      <View style={styles.jobDetailsRow}>
                        <View style={styles.jobDetailsIcon}>
                          <Ionicons name="mail" size={16} color={theme.colors.primary} />
                        </View>
                        <Text style={mergedStyles.jobDetailsText}>{selectedJob.users.email}</Text>
                      </View>
                    )}
                    {selectedJob.users?.phone && (
                      <View style={styles.jobDetailsRow}>
                        <View style={styles.jobDetailsIcon}>
                          <Ionicons name="call" size={16} color={theme.colors.primary} />
                        </View>
                        <Text style={mergedStyles.jobDetailsText}>{selectedJob.users.phone}</Text>
                      </View>
                    )}
                  </View>

                  {selectedJob.description && (
                    <View style={mergedStyles.jobDetailsSection}>
                      <Text style={mergedStyles.jobDetailsSectionTitle}>Job Description</Text>
                      <Text style={mergedStyles.jobDetailsDescription}>{String(selectedJob.description)}</Text>
                    </View>
                  )}

                  {selectedJob.children?.length > 0 && (
                    <View style={mergedStyles.jobDetailsSection}>
                      <Text style={mergedStyles.jobDetailsSectionTitle}>Children Information</Text>
                      <View style={styles.jobDetailsPillRow}>
                        {selectedJob.children.map((child, index) => (
                          <View key={index} style={[mergedStyles.jobDetailsPill, { backgroundColor: theme.colors.surfaceVariant }]}>
                            <Ionicons name="person" size={14} color={theme.colors.primary} />
                            <Text style={mergedStyles.jobDetailsPillText}>{child.name} · {child.age} yrs</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {Array.isArray(selectedJob.requirements) && selectedJob.requirements.length > 0 && (
                    <View style={mergedStyles.jobDetailsRequirements}>
                      <Text style={mergedStyles.jobDetailsRequirementsTitle}>Key Requirements</Text>
                      {selectedJob.requirements.map((req, idx) => (
                        <View key={idx} style={styles.jobDetailsRequirementRow}>
                          <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                          <Text style={mergedStyles.jobDetailsRequirementText}>{String(req)}</Text>
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
                        <View style={mergedStyles.jobDetailsSection}>
                          <Text style={mergedStyles.jobDetailsSectionTitle}>Your Application</Text>
                          <View style={[mergedStyles.applicationStatusCard, { backgroundColor: theme.colors.surfaceVariant }]}>
                            <View style={styles.applicationStatusHeader}>
                              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                              <Text style={[mergedStyles.applicationStatusText, { color: theme.colors.text }]}>
                                Applied on {new Date(appData.appliedDate || appData.applied_at || Date.now()).toLocaleDateString()}
                              </Text>
                            </View>
                            <Text style={[mergedStyles.applicationStatusLabel, { color: theme.colors.textSecondary }]}>
                              Status: {appData.applicationStatus || appData.status || 'Pending'}
                            </Text>

                            {appData.proposedRate && (
                              <View style={mergedStyles.coverLetterPreview}>
                                <Text style={[mergedStyles.coverLetterLabel, { color: theme.colors.textSecondary }]}>Your Proposed Rate:</Text>
                                <Text style={[mergedStyles.applicationStatusText, { color: theme.colors.text }]}>₱{appData.proposedRate}/hr</Text>
                              </View>
                            )}

                            {(appData.coverLetter || appData.message) && (
                              <View style={mergedStyles.coverLetterPreview}>
                                <Text style={[mergedStyles.coverLetterLabel, { color: theme.colors.textSecondary }]}>Your Message:</Text>
                                <Text style={[mergedStyles.coverLetterText, { color: theme.colors.text }]}>{appData.coverLetter || appData.message}</Text>
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
                      buttonColor={theme.colors.primary}
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
        theme={theme}
        isDark={isDark}
      />

      <PrivacyNotificationModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        requests={pendingRequests}
        subtitle="Manage requests for your personal information as a caregiver"
        emptyStateTitle="No privacy requests from parents"
        emptyStateMessage="You're all caught up—no pending caregiver requests."
        theme={theme}
        isDark={isDark}
      />

      <RequestInfoModal
        visible={showRequestModal}
        onClose={handleCloseRequestInfoModal}
        targetUser={requestInfoTarget}
        availableTargets={requestInfoTargets}
        onTargetChange={handleRequestInfoTargetChange}
        onSuccess={handleRequestInfoSuccess}
        userType="caregiver"
        theme={theme}
      />

      <Modal
        visible={showReviewForm}
        animationType="slide"
        onRequestClose={handleCloseReviewModal}
        transparent
      >
        <View style={mergedStyles.modalOverlay}>
          <View style={[mergedStyles.applicationModal, { maxHeight: '80%' }]}>
            <ReviewForm
              onSubmit={handleSubmitReview}
              onCancel={handleCloseReviewModal}
              initialRating={selectedReview?.rating || 0}
              initialComment={selectedReview?.comment || ''}
              submitLabel={selectedReview ? 'Update Review' : 'Submit Review'}
              heading={selectedReview ? 'Update Your Feedback' : 'Share Your Experience'}
              enableImageUpload={false}
              theme={theme}
            />
            {reviewSubmitting && (
              <View style={mergedStyles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={mergedStyles.loadingText}>Saving review...</Text>
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
        colors={{ primary: theme.colors.primary }}
        theme={theme}
        isDark={isDark}
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
        theme={theme}
      />

      {/* Highlight Request Modal */}
      <Modal
        visible={showHighlightRequestModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowHighlightRequestModal(false)}
      >
        <View style={mergedStyles.modalOverlay}>
          <View style={mergedStyles.highlightModalCard}>
            <View style={styles.highlightModalHeader}>
              <View style={styles.highlightModalTitleRow}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={mergedStyles.highlightModalTitle}>Request a Highlight</Text>
                  <Text style={mergedStyles.highlightModalSubtitle}>
                    Choose a family you've recently worked with to ask for a highlight on your profile.
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setShowHighlightRequestModal(false);
                    setSelectedFamilyForHighlight(null);
                  }}
                  style={mergedStyles.highlightCloseButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close highlight request"
                >
                  <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.highlightBody}
              contentContainerStyle={styles.highlightBodyContent}
            >
              <View style={styles.highlightSection}>
                <Text style={mergedStyles.highlightSectionTitle}>Recent Families</Text>
                <Text style={mergedStyles.highlightSectionDescription}>
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
                          mergedStyles.highlightFamilyItem,
                          isSelected && mergedStyles.highlightFamilySelected,
                          isLast && styles.highlightFamilyItemLast,
                        ]}
                        onPress={handleSelectFamily}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        android_ripple={{ color: theme.colors.primary + '20' }}
                      >
                        <View style={styles.highlightFamilyRow}>
                          <View style={styles.highlightFamilyInfo}>
                            <View style={styles.highlightFamilyIconWrap}>
                              <Ionicons
                                name={item.iconName}
                                size={20}
                                color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                              />
                            </View>
                            <View style={styles.highlightFamilyText}>
                              <Text style={mergedStyles.highlightFamilyName}>{item.name}</Text>
                              <Text style={mergedStyles.highlightFamilyMeta}>{item.statusLabel}</Text>
                            </View>
                          </View>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}

                  {recentHighlightFamilies.length === 0 && (
                    <View style={[mergedStyles.highlightEmptyState, { backgroundColor: theme.colors.surfaceVariant }]}>
                      <View style={[mergedStyles.highlightEmptyIcon, { backgroundColor: theme.colors.surface }]}>
                        <Ionicons name="sparkles-outline" size={28} color={theme.colors.textSecondary} />
                      </View>
                      <Text style={mergedStyles.highlightEmptyTitle}>No families available yet</Text>
                      <Text style={mergedStyles.highlightEmptySubtitle}>
                        Once you complete bookings or engage with families, they will appear here so you can request a highlight.
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.highlightSection}>
                <View style={[mergedStyles.highlightHintBox, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} style={styles.highlightHintIcon} />
                  <Text style={mergedStyles.highlightHintText}>
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
                  labelStyle={[mergedStyles.highlightSecondaryLabel, { color: theme.colors.text }]}
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
                  buttonColor={theme.colors.primary}
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
          theme={theme}
          isDark={isDark}
        />
      )}
    </Fragment>
  );
};

export default CaregiverDashboard;
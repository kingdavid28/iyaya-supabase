import { useNavigation } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Platform, Text, View } from 'react-native';

// Core imports
import { useAuth } from '../../contexts/AuthContext';
import { useNotificationCounts } from '../../hooks/useNotificationCounts';
import { useParentDashboard } from '../../hooks/useParentDashboard';

// Supabase service import
import { supabaseService } from '../../services/supabase';
import { contractService as supabaseContractService } from '../../services/supabase/contractService';

// Utility imports
import { childService } from '../../services/childService';
import {
  countActiveFilters,
  getDefaultFilters,
} from '../../utils/filterUtils';
import { styles } from '../styles/ParentDashboard.styles';

// Component imports
import ContractTypeSelector, { CONTRACT_TYPES } from '../../components/modals/ContractTypeSelector';
import AlertsTab from './components/AlertsTab';
import BookingsTab from './components/BookingsTab';
import Header from './components/Header';
import HomeTab from './components/HomeTab';
import JobApplicationsTab from './components/JobApplicationsTab';
import JobsTab from './components/JobsTab';
import MessagesTab from './components/MessagesTab';
import NavigationTabs from './components/NavigationTabs';
import ReviewsTab from './components/ReviewsTab';
import SearchTab from './components/SearchTab';

// Modal imports
import ContractModal from '../../components/modals/ContractModal';
import { RequestInfoModal } from '../../shared/ui/modals';
import BookingDetailsModal from '../../shared/ui/modals/BookingDetailsModal';
import BookingModal from './modals/BookingModal';
import ChildModal from './modals/ChildModal';
import FilterModal from './modals/FilterModal';
import JobPostingModal from './modals/JobPostingModal';
import PaymentModal from './modals/PaymentModal';
import ProfileModal from './modals/ProfileModal';

// Constants
const DEFAULT_FILTERS = getDefaultFilters();

const DEFAULT_CAREGIVER = {
  _id: null,
  userId: null,
  name: 'Select a Caregiver',
  avatar: null,
  rating: 0,
  reviewCount: 0,
  hourlyRate: 0,
  rate: '₱0/hr'
};

const QUICK_FILTER_DEFAULTS = Object.freeze({
  availableNow: false,
  nearMe: false,
  topRated: false,
  certified: false,
});

const buildNormalizedFilters = (overrides = {}) => {
  const defaults = getDefaultFilters();

  return {
    ...defaults,
    ...overrides,
    availability: {
      ...defaults.availability,
      ...(overrides?.availability || {}),
    },
    location: {
      ...defaults.location,
      ...(overrides?.location || {}),
    },
    rate: {
      ...defaults.rate,
      ...(overrides?.rate || {}),
    },
    experience: {
      ...defaults.experience,
      ...(overrides?.experience || {}),
    },
    certifications: Array.isArray(overrides?.certifications)
      ? [...overrides.certifications]
      : [...defaults.certifications],
    rating: overrides?.rating ?? defaults.rating,
  };
};

// Memoized utility functions outside component
const formatPesoRate = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return `₱${numeric.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

const summarizeChildrenFromApplication = (application) => {
  const rawChildren =
    application?.children ||
    application?.selectedChildren ||
    application?.selected_children ||
    application?.job?.children ||
    [];

  if (!Array.isArray(rawChildren) || rawChildren.length === 0) {
    return 'As agreed per booking';
  }

  const names = rawChildren
    .map((child, index) => {
      if (typeof child === 'string') {
        return child;
      }
      if (child?.name) {
        return child.name;
      }
      if (child?.child?.name) {
        return child.child.name;
      }
      return `Child ${index + 1}`;
    })
    .filter(Boolean)
    .slice(0, 5);

  if (names.length === 0) {
    return 'As agreed per booking';
  }

  return names.join(', ');
};

const resolveContractTemplate = (application) => {
  const preferredType =
    application?.preferredContractType ||
    application?.contractType ||
    application?.selectedContractType ||
    application?.job?.contractType ||
    application?.job?.preferredContractType ||
    application?.job?.metadata?.contractType;

  if (preferredType) {
    const normalized = String(preferredType).toLowerCase();
    const match = Object.values(CONTRACT_TYPES).find(
      (type) =>
        type.id.toLowerCase() === normalized ||
        type.title.toLowerCase() === normalized
    );

    if (match) {
      return match;
    }
  }

  return CONTRACT_TYPES.STANDARD;
};

const buildPromotionContractTerms = (application, contractTemplateOverride = null) => {
  const nowIso = new Date().toISOString();
  const contractTemplate = contractTemplateOverride || resolveContractTemplate(application);

  const jobTitle =
    application?.jobTitle ||
    application?.job?.title ||
    application?.job?.jobTitle ||
    'Childcare Services Engagement';

  const jobLocation =
    application?.jobLocation ||
    application?.job?.location ||
    application?.job?.address ||
    'To be confirmed';

  const schedule =
    application?.preferredSchedule ||
    application?.job?.schedule ||
    application?.job?.time ||
    'As agreed per booking';

  const pesoRate = formatPesoRate(
    application?.proposedRate ??
    application?.job?.hourlyRate ??
    application?.job?.hourly_rate ??
    application?.job?.rate
  );

  const paymentTerms = pesoRate
    ? `${pesoRate} per hour, payable upon completion of services`
    : 'Payment upon completion of services';

  const engagementNotes = (
    application?.message ||
    application?.job?.description ||
    application?.job?.notes ||
    ''
  ).trim() || 'Refer to booking details for specific instructions.';

  const contractOptionsSummary =
    Object.values(CONTRACT_TYPES)
      .map(({ title, subtitle, description }) => {
        const base = subtitle ? `${title} — ${subtitle}` : title;
        return `${base}: ${description}`;
      })
      .join(' | ') || `${contractTemplate.title}: ${contractTemplate.description}`;

  const dynamicTerms = {
    'Work Schedule': String(schedule),
    'Payment Terms': paymentTerms,
    'Job Title': String(jobTitle),
    'Work Location': String(jobLocation),
    'Children Covered': summarizeChildrenFromApplication(application),
    'Hourly Rate Reference': pesoRate || 'To be determined with caregiver',
    'Engagement Notes': engagementNotes
  };

  return {
    contractType: contractTemplate.id,
    contractTitle: contractTemplate.title,
    ...contractTemplate.terms,
    ...dynamicTerms,
    'Contract Subtitle': contractTemplate.subtitle || contractTemplate.description || contractTemplate.title,
    'Available Contract Templates': contractOptionsSummary,
    createdAt: nowIso,
    generatedAt: nowIso,
    version: 1,
    'Generated Via': 'application-promotion'
  };
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Something went wrong. Please restart the app.</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const ParentDashboard = () => {
  const navigation = useNavigation();
  const { signOut, user } = useAuth();

  // Dashboard data
  const {
    activeTab,
    setActiveTab,
    profile,
    jobs,
    caregivers,
    bookings,
    applications,
    setApplications,
    applicationsLoading,
    children,
    loading,
    loadProfile,
    fetchJobs,
    fetchCaregivers,
    fetchBookings,
    fetchApplications,
    fetchChildren
  } = useParentDashboard();

  // Get notification counts
  const { counts: notificationCounts } = useNotificationCounts();

  // UI State
  const [refreshing, setRefreshing] = useState(false);
  const [showAllChildren, setShowAllChildren] = useState(false);

  // Modal states
  const [modals, setModals] = useState({
    child: false,
    profile: false,
    jobPosting: false,
    filter: false,
    payment: false,
    booking: false,
    bookingDetails: false,
    contract: false,
    contractType: false,
    requestInfo: false,
  });

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [selectedContractTemplate, setSelectedContractTemplate] = useState(null);
  const [pendingApplicationForContract, setPendingApplicationForContract] = useState(null);
  const [applicationsMutatingId, setApplicationsMutatingId] = useState(null);
  const [requestInfoTarget, setRequestInfoTarget] = useState(null);
  const [savingContractDraft, setSavingContractDraft] = useState(false);
  const [sendingContractForSignature, setSendingContractForSignature] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [filteredCaregivers, setFilteredCaregivers] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filters, setFilters] = useState(() => buildNormalizedFilters());
  const [activeFilters, setActiveFilters] = useState(() => countActiveFilters(buildNormalizedFilters()));

  const [quickFilters, setQuickFilters] = useState(() => ({ ...QUICK_FILTER_DEFAULTS }));

  // Form states
  const [childForm, setChildForm] = useState({
    name: '',
    age: '',
    allergies: '',
    notes: '',
    editingId: null
  });

  const [profileForm, setProfileForm] = useState({
    name: '',
    contact: '',
    location: '',
    image: ''
  });

  // Booking state
  const [bookingsFilter, setBookingsFilter] = useState('upcoming');
  const [selectedCaregiver, setSelectedCaregiver] = useState(DEFAULT_CAREGIVER);
  const [paymentData, setPaymentData] = useState({
    bookingId: null,
    base64: '',
    mimeType: 'image/jpeg'
  });

  // Update profile form when profile data changes
  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name || '',
        contact: profile.email || profile.contact || '',
        location: profile.location || profile.address || '',
        image: profile.profile_image || profile.profileImage || profile.avatar || ''
      });
    }
  }, [profile]);

  // Calculate tab notification counts
  const tabNotificationCounts = useMemo(() => {
    const pendingBookings = bookings?.filter(b =>
      b.status === 'pending' || b.status === 'awaiting_payment'
    )?.length || 0;

    return {
      messages: notificationCounts.messages,
      bookings: Math.max(pendingBookings, notificationCounts.bookings),
      jobs: notificationCounts.jobs,
      applications: applications?.filter(app => app.status === 'pending')?.length || 0,
      reviews: notificationCounts.reviews,
      notifications: notificationCounts.notifications
    };
  }, [notificationCounts, bookings, applications]);

  // Derived data
  const displayName = useMemo(() => {
    return (user?.displayName || (user?.email ? String(user.email).split('@')[0] : '') || '').trim();
  }, [user?.displayName, user?.email]);

  const greetingName = useMemo(() => {
    return (profileForm.name && String(profileForm.name).trim()) || displayName;
  }, [profileForm.name, displayName]);

  // Enhanced caregivers with review eligibility
  const caregiversWithReviews = useMemo(() => {
    if (!caregivers || !bookings) return caregivers || [];

    return (caregivers || []).map(caregiver => {
      const hasCompletedJobs = bookings.some(booking => {
        const caregiverId = booking?.caregiver_id || booking?.caregiverId || booking?.caregiver?.id;
        return caregiverId === caregiver.id && booking.status === 'completed';
      });

      return {
        ...caregiver,
        hasCompletedJobs
      };
    });
  }, [caregivers, bookings]);

  // Modal handlers
  const toggleModal = useCallback((modalName, isOpen = null) => {
    setModals(prev => ({
      ...prev,
      [modalName]: isOpen !== null ? isOpen : !prev[modalName]
    }));
  }, []);

  const openRequestInfoModal = useCallback((caregiver) => {
    const resolvedId = caregiver?.id || caregiver?._id || caregiver?.userId;

    if (!caregiver || !resolvedId) {
      Alert.alert(
        'Invalid recipient',
        'Caregiver details are missing. Please try again after selecting a valid caregiver.'
      );
      return;
    }

    setRequestInfoTarget({
      id: resolvedId,
      name: caregiver.name || caregiver.fullName || 'Caregiver',
      avatar: caregiver.avatar || caregiver.profileImage || null,
    });

    toggleModal('requestInfo', true);
  }, [toggleModal]);

  const openContractTypeSelector = useCallback((application) => {
    setPendingApplicationForContract(application);
    setSelectedContractTemplate(null);
    toggleModal('contractType', true);
  }, [toggleModal]);

  const handleContractTemplateChosen = useCallback((contractType) => {
    setSelectedContractTemplate(contractType);
  }, []);

  const closeContractTypeSelector = useCallback(() => {
    toggleModal('contractType', false);
    setSelectedContractTemplate(null);
    setPendingApplicationForContract(null);
  }, [toggleModal]);

  const handleOpenRequestInfoFromHeader = useCallback(() => {
    if (requestInfoTarget) {
      toggleModal('requestInfo', true);
      return;
    }

    Alert.alert(
      'Select a caregiver first',
      'Choose a caregiver from the dashboard and tap “Request Info” on their card to start a privacy request.'
    );
  }, [requestInfoTarget, toggleModal]);

  const handleCloseRequestInfoModal = useCallback(() => {
    toggleModal('requestInfo', false);
  }, [toggleModal]);

  // Helper function to create caregiver object
  const createCaregiverObject = useCallback((caregiverData = null) => {
    const caregiver = caregiverData || (caregivers?.length > 0 ? caregivers[0] : null);
    return caregiver ? {
      _id: caregiver._id || caregiver.id,
      id: caregiver.id || caregiver._id,
      userId: caregiver.userId || null,
      name: caregiver.name,
      avatar: caregiver.avatar || caregiver.profileImage,
      profileImage: caregiver.profileImage || caregiver.avatar,
      rating: caregiver.rating,
      reviews: caregiver.reviewCount,
      hourlyRate: caregiver.hourlyRate,
      rate: caregiver.hourlyRate ? `₱${caregiver.hourlyRate}/hr` : undefined,
    } : DEFAULT_CAREGIVER;
  }, [caregivers]);

  // Child management functions
  const openAddChild = useCallback(() => {
    setChildForm({
      name: '',
      age: '',
      allergies: '',
      notes: '',
      editingId: null
    });
    toggleModal('child', true);
  }, [toggleModal]);

  const openEditChild = useCallback((child) => {
    setChildForm({
      name: child.name || '',
      age: String(child.age ?? ''),
      allergies: child.allergies || '',
      notes: child.preferences || child.notes || '',
      editingId: child.id || child._id
    });
    toggleModal('child', true);
  }, [toggleModal]);

  const handleDeleteChild = useCallback(async (child) => {
    Alert.alert(
      'Delete Child',
      `Are you sure you want to delete ${child.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await childService.deleteChild(child.id || child._id, user.id);
              await fetchChildren();
              Alert.alert('Success', 'Child deleted successfully!');
            } catch (error) {
              console.error('Child delete failed:', error);
              Alert.alert('Error', 'Failed to delete child. Please try again.');
            }
          }
        }
      ]
    );
  }, [fetchChildren, user?.id]);

  const handleViewAllChildren = useCallback(() => {
    setShowAllChildren(prev => !prev);
  }, []);

  const handleAddOrSaveChild = useCallback(async () => {
    const trimmedName = childForm.name.trim();
    if (!trimmedName) return;

    const childData = {
      name: trimmedName,
      age: Number(childForm.age || 0),
      allergies: childForm.allergies || '',
      preferences: childForm.notes || ''
    };

    try {
      if (childForm.editingId) {
        await childService.updateChild(childForm.editingId, childData, user.id);
      } else {
        const existingChild = children.find(child =>
          child.name.toLowerCase() === trimmedName.toLowerCase()
        );

        if (existingChild) {
          Alert.alert(
            'Child Already Exists',
            `${trimmedName} already exists in your children list. Would you like to update the existing child instead?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Update',
                onPress: async () => {
                  try {
                    await childService.updateChild(existingChild._id || existingChild.id, childData, user.id);
                    await fetchChildren();
                    toggleModal('child', false);
                    setChildForm({ name: '', age: '', allergies: '', notes: '', editingId: null });
                    Alert.alert('Success', 'Child updated successfully!');
                  } catch (updateError) {
                    console.error('Child update failed:', updateError);
                    Alert.alert('Error', 'Failed to update child. Please try again.');
                  }
                }
              }
            ]
          );
          return;
        }

        await childService.createChild(childData, user.id);
      }

      await fetchChildren();
      toggleModal('child', false);
      setChildForm({ name: '', age: '', allergies: '', notes: '', editingId: null });

      Alert.alert('Success', childForm.editingId ? 'Child updated successfully!' : 'Child added successfully!');
    } catch (error) {
      console.error('Child save failed:', error);

      if (error.message && error.message.includes('already exists')) {
        Alert.alert(
          'Child Already Exists',
          'A child with this name already exists. Please use a different name or edit the existing child.',
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert('Error', 'Failed to save child. Please try again.');
    }
  }, [childForm, children, fetchChildren, toggleModal, user?.id]);

  // Quick actions
  const quickActions = useMemo(() => [
    {
      id: 'find',
      icon: 'search',
      title: 'Find Caregiver',
      onPress: () => setActiveTab('search')
    },
    {
      id: 'book',
      icon: 'calendar',
      title: 'Book Service',
      onPress: () => {
        setSelectedCaregiver(createCaregiverObject());
        toggleModal('booking', true);
      }
    },
    {
      id: 'messages',
      icon: 'chatbubble-ellipses',
      title: 'Messages',
      onPress: () => setActiveTab('messages')
    },
    {
      id: 'add-child',
      icon: 'person-add',
      title: 'Add Child',
      onPress: () => openAddChild()
    }
  ], [setActiveTab, createCaregiverObject, toggleModal, openAddChild]);

  // Refresh function
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadProfile(),
        fetchJobs(),
        fetchCaregivers(),
        fetchBookings(),
        fetchChildren()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadProfile, fetchJobs, fetchCaregivers, fetchBookings, fetchChildren]);

  const handleApplicationsRefresh = useCallback(async () => {
    try {
      await Promise.all([
        fetchApplications({ force: true }),
        fetchBookings({ force: true })
      ]);
    } catch (error) {
      console.error('Error refreshing applications data:', error);
    }
  }, [fetchApplications, fetchBookings]);

  // Caregiver interaction functions
  const handleViewCaregiver = useCallback((caregiver) => {
    navigation.navigate('CaregiverProfile', { caregiverId: caregiver._id });
  }, [navigation]);

  const handleMessageCaregiver = useCallback(async (caregiver) => {
    const resolveAllowDirectMessages = (value) => {
      if (value === false || value === 0) return false;
      if (value === true || value === 1) return true;
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['false', '0', 'off', 'no'].includes(normalized)) return false;
        if (['true', '1', 'on', 'yes'].includes(normalized)) return true;
      }
      return undefined;
    };

    const allowDirectMessages = resolveAllowDirectMessages(caregiver?.allowDirectMessages);
    const allowDirectMessagesFallback =
      resolveAllowDirectMessages(caregiver?.privacySettings?.allowDirectMessages) ??
      resolveAllowDirectMessages(caregiver?.privacySettings?.allow_direct_messages);

    const effectiveAllowDirectMessages =
      allowDirectMessages ??
      allowDirectMessagesFallback ??
      true;

    if (effectiveAllowDirectMessages === false) {
      const caregiverNameFallback = caregiver?.name || 'Caregiver';
      Alert.alert('Messaging disabled', `${caregiverNameFallback} is not accepting direct messages.`);
      return;
    }

    const caregiverName = caregiver?.name || 'Caregiver';

    if (!user?.id) {
      Alert.alert('Error', 'User authentication required. Please log out and back in.');
      return;
    }

    const caregiverId = caregiver?._id || caregiver?.id || caregiver?.userId;
    if (!caregiverId) {
      Alert.alert('Error', 'Caregiver information not available');
      return;
    }

    try {
      await supabaseService.getOrCreateConversation(user.id, caregiverId);
      navigation.navigate('Chat', {
        userId: user.id,
        targetUserId: caregiverId,
        targetUserName: caregiverName,
        userType: 'parent',
        targetUserType: 'caregiver'
      });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Unable to open chat right now. Please try again later.');
    }
  }, [navigation, user]);

  const handleCallCaregiver = useCallback((caregiver) => {
    if (!caregiver) {
      Alert.alert('No caregiver information', 'Caregiver details are missing.');
      return;
    }

    const rawPhone = caregiver.phone || caregiver.contactPhone;
    if (!rawPhone) {
      Alert.alert('No phone number', 'This caregiver has not provided a phone number.');
      return;
    }

    const sanitized = String(rawPhone).replace(/[^0-9+]/g, '');
    if (!sanitized) {
      Alert.alert('Invalid phone number', 'Unable to place call with the provided number.');
      return;
    }

    Linking.openURL(`tel:${sanitized}`).catch(() => {
      Alert.alert('Unable to place call', 'Please try again later.');
    });
  }, []);

  const handleViewReviews = useCallback((caregiver) => {
    navigation.navigate('CaregiverReviews', {
      userId: user.id,
      caregiverId: caregiver._id || caregiver.id
    });
  }, [navigation, user?.id]);

  const handleBookCaregiver = useCallback((caregiver) => {
    setSelectedCaregiver({
      _id: caregiver._id || caregiver.id,
      id: caregiver.id || caregiver._id,
      name: caregiver.name,
      avatar: caregiver.avatar || caregiver.profileImage,
      profileImage: caregiver.profileImage || caregiver.avatar,
      rating: caregiver.rating,
      reviews: caregiver.reviewCount,
      hourlyRate: caregiver.hourlyRate,
      rate: caregiver.hourlyRate ? `₱${caregiver.hourlyRate}/hr` : undefined,
    });
    toggleModal('booking', true);
  }, [toggleModal]);

  // Contract signing function
  const handleContractSign = useCallback(async ({ signature, acknowledged }) => {
    if (!selectedContract) return;

    try {
      const bookingIdentifier =
        (selectedBooking && (selectedBooking.id || selectedBooking._id)) ||
        selectedContract.bookingId ||
        null;
      let existingContract = null;

      try {
        existingContract = await supabaseContractService.getContractById(selectedContract.id);
      } catch (error) {
        const isNotFound = error?.code === 'PGRST116' || error?.message?.includes('0 rows');
        console.warn('⚠️ Contract lookup failed before signing:', {
          errorCode: error?.code,
          errorMessage: error?.message,
          bookingIdentifier,
          selectedContractId: selectedContract.id,
          selectedBookingId: (selectedBooking && (selectedBooking.id || selectedBooking._id)) || null
        });

        if (!isNotFound) {
          throw error;
        }

        if (bookingIdentifier) {
          try {
            const fallbackContracts = await supabaseContractService.getContractsByBooking(bookingIdentifier);
            console.log('ℹ️ Fallback contract lookup result:', {
              resultCount: Array.isArray(fallbackContracts) ? fallbackContracts.length : null,
              bookingIdentifier
            });
            if (Array.isArray(fallbackContracts) && fallbackContracts.length > 0) {
              existingContract = fallbackContracts[0];
              setSelectedContract(existingContract);
            }
          } catch (fallbackError) {
            console.warn('⚠️ Failed to load fallback contract list:', fallbackError);
          }
        }

        if (!existingContract) {
          console.warn('⚠️ Contract signing aborted after failed lookups.', {
            bookingIdentifier,
            selectedContractId: selectedContract.id
          });
          Alert.alert('Contract unavailable', 'This contract could not be found. Please refresh and try again.');
          toggleModal('contract', false);
          setSelectedContract(null);
          setSelectedBooking(null);
          return;
        }
      }

      if (!existingContract) {
        Alert.alert('Contract unavailable', 'This contract could not be found. Please refresh and try again.');
        toggleModal('contract', false);
        setSelectedContract(null);
        setSelectedBooking(null);
        return;
      }

      let result;
      try {
        result = await supabaseContractService.signContract(existingContract.id, 'parent', {
          signature,
          signatureHash: Buffer.from(signature || '').toString('base64'),
          ipAddress: null,
          acknowledged
        });
      } catch (error) {
        console.error('❌ Contract signing failed:', {
          errorCode: error?.code,
          errorMessage: error?.message,
          bookingIdentifier,
          contractId: existingContract.id
        });
        if (error?.code === 'CONTRACT_NOT_FOUND' || error?.code === 'PGRST116' || error?.message?.includes('0 rows')) {
          Alert.alert('Contract unavailable', 'This contract could not be found. Please refresh and try again.');
          toggleModal('contract', false);
          setSelectedContract(null);
          setSelectedBooking(null);
          return;
        }
        if (error?.code === 'CONTRACT_ACTIVE_CONFLICT') {
          Alert.alert(
            'Contract already active',
            'There is already an active contract for this booking. Please view or sign that contract instead.'
          );
          toggleModal('contract', false);
          setSelectedContract(null);
          setSelectedBooking(null);
          await fetchBookings();
          return;
        }
        throw error;
      }

      if (result) {
        Alert.alert('Success', 'Contract signed successfully!');
        toggleModal('contract', false);
        setSelectedContract(null);
        setSelectedBooking(null);
        await fetchBookings();
      }
    } catch (error) {
      console.error('Error signing contract:', error);
      Alert.alert('Error', 'Failed to sign contract. Please try again.');
    }
  }, [selectedContract, selectedBooking, fetchBookings, toggleModal]);

  // Booking functions
  const handleBookingConfirm = async (bookingData) => {
    if (!bookingData.caregiverId || !bookingData.date || !bookingData.startTime || !bookingData.endTime) {
      throw new Error('Missing required booking information');
    }

    const selectedChildrenObjects = (bookingData.selectedChildren || []).map((childName, index) => {
      const matchedChild = children.find(child => child?.name === childName);
      return {
        name: matchedChild?.name || childName || `Child ${index + 1}`,
        age: matchedChild?.age || 'Unknown',
        preferences: matchedChild?.preferences || '',
        allergies: matchedChild?.allergies || 'None',
        specialInstructions: matchedChild?.specialInstructions || '',
      };
    });

    const normalizedDate = bookingData.date instanceof Date
      ? bookingData.date.toISOString().split('T')[0]
      : String(bookingData.date);

    const parentId = user?.id || profile?._id || profile?.id;

    const payload = {
      caregiverId: bookingData.caregiverId,
      caregiver_id: bookingData.caregiverId,
      clientId: parentId,
      parent_id: parentId,
      date: normalizedDate,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
      address: bookingData.address,
      contactPhone: bookingData.contactPhone || null,
      hourlyRate: Number(bookingData.hourlyRate),
      totalCost: Number(bookingData.totalCost),
      selectedChildren: selectedChildrenObjects,
      children: selectedChildrenObjects,
      specialInstructions: bookingData.specialInstructions || null,
      emergencyContact: bookingData.emergencyContact || null,
      status: bookingData.status || 'pending_confirmation'
    };

    try {
      await supabaseService.createBooking(payload);
      setActiveTab('bookings');
      await fetchBookings();
      toggleModal('booking', false);
      Alert.alert('Success', 'Booking created successfully!');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create booking');
      throw error;
    }
  };

  const handleGetDirections = useCallback((booking) => {
    if (!booking) {
      Alert.alert('No booking selected', 'Please select a booking first.');
      return;
    }

    const destination = booking.address || booking.location;
    if (!destination) {
      Alert.alert('Location unavailable', 'No address was provided for this booking.');
      return;
    }

    const encoded = encodeURIComponent(destination);
    const url = `https://www.google.com/maps/search/?api=1&query=${encoded}`;

    Linking.openURL(url).catch((error) => {
      console.error('Failed to open maps link:', error);
      Alert.alert('Error', 'Unable to open maps. Please try again later.');
    });
  }, []);

  const handleCancelBooking = useCallback(async (bookingOrId) => {
    const bookingId = typeof bookingOrId === 'object' ? (bookingOrId.id || bookingOrId._id) : bookingOrId;

    if (!bookingId) {
      Alert.alert('Unable to cancel', 'Missing booking information.');
      return;
    }

    try {
      setRefreshing(true);
      await supabaseService.cancelBooking(bookingId);
      Alert.alert('Success', 'Booking cancelled successfully');
      await fetchBookings();
    } catch (error) {
      console.error('Cancellation failed:', error);
      Alert.alert('Error', error?.message || 'Failed to cancel booking. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, [fetchBookings]);

  // Search and filter functions
  const handleSearch = useCallback((text) => {
    setSearchQuery(text);
  }, []);

  const handleApplyFilters = useCallback((newFilters) => {
    setFilters(buildNormalizedFilters(newFilters));
    setActiveFilters(countActiveFilters(buildNormalizedFilters(newFilters)));
  }, []);

  const handleQuickFilter = useCallback((filterKey) => {
    if (filterKey === 'clear') {
      setFilters(buildNormalizedFilters());
      setActiveFilters(countActiveFilters(buildNormalizedFilters()));
      setQuickFilters({ ...QUICK_FILTER_DEFAULTS });
      setSearchQuery('');
      return;
    }

    setQuickFilters((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, filterKey)) {
        return prev;
      }
      return {
        ...prev,
        [filterKey]: !prev[filterKey],
      };
    });
  }, []);

  // Job management functions
  const handleCreateJob = useCallback(() => {
    toggleModal('jobPosting', true);
  }, [toggleModal]);

  const handleEditJob = useCallback(() => {
    toggleModal('jobPosting', true);
  }, [toggleModal]);

  const handleCompleteJob = useCallback(async (jobOrBooking) => {
    const resolvedBookingId = typeof jobOrBooking === 'object'
      ? (jobOrBooking.id || jobOrBooking._id)
      : jobOrBooking;

    if (!resolvedBookingId) {
      Alert.alert('Error', 'Unable to determine which booking to update.');
      return;
    }

    Alert.alert(
      'Complete Booking',
      'Mark this booking as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await supabaseService.bookings.updateBookingStatus(resolvedBookingId, 'completed');
              await fetchBookings();
              Alert.alert('Success', 'Booking marked as completed');
            } catch (error) {
              console.error('Error completing booking:', error);
              Alert.alert('Error', 'Failed to complete booking');
            }
          }
        }
      ]
    );
  }, [fetchBookings]);

  const handleDeleteJob = useCallback(async (jobId) => {
    Alert.alert(
      'Delete Job',
      'Are you sure you want to delete this job posting?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabaseService.deleteJob(jobId);
              await fetchJobs();
              Alert.alert('Success', 'Job deleted successfully');
            } catch (error) {
              console.error('Error deleting job:', error);
              Alert.alert('Error', 'Failed to delete job');
            }
          }
        }
      ]
    );
  }, [fetchJobs]);

  const handleJobPosted = useCallback(async () => {
    toggleModal('jobPosting', false);
    Alert.alert('Success', 'Job posted successfully!');
    await fetchJobs();
  }, [toggleModal, fetchJobs]);

  const handleApplicationStatusUpdate = useCallback(async (applicationId, status, jobId, contractTemplateOverride = null) => {
    if (!applicationId) {
      Alert.alert('Error', 'Missing application identifier.');
      return;
    }

    setApplicationsMutatingId(applicationId);
    try {
      if (status === 'accepted') {
        const application = Array.isArray(applications)
          ? applications.find((app) => String(app.id) === String(applicationId))
          : null;

        const contractTerms = buildPromotionContractTerms(application || {}, contractTemplateOverride);

        await supabaseService.applications.promoteApplication(applicationId, {
          contractTerms,
          createdBy: user?.id || null
        });

        await Promise.all([
          fetchJobs(),
          fetchBookings(),
          fetchApplications()
        ]);

        Alert.alert('Success', 'Application accepted and booking created successfully.');
      } else {
        await supabaseService.applications.updateApplicationStatus(applicationId, status, jobId);
        await Promise.all([
          fetchJobs(),
          fetchBookings(),
          fetchApplications()
        ]);
        Alert.alert('Success', `Application ${status} successfully`);
      }
    } catch (error) {
      console.error('Failed to update application status:', error);
      Alert.alert('Error', error?.message || 'Failed to update application status.');
    } finally {
      setApplicationsMutatingId(null);
      setPendingApplicationForContract(null);
    }
  }, [applications, fetchJobs, fetchBookings, fetchApplications, user?.id]);

  const handleOpenContract = useCallback((booking, contract) => {
    setSelectedBooking(booking);
    setSelectedContract(contract);
    toggleModal('contract', true);
  }, [toggleModal]);

  const openContractByIds = useCallback(async ({ contractId, bookingId }) => {
    if (!contractId) {
      Alert.alert('Contract unavailable', 'We could not identify the requested contract.');
      return;
    }

    try {
      const contract = await supabaseContractService.getContractById(contractId);
      setSelectedContract(contract);
      setSelectedBooking(null);
      toggleModal('contract', true);
    } catch (error) {
      console.error('Failed to open contract:', error);
      Alert.alert('Error', 'Failed to open contract. Please try again.');
    }
  }, [toggleModal]);

  const openPaymentModal = useCallback((bookingId) => {
    setPaymentData(prev => ({ ...prev, bookingId }));
    toggleModal('payment', true);
  }, [toggleModal]);

  const handleContractResend = useCallback(async (contract) => {
    if (!contract) return;
    try {
      await supabaseContractService.resendContract(contract.id, user?.id);
      Alert.alert('Success', 'Contract reminder sent!');
    } catch (error) {
      console.error('Error resending contract:', error);
      Alert.alert('Error', 'Failed to send reminder. Please try again.');
    }
  }, [user?.id]);

  const handleSaveContractDraft = useCallback(async ({ contract, terms }) => {
    if (!contract?.id) return;
    setSavingContractDraft(true);
    try {
      const saved = await supabaseContractService.saveDraft(contract.id, terms, {
        actorId: user?.id || null,
        actorRole: 'parent'
      });
      setSelectedContract(saved);
      await fetchBookings();
      Alert.alert('Draft saved', 'Your changes were saved successfully.');
    } catch (error) {
      console.error('Failed to save draft:', error);
      Alert.alert('Save failed', error?.message || 'Unable to save draft. Please try again.');
    } finally {
      setSavingContractDraft(false);
    }
  }, [fetchBookings, user?.id]);

  const handleSendContractForSignature = useCallback(async ({ contract, terms }) => {
    if (!contract?.id) return;
    setSendingContractForSignature(true);
    try {
      const sent = await supabaseContractService.sendDraftForSignature(contract.id, {
        terms,
        actorId: user?.id || null,
        actorRole: 'parent'
      });
      setSelectedContract(sent);
      Alert.alert('Sent for signature', 'Caregiver has been notified to review and sign.');
      await fetchBookings();
      toggleModal('contract', false);
      setSelectedContract(null);
      setSelectedBooking(null);
    } catch (error) {
      console.error('Failed to send contract for signature:', error);
      Alert.alert('Send failed', error?.message || 'Unable to send contract. Please try again.');
    } finally {
      setSendingContractForSignature(false);
    }
  }, [fetchBookings, toggleModal, user?.id]);

  const handleDownloadPdf = useCallback(async (contract) => {
    if (!contract?.id) {
      Alert.alert('Error', 'Contract information is missing. Please try again.');
      return;
    }

    try {
      const result = await supabaseContractService.generateContractPdf(contract.id, {
        autoDownload: Platform.OS === 'web',
        includeSignatures: true,
      });

      if (!result?.uri && !result?.url) {
        throw new Error('Download did not return a file location.');
      }

      const fileUri = result.uri || result.url;
      const isLocalFile = typeof fileUri === 'string' && fileUri.startsWith('file://');

      let handled = false;

      if (isLocalFile) {
        try {
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf' });
            handled = true;
          }
        } catch (shareError) {
          console.warn('Share unavailable for contract PDF:', shareError);
        }
      }

      if (!handled) {
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
              await Linking.openURL(fileUri);
              handled = true;
            } catch (linkError) {
              console.warn('Failed to open contract PDF URL:', linkError);
            }
          }
        }
      }

      if (!handled) {
        Alert.alert('Download complete', `PDF available at:\n${fileUri}`);
      }
    } catch (error) {
      console.error('Error downloading contract PDF:', error);
      Alert.alert('Download failed', error instanceof Error ? error.message : String(error));
    }
  }, []);

  // Profile management
  const handleSaveProfile = useCallback(async () => {
    try {
      const updateData = {
        name: profileForm.name.trim(),
        phone: profileForm.contact.trim(),
        address: profileForm.location.trim(),
        location: profileForm.location.trim()
      };

      await supabaseService.updateProfile(user.id, updateData);
      toggleModal('profile', false);
      Alert.alert('Success', 'Profile updated successfully');
      await loadProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  }, [profileForm, toggleModal, loadProfile, user?.id]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeTab
            bookings={bookings}
            children={children}
            quickActions={quickActions}
            onAddChild={openAddChild}
            onEditChild={openEditChild}
            onDeleteChild={handleDeleteChild}
            onViewBookings={() => setActiveTab('bookings')}
            onViewAllChildren={handleViewAllChildren}
            showAllChildren={showAllChildren}
            greetingName={greetingName}
            profileImage={profileForm.image}
            profileContact={profileForm.contact}
            profileLocation={profile?.location || profileForm.location}
            userData={profile}
            caregivers={caregiversWithReviews || []}
            onBookCaregiver={handleBookCaregiver}
            onMessageCaregiver={handleMessageCaregiver}
            onViewReviews={handleViewReviews}
            onRequestInfo={openRequestInfoModal}
            navigation={navigation}
            loading={loading}
            refreshing={refreshing}
            onRefresh={onRefresh}
            setActiveTab={setActiveTab}
          />
        );
      case 'search':
        return (
          <SearchTab
            caregivers={caregiversWithReviews}
            filteredCaregivers={filteredCaregivers}
            onViewCaregiver={handleViewCaregiver}
            onMessageCaregiver={handleMessageCaregiver}
            onViewReviews={handleViewReviews}
            onBookCaregiver={handleBookCaregiver}
            onRequestInfo={openRequestInfoModal}
            searchQuery={searchQuery}
            onSearch={handleSearch}
            onOpenFilter={() => toggleModal('filter', true)}
            onQuickFilter={handleQuickFilter}
            quickFilters={quickFilters}
            activeFilters={activeFilters}
            loading={loading || searchLoading}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        );
      case 'bookings':
        return (
          <BookingsTab
            bookings={bookings}
            bookingsFilter={bookingsFilter}
            setBookingsFilter={setBookingsFilter}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onCancelBooking={handleCancelBooking}
            onUploadPayment={openPaymentModal}
            onViewBookingDetails={(bookingId) => {
              const booking = bookings.find(b => (b.id || b._id) === bookingId);
              if (booking) {
                setSelectedBooking(booking);
                toggleModal('bookingDetails', true);
              }
            }}
            onWriteReview={({ bookingId, caregiverId, caregiverName }) => {
              navigation.navigate('CaregiverReviews', {
                caregiverId,
                bookingId,
                caregiverName: caregiverName || 'Caregiver'
              });
            }}
            onCreateBooking={() => {
              setSelectedCaregiver(createCaregiverObject());
              toggleModal('booking', true);
            }}
            onMessageCaregiver={handleMessageCaregiver}
            onOpenContract={handleOpenContract}
            navigation={navigation}
            loading={loading}
          />
        );
      case 'messages':
        return (
          <MessagesTab
            navigation={navigation}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        );
      case 'jobs':
        return (
          <JobsTab
            jobs={jobs}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onCreateJob={handleCreateJob}
            onEditJob={handleEditJob}
            onDeleteJob={handleDeleteJob}
            onCompleteJob={handleCompleteJob}
            onJobPosted={handleJobPosted}
            loading={loading}
            setActiveTab={setActiveTab}
            childrenList={children}
          />
        );
      case 'applications':
        return (
          <JobApplicationsTab
            applications={applications}
            bookings={bookings}
            loading={applicationsLoading}
            mutatingApplicationId={applicationsMutatingId}
            refreshing={refreshing}
            onRefresh={handleApplicationsRefresh}
            onViewCaregiver={handleViewCaregiver}
            onMessageCaregiver={handleMessageCaregiver}
            onOpenContractTypeSelector={openContractTypeSelector}
            onUpdateStatus={handleApplicationStatusUpdate}
            onOpenContract={openContractByIds}
            onCallCaregiver={handleCallCaregiver}
          />
        );
      case 'reviews':
        return (
          <ReviewsTab
            refreshing={refreshing}
            onRefresh={onRefresh}
            loading={loading}
          />
        );
      case 'alerts':
        return (
          <AlertsTab
            navigation={navigation}
            refreshing={refreshing}
            onRefresh={onRefresh}
            loading={loading}
            onNavigateTab={async (tabId, metadata) => {
              setActiveTab(tabId);
              if (metadata?.contractId) {
                await openContractByIds({
                  contractId: metadata.contractId,
                  bookingId: metadata.bookingId
                });
              }
            }}
          />
        );
      default:
        return (
          <View style={styles.defaultTab}>
            <Text>Select a tab to get started</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Header
          navigation={navigation}
          onProfilePress={() => toggleModal('profile', true)}
          onSignOut={signOut}
          greetingName={greetingName}
          onProfileEdit={() => toggleModal('profile', true)}
          profileName={profile?.name}
          profileImage={profile?.profileImage || profile?.profile_image}
          profileContact={profile?.email}
          profileLocation={profile?.location}
          setActiveTab={setActiveTab}
          tabNotificationCounts={tabNotificationCounts}
          onRequestInfo={handleOpenRequestInfoFromHeader}
          user={user}
          userType="parent"
        />

        <NavigationTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onProfilePress={() => toggleModal('profile', true)}
          navigation={navigation}
          tabNotificationCounts={tabNotificationCounts}
        />

        {renderActiveTab()}

        {/* Modals */}
        <ChildModal
          visible={modals.child}
          onClose={() => toggleModal('child', false)}
          childName={childForm.name}
          setChildName={(name) => setChildForm(prev => ({ ...prev, name }))}
          childAge={childForm.age}
          setChildAge={(age) => setChildForm(prev => ({ ...prev, age }))}
          childAllergies={childForm.allergies}
          setChildAllergies={(allergies) => setChildForm(prev => ({ ...prev, allergies }))}
          childNotes={childForm.notes}
          setChildNotes={(notes) => setChildForm(prev => ({ ...prev, notes }))}
          onSave={handleAddOrSaveChild}
          editing={!!childForm.editingId}
        />

        <ProfileModal
          visible={modals.profile}
          onClose={() => toggleModal('profile', false)}
          profileName={profileForm.name}
          setProfileName={(name) => setProfileForm(prev => ({ ...prev, name }))}
          profileContact={profileForm.contact}
          setProfileContact={(contact) => setProfileForm(prev => ({ ...prev, contact }))}
          profileLocation={profileForm.location}
          setProfileLocation={(location) => setProfileForm(prev => ({ ...prev, location }))}
          profileImage={profileForm.image}
          setProfileImage={(image) => setProfileForm(prev => ({ ...prev, image }))}
          handleSaveProfile={handleSaveProfile}
        />

        <FilterModal
          visible={modals.filter}
          onClose={() => toggleModal('filter', false)}
          filters={filters}
          onApplyFilters={handleApplyFilters}
        />

        <JobPostingModal
          visible={modals.jobPosting}
          onClose={() => toggleModal('jobPosting', false)}
          onJobPosted={handleJobPosted}
          childrenList={children}
        />

        <PaymentModal
          visible={modals.payment}
          onClose={() => toggleModal('payment', false)}
          bookingId={paymentData.bookingId}
          amount={bookings.find(b => b._id === paymentData.bookingId)?.totalCost}
          caregiverName={bookings.find(b => b._id === paymentData.bookingId)?.caregiver?.name}
          bookingDate={bookings.find(b => b._id === paymentData.bookingId)?.date}
          paymentType={bookings.find(b => b._id === paymentData.bookingId)?.status === 'completed' ? 'final_payment' : 'deposit'}
          onPaymentSuccess={() => {
            toggleModal('payment', false);
            fetchBookings();
          }}
        />

        <BookingModal
          visible={modals.booking}
          onClose={() => toggleModal('booking', false)}
          caregiver={selectedCaregiver}
          childrenList={children}
          onConfirm={handleBookingConfirm}
        />

        {modals.bookingDetails && selectedBooking && (
          <BookingDetailsModal
            visible={modals.bookingDetails}
            booking={selectedBooking}
            onClose={() => {
              toggleModal('bookingDetails', false);
              setSelectedBooking(null);
            }}
            onMessage={() => {
              if (selectedBooking?.caregiver) {
                toggleModal('bookingDetails', false);
                handleMessageCaregiver(selectedBooking.caregiver);
                setSelectedBooking(null);
              }
            }}
            onGetDirections={() => handleGetDirections(selectedBooking)}
            onCompleteBooking={() => handleCompleteJob(selectedBooking)}
            onCancelBooking={() => handleCancelBooking(selectedBooking)}
          />
        )}

        <ContractModal
          visible={modals.contract}
          onClose={() => {
            toggleModal('contract', false);
            setSelectedContract(null);
            setSelectedBooking(null);
            setSavingContractDraft(false);
            setSendingContractForSignature(false);
          }}
          contract={selectedContract}
          booking={selectedBooking}
          viewerRole="parent"
          onSign={handleContractSign}
          onResend={handleContractResend}
          onDownloadPdf={handleDownloadPdf}
          onSaveDraft={handleSaveContractDraft}
          onSendForSignature={handleSendContractForSignature}
          savingDraft={savingContractDraft}
          sendingForSignature={sendingContractForSignature}
        />

        <ContractTypeSelector
          visible={modals.contractType}
          onClose={closeContractTypeSelector}
          onSelectContractType={(type) => {
            handleContractTemplateChosen(type);
            toggleModal('contractType', false);
            if (pendingApplicationForContract?.id || pendingApplicationForContract?._id) {
              const applicationId = pendingApplicationForContract.id || pendingApplicationForContract._id;
              const jobId = pendingApplicationForContract.jobId || pendingApplicationForContract.job?.id;
              handleApplicationStatusUpdate(applicationId, 'accepted', jobId, type);
            }
          }}
          selectedType={selectedContractTemplate}
        />

        <RequestInfoModal
          visible={modals.requestInfo}
          onClose={handleCloseRequestInfoModal}
          targetUser={requestInfoTarget}
          userType="parent"
        />
      </View>
    </View>
  );
};

const ParentDashboardWithErrorBoundary = (props) => (
  <ErrorBoundary>
    <ParentDashboard {...props} />
  </ErrorBoundary>
);

export { ParentDashboard };
export default ParentDashboardWithErrorBoundary;
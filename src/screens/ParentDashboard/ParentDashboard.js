import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { processImageForUpload } from '../../utils/imageUtils';

// Core imports
import { useAuth } from '../../contexts/AuthContext';
import { useNotificationCounts } from '../../hooks/useNotificationCounts';
import { useParentDashboard } from '../../hooks/useParentDashboard';

// Supabase service import
import { supabaseService } from '../../services/supabase';
import { contractService } from '../../services/supabase/contractService';

// Utility imports
import { countActiveFilters } from '../../utils/caregiverUtils';
import { styles } from '../styles/ParentDashboard.styles';

// Privacy components
import { usePrivacy } from '../../components/features/privacy/PrivacyManager';
import { useProfileData } from '../../components/features/privacy/ProfileDataManager';

// Component imports
import ContractTypeSelector, { CONTRACT_TYPES } from '../../components/modals/ContractTypeSelector';
import AlertsTab from './components/AlertsTab';
import BookingsTab from './components/BookingsTab';
import Header from './components/Header';
import HomeTab from './components/HomeTab';
import JobApplicationsTab from './components/JobApplicationsTab';
import JobsTab from './components/JobsTab';
import MessagesTab from './components/MessagesTab'; // Added missing import
import NavigationTabs from './components/NavigationTabs';
import ReviewsTab from './components/ReviewsTab';
import SearchTab from './components/SearchTab';


// Modal imports
import ContractModal from '../../components/modals/ContractModal';
import BookingDetailsModal from '../../shared/ui/modals/BookingDetailsModal';
import BookingModal from './modals/BookingModal';
import ChildModal from './modals/ChildModal';
import FilterModal from './modals/FilterModal';
import JobPostingModal from './modals/JobPostingModal';
import PaymentModal from './modals/PaymentModal';
import ProfileModal from './modals/ProfileModal';
// Constants
const DEFAULT_FILTERS = {
  availability: { availableNow: false, days: [] },
  location: { distance: 10, location: '' },
  rate: { min: 0, max: 1000 },
  experience: { min: 0, max: 30 },
  certifications: [],
  rating: 0,
};

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

const ParentDashboard = () => {
  const navigation = useNavigation();
  const { signOut, user } = useAuth();
  
  // Get privacy-related data (context provided at app root)
  const { pendingRequests } = usePrivacy();
  const profileDataContext = useProfileData?.() || {};
  
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
  
  // Calculate tab notification counts
  const tabNotificationCounts = useMemo(() => {
    // Count pending bookings from actual booking data
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
    contractType: false
  });

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [selectedContractTemplate, setSelectedContractTemplate] = useState(null);
  const [pendingApplicationForContract, setPendingApplicationForContract] = useState(null);
  const [applicationsMutatingId, setApplicationsMutatingId] = useState(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [filteredCaregivers, setFilteredCaregivers] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [activeFilters, setActiveFilters] = useState(0);
  const [quickFilters, setQuickFilters] = useState({
    availableNow: false,
    nearMe: false,
    topRated: false,
    certified: false
  });

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

  // Derived data
  const displayName = useMemo(() => {
    return (user?.displayName || (user?.email ? String(user.email).split('@')[0] : '') || '').trim();
  }, [user]);

  const greetingName = useMemo(() => {
    return (profileForm.name && String(profileForm.name).trim()) || displayName;
  }, [profileForm.name, displayName]);

  // Enhanced caregivers with review eligibility
  const caregiversWithReviews = useMemo(() => {
    if (!caregivers || !bookings) return caregivers || [];

    return (caregivers || []).map(caregiver => {
      // Check if this caregiver has any completed bookings
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
  ], [setActiveTab, createCaregiverObject, toggleModal]);

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
    console.log('🔍 Opening edit for child:', child);
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
              console.log('🗑️ Deleting child:', child);
              const { childService } = await import('../../services/childService');
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
  }, [fetchChildren]);

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
        const { childService } = await import('../../services/childService');
        await childService.updateChild(childForm.editingId, childData, user.id);
      } else {
        // Check if child already exists before creating
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
                    const { childService } = await import('../../services/childService');
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

        // Try to create the child
        try {
          // Use childService with user.id from AuthContext
          const { childService } = await import('../../services/childService');
          await childService.createChild(childData, user.id);
        } catch (createError) {
          // If creation fails due to "already exists", try to find and update existing child
          if (createError.message && createError.message.includes('already exists')) {
            const existingChild = children.find(child =>
              child.name.toLowerCase() === trimmedName.toLowerCase()
            );

            if (existingChild) {
              Alert.alert(
                'Child Already Exists',
                `${trimmedName} already exists. Would you like to update the existing child instead?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Update',
                    onPress: async () => {
                      try {
                        const { childService } = await import('../../services/childService');
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
          }
          throw createError; // Re-throw if it's not an "already exists" error
        }
      }

      await fetchChildren();
      toggleModal('child', false);
      setChildForm({ name: '', age: '', allergies: '', notes: '', editingId: null });
      
      // Trigger a full refresh to update all components
      setTimeout(() => {
        onRefresh();
      }, 100);

      Alert.alert('Success', childForm.editingId ? 'Child updated successfully!' : 'Child added successfully!');
    } catch (error) {
      console.error('Child save failed:', error);

      // Handle specific error cases
      if (error.message && error.message.includes('already exists')) {
        Alert.alert(
          'Child Already Exists',
          'A child with this name already exists. Please use a different name or edit the existing child.',
          [{ text: 'OK' }]
        );
        return;
      }

      const errorMessages = {
        'Network request failed': 'Network connection failed. Please check your internet connection and try again.',
        'No auth token found': 'Authentication error. Please log out and log back in.',
        '401': 'Authentication expired. Please log out and log back in.'
      };

      const errorMessage = Object.keys(errorMessages).find(key => error.message.includes(key))
        ? errorMessages[Object.keys(errorMessages).find(key => error.message.includes(key))]
        : 'Failed to save child. Please try again.';

      Alert.alert('Error', errorMessage);
    }
  }, [childForm, children, fetchChildren, toggleModal]);

  // Caregiver interaction functions
  const handleViewCaregiver = (caregiver) => {
    navigation.navigate('CaregiverProfile', { caregiverId: caregiver._id });
  };

  const handleMessageCaregiver = useCallback(async (caregiver) => {
    console.log('🔍 ParentDashboard - handleMessageCaregiver called with:', {
      caregiver,
      user,
      userId: user?.id
    });
    
    if (!user?.id) {
      console.error('❌ ParentDashboard - No user ID available');
      Alert.alert('Error', 'User authentication required. Please log out and back in.');
      return;
    }

    const caregiverId = caregiver?._id
      || caregiver?.id
      || caregiver?.userId
      || caregiver?.user_id
      || caregiver?.user?.id
      || caregiver?.caregiver_id;

    if (!caregiverId) {
      console.error('❌ ParentDashboard - No caregiver ID available');
      Alert.alert('Error', 'Caregiver information not available');
      return;
    }

    const caregiverName = caregiver?.name
      || caregiver?.user?.name
      || caregiver?.profile?.name
      || 'Caregiver';

    try {
      await supabaseService.getOrCreateConversation(user.id, caregiverId);
    } catch (error) {
      console.warn('⚠️ ParentDashboard - Conversation setup issue:', error?.message || error);
    }

    try {
      navigation.navigate('Chat', {
        userId: user.id,
        targetUserId: caregiverId,
        targetUserName: caregiverName,
        userType: 'parent',
        targetUserType: 'caregiver'
      });
    } catch (navError) {
      console.error('❌ ParentDashboard - Navigation error:', navError);
      Alert.alert('Error', 'Unable to open chat right now. Please try again later.');
    }
  }, [navigation, user]);

  const handleCallCaregiver = useCallback((caregiver) => {
    if (!caregiver) {
      Alert.alert('No caregiver information', 'Caregiver details are missing.');
      return;
    }

    const rawPhone = caregiver.phone || caregiver.contactPhone || caregiver?.user?.phone || caregiver?.caregiver?.phone;
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
  }, [navigation, user]);

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

  // Booking functions
  const handleBookingConfirm = async (bookingData) => {
    // Validate required fields
    if (!bookingData.caregiverId || !bookingData.date || !bookingData.startTime || !bookingData.endTime) {
      throw new Error('Missing required booking information');
    }

    // Transform selected children names to child objects
    const normalizeChildRecord = (childRecord, fallbackName, index) => {
      const base = childRecord?.child ?? childRecord ?? {};

      return {
        name: base.name || fallbackName || `Child ${index + 1}`,
        age: base.age ?? base.childAge ?? 'Unknown',
        preferences: base.preferences ?? base.childPreferences ?? '',
        allergies: base.allergies ?? base.childAllergies ?? 'None',
        specialInstructions:
          base.specialInstructions ??
          base.special_instructions ??
          base.notes ??
          '',
      };
    };

    const selectedChildrenObjects = (bookingData.selectedChildren || []).map((childName, index) => {
      const matchedChild = children.find(child => child?.name === childName);
      return normalizeChildRecord(matchedChild, childName, index);
    });

    const normalizedDate = (() => {
      if (!bookingData.date) return null;
      if (typeof bookingData.date === 'string') return bookingData.date;
      if (bookingData.date instanceof Date) {
        return bookingData.date.toISOString().split('T')[0];
      }
      return `${bookingData.date}`;
    })();

    const parentId = bookingData.clientId
      || bookingData.parent_id
      || user?.id
      || profile?._id
      || profile?.id;

    const payload = {
      caregiverId: bookingData.caregiverId,
      caregiver_id: bookingData.caregiver_id || bookingData.caregiverId,
      clientId: bookingData.clientId || parentId,
      parent_id: bookingData.parent_id || parentId,
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
      const booking = await supabaseService.createBooking(payload);

      setActiveTab('bookings');
      await fetchBookings();
      toggleModal('booking', false);
      Alert.alert('Success', 'Booking created successfully!');

      return booking;
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

    console.log('🔍 handleCancelBooking called with:', bookingOrId, 'extracted ID:', bookingId);

    if (!bookingId) {
      console.error('❌ handleCancelBooking: Missing booking ID');
      Alert.alert('Unable to cancel', 'Missing booking information.');
      return;
    }

    try {
      console.log('🔄 handleCancelBooking: Starting cancellation for booking ID:', bookingId);
      setRefreshing(true);

      const result = await supabaseService.cancelBooking(bookingId);
      console.log('✅ handleCancelBooking: Cancellation successful:', result);

      Alert.alert('Success', 'Booking cancelled successfully');
    } catch (error) {
      console.error('❌ handleCancelBooking: Cancellation failed:', error?.message || error);
      Alert.alert('Error', error?.message || 'Failed to cancel booking. Please try again.');
    } finally {
      console.log('🔄 handleCancelBooking: Refreshing bookings...');
      await fetchBookings();
      setRefreshing(false);
    }
  }, [fetchBookings]);

  const handleContractSign = useCallback(async ({ signature, acknowledged }) => {
    if (!selectedContract || !selectedBooking) return;

    try {
      const { contractService } = await import('../../services/supabase/contractService');

      const bookingIdentifier = selectedBooking.id || selectedBooking._id || selectedContract.bookingId;
      let existingContract = null;

      try {
        existingContract = await contractService.getContractById(selectedContract.id);
      } catch (error) {
        const isNotFound = error?.code === 'PGRST116' || error?.message?.includes('0 rows');
        console.warn('⚠️ Contract lookup failed before signing:', {
          errorCode: error?.code,
          errorMessage: error?.message,
          bookingIdentifier,
          selectedContractId: selectedContract.id,
          selectedBookingId: selectedBooking.id || selectedBooking._id
        });

        if (!isNotFound) {
          throw error;
        }

        // Attempt to recover by fetching the latest contract for this booking
        if (bookingIdentifier) {
          try {
            const fallbackContracts = await contractService.getContractsByBooking(bookingIdentifier);
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
        result = await contractService.signContract(existingContract.id, 'parent', {
          signature,
          signatureHash: btoa(signature), // Simple hash for demo
          ipAddress: null
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
        throw error;
      }

      if (result) {
        Alert.alert('Success', 'Contract signed successfully!');
        toggleModal('contract', false);
        setSelectedContract(null);
        setSelectedBooking(null);
        await fetchBookings(); // Refresh to update contract status
      }
    } catch (error) {
      console.error('Error signing contract:', error);
      Alert.alert('Error', 'Failed to sign contract. Please try again.');
    }
  }, [selectedContract, selectedBooking, fetchBookings]);

  const handleContractResend = useCallback(async (contract) => {
    if (!contract) return;

    try {
      const { contractService } = await import('../../services/supabase/contractService');
      await contractService.resendContract(contract.id, user?.id);
      Alert.alert('Success', 'Contract reminder sent!');
    } catch (error) {
      console.error('Error resending contract:', error);
      Alert.alert('Error', 'Failed to send reminder. Please try again.');
    }
  }, [user?.id]);

  const handleDownloadPdf = useCallback(async (contract) => {
    if (!contract) return;

    let cleanup;

    try {
      const { contractService } = await import('../../services/supabase/contractService');
      const result = await contractService.generateContractPdf(contract.id, { autoDownload: true });

      cleanup = typeof result?.cleanup === 'function' ? result.cleanup : undefined;

      if (!result?.uri && !result?.url) {
        throw new Error('Download did not return a file location.');
      }

      const fileUri = result.uri || result.url;
      const isFileUri = typeof fileUri === 'string' && fileUri.startsWith('file://');
      const canShare = await Sharing.isAvailableAsync();

      if (isFileUri && canShare) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf' });
        return;
      }

      if (!isFileUri && typeof fileUri === 'string') {
        let openedExternally = false;
        try {
          if (Linking?.canOpenURL) {
            const canOpen = await Linking.canOpenURL(fileUri);
            if (canOpen) {
              await Linking.openURL(fileUri);
              openedExternally = true;
            }
          }
        } catch (linkError) {
          console.warn('⚠️ Unable to open contract URL directly:', linkError);
        }

        Alert.alert(
          'Download Link Ready',
          'We were unable to save the PDF locally. Tap OK to copy the link and open it in your browser.',
          [
            {
              text: 'Copy Link',
              onPress: () => {
                try {
                  navigator.clipboard?.writeText?.(fileUri);
                  Alert.alert('Link Copied', 'Paste the link into your browser to download the PDF.');
                } catch (clipError) {
                  console.warn('Clipboard unavailable:', clipError);
                }
              }
            },
            { text: 'OK', onPress: () => {} }
          ]
        );
        return;
      }

      if (Platform.OS === 'android') {
        Alert.alert('Downloaded', `PDF saved at:\n${fileUri}`);
      } else {
        Alert.alert('Downloaded', 'PDF saved. Open it with a PDF viewer or Files app.');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Alert.alert('Download failed', error instanceof Error ? error.message : String(error));
    }
  }, []);

  const handleOpenContract = useCallback((booking, contract) => {
    console.log('🔍 ParentDashboard - Opening contract:', { booking, contract });
    setSelectedBooking(booking);
    setSelectedContract(contract);
    toggleModal('contract', true);
  }, [toggleModal]);

  const openContractByIds = useCallback(async ({ contractId, bookingId, context = 'default' } = {}) => {
    if (!contractId) {
      Alert.alert('Contract unavailable', 'We could not identify the requested contract. Please refresh and try again.');
      return;
    }

    try {
      const [contract, booking] = await Promise.all([
        contractService.getContractById(contractId),
        bookingId ? supabaseService.bookings.getBookingById(bookingId, user?.id) : Promise.resolve(null)
      ]);

      if (!contract) {
        Alert.alert('Contract unavailable', 'We could not load the contract details. Try refreshing or check again later.');
        return;
      }

      let resolvedBooking = booking;

      if (!resolvedBooking && contract.bookingId) {
        try {
          resolvedBooking = await supabaseService.bookings.getBookingById(contract.bookingId, user?.id);
        } catch (fetchError) {
          console.warn('⚠️ Failed to load booking for contract:', { contractId, context, error: fetchError });
        }
      }

      setSelectedContract(contract);
      setSelectedBooking(resolvedBooking || null);
      toggleModal('contract', true);
    } catch (error) {
      console.error('❌ Failed to open contract by IDs:', { contractId, bookingId, context, error });
      Alert.alert('Error', 'Failed to open contract. Please try again.');
    }
  }, [toggleModal, user?.id]);

  const openPaymentModal = useCallback((bookingId, paymentType = 'deposit') => {
    setPaymentData({
      bookingId,
      base64: '',
      mimeType: 'image/jpeg'
    });
    toggleModal('payment', true);
  }, [toggleModal]);

  const handleUploadPayment = useCallback(async () => {
    if (!paymentData.bookingId || !paymentData.base64) return;

    try {
      await supabaseService.uploadPaymentProof(paymentData.bookingId, paymentData.base64, paymentData.mimeType);
      toggleModal('payment', false);
      setPaymentData({ bookingId: null, base64: '', mimeType: 'image/jpeg' });
      await fetchBookings();
    } catch (error) {
      console.warn('Failed to upload payment proof:', error?.message || error);
    }
  }, [paymentData, toggleModal, fetchBookings]);

  // Search function
  const handleSearch = useCallback((text) => {
    setSearchQuery(text);
    const normalized = String(text).trim().toLowerCase();
  
    if (!normalized) {
      setFilteredCaregivers(caregivers);
      return;
    }
  
    const results = caregivers.filter((caregiver) => {
      const haystack = [
        caregiver.name,
        caregiver.location,
        caregiver.skills?.join(' '),
        caregiver.bio,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
  
      return haystack.includes(normalized);
    });
  
    setFilteredCaregivers(results);
  }, [caregivers]);

  // Filter functions
  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    setActiveFilters(countActiveFilters(newFilters));

    const currentResults = searchQuery ? searchResults : caregivers;
    const filtered = currentResults; // Simplified - remove complex filtering for now
    setFilteredCaregivers(filtered);
  };

  const handleQuickFilter = useCallback((filterKey) => {
    if (filterKey === 'clear') {
      setQuickFilters({
        availableNow: false,
        nearMe: false,
        topRated: false,
        certified: false
      });
      setFilters(DEFAULT_FILTERS);
      setActiveFilters(0);
      setFilteredCaregivers([]);
      return;
    }

    setQuickFilters(prev => {
      const newQuickFilters = {
        ...prev,
        [filterKey]: !prev[filterKey]
      };

      // Apply quick filters to caregivers
      let filtered = caregivers;

      if (newQuickFilters.availableNow) {
        filtered = filtered.filter(c => c.availableNow || c.availability?.availableNow);
      }

      if (newQuickFilters.nearMe) {
        // Filter by distance (assuming we have location data)
        filtered = filtered.filter(c => c.distance <= 10);
      }

      if (newQuickFilters.topRated) {
        filtered = filtered.filter(c => (c.rating || 0) >= 4.5);
      }

      if (newQuickFilters.certified) {
        filtered = filtered.filter(c => 
          c.certifications?.length > 0 || 
          c.skills?.some(skill => skill.toLowerCase().includes('certified'))
        );
      }

      setFilteredCaregivers(filtered);
      return newQuickFilters;
    });
  }, [caregivers]);

  // Job management functions
  const handleCreateJob = useCallback(() => {
    toggleModal('jobPosting', true);
  }, [toggleModal]);

  const handleEditJob = useCallback((job) => {
    toggleModal('jobPosting', true);
  }, [toggleModal]);

  const handleCompleteJob = useCallback(async (jobId) => {
    Alert.alert(
      'Complete Job',
      'Mark this job as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await supabaseService.updateJob(jobId, { status: 'completed' });
              await fetchJobs();
              Alert.alert('Success', 'Job marked as completed');
            } catch (error) {
              console.error('Error completing job:', error);
              Alert.alert('Error', 'Failed to complete job');
            }
          }
        }
      ]
    );
  }, [fetchJobs]);

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
              Alert.alert('Success', 'Job deleted successfully');
              await fetchJobs();
            } catch (error) {
              console.error('Error deleting job:', error);
              Alert.alert('Error', 'Failed to delete job');
            }
          }
        }
      ]
    );
  }, [fetchJobs]);

  const handleJobPosted = useCallback(async (newJob) => {
    try {
      toggleModal('jobPosting', false);
      Alert.alert('Success', 'Job posted successfully!');
      await fetchJobs();
    } catch (error) {
      console.error('Error handling job post:', error);
    }
  }, [toggleModal, fetchJobs]);

  const handleViewAllChildren = useCallback(() => {
    setShowAllChildren(prev => !prev);
  }, []);

  const handleApplicationStatusUpdate = useCallback(async (applicationId, status, jobId, contractTemplateOverride = null) => {
    if (!applicationId) {
      Alert.alert('Error', 'Missing application identifier. Please refresh and try again.');
      return;
    }

    const currentApplication = applications.find((application) =>
      String(application.id || application._id) === String(applicationId)
    ) || null;

    const templateToUse = contractTemplateOverride || selectedContractTemplate;

    if (status === 'accepted' && currentApplication && !templateToUse) {
      openContractTypeSelector({ ...currentApplication });
      setApplicationsMutatingId(null);
      return;
    }

    if (contractTemplateOverride) {
      setSelectedContractTemplate(contractTemplateOverride);
    }

    setApplicationsMutatingId(applicationId);

    try {
      const updated = await supabaseService.applications.updateApplicationStatus(applicationId, status, jobId);
      setApplications((prev) => prev.map((application) => {
        const matches = String(application.id || application._id) === String(applicationId);
        if (!matches) return application;

        const merged = {
          ...application,
          status,
          updatedAt: new Date().toISOString()
        };

        if (updated && typeof updated === 'object') {
          merged.status = updated.status || status;
          merged.updatedAt = updated.updated_at || updated.updatedAt || merged.updatedAt;
        }

        return merged;
      }));

      if (status === 'accepted' && currentApplication) {
        try {
          const chosenTemplate = templateToUse || resolveContractTemplate(currentApplication);
          const promotionResult = await supabaseService.applications.promoteApplication(applicationId, {
            contractTerms: buildPromotionContractTerms(currentApplication, chosenTemplate)
          });

          if (promotionResult?.contractId) {
            const { contractService } = await import('../../services/supabase/contractService');
            try {
              await contractService.getContractById(promotionResult.contractId);
            } catch (prefetchError) {
              console.warn('⚠️ Contract prefetch failed:', prefetchError?.message || prefetchError);
            }
          }
        } catch (promotionError) {
          console.error('❌ Failed to promote application:', promotionError);
          Alert.alert(
            'Promotion Failed',
            promotionError?.message || 'The application was accepted, but promotion to booking did not complete. Please try again.'
          );
        }
      }

      await Promise.all([
        fetchJobs(),
        fetchBookings(),
        fetchApplications()
      ]);
    } catch (error) {
      console.error('❌ Failed to update application status:', error);
      Alert.alert('Error', error?.message || 'Failed to update application status.');
    } finally {
      setApplicationsMutatingId(null);
      setSelectedContractTemplate(null);
      setPendingApplicationForContract(null);
    }
  }, [
    applications,
    selectedContractTemplate,
    openContractTypeSelector,
    fetchJobs,
    fetchBookings,
    fetchApplications,
    resolveContractTemplate,
    buildPromotionContractTerms,
    supabaseService
  ]);

  // Profile functions
  const handleSaveProfile = useCallback(async (imageUri = null) => {
    try {
      const updateData = {
        name: profileForm.name.trim(),
        phone: profileForm.contact.trim(),
        address: profileForm.location.trim(),
        location: profileForm.location.trim()
      };

      console.log('Profile form location:', profileForm.location);
      console.log('Update data being sent:', updateData);

      // Handle image upload if provided
      if (imageUri) {
        try {
          let uploadPayload;
          try {
            const processed = await processImageForUpload(imageUri, {
              maxWidth: 1024,
              maxHeight: 1024,
              compress: 0.8,
            });
            uploadPayload = processed.base64;
          } catch (processingError) {
            console.warn('Failed to process profile image before upload, falling back to original.', processingError);
            const base64Image = await FileSystem.readAsStringAsync(imageUri, {
              encoding: 'base64',
            });
            uploadPayload = `data:image/jpeg;base64,${base64Image}`;
          }

          const imageResult = await supabaseService.uploadProfileImage(user.id, uploadPayload);
          const imageUrl = imageResult?.data?.url || imageResult?.url || imageResult?.data?.profileImageUrl;

          if (imageUrl) {
            setProfileForm(prev => ({ ...prev, image: imageUrl }));

            if (imageResult?.data?.user) {
              toggleModal('profile', false);
              Alert.alert('Success', 'Profile updated successfully');
              await loadProfile();
              return;
            }
          }
        } catch (imageError) {
          console.error('Error uploading image:', imageError);
          Alert.alert('Warning', 'Image upload failed, but will continue with profile update');
        }
      }

      const { tokenManager } = await import('../../utils/tokenManager');
      const freshToken = await tokenManager.getValidToken(true);

      if (!freshToken) {
        throw new Error('Authentication required. Please log in again.');
      }

      const result = await supabaseService.updateProfile(user.id, updateData);

      if (result?.data) {
        console.log('Profile update result:', result.data);
        // Keep the location we just saved since server doesn't return it
        setProfileForm(prev => ({
          ...prev,
          name: result.data.name || prev.name,
          contact: result.data.contact || result.data.email || prev.contact,
          location: prev.location, // Keep our saved location
          image: result.data.profileImage || prev.image
        }));

        toggleModal('profile', false);
        Alert.alert('Success', 'Profile updated successfully');
        await loadProfile();
      } else {
        Alert.alert('Error', 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  }, [profileForm, toggleModal, loadProfile]);

  // Render function for active tab
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
            profileLocation={profile?.location || profile?.address || profileForm.location}
            userData={profile}
            caregivers={caregiversWithReviews || []}
            onBookCaregiver={handleBookCaregiver}
            onMessageCaregiver={handleMessageCaregiver}
            onViewReviews={handleViewReviews}
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
              console.log('🔍 ParentDashboard - Looking for booking with ID:', bookingId);
              console.log('🔍 ParentDashboard - Available bookings:', bookings?.map(b => ({ id: b.id || b._id, status: b.status })));
              
              const booking = bookings.find(b => (b.id || b._id) === bookingId);
              console.log('🔍 ParentDashboard - Found booking:', booking);
              
              if (booking) {
                setSelectedBooking(booking);
                toggleModal('bookingDetails', true);
              } else {
                console.warn('⚠️ ParentDashboard - Booking not found for ID:', bookingId);
              }
            }}
            onWriteReview={({ bookingId, caregiverId, caregiverName, booking }) => {
              if (!caregiverId) {
                Alert.alert('Missing caregiver information', 'We could not identify the caregiver for this booking.');
                return;
              }

              navigation.navigate('CaregiverReviews', {
                caregiverId,
                bookingId,
                caregiverName: caregiverName || 'Caregiver',
                booking
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
            refreshBookings={fetchBookings}
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
            loading={applicationsLoading}
            mutatingApplicationId={applicationsMutatingId}
            refreshing={refreshing}
            onRefresh={async () => {
              await fetchApplications();
            }}
            onViewCaregiver={(caregiver) => {
              if (!caregiver) {
                Alert.alert('No caregiver information', 'Unable to view caregiver profile.');
                return;
              }
              handleViewCaregiver(caregiver);
            }}
            onMessageCaregiver={(caregiver) => {
              if (!caregiver) {
                Alert.alert('No caregiver information', 'Unable to message caregiver.');
                return;
              }
              handleMessageCaregiver(caregiver);
            }}
            onUpdateStatus={handleApplicationStatusUpdate}
            onOpenContract={({ contractId, bookingId }) =>
              openContractByIds({ contractId, bookingId, context: 'applications-tab' })
            }
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

              if (!metadata?.contractId) {
                return;
              }

              await openContractByIds({
                contractId: metadata.contractId,
                bookingId: metadata.bookingId,
                context: `alert-${tabId}`
              });
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
        <View style={styles.container}>
          <View style={styles.contentContainer}>
            <Header
              navigation={navigation}
              onProfilePress={() => toggleModal('profile', true)}
              onSignOut={signOut}
              greetingName={profile?.firstName || profile?.name}
              onProfileEdit={() => toggleModal('profile', true)}
              profileName={profile?.name}
              profileImage={profile?.profileImage}
              profileContact={profile?.email}
              profileLocation={profile?.location}
              setActiveTab={setActiveTab}
              tabNotificationCounts={tabNotificationCounts}
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
                if (!selectedBooking?.caregiver) {
                  Alert.alert('No caregiver information', 'Unable to message caregiver because details are missing.');
                  return;
                }

                const caregiverTarget =
                  selectedBooking.caregiver ||
                  selectedBooking.caregiverId ||
                  selectedBooking.assignedCaregiver ||
                  selectedBooking.caregiverProfile ||
                  null;

                if (!caregiverTarget) {
                  Alert.alert('No caregiver information', 'Unable to message caregiver because details are missing.');
                  return;
                }

                toggleModal('bookingDetails', false);
                handleMessageCaregiver(caregiverTarget);
                setSelectedBooking(null);
              }}
              onGetDirections={() => handleGetDirections(selectedBooking)}
              onCompleteBooking={() => handleCompleteBooking(selectedBooking)}
              onCancelBooking={() => handleCancelBooking(selectedBooking)}
            />
          )}

          <ContractModal
            visible={modals.contract}
            onClose={() => {
              toggleModal('contract', false);
              setSelectedContract(null);
              setSelectedBooking(null);
            }}
            contract={selectedContract}
            booking={selectedBooking}
            viewerRole="parent"
            onSign={handleContractSign}
            onResend={handleContractResend}
            onDownloadPdf={handleDownloadPdf}
          />

          <ContractTypeSelector
            visible={modals.contractType}
            onClose={closeContractTypeSelector}
            onSelectContractType={(type) => {
              handleContractTemplateChosen(type);
              toggleModal('contractType', false);

              if (pendingApplicationForContract?.id || pendingApplicationForContract?._id) {
                const applicationId = pendingApplicationForContract.id || pendingApplicationForContract._id;
                const jobId = pendingApplicationForContract.jobId || pendingApplicationForContract.job?.id || pendingApplicationForContract.job_id;
                handleApplicationStatusUpdate(applicationId, 'accepted', jobId, type);
              }
            }}
            selectedType={selectedContractTemplate}
          />
          </View>
        </View>
  );
};

export default ParentDashboard;
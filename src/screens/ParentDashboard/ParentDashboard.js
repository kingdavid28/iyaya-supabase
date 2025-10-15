import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import { usePrivacy } from '../../components/features/privacy/PrivacyManager';

// Core imports
import { useAuth } from '../../contexts/AuthContext';
import { useParentDashboard } from '../../hooks/useParentDashboard';
import { useNotificationCounts } from '../../hooks/useNotificationCounts';

// Supabase service import
import { supabaseService } from '../../services/supabase';
import { __DEV__ } from '../../config/constants';

// Utility imports
import { applyFilters, countActiveFilters } from '../../utils/caregiverUtils';
import { styles } from '../styles/ParentDashboard.styles';

// Privacy components
import PrivacyProvider from '../../components/features/privacy/PrivacyManager';
import ProfileDataProvider from '../../components/features/privacy/ProfileDataManager';

// Component imports
import Header from './components/Header';
import NavigationTabs from './components/NavigationTabs';
import HomeTab from './components/HomeTab';
import SearchTab from './components/SearchTab';
import BookingsTab from './components/BookingsTab';
import JobsTab from './components/JobsTab';
import MessagesTab from './components/MessagesTab'; // Added missing import
import ReviewsTab from './components/ReviewsTab';
import AlertsTab from './components/AlertsTab';
import NotificationTester from '../../components/NotificationTester';

// Modal imports
import ProfileModal from './modals/ProfileModal';
import FilterModal from './modals/FilterModal';
import JobPostingModal from './modals/JobPostingModal';
import BookingModal from './modals/BookingModal';
import PaymentModal from './modals/PaymentModal';
import ChildModal from './modals/ChildModal';
import BookingDetailsModal from '../../components/BookingDetailsModal';

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

const ParentDashboard = () => {
  const navigation = useNavigation();
  const { signOut, user } = useAuth();
  
  // Get privacy-related data
  const { pendingRequests } = usePrivacy();
  
  // Dashboard data
  const {
    activeTab, 
    setActiveTab,
    profile,
    jobs, 
    caregivers, 
    bookings, 
    children,
    loading,
    loadProfile, 
    fetchJobs, 
    fetchCaregivers, 
    fetchBookings, 
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
      reviews: notificationCounts.reviews,
      notifications: notificationCounts.notifications
    };
  }, [notificationCounts, bookings]);

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
    bookingDetails: false
  });

  const [selectedBooking, setSelectedBooking] = useState(null);

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

  // Modal handlers
  const toggleModal = useCallback((modalName, isOpen = null) => {
    setModals(prev => ({
      ...prev,
      [modalName]: isOpen !== null ? isOpen : !prev[modalName]
    }));
  }, []);

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
              await supabaseService.deleteChild(child.id || child._id);
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
        await supabaseService.updateChild(childForm.editingId, childData);
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
                    await supabaseService.updateChild(existingChild._id || existingChild.id, childData);
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
          await supabaseService.addChild(user.id, childData);
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
                        await supabaseService.updateChild(existingChild._id || existingChild.id, childData);
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
    
    const caregiverId = caregiver._id || caregiver.id;
    if (!caregiverId) {
      console.error('❌ ParentDashboard - No caregiver ID available');
      Alert.alert('Error', 'Caregiver information not available');
      return;
    }
    
    try {
      // Create or get conversation in Supabase
      await supabaseService.getOrCreateConversation(user.id, caregiverId);
    } catch (error) {
      console.log('Connection setup warning:', error.message);
    }

    navigation.navigate('Chat', {
      userId: user.id,
      targetUserId: caregiverId,
      targetUserName: caregiver.name,
      userType: 'parent',
      targetUserType: 'caregiver'
    });
  }, [navigation, user]);

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

  const handleCancelBooking = useCallback(async (bookingId) => {
    try {
      setRefreshing(true);
      await supabaseService.cancelBooking(bookingId);
    } catch (error) {
      console.warn('Failed to cancel booking:', error?.message || error);
    } finally {
      await fetchBookings();
      setRefreshing(false);
    }
  }, [fetchBookings]);

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
          const base64Image = await FileSystem.readAsStringAsync(imageUri, {
            encoding: 'base64',
          });

          const imageResult = await supabaseService.uploadProfileImage(user.id, base64Image);
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
            caregivers={caregivers || []}
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
            caregivers={caregivers}
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
            onWriteReview={(bookingId, caregiverId) => navigation.navigate('Review', { bookingId, caregiverId })}
            onCreateBooking={() => {
              setSelectedCaregiver(createCaregiverObject());
              toggleModal('booking', true);
            }}
            onMessageCaregiver={handleMessageCaregiver}
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
          <View>
            <AlertsTab
              navigation={navigation}
              refreshing={refreshing}
              onRefresh={onRefresh}
              loading={loading}
              onNavigateTab={setActiveTab}
            />
            {__DEV__ && <NotificationTester />}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <PrivacyProvider>
      <ProfileDataProvider>
        <View style={styles.container}>
          <Header
            navigation={navigation}
            onProfilePress={() => toggleModal('profile', true)}
            onSignOut={signOut}
            greetingName={greetingName}
            onProfileEdit={() => toggleModal('profile', true)}
            profileName={profileForm.name}
            profileImage={profileForm.image}
            setActiveTab={setActiveTab}
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

          <BookingDetailsModal
            visible={modals.bookingDetails}
            booking={selectedBooking}
            onClose={() => toggleModal('bookingDetails', false)}
            colors={['#ebc5dd', '#ccc8e8']}
          />
        </View>
      </ProfileDataProvider>
    </PrivacyProvider>
  );
};

export default ParentDashboard;
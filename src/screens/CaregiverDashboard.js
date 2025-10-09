import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from "@react-navigation/native"
import { LinearGradient } from "expo-linear-gradient"
import React, { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Alert, Dimensions, Image, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View, FlatList } from "react-native"
import { Button, Card, Chip, Searchbar } from "react-native-paper"
import Toast from "../components/ui/feedback/Toast"
import { supabaseService } from '../services/supabaseService'
import { getCurrentSocketURL } from '../config/api'
import { useAuth } from "../contexts/AuthContext"

import { usePrivacy } from '../components/features/privacy/PrivacyManager';
import { SettingsModal } from "../components/ui/modals/SettingsModal"
import { RequestInfoModal } from "../components/ui/modals/RequestInfoModal"

import { formatAddress } from "../utils/addressUtils"
import { calculateAge } from "../utils/dateUtils"
import { __DEV__ } from "../config/constants"
import MessagesTab from './CaregiverDashboard/components/MessagesTab';

import { 
  EmptyState, 
  StatusBadge, 
  ModalWrapper, 
  Card as SharedCard, 
  Button as SharedButton,
  FormInput,
  QuickStat, 
  QuickAction,
  formatDate,
  useDebounce
} from '../shared/ui';

import { styles } from './styles/CaregiverDashboard.styles';
import { useCaregiverDashboard } from '../hooks/useCaregiverDashboard';
import CaregiverProfileSection from './CaregiverDashboard/components/CaregiverProfileSection';
import { PrivacyNotificationModal } from '../components/ui/modals/PrivacyNotificationModal';
import firebaseMessagingService from '../services/firebaseMessagingService';
import MessageItemLocal from '../components/messaging/MessageItemLocal';
import ReviewItemLocal from '../components/messaging/ReviewItemLocal';

function JobCard({ job, showActions = true, onApply, hasApplied, onLearnMore, jobCardStyle, gridMode = false }) {
  const applied = typeof hasApplied === 'function' ? hasApplied(job.id) : false
  const maxRequirementChips = gridMode ? 2 : 3
  return (
    <Card style={[styles.jobCard, jobCardStyle]}>
      <Card.Content style={{ padding: 16 }}>
        <View style={styles.jobHeader}>
          <View>
            <Text style={styles.jobTitle} numberOfLines={gridMode ? 2 : undefined}>{job.title}</Text>
            <View style={styles.jobMeta}>
              <Ionicons name="people" size={16} color="#6B7280" />
              <Text style={styles.jobMetaText}>
                {job.children} {job.children === 1 ? 'child' : 'children'} • {job.ages}
              </Text>
              <Ionicons name="location" size={16} color="#6B7280" style={styles.jobMetaIcon} />
              <Text style={styles.jobMetaText}>{job.distance}</Text>
            </View>
          </View>
          {job.urgent && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentBadgeText}>Urgent</Text>
            </View>
          )}
        </View>

        <View style={styles.jobDetails}>
          <View style={styles.jobDetailRow}>
            <Ionicons name="time" size={16} color="#6B7280" />
            <Text style={styles.jobDetailText}>{job.schedule}</Text>
          </View>
          <View style={styles.jobDetailRow}>
            <Ionicons name="cash" size={16} color="#6B7280" />
            <Text style={styles.jobDetailText}>₱{job.hourlyRate}/hr</Text>
          </View>
        </View>

        {job.requirements && job.requirements.length > 0 && (
          <View style={styles.requirementsContainer}>
            {job.requirements.slice(0, maxRequirementChips).map((req, index) => (
              <View key={index} style={styles.requirementTag}>
                <Text style={styles.requirementText}>{req}</Text>
              </View>
            ))}
            {job.requirements.length > maxRequirementChips && (
              <Text style={styles.moreRequirementsText}>
                +{job.requirements.length - maxRequirementChips} more
              </Text>
            )}
          </View>
        )}

        {showActions && (
          <View style={styles.jobFooter}>
            <Text style={styles.postedDate}>Posted {job.postedDate}</Text>
            <View style={styles.jobActionButtons}>
              <Button 
                mode="outlined" 
                style={styles.secondaryButton}
                labelStyle={styles.secondaryButtonText}
                onPress={() => onLearnMore && onLearnMore(job)}
              >
                Learn More
              </Button>
              {applied ? (
                <View style={[styles.appliedBadge]}>
                  <View style={styles.appliedBadgeContent}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={{ marginRight: 6 }} />
                    <Text style={styles.appliedBadgeText}>Applied</Text>
                  </View>
                </View>
              ) : (
                <Button 
                  mode="contained" 
                  style={styles.primaryButton}
                  labelStyle={styles.primaryButtonText}
                  onPress={() => onApply && onApply(job)}
                >
                  Apply Now
                </Button>
              )}
            </View>
          </View>
        )}
      </Card.Content>
    </Card>
  )
}

function ApplicationCard({ application, onViewDetails, onMessage }) {
  return (
    <Card style={styles.applicationCard}>
      <Card.Content style={styles.applicationContent}>
        <View style={styles.applicationHeader}>
          <View>
            <Text style={styles.applicationJobTitle}>{application.jobTitle}</Text>
            <Text style={styles.applicationFamily}>{application.family}</Text>
          </View>
          <StatusBadge status={application.status} />
        </View>

        <View style={styles.applicationDetails}>
          <View style={styles.applicationDetailRow}>
            <Ionicons name="calendar" size={16} color="#6B7280" />
            <Text style={styles.applicationDetailText}>
              Applied on {new Date(application.appliedDate).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.applicationDetailRow}>
            <Ionicons name="cash" size={16} color="#6B7280" />
            <Text style={styles.applicationDetailText}>
              ${application.hourlyRate}/hr
            </Text>
          </View>
        </View>

        <View style={styles.applicationActions}>
          <Button 
            mode="outlined" 
            style={styles.applicationButton}
            labelStyle={styles.applicationButtonText}
            onPress={() => onViewDetails && onViewDetails(application)}
          >
            View Details
          </Button>
          {application.status === 'accepted' && (
            <Button 
              mode="contained" 
              style={[styles.applicationButton, { marginLeft: 8 }]}
              labelStyle={styles.applicationButtonText}
              onPress={() => onMessage && onMessage(application)}
            >
              Message Family
            </Button>
          )}
        </View>
      </Card.Content>
    </Card>
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

  return (
    <Card style={styles.bookingCard} accessibilityLabel={`Booking with ${booking.family}`}>
      <Card.Content style={styles.bookingContent}>
        <View style={styles.bookingHeader}>
          <View style={styles.bookingTitleSection}>
            <Text style={styles.bookingFamily} numberOfLines={1}>{booking.family}</Text>
            <Text style={styles.bookingDate}>{formatDate(booking.date)}</Text>
          </View>
          <StatusBadge status={booking.status} />
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.bookingDetailRow}>
            <View style={styles.bookingDetailItem}>
              <Ionicons name="time-outline" size={18} color="#6B7280" />
              <Text style={styles.bookingDetailText}>{booking.time}</Text>
            </View>
            <View style={styles.bookingDetailItem}>
              <Ionicons name="people-outline" size={18} color="#6B7280" />
              <Text style={styles.bookingDetailText}>
                {booking.children} {booking.children === 1 ? 'child' : 'children'}
              </Text>
            </View>
          </View>
          
          <View style={styles.bookingLocationRow}>
            <Ionicons name="location-outline" size={18} color="#6B7280" />
            <Pressable 
              onPress={handleLocationPress}
              style={styles.locationButton}
              accessibilityLabel="Open location in maps"
              accessibilityHint={`Navigate to ${booking.location}`}
            >
              <Text style={styles.bookingLocationText} numberOfLines={1}>
                {booking.location}
              </Text>
              <Ionicons name="open-outline" size={14} color="#2563EB" style={styles.locationIcon} />
            </Pressable>
          </View>
        </View>

        <View style={styles.bookingActions}>
          <Button 
            mode="outlined" 
            style={styles.bookingSecondaryButton}
            labelStyle={styles.bookingSecondaryButtonText}
            onPress={() => onViewDetails && onViewDetails(booking)}
            accessibilityLabel="View booking details"
          >
            Details
          </Button>
          {booking.status === 'pending' && (
            <Button 
              mode="contained" 
              style={styles.bookingConfirmButton}
              labelStyle={styles.bookingConfirmButtonText}
              onPress={() => onConfirmAttendance && onConfirmAttendance(booking)}
              accessibilityLabel="Confirm attendance for this booking"
            >
              Confirm
            </Button>
          )}
          {booking.status === 'confirmed' && (
            <Button 
              mode="contained" 
              style={styles.bookingPrimaryButton}
              labelStyle={styles.bookingPrimaryButtonText}
              onPress={onMessage}
              accessibilityLabel="Send message to family"
            >
              Message
            </Button>
          )}
        </View>
      </Card.Content>
    </Card>
  )
}

function CaregiverDashboard({ onLogout, route }) {
  const navigation = useNavigation()
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
    activeTab, setActiveTab: setActiveTabHook,
    profile, setProfile,
    jobs, applications, setApplications, bookings,
    jobsLoading,
    loadProfile, fetchJobs, fetchApplications, fetchBookings
  } = useCaregiverDashboard();
  
  const setActiveTab = setActiveTabHook;
  
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 300)
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
  
  // Add these new state variables for messaging and reviews
  const [parents, setParents] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [reviews, setReviews] = useState([]);
  const [chatActive, setChatActive] = useState(false);

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' })
  const showToast = (message, type = 'success') => setToast({ visible: true, message, type })
  const [refreshing, setRefreshing] = useState(false)
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadProfile(),
        fetchJobs(),
        fetchApplications(),
        fetchBookings()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadProfile, fetchJobs, fetchApplications, fetchBookings]);

  // Fetch conversations using unified Firebase service
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = firebaseMessagingService.getConversations(user.id, (conversations) => {
      console.log('📨 Caregiver received conversations:', conversations.length);
      setParents(conversations.map(conv => ({
        id: conv.parentId || conv.id,
        name: conv.parentName || conv.caregiverName || 'Parent',
        profileImage: conv.parentAvatar || conv.caregiverAvatar || null
      })));
    }, 'caregiver');

    return () => unsubscribe();
  }, [user?.id]);

  // Fetch messages for selected parent
  useEffect(() => {
    if (!selectedParent || !user?.id) return;

    // Create consistent conversation ID: always use smaller ID first
    const [id1, id2] = [user.id, selectedParent.id].sort();
    const conversationId = `${id1}_${id2}`;

    console.log('📨 Fetching messages for conversation:', {
      caregiverId: selectedParent.id,
      userId: user.id,
      conversationId
    });

    const unsubscribe = firebaseMessagingService.getMessages(user.id, selectedParent.id, (messagesData) => {
      console.log('📨 Received messages:', messagesData.length);
      setMessages(messagesData.reverse()); // Reverse to show latest at bottom
    }, conversationId);

    return () => unsubscribe();
  }, [selectedParent, user?.id]);

  // Fetch reviews using Supabase
  useEffect(() => {
    if (!user?.id) return;

    const fetchReviews = async () => {
      try {
        const { supabase } = await import('../config/supabase');
        const { data, error } = await supabase
          .from('reviews')
          .select('*')
          .eq('caregiver_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setReviews(data || []);
      } catch (error) {
        console.warn('Failed to fetch reviews:', error);
        setReviews([]);
      }
    };

    fetchReviews();
  }, [user?.id]);
  
  const { pendingRequests, notifications } = usePrivacy();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [imageRefreshKey, setImageRefreshKey] = useState(0);

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
    if (route?.params?.refreshProfile) {
      console.log('🔄 CaregiverDashboard - Force refresh triggered by route params');
      loadProfile();
      // Clear the param without causing re-render
      setTimeout(() => {
        navigation.setParams({ refreshProfile: undefined });
      }, 100);
    }
  }, [route?.params?.refreshProfile]);

  const handleJobApplication = (job) => {
    setSelectedJob(job)
    setApplicationForm({ coverLetter: '', proposedRate: '' })
    setShowJobApplication(true)
  }

  const handleViewJob = (job) => {
    setSelectedJob(job)
    setShowJobDetails(true)
  }

  const handleViewApplication = (application) => {
    setSelectedApplication(application)
    setShowApplicationDetails(true)
  }

  const handleMessageFamily = async (application) => {
    Alert.alert('Feature Unavailable', 'Messaging feature has been removed.');
    setShowApplicationDetails(false);
  }

  const handleBookingMessage = async (booking) => {
    try {
      // Navigate to messages tab first
      setActiveTab('messages');

      // Extract parent/family name from booking
      const parentName = booking.family || booking.parentName;

      if (!parentName) {
        showToast('Unable to identify parent for this booking', 'error');
        return;
      }

      // Look for existing conversation with this parent
      const existingParent = parents.find(parent =>
        parent.name?.toLowerCase() === parentName.toLowerCase()
      );

      if (existingParent) {
        // Found existing conversation - set as selected and open chat
        setSelectedParent(existingParent);
        setChatActive(true);
        // Mark messages as read when opening chat
        await firebaseMessagingService.markMessagesAsRead(user.id, existingParent.id);
        showToast(`Opened conversation with ${existingParent.name}`, 'success');
      } else {
        // No existing conversation found
        showToast(`No conversation found with ${parentName}. Please ensure they have contacted you first.`, 'info');
        // Still navigate to messages tab so user can see available conversations
      }

    } catch (error) {
      console.error('Error opening booking message:', error);
      showToast('Failed to open message', 'error');
    }
  }

  const handleConfirmAttendance = async (booking) => {
    try {
      await supabaseService.updateBookingStatus(
        booking.id,
        'confirmed',
        'Caregiver confirmed attendance'
      );

      showToast('Attendance confirmed successfully!', 'success');
      fetchBookings(); // Refresh bookings list
    } catch (error) {
      console.error('Confirm attendance failed:', error);
      showToast('Failed to confirm attendance. Please try again.', 'error');
    }
  }

  // Send messages using unified Firebase service
  const sendMessage = async () => {
    if (!newMessage?.trim() || !selectedParent || !user?.id) {
      console.warn('❌ Missing data:', {
        hasMessage: !!newMessage?.trim(),
        hasParent: !!selectedParent,
        hasUserId: !!user?.id
      });
      return;
    }

    try {
      // Create connection if it doesn't exist
      try {
        console.log('🔗 Ensuring Firebase connection exists:', { caregiverId: user.id, parentId: selectedParent.id });
        await firebaseMessagingService.createConnection(user.id, selectedParent.id);
        console.log('✅ Firebase connection ensured');
      } catch (connectionError) {
        console.warn('⚠️ Failed to ensure Firebase connection:', connectionError.message);
        // Continue with sending message even if connection creation fails
      }

      // Create consistent conversation ID: always use smaller ID first
      const [id1, id2] = [user.id, selectedParent.id].sort();
      const conversationId = `${id1}_${id2}`;

      console.log('📨 Caregiver sending message:', {
        senderId: user.id,
        receiverId: selectedParent.id, // Parent ID
        conversationId,
        message: newMessage.trim()
      });

      await firebaseMessagingService.sendMessage(user.id, selectedParent.id, newMessage, 'text', null, conversationId);
      setNewMessage('');
      console.log('✅ Caregiver message sent successfully');
    } catch (error) {
      console.error('❌ Error sending caregiver message:', error);
      showToast('Failed to send message: ' + error.message, 'error');
    }
  };

  const handleApplicationSubmit = async ({ jobId, jobTitle, family, coverLetter, proposedRate }) => {
    // Fix: Add missing apiService import or use applicationsAPI directly
    if (applications.some(app => app.jobId === jobId)) {
      showToast('You have already applied to this job', 'error');
      return;
    }

    const matchedJob = jobs.find((j) => j.id === jobId)

    try {
      setApplicationSubmitting(true)

      console.log('Submitting application with jobId:', jobId);
      const response = await supabaseService.applyToJob(
        jobId,
        user.id,
        coverLetter || ''
      );

      if (response) {
        // Create Firebase connection between caregiver and job poster (parent)
        const parentId = matchedJob?.parentId || matchedJob?.userId || matchedJob?.createdBy;

        if (parentId && parentId !== user?.id) {
          try {
            console.log('🔗 Creating Firebase connection for application:', { caregiverId: user.id, parentId });
            await firebaseMessagingService.createConnection(user.id, parentId);
            console.log('✅ Firebase connection created successfully');
          } catch (connectionError) {
            console.warn('⚠️ Failed to create Firebase connection:', connectionError.message);
            // Don't fail the application if connection creation fails
          }
        }

        const newApplication = {
          id: response.id || Date.now(),
          jobId,
          jobTitle,
          family,
          status: "pending",
          appliedDate: new Date().toISOString(),
          hourlyRate: proposedRate || (matchedJob ? matchedJob.hourlyRate : undefined)
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
        await supabaseService.updateProfile(user.id, payload);
      } else {
        await supabaseService.updateProfile(user.id, { name: payload.name });
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
    const unreadNotifications = notifications?.filter(n => !n.read)?.length || 0;
    const pendingRequestsCount = pendingRequests?.length || 0;
    const totalUnread = unreadNotifications + pendingRequestsCount;
    
    const tabs = [
      { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
      { id: 'jobs', label: 'Jobs', icon: 'briefcase' },
      { id: 'applications', label: 'Applications', icon: 'document-text' },
      { id: 'bookings', label: 'Bookings', icon: 'calendar' },
      { id: 'messages', label: 'Messages', icon: 'chatbubbles' },
      { id: 'reviews', label: 'Reviews', icon: 'star' },
      { 
        id: 'notifications', 
        label: 'Notifications', 
        icon: 'notifications',
        badgeCount: totalUnread
      },
    ];
    
    return (
      <View style={styles.navContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navScroll}>
          {tabs.map((tab) => {
          const active = activeTab === tab.id
          const onPress = () => {
            setActiveTab(tab.id)
            if (tab.id === 'jobs') {
              fetchJobs()
            } else if (tab.id === 'applications') {
              fetchApplications()
            }
          }
          const iconColor = active ? '#3b83f5' : '#6B7280'
          return (
            <Pressable
              key={tab.id}
              onPress={onPress}
              style={[
                styles.navTab,
                active ? styles.navTabActive : null,
              ]}
            >
              <View style={{ position: 'relative' }}>
                <Ionicons name={tab.icon} size={18} color={iconColor} />
                {tab.badgeCount > 0 && tab.id === 'notifications' && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {tab.badgeCount > 9 ? '9+' : tab.badgeCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.navTabText, active ? styles.navTabTextActive : null]}>
                {tab.label}
              </Text>

            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  );
}

  const renderMessagesTab = () => (
    <View style={styles.messagesContainer}>
      {!chatActive ? (
        <>
          <Text style={styles.sectionTitle}>Connected Families</Text>
          {parents.length > 0 ? (
            <FlatList
              data={parents}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.parentItem}
                  onPress={async () => {
                    setSelectedParent(item);
                    setChatActive(true);
                    // Mark messages as read when opening chat
                    await firebaseMessagingService.markMessagesAsRead(user.id, item.id);
                  }}
                >
                  <Ionicons name="person-circle" size={40} color="#3B82F6" />
                  <View style={styles.parentInfo}>
                    <Text style={styles.parentName}>{item.name}</Text>
                    <Text style={styles.parentStatus}>Last seen recently</Text>
                  </View>
                </Pressable>
              )}
              keyExtractor={(item) => item.id}
              style={styles.parentsList}
            />
          ) : (
            <EmptyState 
              icon="people"
              title="No conversations yet"
              subtitle="Parents who contact you will appear here. You can start messaging once they reach out first."
            />
          )}
        </>
      ) : (
        <View style={styles.chatContainer}>
          <Card style={styles.chatHeaderCard}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>{selectedParent.name}</Text>
            </View>
          </Card>

          <Card style={styles.messagesCard}>
            <FlatList
              data={messages}
              renderItem={({ item }) => (
                <MessageItemLocal
                  message={item}
                  isCurrentUser={item.senderId === user?.id}
                />
              )}
              keyExtractor={(item) => item.id}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              inverted
              showsVerticalScrollIndicator={false}
            />
          </Card>

          <Card style={styles.inputCard}>
            <View style={styles.messageInputContainer}>
              <TextInput
                style={styles.messageInput}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type your message..."
                multiline
                maxLength={500}
              />
              <Pressable
                style={[styles.sendButton, { opacity: newMessage?.trim() ? 1 : 0.5 }]}
                onPress={sendMessage}
                disabled={!newMessage?.trim()}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color="#FFFFFF"
                />
              </Pressable>
            </View>
          </Card>
        </View>
      )}
    </View>
  );

  const renderReviewsTab = () => (
    <View style={styles.reviewsContainer}>
      <Text style={styles.sectionTitle}>Your Reviews</Text>
      {reviews.length > 0 ? (
        <FlatList
          data={reviews}
          renderItem={({ item }) => <ReviewItemLocal review={item} />}
          keyExtractor={(item) => item.id}
          style={styles.reviewsList}
          contentContainerStyle={styles.reviewsContent}
        />
      ) : (
        <EmptyState 
          icon="star-outline" 
          title="No reviews yet"
          subtitle="Reviews from families will appear here"
        />
      )}
    </View>
  );

  const renderHeader = () => {
    const unreadNotifications = notifications?.filter(n => !n.read)?.length || 0;
    const pendingRequestsCount = pendingRequests?.length || 0;
    const totalUnread = unreadNotifications + pendingRequestsCount;
    
    return (
      <View style={styles.parentLikeHeaderContainer}>
        <LinearGradient
          colors={["#5bbafa", "#b672ff"]}
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
        {/* Only show search bar on specific tabs, not messages */}
        {(activeTab === 'jobs' || activeTab === 'search' || activeTab === 'applications' || activeTab === 'bookings') && (
          <Searchbar
            placeholder="Search jobs, families..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            iconColor="#9CA3AF"
            placeholderTextColor="#9CA3AF"
            inputStyle={styles.searchInput}
          />
        )}

        {__DEV__ && debouncedSearch && (
          <Text style={{ padding: 8, fontSize: 12, color: '#666' }}>Searching: {debouncedSearch}</Text>
        )}

        {activeTab === "dashboard" && (
          jobsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading dashboard...</Text>
            </View>
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
                value={profile?.rating?.toFixed(1) || "0.0"}
                label="Rating"
                color="#F59E0B"
                bgColor="#FEF3C7"
                styles={styles}
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
                  contentContainerStyle={{ paddingLeft: 2, paddingRight: 2 }}
                >
                  {(jobs || []).slice(0, 3).map((job, index) => (
                    <JobCard
                      key={job.id || index}
                      job={job}
                      showActions={true}
                      onApply={handleJobApplication}
                      onLearnMore={handleViewJob}
                      hasApplied={(id) => applications.some((a) => a.jobId === id)}
                      jobCardStyle={[
                        styles.jobCardHorizontal,
                        { marginRight: index === 2 ? 0 : 26 }
                      ]}
                    />
                  ))}
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
                  onMessage={() => handleBookingMessage(booking)}
                  onViewDetails={() => {
                    setSelectedBooking(booking)
                    setShowBookingDetails(true)
                  }}
                  onConfirmAttendance={handleConfirmAttendance}
                />
              ))}
            </View>
            </ScrollView>
          )
        )}

        {activeTab === "jobs" && (
          <ScrollView 
            style={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshing || jobsLoading}
                onRefresh={onRefresh}
                colors={['#3B82F6']}
                tintColor="#3B82F6"
              />
            }
          >
            <View style={styles.section}>
              <View style={styles.filters}>
                <Chip style={styles.filterChip} textStyle={styles.filterChipText}>
                  All Jobs
                </Chip>
                <Chip
                  style={[styles.filterChip, styles.filterChipActive]}
                  textStyle={[styles.filterChipText, styles.filterChipTextActive]}
                >
                  Nearby
                </Chip>
                <Chip style={styles.filterChip} textStyle={styles.filterChipText}>
                  High Pay
                </Chip>
                <Chip style={styles.filterChip} textStyle={styles.filterChipText}>
                  Urgent
                </Chip>
              </View>

              {jobsLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3B82F6" />
                  <Text style={styles.loadingText}>Loading jobs...</Text>
                </View>
              ) : (() => {
                const filteredJobs = jobs.filter(job => {
                  if (!debouncedSearch) return true;
                  const searchLower = debouncedSearch.toLowerCase();
                  return (
                    job.title?.toLowerCase().includes(searchLower) ||
                    job.family?.toLowerCase().includes(searchLower) ||
                    job.location?.toLowerCase().includes(searchLower) ||
                    job.requirements?.some(req => req.toLowerCase().includes(searchLower))
                  );
                });
                
                return filteredJobs.length > 0 ? (
                  <View style={[styles.jobsGrid, columns === 1 && { flexDirection: 'column' }]}>
                    {filteredJobs.map((job, index) => (
                      <JobCard
                        key={job.id || `job-${index}`}
                        job={job}
                        showActions={true}
                        onApply={handleJobApplication}
                        onLearnMore={handleViewJob}
                        hasApplied={(id) => applications.some((a) => a.jobId === id)}
                        jobCardStyle={columns === 1 ? { width: '100%', marginBottom: 16 } : { width: gridCardWidth, marginBottom: 16, marginRight: 8 }}
                        gridMode
                      />
                    ))}
                  </View>
                ) : (
                  <EmptyState 
                    icon="briefcase" 
                    title={debouncedSearch ? "No matching jobs" : "No jobs available"}
                    subtitle={debouncedSearch ? `No jobs found for "${debouncedSearch}"` : "Please check back later or adjust your filters"}
                  />
                );
              })()}
            </View>
          </ScrollView>
        )}

        {activeTab === "applications" && (
          jobsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading applications...</Text>
            </View>
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
              <View style={styles.section}>
                {applications.length > 0 ? (
                  (applications || []).map((application, index) => (
                    <ApplicationCard 
                      key={application.id || index} 
                      application={application}
                      onViewDetails={handleViewApplication}
                      onMessage={handleMessageFamily}
                    />
                  ))
                ) : (
                  <EmptyState 
                    icon="document-text" 
                    title="No applications yet"
                    subtitle="Apply to jobs to see them here"
                  />
                )}
              </View>
            </ScrollView>
          )
        )}

        {activeTab === "bookings" && (
          <ScrollView style={styles.content}>
            <View style={styles.section}>
              <View style={styles.bookingFilters}>
                <Chip
                  style={[styles.bookingFilterChip, styles.bookingFilterChipActive]}
                  textStyle={styles.bookingFilterChipText}
                >
                  Upcoming
                </Chip>
                <Chip
                  style={styles.bookingFilterChip}
                  textStyle={styles.bookingFilterChipText}
                >
                  Past
                </Chip>
                <Chip
                  style={styles.bookingFilterChip}
                  textStyle={styles.bookingFilterChipText}
                >
                  Cancelled
                </Chip>
              </View>

              {bookings.length > 0 ? (
                (bookings || []).map((booking, index) => (
                  <BookingCard
                    key={booking.id || index}
                    booking={booking}
                    onMessage={() => handleBookingMessage(booking)}
                    onViewDetails={() => {
                      setSelectedBooking(booking)
                      setShowBookingDetails(true)
                    }}
                    onConfirmAttendance={handleConfirmAttendance}
                  />
                ))
              ) : (
                <EmptyState 
                  icon="calendar" 
                  title="No bookings yet"
                  subtitle="Your upcoming bookings will appear here"
                />
              )}
            </View>
          </ScrollView>
        )}

        {activeTab === "messages" && (
          <MessagesTab
            navigation={navigation}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        )}
        {activeTab === "reviews" && renderReviewsTab()}

        {activeTab === "notifications" && (
          <ScrollView style={styles.content}>
            <View style={styles.section}>
              {(() => {
                const allNotifications = [
                  ...(notifications || []),
                  ...(pendingRequests || []).map(req => ({
                    id: req.id,
                    type: 'privacy_request',
                    title: 'Privacy Request',
                    message: `${req.requesterName} requested access to your information`,
                    timestamp: req.createdAt,
                    read: false
                  }))
                ];
                
                return allNotifications.length > 0 ? (
                  allNotifications.map((notification, index) => (
                    <Card key={notification.id || index} style={styles.notificationCard}>
                      <Card.Content style={styles.notificationContent}>
                        <View style={styles.notificationHeader}>
                          <View style={styles.notificationIcon}>
                            <Ionicons 
                              name={notification.type === 'privacy_request' ? 'shield' : 'notifications'} 
                              size={20} 
                              color={notification.read ? '#6B7280' : '#3B82F6'} 
                            />
                          </View>
                          <View style={styles.notificationText}>
                            <Text style={[styles.notificationTitle, !notification.read && styles.unreadTitle]}>
                              {notification.title}
                            </Text>
                            <Text style={styles.notificationMessage}>
                              {notification.message}
                            </Text>
                            <Text style={styles.notificationTime}>
                              {formatDate(notification.timestamp)}
                            </Text>
                          </View>
                          {!notification.read && (
                            <View style={styles.unreadDot} />
                          )}
                        </View>
                      </Card.Content>
                    </Card>
                  ))
                ) : (
                  <EmptyState 
                    icon="notifications" 
                    title="No notifications"
                    subtitle="You're all caught up!"
                  />
                );
              })()
              }
            </View>
          </ScrollView>
        )}
      </View>

      {renderEditProfileModal()}

      {showBookingDetails && selectedBooking && (
        <ModalWrapper 
          visible={showBookingDetails} 
          onClose={() => setShowBookingDetails(false)}
        >
          <SharedCard style={styles.editProfileModal}>
              <Text style={styles.editProfileTitle}>{selectedBooking.family}</Text>
              <Text style={styles.profileSectionText}>Children: {selectedBooking.children}</Text>
              <Text style={styles.profileSectionText}>Date: {formatDate(selectedBooking.date)}</Text>
              <Text style={styles.profileSectionText}>Time: {selectedBooking.time}</Text>
              <Text style={styles.profileSectionText}>Location: {selectedBooking.location}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                <SharedButton title="Close" variant="secondary" onPress={() => setShowBookingDetails(false)} />
              </View>
          </SharedCard>
        </ModalWrapper>
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
                      jobId: selectedJob.id,
                      jobTitle: selectedJob.title,
                      family: selectedJob.family,
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
                  <Text style={styles.jobSummaryTitle}>{selectedApplication.jobTitle}</Text>
                  <Text style={styles.jobSummaryFamily}>{selectedApplication.family}</Text>
                  <StatusBadge status={selectedApplication.status} />
                </View>
                
                <View style={styles.applicationDetails}>
                  <View style={styles.applicationDetailRow}>
                    <Ionicons name="calendar" size={18} color="#6B7280" />
                    <Text style={styles.applicationDetailText}>
                      Applied: {new Date(selectedApplication.appliedDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.applicationDetailRow}>
                    <Ionicons name="cash" size={18} color="#6B7280" />
                    <Text style={styles.applicationDetailText}>
                      ₱{selectedApplication.hourlyRate}/hr
                    </Text>
                  </View>
                  {selectedApplication.proposedRate && (
                    <View style={styles.applicationDetailRow}>
                      <Ionicons name="trending-up" size={18} color="#6B7280" />
                      <Text style={styles.applicationDetailText}>
                        Proposed Rate: ₱{selectedApplication.proposedRate}/hr
                      </Text>
                    </View>
                  )}
                  {selectedApplication.coverLetter && (
                    <View style={{ marginTop: 16 }}>
                      <Text style={styles.inputLabel}>Cover Letter</Text>
                      <View style={styles.coverLetterDisplay}>
                        <Text style={styles.coverLetterText}>{selectedApplication.coverLetter}</Text>
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
            <View style={styles.jobDetailsModal}>
              <View style={styles.jobDetailsContent}>
                <Text style={styles.jobDetailsTitle}>{selectedJob.title}</Text>
                <Text style={styles.jobDetailsFamily}>{selectedJob.family}</Text>
                
                <View style={styles.jobDetailsInfo}>
                  <View style={styles.jobDetailsRow}>
                    <Ionicons name="location" size={16} color="#6B7280" />
                    <Text style={styles.jobDetailsText}>{selectedJob.location}</Text>
                  </View>
                  <View style={styles.jobDetailsRow}>
                    <Ionicons name="time" size={16} color="#6B7280" />
                    <Text style={styles.jobDetailsText}>{selectedJob.schedule}</Text>
                  </View>
                  <View style={styles.jobDetailsRow}>
                    <Ionicons name="cash" size={16} color="#059669" />
                    <Text style={[styles.jobDetailsText, { color: '#059669', fontWeight: '600' }]}>₱{selectedJob.hourlyRate}/hr</Text>
                  </View>
                  {selectedJob.distance && (
                    <View style={styles.jobDetailsRow}>
                      <Ionicons name="navigate" size={16} color="#6B7280" />
                      <Text style={styles.jobDetailsText}>{selectedJob.distance}</Text>
                    </View>
                  )}
                </View>
                
                {Array.isArray(selectedJob.requirements) && selectedJob.requirements.length > 0 && (
                  <View style={styles.jobDetailsRequirements}>
                    <Text style={styles.jobDetailsRequirementsTitle}>Requirements</Text>
                    {selectedJob.requirements.map((req, idx) => (
                      <View key={idx} style={styles.jobDetailsRequirementRow}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={styles.jobDetailsRequirementText}>{req}</Text>
                      </View>
                    ))}
                  </View>
                )}
                
                <View style={styles.jobDetailsActions}>
                  <Button 
                    mode="text" 
                    onPress={() => { setShowJobDetails(false); setSelectedJob(null) }}
                    style={styles.jobDetailsCloseButton}
                    labelStyle={{ fontSize: 14 }}
                  >
                    Close
                  </Button>
                  {applications.some((a) => a.jobId === selectedJob.id) ? (
                    <View style={[styles.appliedBadge, { flex: 1, alignItems: 'center' }]}>
                      <View style={styles.appliedBadgeContent}>
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={{ marginRight: 6 }} />
                        <Text style={styles.appliedBadgeText}>Applied</Text>
                      </View>
                    </View>
                  ) : (
                    <Button
                      mode="contained"
                      style={styles.jobDetailsApplyButton}
                      labelStyle={{ fontSize: 14 }}
                      onPress={() => {
                        setShowJobDetails(false)
                        handleJobApplication(selectedJob)
                      }}
                    >
                      Apply
                    </Button>
                  )}
                </View>
              </View>
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
      </View>
  );
}

export default CaregiverDashboard;
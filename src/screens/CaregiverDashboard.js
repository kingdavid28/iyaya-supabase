import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from "@react-navigation/native"
import { LinearGradient } from "expo-linear-gradient"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Alert, Dimensions, Image, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View, FlatList } from "react-native"
import { Button, Card, Chip } from "react-native-paper"
import Toast from "../components/ui/feedback/Toast"
import { supabaseService } from '../services/supabase'
import { getCurrentSocketURL } from '../config/api'
import { useAuth } from "../contexts/AuthContext"
import JobsTab, { CaregiverJobCard } from './CaregiverDashboard/JobsTab';
import { usePrivacy } from '../components/features/privacy/PrivacyManager';
import { SettingsModal } from "../components/ui/modals/SettingsModal"
import { RequestInfoModal } from "../components/ui/modals/RequestInfoModal"
import BookingDetailsModal from '../components/BookingDetailsModal';

import { formatAddress } from "../utils/addressUtils"
import { calculateAge } from "../utils/dateUtils"
import { __DEV__ } from "../config/constants"
import MessagesTab from './CaregiverDashboard/components/MessagesTab';
import NotificationsTab from './CaregiverDashboard/components/NotificationsTab';
import BookingsTab from './CaregiverDashboard/BookingsTab';
import ApplicationsTab from './CaregiverDashboard/ApplicationsTab';

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

import { styles } from './styles/CaregiverDashboard.styles';
import { useCaregiverDashboard } from '../hooks/useCaregiverDashboard';
import CaregiverProfileSection from './CaregiverDashboard/components/CaregiverProfileSection';
import { PrivacyNotificationModal } from '../components/ui/modals/PrivacyNotificationModal';

import MessageItemLocal from '../components/messaging/MessageItemLocal';
import ReviewItemLocal from '../components/messaging/ReviewItemLocal';



function ApplicationCard({ application, onViewDetails, onMessage }) {
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
              {application.jobTitle}
            </Text>
            <Text style={{
              fontSize: 14,
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: '500'
            }}>
              {application.family}
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
            borderRadius: 20,
            marginRight: 8,
            marginBottom: 8,
            flex: 0.48,
          }}>
            <Ionicons name="calendar" size={16} color="#6B7280" />
            <Text style={{
              marginLeft: 6,
              fontSize: 13,
              color: '#374151',
              fontWeight: '500'
            }} numberOfLines={1}>
              {new Date(application.appliedDate).toLocaleDateString()}
            </Text>
          </View>

          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F0FDF4',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
            marginBottom: 8,
            flex: 0.48,
          }}>
            <Ionicons name="cash" size={16} color="#059669" />
            <Text style={{
              marginLeft: 6,
              fontSize: 13,
              color: '#059669',
              fontWeight: '600'
            }}>
              ₱{application.hourlyRate}/hr
            </Text>
          </View>
        </View>

        {/* Cover Letter Preview */}
        {application.coverLetter && (
          <View style={{
            backgroundColor: '#F9FAFB',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
          }}>
            <Text style={{
              fontSize: 12,
              color: '#6B7280',
              fontWeight: '600',
              marginBottom: 4,
            }}>
              Cover Letter:
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#374151',
              lineHeight: 20,
            }} numberOfLines={2}>
              {application.coverLetter}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 'auto' }}>
          <Pressable
            onPress={() => onViewDetails && onViewDetails(application)}
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
    activeTab, setActiveTab,
    profile, setProfile,
    jobs, applications, setApplications, bookings,
    jobsLoading,
    loadProfile, fetchJobs, fetchApplications, fetchBookings
  } = useCaregiverDashboard();
  const { pendingRequests, notifications } = usePrivacy();
  
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

  const tabBadgeCounts = useMemo(() => {
    const pendingBookingsCount = Array.isArray(bookings)
      ? bookings.filter(booking => (booking?.status || '').toLowerCase() === 'pending').length
      : 0

    const pendingApplicationsCount = Array.isArray(applications)
      ? applications.filter(application => (application?.status || '').toLowerCase() === 'pending').length
      : 0

    const unreadMessagesCount = Array.isArray(parents)
      ? parents.reduce((sum, parent) => sum + (parent?.unreadCount || 0), 0)
      : 0

    const unreadReviewsCount = Array.isArray(reviews)
      ? reviews.filter(review => !review?.read).length
      : 0

    const unreadNotifications = notifications?.filter?.(n => !n.read)?.length || 0
    const pendingRequestsCount = pendingRequests?.length || 0

    return {
      bookings: pendingBookingsCount,
      applications: pendingApplicationsCount,
      messages: unreadMessagesCount,
      reviews: unreadReviewsCount,
      notifications: unreadNotifications + pendingRequestsCount
    }
  }, [applications, bookings, notifications, parents, pendingRequests, reviews])
  
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

  // Fetch conversations using Supabase
  useEffect(() => {
    if (!user?.id) return;

    const loadConversations = async () => {
      try {
        const conversations = await supabaseService.messaging.getConversations(user.id);
        console.log('📨 Caregiver received conversations:', conversations.length);
        setParents(conversations.map(conv => {
          const otherUser = conv.otherParticipant;
          return {
            id: otherUser?.id,
            name: otherUser?.name || 'Parent',
            profileImage: otherUser?.profile_image || null,
            unreadCount: conv?.unread_count ?? conv?.unreadCount ?? 0
          };
        }));
      } catch (error) {
        console.error('Error loading conversations:', error);
        setParents([]);
      }
    };

    loadConversations();
  }, [user?.id]);

  // Fetch messages for selected parent
  useEffect(() => {
    if (!selectedParent || !user?.id) return;

    const loadMessages = async () => {
      try {
        const conversation = await supabaseService.messaging.getOrCreateConversation(user.id, selectedParent.id);
        const messagesData = await supabaseService.messaging.getMessages(conversation.id);
        console.log('📨 Received messages:', messagesData.length);
        setMessages(messagesData);
        if (selectedParent?.id) {
          setParents(prev => prev.map(parent => parent.id === selectedParent.id ? { ...parent, unreadCount: 0 } : parent));
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        setMessages([]);
      }
    };

    loadMessages();
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
        const conversation = await supabaseService.getOrCreateConversation(user.id, existingParent.id);
        await supabaseService.markMessagesAsRead(conversation.id, user.id);
        setParents(prev => prev.map(parent => parent.id === existingParent.id ? { ...parent, unreadCount: 0 } : parent));
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

  // Send messages using Supabase
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
      const conversation = await supabaseService.messaging.getOrCreateConversation(user.id, selectedParent.id);
      
      console.log('📨 Caregiver sending message:', {
        senderId: user.id,
        receiverId: selectedParent.id,
        conversationId: conversation.id,
        message: newMessage.trim()
      });

      await supabaseService.messaging.sendMessage(conversation.id, user.id, newMessage.trim());
      setNewMessage('');
      console.log('✅ Caregiver message sent successfully');
      
      // Reload messages to show the new one
      const messagesData = await supabaseService.messaging.getMessages(conversation.id);
      setMessages(messagesData);
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
                    const conversation = await supabaseService.messaging.getOrCreateConversation(user.id, item.id);
                    await supabaseService.messaging.markMessagesAsRead(conversation.id, user.id);
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
                        style={{ width: isTablet ? 320 : '100%', marginRight: isTablet && index < 2 ? 16 : 0 }}
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
          <ApplicationsTab
            applications={applications}
            onViewJob={handleViewJob}
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

        {activeTab === 'notifications' && (
          <NotificationsTab
            navigation={navigation}
            onNavigateTab={(tabId) => setActiveTab(tabId)}
          />
        )}

      </View>

      {showBookingDetails && selectedBooking && (
        <BookingDetailsModal
          visible={showBookingDetails}
          booking={selectedBooking}
          onClose={() => setShowBookingDetails(false)}
          onMessage={() => handleBookingMessage(selectedBooking)}
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
            <ScrollView style={styles.jobDetailsModal}>
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
                    <Text style={styles.jobDetailsText}>{String(selectedJob.address || selectedJob.location || 'Location not specified')}</Text>
                  </View>
                  <View style={styles.jobDetailsRow}>
                    <Ionicons name="time" size={16} color="#6B7280" />
                    <Text style={styles.jobDetailsText}>
                      {String(selectedJob.schedule || selectedJob.time || selectedJob.workingHours || 'Flexible schedule')}
                      {selectedJob.startTime && selectedJob.endTime ? ` (${String(selectedJob.startTime)} - ${String(selectedJob.endTime)})` : ''}
                    </Text>
                  </View>
                  <View style={styles.jobDetailsRow}>
                    <Ionicons name="calendar" size={16} color="#6B7280" />
                    <Text style={styles.jobDetailsText}>{String(selectedJob.date ? new Date(selectedJob.date).toLocaleDateString() : 'Date flexible')}</Text>
                  </View>
                  <View style={styles.jobDetailsRow}>
                    <Ionicons name="people" size={16} color="#6B7280" />
                    <Text style={styles.jobDetailsText}>
                      {String(selectedJob.childrenCount || selectedJob.children?.length || 1)} child{(selectedJob.childrenCount || selectedJob.children?.length || 1) > 1 ? 'ren' : ''}
                      {selectedJob.childrenAges ? ` (${String(selectedJob.childrenAges)})` : ''}
                    </Text>
                  </View>
                  <View style={styles.jobDetailsRow}>
                    <Ionicons name="cash" size={16} color="#059669" />
                    <Text style={[styles.jobDetailsText, { color: '#059669', fontWeight: '600' }]}>₱{String(selectedJob.hourlyRate || selectedJob.rate || 0)}/hr</Text>
                  </View>
                  {selectedJob.distance && (
                    <View style={styles.jobDetailsRow}>
                      <Ionicons name="navigate" size={16} color="#6B7280" />
                      <Text style={styles.jobDetailsText}>{String(selectedJob.distance)}</Text>
                    </View>
                  )}
                </View>
                
                {selectedJob.description && (
                  <View style={styles.jobDetailsSection}>
                    <Text style={styles.jobDetailsSectionTitle}>Job Description</Text>
                    <Text style={styles.jobDetailsDescription}>{String(selectedJob.description)}</Text>
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
            </ScrollView>
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
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Alert,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import { getCaregiverDisplayName } from '../utils/caregiverUtils';

// Mock data and utilities
const SAMPLE_BOOKINGS = [
  { 
    _id: '1', 
    caregiverId: { name: 'Jenefa Reyes' }, 
    date: '2023-12-15', 
    startTime: '14:00', 
    endTime: '18:00', 
    status: 'confirmed',
    totalAmount: 120,
    totalHours: 4,
    hourlyRate: 30,
    children: ['Child 1', 'Child 2'],
    address: '123 Main St, City',
    createdAt: new Date()
  },
  { 
    _id: '2', 
    caregiverId: { name: 'Maria Reyes' }, 
    date: '2023-12-16', 
    startTime: '09:00', 
    endTime: '17:00', 
    status: 'pending_confirmation',
    totalAmount: 240,
    totalHours: 8,
    hourlyRate: 30,
    children: ['Child 1'],
    address: '456 Oak St, City',
    createdAt: new Date(Date.now() - 86400000)
  },
];


const getStatusColor = (status) => {
  switch(status) {
    case 'confirmed': return '#2ecc71';
    case 'pending_confirmation': return '#f39c12';
    case 'cancelled': return '#e74c3c';
    case 'completed': return '#3498db';
    case 'in_progress': return '#2196F3';
    case 'rejected': return '#f44336';
    default: return '#95a5a6';
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'pending_confirmation': return 'time-outline';
    case 'confirmed': return 'checkmark-circle-outline';
    case 'in_progress': return 'play-circle-outline';
    case 'completed': return 'checkmark-done-circle-outline';
    case 'cancelled': return 'close-circle-outline';
    case 'rejected': return 'close-circle-outline';
    default: return 'help-circle-outline';
  }
};

// Status Chip Component
const StatusChip = ({ status }) => {
  const statusText = status.replace('_', ' ').toUpperCase();
  const backgroundColor = getStatusColor(status);
  
  return (
    <View style={[styles.statusBadge, { backgroundColor }]}>
      <Ionicons name={getStatusIcon(status)} size={16} color="#fff" />
      <Text style={styles.statusText}>{statusText}</Text>
    </View>
  );
};

// Main Booking Management Component
const BookingManagementScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const createdBookingId = route?.params?.createdBookingId || null;
  
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  useEffect(() => {
    if (createdBookingId) setSnackbarVisible(true);
  }, [createdBookingId]);

  const fetchBookings = useCallback(async () => {
    // In a real app, this would be an API call
    setLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Filter based on active tab
      let filteredBookings = SAMPLE_BOOKINGS;
      if (activeTab !== 'all') {
        const statusFilter = activeTab === 'pending' ? 'pending_confirmation' : activeTab;
        filteredBookings = SAMPLE_BOOKINGS.filter(booking => booking.status === statusFilter);
      }
      
      setBookings(filteredBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      Alert.alert('Error', 'Failed to load bookings');
      setBookings(SAMPLE_BOOKINGS); // Fallback to sample data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBookings();
  };

  const handleBookingPress = (booking) => {
    navigation.navigate('BookingDetailsScreen', { bookingId: booking._id });
  };

  const handleStatusUpdate = async (bookingId, newStatus, reason = null) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update local state
      setBookings(prev =>
        prev.map(booking =>
          booking._id === bookingId
            ? { ...booking, status: newStatus }
            : booking
        )
      );

      Alert.alert('Success', `Booking ${newStatus} successfully`);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update booking status');
    }
  };

  const handleCancelBooking = (booking) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              'Cancellation Reason',
              'Please provide a reason for cancellation:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Submit',
                  onPress: (reason) => {
                    if (reason?.trim()) {
                      handleStatusUpdate(booking._id, 'cancelled', reason);
                    }
                  },
                },
              ],
              'plain-text'
            );
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${hour12}:${minutes} ${period}`;
  };

  const renderBookingItem = ({ item }) => {
    const isUpcoming = new Date(item.date) > new Date();
    const canCancel = ['pending_confirmation', 'confirmed'].includes(item.status) && isUpcoming;

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => handleBookingPress(item)}
      >
        <View style={styles.bookingHeader}>
          <View style={styles.bookingInfo}>
            <Text style={styles.bookingTitle}>Childcare Booking</Text>
            <Text style={styles.bookingSubtitle}>
              with {getCaregiverDisplayName(item.caregiverId)}
            </Text>
          </View>
          <StatusChip status={item.status} />
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              {formatDate(item.date)} • {formatTime(item.startTime)}–{formatTime(item.endTime)}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              ${item.totalAmount} ({item.totalHours} hours)
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              Children: {item.children?.join(', ') || 'Not specified'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{item.address}</Text>
          </View>
        </View>

        <View style={styles.bookingFooter}>
          <Text style={styles.bookingTime}>
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </Text>
          
          {canCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelBooking(item)}
            >
              <Ionicons name="close" size={16} color="#e74c3c" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderTabBar = () => {
    const tabs = [
      { key: 'all', label: 'All', icon: 'list-outline' },
      { key: 'pending', label: 'Pending', icon: 'time-outline' },
      { key: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle-outline' },
      { key: 'completed', label: 'Completed', icon: 'checkmark-done-outline' },
    ];

    return (
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={20}
              color={activeTab === tab.key ? '#3b83f5' : '#666'}
            />
            <Text style={[
              styles.tabText,
              activeTab === tab.key && styles.activeTabText
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No bookings found</Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'all'
          ? 'Your bookings will appear here once you start booking caregivers'
          : `No ${activeTab} bookings at the moment`
        }
      </Text>
    </View>
  );

  if (loading && bookings.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b83f5" />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {createdBookingId && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Booking created successfully</Text>
          <Text style={styles.bannerSub}>ID: {createdBookingId}</Text>
        </View>
      )}
      
      {renderTabBar()}
      
      <FlatList
        data={bookings}
        keyExtractor={(item) => item._id}
        renderItem={renderBookingItem}
        contentContainerStyle={bookings.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#3b83f5']}
            tintColor="#3b83f5"
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  
  activeTab: {
    borderBottomColor: '#3b83f5',
  },
  
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 6,
  },
  
  activeTabText: {
    color: '#3b83f5',
    fontWeight: '600',
  },
  
  list: {
    paddingVertical: 10,
  },
  
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  bookingCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  
  bookingInfo: {
    flex: 1,
    marginRight: 10,
  },
  
  bookingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  
  bookingSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 4,
  },
  
  bookingDetails: {
    marginBottom: 15,
  },
  
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  bookingTime: {
    fontSize: 12,
    color: '#999',
  },
  
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  
  cancelButtonText: {
    color: '#e74c3c',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // Additional styles for banner
  banner: {
    backgroundColor: '#ECFDF5',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    margin: 16,
    marginBottom: 12,
  },
  
  bannerText: {
    color: '#065F46',
    fontWeight: '700',
  },
  
  bannerSub: {
    color: '#065F46',
    marginTop: 4,
    fontSize: 12,
  },
});

export default BookingManagementScreen;

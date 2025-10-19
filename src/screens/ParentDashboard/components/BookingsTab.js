import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, Alert, Linking, ActivityIndicator, ScrollView, StyleSheet, Animated, Easing } from 'react-native';
import { Calendar, Clock, DollarSign, Filter, Plus } from 'lucide-react-native';
import { styles, colors } from '../../styles/ParentDashboard.styles';
import BookingItem from './BookingItem';
import { parseDate } from '../../../utils/dateUtils';
import { formatAddress } from '../../../utils/addressUtils';
import { BOOKING_STATUSES } from '../../../constants/bookingStatuses';

const BOOKING_ITEM_HEIGHT = 320;
const SKELETON_ITEMS = 5;

const skeletonStyles = StyleSheet.create({
  listContent: {
    paddingVertical: 8
  },
  card: {
    height: BOOKING_ITEM_HEIGHT,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F4F4F8',
    overflow: 'hidden'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#EBECF5'
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D7D9E6',
    marginRight: 12
  },
  headerText: {
    flex: 1,
    gap: 8
  },
  lineLong: {
    width: '70%',
    height: 12,
    borderRadius: 8,
    backgroundColor: '#D7D9E6'
  },
  lineShort: {
    width: '40%',
    height: 10,
    borderRadius: 8,
    backgroundColor: '#D7D9E6'
  },
  badge: {
    width: 60,
    height: 20,
    borderRadius: 12,
    backgroundColor: '#D7D9E6'
  },
  body: {
    flex: 1,
    padding: 16,
    gap: 12
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  pill: {
    height: 18,
    borderRadius: 10,
    backgroundColor: '#E4E6F1'
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16
  },
  button: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E4E6F1',
    marginHorizontal: 6
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    opacity: 0.6
  }
});

const MemoizedBookingItem = React.memo(BookingItem);

const SkeletonBookingItem = React.memo(() => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true
        })
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 150]
  });

  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.header}>
        <View style={skeletonStyles.avatar} />
        <View style={skeletonStyles.headerText}>
          <View style={skeletonStyles.lineLong} />
          <View style={skeletonStyles.lineShort} />
        </View>
        <View style={skeletonStyles.badge} />
      </View>
      <View style={skeletonStyles.body}>
        <View style={skeletonStyles.row}>
          <View style={[skeletonStyles.pill, { width: '55%' }]} />
          <View style={[skeletonStyles.pill, { width: '35%' }]} />
        </View>
        <View style={[skeletonStyles.pill, { width: '80%' }]} />
        <View style={[skeletonStyles.pill, { width: '60%' }]} />
        <View style={skeletonStyles.buttonRow}>
          <View style={skeletonStyles.button} />
          <View style={skeletonStyles.button} />
          <View style={skeletonStyles.button} />
        </View>
      </View>
      <Animated.View
        pointerEvents="none"
        style={[skeletonStyles.shimmer, { transform: [{ translateX }] }]}
      />
    </View>
  );
});

const BookingsTab = ({
  bookings,
  bookingsFilter,
  setBookingsFilter,
  refreshing,
  onRefresh,
  onCancelBooking,
  onUploadPayment,
  onViewBookingDetails,
  onWriteReview,
  onCreateBooking,
  onMessageCaregiver,
  navigation,
  loading
}) => {
  const filteredBookings = useMemo(() => {
    if (!bookings || !Array.isArray(bookings)) return [];
    
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today
    
    switch (bookingsFilter) {
      case 'upcoming':
        return bookings.filter((b) => {
          if (!b.date) return false;
          const bookingDate = new Date(b.date);
          bookingDate.setHours(0, 0, 0, 0);
          return bookingDate >= now;
        });
        
      case 'past':
        return bookings.filter((b) => {
          if (!b.date) return false;
          const bookingDate = new Date(b.date);
          bookingDate.setHours(0, 0, 0, 0);
          return bookingDate < now;
        });
        
      case 'pending':
        return bookings.filter(b => b.status === BOOKING_STATUSES.PENDING);
        
      case 'confirmed':
        return bookings.filter(b => 
          b.status === BOOKING_STATUSES.CONFIRMED || 
          b.status === BOOKING_STATUSES.IN_PROGRESS
        );
        
      case 'completed':
        return bookings.filter(b => 
          b.status === BOOKING_STATUSES.COMPLETED || 
          b.status === BOOKING_STATUSES.PAID
        );
        
      default:
        return bookings;
    }
  }, [bookings, bookingsFilter]);
  
  // Calculate booking statistics
  const bookingStats = useMemo(() => {
    if (!bookings || !Array.isArray(bookings)) {
      return { total: 0, pending: 0, confirmed: 0, completed: 0, totalSpent: 0 };
    }
    
    return bookings.reduce((stats, booking) => {
      stats.total += 1;
      
      // Only count money as "spent" if booking is paid or completed with payment
      if (booking.status === BOOKING_STATUSES.PAID || 
          (booking.status === BOOKING_STATUSES.COMPLETED && booking.paymentProof)) {
        stats.totalSpent += (booking.totalCost || booking.amount || 0);
      }
      
      switch (booking.status) {
        case BOOKING_STATUSES.PENDING:
          stats.pending += 1;
          break;
        case BOOKING_STATUSES.CONFIRMED:
        case BOOKING_STATUSES.IN_PROGRESS:
          stats.confirmed += 1;
          break;
        case BOOKING_STATUSES.COMPLETED:
        case BOOKING_STATUSES.PAID:
          stats.completed += 1;
          break;
      }
      
      return stats;
    }, { total: 0, pending: 0, confirmed: 0, completed: 0, totalSpent: 0 });
  }, [bookings]);

  const handleMessageCaregiver = async (caregiver) => {
    try {
      console.log('🔍 BookingsTab - Caregiver data for messaging:', caregiver);
      
      if (!caregiver) {
        Alert.alert('Error', 'Caregiver information not available');
        return;
      }
      
      const caregiverId = caregiver._id || caregiver.id;
      const caregiverName = caregiver.name || caregiver.firstName || 'Caregiver';
      
      console.log('🔍 BookingsTab - Extracted caregiver info:', { caregiverId, caregiverName });
      
      if (onMessageCaregiver) {
        await onMessageCaregiver({
          _id: caregiverId,
          name: caregiverName,
          avatar: caregiver.avatar || caregiver.profileImage
        });
      } else {
        console.log('Starting conversation with caregiver:', {
          recipientId: caregiverId,
          recipientName: caregiverName,
          recipientAvatar: caregiver.avatar || caregiver.profileImage
        });
      }
    } catch (error) {
      console.error('Error messaging caregiver:', error);
      Alert.alert('Error', 'Failed to open messaging. Please try again.');
    }
  };

  const handleCallCaregiver = async (caregiver) => {
    try {
      if (!caregiver || !caregiver.phone) {
        Alert.alert('No Phone Number', 'Caregiver phone number is not available');
        return;
      }
      
      const phoneNumber = caregiver.phone.replace(/[^0-9+]/g, '');
      
      Alert.alert(
        'Call Caregiver',
        `Call ${caregiver.name || 'caregiver'} at ${caregiver.phone}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Call',
            onPress: () => {
              Linking.openURL(`tel:${phoneNumber}`);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error calling caregiver:', error);
      Alert.alert('Error', 'Failed to make call. Please try again.');
    }
  };

  const renderStatsHeader = useCallback(() => (
    <View style={styles.bookingStatsContainer}>
      <View style={styles.statItem}>
        <Calendar size={20} color={colors.primary} />
        <Text style={styles.statNumber}>{bookingStats.total}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </View>
      <View style={styles.statItem}>
        <Clock size={20} color={colors.warning} />
        <Text style={styles.statNumber}>{bookingStats.pending}</Text>
        <Text style={styles.statLabel}>Pending</Text>
      </View>
      <View style={styles.statItem}>
        <Calendar size={20} color={colors.success} />
        <Text style={styles.statNumber}>{bookingStats.confirmed}</Text>
        <Text style={styles.statLabel}>Active</Text>
      </View>
      <View style={styles.statItem}>
        <DollarSign size={20} color={colors.primary} />
        <Text style={styles.statNumber}>₱{bookingStats.totalSpent.toFixed(0)}</Text>
        <Text style={styles.statLabel}>Spent</Text>
      </View>
    </View>
  ), [bookingStats.completed, bookingStats.confirmed, bookingStats.pending, bookingStats.total, bookingStats.totalSpent]);

  const renderFilterTabs = useCallback(() => {
    const filterOptions = [
      { key: 'all', label: 'All', count: bookingStats.total },
      { key: 'upcoming', label: 'Upcoming', count: null },
      { key: 'pending', label: 'Pending', count: bookingStats.pending },
      { key: 'confirmed', label: 'Active', count: bookingStats.confirmed },
      { key: 'completed', label: 'Done', count: bookingStats.completed }
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bookingsFilterTabs}
        contentContainerStyle={styles.bookingsFilterTabsContent}
      >
        {filterOptions.map((option) => {
          const isActive = bookingsFilter === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.filterTab, isActive && styles.activeFilterTab]}
              onPress={() => setBookingsFilter(option.key)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${option.label} bookings`}
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[styles.filterTabText, isActive && styles.activeFilterTabText]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {option.label}
                {option.count !== null && option.count > 0 && (
                  <Text
                    style={[styles.filterTabCount, isActive && { color: colors.textInverse }]}
                  >
                    {` (${option.count})`}
                  </Text>
                )}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  }, [bookingStats.completed, bookingStats.confirmed, bookingStats.pending, bookingStats.total, bookingsFilter, setBookingsFilter]);

  const renderEmptyState = useCallback(() => {
    const getEmptyMessage = () => {
      switch (bookingsFilter) {
        case 'upcoming':
          return 'No upcoming bookings';
        case 'past':
          return 'No past bookings';
        case 'pending':
          return 'No pending bookings';
        case 'confirmed':
          return 'No active bookings';
        case 'completed':
          return 'No completed bookings';
        default:
          return 'No bookings found';
      }
    };

    return (
      <View style={styles.emptySection}>
        <Calendar size={48} color={colors.textSecondary} style={styles.emptyIcon} />
        <Text style={styles.emptySectionTitle}>{getEmptyMessage()}</Text>
        <Text style={styles.emptySectionText}>
          {bookingsFilter === 'all'
            ? 'Start by booking a caregiver for your children'
            : 'Check other tabs or create a new booking'}
        </Text>
        {onCreateBooking && (
          <TouchableOpacity
            style={styles.emptyActionButton}
            onPress={onCreateBooking}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.emptyActionButtonText}>Book a Caregiver</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [bookingsFilter, onCreateBooking]);

  const keyExtractor = useCallback((item, index) => item?._id || item?.id || `booking-${index}`, []);

  const getItemLayout = useCallback((_, index) => ({
    length: BOOKING_ITEM_HEIGHT,
    offset: BOOKING_ITEM_HEIGHT * index,
    index
  }), []);

  const renderBookingItem = useCallback(({ item }) => {
    const caregiverData = item?.caregiverId || item?.caregiver || item?.caregiverProfile || item?.assignedCaregiver;

    return (
      <MemoizedBookingItem
        booking={item}
        user={caregiverData}
        onCancelBooking={onCancelBooking}
        onUploadPayment={onUploadPayment}
        onViewBookingDetails={onViewBookingDetails}
        onWriteReview={onWriteReview}
        onMessageCaregiver={handleMessageCaregiver}
        onCallCaregiver={handleCallCaregiver}
      />
    );
  }, [handleCallCaregiver, handleMessageCaregiver, onCancelBooking, onUploadPayment, onViewBookingDetails, onWriteReview]);

  const skeletonData = useMemo(
    () => Array.from({ length: SKELETON_ITEMS }, (_, index) => `skeleton-${index}`),
    []
  );

  if (loading) {
    return (
      <View style={[styles.bookingsContent, { flex: 1 }]}>
        <View style={styles.bookingsHeader}>
          <View style={styles.bookingsHeaderTop}>
            <Text style={styles.bookingsTitle}>My Bookings</Text>
          </View>
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 12 }} />
        </View>

        <FlatList
          data={skeletonData}
          keyExtractor={(item) => item}
          renderItem={() => <SkeletonBookingItem />}
          contentContainerStyle={skeletonStyles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        />
      </View>
    );
  }

  return (
    <View style={[styles.bookingsContent, { flex: 1 }]}>
      <View style={styles.bookingsHeader}>
        <View style={styles.bookingsHeaderTop}>
          <Text style={styles.bookingsTitle}>My Bookings</Text>
          {onCreateBooking && (
            <TouchableOpacity
              style={styles.createBookingButton}
              onPress={onCreateBooking}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.createBookingButtonText}>Book</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {bookingStats.total > 0 && renderStatsHeader()}
        {renderFilterTabs()}
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={filteredBookings}
        keyExtractor={keyExtractor}
        renderItem={renderBookingItem}
        contentContainerStyle={[
          styles.bookingsList,
          filteredBookings.length === 0 && { flex: 1 }
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        getItemLayout={getItemLayout}
        initialNumToRender={6}
        windowSize={10}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={120}
        removeClippedSubviews
      />
    </View>
  );
};

export default BookingsTab;

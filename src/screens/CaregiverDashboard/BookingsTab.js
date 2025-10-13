import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../shared/ui';
import { styles } from '../styles/CaregiverDashboard.styles';

const BookingCard = React.memo(({ booking, onMessageFamily, onConfirmBooking, onViewDetails }) => {
  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      return timeString;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#F59E0B';
      case 'confirmed': return '#10B981';
      case 'completed': return '#3B82F6';
      case 'cancelled': return '#EF4444';
      default: return '#9CA3AF';
    }
  };

  const startTime = formatTime(booking?.start_time || booking?.startTime);
  const endTime = formatTime(booking?.end_time || booking?.endTime);
  const timeDisplay = booking?.time || (startTime && endTime ? `${startTime} - ${endTime}` : 'Time TBD');
  const childrenCount = booking?.selected_children?.length || booking?.numberOfChildren || 1;
  const location = booking?.address || booking?.location;

  return (
    <View style={bookingCardStyles.card}>
      <View style={bookingCardStyles.header}>
        <Text style={bookingCardStyles.familyName}>{booking.family || 'Family'}</Text>
        <View style={[bookingCardStyles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
          <Text style={bookingCardStyles.statusText}>{booking.status || 'Unknown'}</Text>
        </View>
      </View>
      
      <View style={bookingCardStyles.details}>
        <View style={bookingCardStyles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#6b7280" />
          <Text style={bookingCardStyles.detailText}>{booking.date || 'Date TBD'}</Text>
        </View>
        
        <View style={bookingCardStyles.detailRow}>
          <Ionicons name="time-outline" size={16} color="#6b7280" />
          <Text style={bookingCardStyles.detailText}>{timeDisplay}</Text>
        </View>
        
        <View style={bookingCardStyles.detailRow}>
          <Ionicons name="people-outline" size={16} color="#6b7280" />
          <Text style={bookingCardStyles.detailText}>
            {childrenCount} {childrenCount === 1 ? 'child' : 'children'}
          </Text>
        </View>
        
        {location && (
          <View style={bookingCardStyles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#6b7280" />
            <Text style={bookingCardStyles.detailText} numberOfLines={1}>{location}</Text>
          </View>
        )}
      </View>
      
      {booking?.special_instructions && (
        <View style={bookingCardStyles.instructionsContainer}>
          <Text style={bookingCardStyles.instructionsText} numberOfLines={2}>
            {booking.special_instructions}
          </Text>
        </View>
      )}
      
      <View style={bookingCardStyles.footer}>
        <View style={bookingCardStyles.amountContainer}>
          <Text style={bookingCardStyles.amount}>₱{booking.totalAmount || booking.total_amount || 0}</Text>
          <Text style={bookingCardStyles.hourlyRate}>₱{booking.hourlyRate || booking.hourly_rate || 300}/hr</Text>
        </View>
        
        <View style={bookingCardStyles.actionButtons}>
          {booking.status === 'pending' && (
            <TouchableOpacity 
              style={bookingCardStyles.confirmButton}
              onPress={() => onConfirmBooking && onConfirmBooking(booking.id || booking._id)}
            >
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              <Text style={bookingCardStyles.buttonText}>Confirm</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={bookingCardStyles.detailsButton}
            onPress={() => onViewDetails && onViewDetails(booking)}
          >
            <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
            <Text style={bookingCardStyles.buttonText}>Details</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={bookingCardStyles.messageButton}
            onPress={() => onMessageFamily && onMessageFamily(booking)}
          >
            <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" />
            <Text style={bookingCardStyles.buttonText}>Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const bookingCardStyles = {
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  familyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  details: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    flex: 1,
  },
  instructionsContainer: {
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  instructionsText: {
    fontSize: 13,
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountContainer: {
    flex: 1,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  hourlyRate: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  detailsButton: {
    backgroundColor: '#6B7280',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#6B7280',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  messageButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
};

const normalizeStatus = (status) => String(status || '').toLowerCase();

const isUpcomingBooking = (booking) => {
  if (!booking?.date) return false;
  const bookingDate = new Date(booking.date);
  if (Number.isNaN(bookingDate.getTime())) return false;
  const today = new Date();
  bookingDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return bookingDate >= today;
};

const computeFilterCounts = (bookings) => {
  const counts = {
    all: Array.isArray(bookings) ? bookings.length : 0,
    upcoming: 0,
    pending: 0,
    confirmed: 0,
    completed: 0
  };

  if (!Array.isArray(bookings)) return counts;

  bookings.forEach((booking) => {
    const status = normalizeStatus(booking?.status);
    if (isUpcomingBooking(booking)) counts.upcoming += 1;
    if (status === 'pending') counts.pending += 1;
    if (status === 'confirmed' || status === 'in-progress' || status === 'in_progress') counts.confirmed += 1;
    if (status === 'completed' || status === 'done' || status === 'paid') counts.completed += 1;
  });

  return counts;
};

const getFilteredBookings = (bookings, activeFilter) => {
  if (!Array.isArray(bookings)) return [];

  return bookings.filter((booking) => {
    const status = normalizeStatus(booking?.status);

    switch (activeFilter) {
      case 'upcoming':
        return isUpcomingBooking(booking);
      case 'pending':
        return status === 'pending';
      case 'confirmed':
        return status === 'confirmed' || status === 'in-progress' || status === 'in_progress';
      case 'completed':
        return status === 'completed' || status === 'done' || status === 'paid';
      default:
        return true;
    }
  });
};

const buildFilterOptions = (metrics) => ([
  { key: 'all', label: 'All', count: metrics.all },
  { key: 'upcoming', label: 'Upcoming', count: metrics.upcoming },
  { key: 'pending', label: 'Pending', count: metrics.pending },
  { key: 'confirmed', label: 'Active', count: metrics.confirmed },
  { key: 'completed', label: 'Done', count: metrics.completed }
]);

export default function BookingsTab({
  bookings,
  onMessageFamily,
  onConfirmBooking,
  onViewDetails,
  refreshing = false,
  onRefresh,
  loading = false
}) {
  const [activeFilter, setActiveFilter] = useState('all');

  const filterMetrics = useMemo(() => computeFilterCounts(bookings), [bookings]);
  const visibleBookings = useMemo(() => getFilteredBookings(bookings, activeFilter), [bookings, activeFilter]);
  const options = useMemo(() => buildFilterOptions(filterMetrics), [filterMetrics]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  return (
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
        <View style={styles.bookingFilterTabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bookingFilterTabs}
          >
            {options.map((option) => {
              const isActive = activeFilter === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.bookingFilterTab,
                    isActive && styles.activeBookingFilterTab
                  ]}
                  onPress={() => setActiveFilter(option.key)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.bookingFilterTabText,
                      isActive && styles.activeBookingFilterTabText
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {option.label}
                    {typeof option.count === 'number' && option.count > 0 && (
                      <Text style={styles.bookingFilterTabCount}>{` (${option.count})`}</Text>
                    )}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {visibleBookings.length > 0 ? (
          visibleBookings.map((booking) => (
            <BookingCard
              key={booking.id || booking._id}
              booking={booking}
              onMessageFamily={onMessageFamily}
              onConfirmBooking={onConfirmBooking}
              onViewDetails={onViewDetails}
            />
          ))
        ) : (
          <EmptyState
            icon="calendar"
            title="No bookings found"
            subtitle={
              activeFilter === 'all'
                ? 'Your bookings will appear here once available'
                : 'Try another tab to see more bookings'
            }
          />
        )}
      </View>
    </ScrollView>
  );
}
import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../shared/ui';
import { styles } from '../styles/CaregiverDashboard.styles';
import {
  SkeletonCard,
  SkeletonBlock,
  SkeletonCircle,
  SkeletonPill
} from '../../components/common/SkeletonPlaceholder';

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
  const childrenCount = Array.isArray(booking?.childrenDetails)
    ? booking.childrenDetails.length
    : Array.isArray(booking?.selectedChildren)
      ? booking.selectedChildren.length
      : Array.isArray(booking?.selected_children)
        ? booking.selected_children.length
        : booking?.numberOfChildren || booking?.children || 1;

  const location = booking?.address || booking?.location;

  const specialInstructions = booking?.specialInstructions || booking?.special_instructions || booking?.notes;

  const totalAmount = booking?.totalAmount ?? booking?.total_amount ?? 0;
  const hourlyRate = booking?.hourlyRate ?? booking?.hourly_rate ?? 0;

  const contactPhone = booking?.contactPhone || booking?.contact_phone;
  const contactEmail = booking?.contactEmail || booking?.contact_email;

  const detailChips = [
    {
      key: 'date',
      icon: 'calendar-outline',
      text: booking?.date || 'Date TBD'
    },
    {
      key: 'time',
      icon: 'time-outline',
      text: timeDisplay
    },
    {
      key: 'children',
      icon: 'people-outline',
      text: `${childrenCount} ${childrenCount === 1 ? 'child' : 'children'}`
    }
  ];

  if (location) {
    detailChips.push({
      key: 'location',
      icon: 'location-outline',
      text: location
    });
  }

  const contactChips = [
    contactPhone ? { key: 'phone', icon: 'call-outline', text: contactPhone } : null,
    contactEmail ? { key: 'email', icon: 'mail-outline', text: contactEmail } : null,
  ].filter(Boolean);

  return (
    <View style={bookingCardStyles.card}>
      <View style={bookingCardStyles.header}>
        <Text style={bookingCardStyles.familyName}>{booking.family || 'Family'}</Text>
        <View style={[bookingCardStyles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
          <Text style={bookingCardStyles.statusText}>{booking.status || 'Unknown'}</Text>
        </View>
      </View>
      
      <View style={bookingCardStyles.details}>
        {detailChips.map(({ key, icon, text }) => (
          <View key={key} style={bookingCardStyles.detailChip}>
            <Ionicons name={icon} size={14} color="#2563EB" />
            <Text style={bookingCardStyles.detailChipText} numberOfLines={1}>
              {text}
            </Text>
          </View>
        ))}
      </View>

      {specialInstructions && (
        <View style={bookingCardStyles.instructionsContainer}>
          <Text style={bookingCardStyles.sectionLabel}>Special Instructions</Text>
          <Text style={bookingCardStyles.instructionsText} numberOfLines={3}>
            {specialInstructions}
          </Text>
        </View>
      )}

      {contactChips.length > 0 && (
        <View style={bookingCardStyles.contactContainer}>
          <Text style={bookingCardStyles.sectionLabel}>Contact</Text>
          <View style={bookingCardStyles.contactChips}>
            {contactChips.map(({ key, icon, text }) => (
              <View key={key} style={bookingCardStyles.contactChip}>
                <Ionicons name={icon} size={14} color="#10B981" />
                <Text style={bookingCardStyles.contactChipText} numberOfLines={1}>{text}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      
      <View style={bookingCardStyles.footer}>
        <View style={bookingCardStyles.amountContainer}>
          <Text style={bookingCardStyles.amount}>₱{totalAmount}</Text>
          <Text style={bookingCardStyles.hourlyRate}>₱{hourlyRate || 300}/hr</Text>
        </View>
        
        <View style={bookingCardStyles.actionButtons}>
          <View style={bookingCardStyles.actionRow}>
            {booking.status === 'pending' && (
              <TouchableOpacity 
                style={bookingCardStyles.confirmButton}
                onPress={() => onConfirmBooking && onConfirmBooking(booking)}
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
          </View>

          <View style={bookingCardStyles.actionRow}>
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: '100%',
    gap: 6,
  },
  detailChipText: {
    fontSize: 13,
    color: '#1f2937',
    flexShrink: 1,
  },
  instructionsContainer: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f2937',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  instructionsText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  contactContainer: {
    marginBottom: 16,
  },
  contactChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
  },
  contactChipText: {
    fontSize: 13,
    color: '#047857',
    flexShrink: 1,
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
    flexDirection: 'column',
    gap: 8,
  },
  actionRow: {
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
    pending: 0,
    confirmed: 0,
    completed: 0
  };

  if (!Array.isArray(bookings)) return counts;

  bookings.forEach((booking) => {
    const status = normalizeStatus(booking?.status);
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

  const skeletonItems = useMemo(() => (
    loading ? Array.from({ length: 4 }).map((_, index) => `booking-skeleton-${index}`) : []
  ), [loading]);

  const renderBookingItem = ({ item, index }) => {
    if (loading) {
      return (
        <SkeletonCard key={`booking-skeleton-${index}`} style={styles.bookingsSkeletonCard}>
          <View style={styles.bookingsSkeletonHeader}>
            <SkeletonBlock width="55%" height={18} />
            <SkeletonPill width="28%" height={18} />
          </View>

          <View style={styles.bookingsSkeletonChipRow}>
            <SkeletonPill width="32%" height={14} />
            <SkeletonPill width="28%" height={14} />
            <SkeletonPill width="26%" height={14} />
          </View>

          <View style={styles.bookingsSkeletonBody}>
            <SkeletonBlock width="90%" height={14} />
            <SkeletonBlock width="85%" height={14} />
            <SkeletonBlock width="70%" height={14} />
          </View>

          <View style={styles.bookingsSkeletonFooter}>
            <SkeletonBlock width="35%" height={18} />
            <SkeletonPill width="28%" height={14} />
          </View>
        </SkeletonCard>
      );
    }

    return (
      <BookingCard
        booking={item}
        onMessageFamily={onMessageFamily}
        onConfirmBooking={onConfirmBooking}
        onViewDetails={onViewDetails}
      />
    );
  };

  const listData = loading ? skeletonItems : visibleBookings;

  return (
    <FlatList
      data={listData}
      keyExtractor={(item, index) => (loading ? `booking-skeleton-${index}` : String(item?.id || item?._id || index))}
      renderItem={renderBookingItem}
      style={styles.content}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshing={refreshing}
      onRefresh={onRefresh}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={(
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
                    style={[styles.bookingFilterTab, isActive && styles.activeBookingFilterTab]}
                    onPress={() => setActiveFilter(option.key)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.bookingFilterTabText, isActive && styles.activeBookingFilterTabText]}
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
        </View>
      )}
      ListEmptyComponent={!loading ? (
        <View style={styles.section}>
          <EmptyState
            icon="calendar"
            title="No bookings found"
            subtitle={
              activeFilter === 'all'
                ? 'Your bookings will appear here once available'
                : 'Try another tab to see more bookings'
            }
          />
        </View>
      ) : null}
      ListFooterComponent={!loading && visibleBookings.length > 0 ? <View style={{ height: 8 }} /> : null}
    />
  );
}
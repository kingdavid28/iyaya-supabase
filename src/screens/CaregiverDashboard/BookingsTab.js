import React from 'react';
import { ScrollView, View, Text, RefreshControl, ActivityIndicator } from 'react-native';
import { Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../shared/ui';
import { styles } from '../styles/CaregiverDashboard.styles';

const BookingCard = ({ booking }) => (
  <View style={bookingCardStyles.card}>
    <View style={bookingCardStyles.header}>
      <Text style={bookingCardStyles.familyName}>{booking.family || 'Family'}</Text>
      <Text style={bookingCardStyles.status}>{booking.status}</Text>
    </View>
    <Text style={bookingCardStyles.date}>{booking.date}</Text>
    <Text style={bookingCardStyles.time}>{booking.time}</Text>
    <Text style={bookingCardStyles.amount}>₱{booking.totalAmount}</Text>
  </View>
);

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
    marginBottom: 8,
  },
  familyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  status: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  date: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  time: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
};

export default function BookingsTab({ 
  bookings, 
  onBookingView, 
  onMessageFamily,
  refreshing = false,
  onRefresh,
  loading = false
}) {
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
          bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
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
  );
}
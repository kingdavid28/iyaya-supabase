import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import React, { useCallback, useMemo } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { styles } from '../styles/CaregiverDashboard.styles';
import { ensureString, formatPeso } from './utils';

const BookingCard = ({ booking, onMessage, onViewDetails, onConfirmAttendance }) => {
  const statusMeta = useMemo(() => {
    const status = String(booking?.status || '').toLowerCase();

    switch (status) {
      case 'pending':
        return { color: '#F59E0B', label: 'Pending' };
      case 'confirmed':
        return { color: '#10B981', label: 'Confirmed' };
      case 'completed':
        return { color: '#3B82F6', label: 'Completed' };
      case 'cancelled':
        return { color: '#EF4444', label: 'Cancelled' };
      default:
        return { color: '#6B7280', label: booking?.status || 'Unknown' };
    }
  }, [booking?.status]);

  const familyName = useMemo(
    () => ensureString(booking?.family, 'Family'),
    [booking?.family]
  );

  const bookingDateLabel = useMemo(
    () =>
      ensureString(
        booking?.date ? new Date(booking.date).toLocaleDateString() : null,
        'Date not specified'
      ),
    [booking?.date]
  );

  const statusLabel = useMemo(
    () => ensureString(booking?.status, 'Unknown'),
    [booking?.status]
  );

  const timeLabel = useMemo(
    () => ensureString(booking?.time, 'Time TBD'),
    [booking?.time]
  );

  const childrenLabel = useMemo(() => {
    const childrenCountNumeric = Number(booking?.children);
    const safeChildrenCount =
      Number.isFinite(childrenCountNumeric) && childrenCountNumeric > 0
        ? childrenCountNumeric
        : 1;
    return `${safeChildrenCount} ${safeChildrenCount === 1 ? 'child' : 'children'}`;
  }, [booking?.children]);

  const hourlyRateValue = booking?.hourlyRate ?? booking?.hourly_rate ?? null;
  const showHourlyRate =
    hourlyRateValue !== null && hourlyRateValue !== undefined && hourlyRateValue !== '';
  const hourlyLabel = useMemo(
    () => `${formatPeso(hourlyRateValue ?? 0)}/hr`,
    [hourlyRateValue]
  );

  const locationLabel = useMemo(
    () => ensureString(booking?.location, 'Location TBD'),
    [booking?.location]
  );

  const handleLocationPress = useCallback(() => {
    if (!booking?.location) return;

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      booking.location
    )}`;

    Linking.openURL(mapsUrl).catch((error) => {
      console.error('Error opening maps:', error);
      Alert.alert(
        'Error',
        'Could not open maps. Please check if you have a maps app installed.'
      );
    });
  }, [booking?.location]);

  const handleConfirmAttendance = useCallback(() => {
    if (!onConfirmAttendance) return;
    onConfirmAttendance(booking);
  }, [booking, onConfirmAttendance]);

  const handleMessage = useCallback(() => {
    if (!onMessage) return;
    onMessage(booking);
  }, [booking, onMessage]);

  const handleViewDetails = useCallback(() => {
    if (!onViewDetails) return;
    onViewDetails(booking);
  }, [booking, onViewDetails]);

  const shouldShowActions =
    booking?.status &&
    ['pending', 'confirmed'].includes(String(booking.status).toLowerCase());

  return (
    <View style={styles.bookingCard}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.bookingCardHeader}
      >
        <View style={styles.bookingCardHeaderContent}>
          <View style={styles.bookingCardTitleContainer}>
            <Text style={styles.bookingCardTitle} numberOfLines={1}>
              {familyName}
            </Text>
            <Text style={styles.bookingCardSubtitle}>{bookingDateLabel}</Text>
          </View>
          <View style={[styles.bookingStatusBadge, { backgroundColor: statusMeta.color }]}>
            <Text style={styles.bookingStatusText}>{statusLabel}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.bookingCardContent}>
        <View style={styles.bookingDetailsGrid}>
          <View style={styles.bookingDetailItem}>
            <Ionicons name="time" size={16} color="#3B82F6" />
            <Text style={styles.bookingDetailText}>{timeLabel}</Text>
          </View>

          <View style={styles.bookingDetailItem}>
            <Ionicons name="people" size={16} color="#10B981" />
            <Text style={styles.bookingDetailText}>{childrenLabel}</Text>
          </View>

          {showHourlyRate ? (
            <View style={styles.hourlyRateItem}>
              <Ionicons name="cash" size={16} color="#059669" />
              <Text style={styles.hourlyRateText}>{hourlyLabel}</Text>
            </View>
          ) : null}
        </View>

        {booking?.location ? (
          <Pressable onPress={handleLocationPress} style={styles.locationContainer}>
            <Ionicons name="location" size={18} color="#7C3AED" />
            <Text style={styles.locationText} numberOfLines={1}>
              {locationLabel}
            </Text>
            <Ionicons name="open-outline" size={16} color="#7C3AED" />
          </Pressable>
        ) : null}

        {typeof onViewDetails === 'function' ? (
          <Pressable onPress={handleViewDetails} style={styles.detailsButton}>
            <Text style={styles.detailsButtonText}>View Details</Text>
          </Pressable>
        ) : null}

        {shouldShowActions ? (
          <View style={styles.bookingActions}>
            {String(booking.status).toLowerCase() === 'pending' && (
              <Pressable onPress={handleConfirmAttendance} style={styles.confirmButton}>
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </Pressable>
            )}

            {String(booking.status).toLowerCase() === 'confirmed' && (
              <Pressable onPress={handleMessage} style={styles.messageButton}>
                <Text style={styles.messageButtonText}>Message</Text>
              </Pressable>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
};

export default BookingCard;
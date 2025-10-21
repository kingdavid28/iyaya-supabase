import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';

const BookingItem = ({
  booking,
  user,
  onCancelBooking,
  onUploadPayment,
  onViewBookingDetails,
  onWriteReview,
  onMessageCaregiver,
  onCallCaregiver
}) => {
  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'No date';
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

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
      case 'pending':
      case 'pending_confirmation':
      case 'awaiting_payment':
        return '#F59E0B';
      case 'confirmed':
      case 'in_progress':
        return '#10B981';
      case 'completed':
      case 'paid':
        return '#3B82F6';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#9CA3AF';
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'pending_confirmation':
      case 'awaiting_payment':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'paid':
        return 'Paid';
      default:
        return status || 'Unknown';
    }
  };

  const canCancelBooking = (status) => {
    const lowerStatus = status?.toLowerCase();
    // Allow cancellation for pending, awaiting_payment, and confirmed bookings
    return ['pending', 'pending_confirmation', 'awaiting_payment', 'confirmed'].includes(lowerStatus);
  };

  const caregiverData = user || booking?.caregiver || booking?.caregiverId || booking?.assignedCaregiver || null;
  const caregiverIdValue = caregiverData?._id || caregiverData?.id || caregiverData?.caregiver_id || booking?.caregiver_id;

  // Debug logging for booking status
  console.log('🔍 BookingItem Debug:', {
    bookingId: booking?.id || booking?._id,
    status: booking?.status,
    canCancel: canCancelBooking(booking?.status),
    statusLower: booking?.status?.toLowerCase()
  });

  const handleLocationPress = () => {
    const address = booking?.address || booking?.location;
    if (!address) {
      Alert.alert('No Address', 'Location information is not available');
      return;
    }

    const encodedAddress = encodeURIComponent(address);
    const url = Platform.select({
      ios: `maps://app?q=${encodedAddress}`,
      android: `geo:0,0?q=${encodedAddress}`,
    });

    Alert.alert(
      'Open Location',
      `Open ${address} in maps?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Maps',
          onPress: () => {
            Linking.openURL(url).catch(() => {
              const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
              Linking.openURL(fallbackUrl);
            });
          }
        }
      ]
    );
  };

  const handleMessagePress = () => {
    console.log('🔍 BookingItem - Message button pressed');
    console.log('🔍 BookingItem - User data:', user);
    console.log('🔍 BookingItem - Booking data:', booking);
    
    if (!onMessageCaregiver) {
      console.warn('⚠️ BookingItem - onMessageCaregiver not provided');
      return;
    }
    
    // Extract caregiver info from user prop or booking data
    if (!caregiverData) {
      console.warn('⚠️ BookingItem - No caregiver data available');
      Alert.alert('Error', 'Caregiver information not available');
      return;
    }
    
    // Create normalized caregiver object
    const normalizedCaregiver = {
      _id: caregiverData._id || caregiverData.id || caregiverData.caregiver_id,
      id: caregiverData.id || caregiverData._id || caregiverData.caregiver_id,
      name: caregiverData.name || caregiverData.caregiver_name || 'Caregiver',
      avatar: caregiverData.avatar || caregiverData.profileImage || caregiverData.profile_image
    };
    
    console.log('🔍 BookingItem - Normalized caregiver:', normalizedCaregiver);
    
    if (!normalizedCaregiver._id && !normalizedCaregiver.id) {
      console.warn('⚠️ BookingItem - No valid caregiver ID found');
      Alert.alert('Error', 'Caregiver ID not available');
      return;
    }
    
    onMessageCaregiver(normalizedCaregiver);
  };



  const caregiverName = caregiverData?.name || caregiverData?.caregiver_name || booking?.caregiver_name || 'Unknown Caregiver';
  const caregiverImage = caregiverData?.profileImage || caregiverData?.avatar || caregiverData?.profile_image;
  const bookingDate = formatDate(booking?.date);
  const startTime = formatTime(booking?.start_time || booking?.startTime);
  const endTime = formatTime(booking?.end_time || booking?.endTime);
  const timeDisplay = booking?.time || (startTime && endTime ? `${startTime} - ${endTime}` : '');
  const totalAmount = booking?.total_amount || booking?.totalAmount || booking?.totalCost || 0;
  const address = booking?.address || booking?.location;

  return (
    <View style={styles.container}>
      {/* Header with parent theme gradient */}
      <LinearGradient
        colors={['#ebc5dd', '#ccc8e8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.caregiverInfo}>
            <View style={styles.avatar}>
              {caregiverImage ? (
                <Image
                  source={{ uri: caregiverImage }}
                  style={styles.avatar}
                  onError={() => console.log('Avatar failed to load')}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={24} color="#9CA3AF" />
                </View>
              )}
            </View>
            <View style={styles.caregiverDetails}>
              <Text style={styles.caregiverName}>{caregiverName}</Text>
              <Text style={styles.bookingDate}>{bookingDate}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking?.status) }]}>
            <Text style={styles.statusText}>{getStatusText(booking?.status)}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Booking Details */}
      <View style={styles.content}>
        {/* Time and Rate Info */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText}>{timeDisplay || 'Time TBD'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="cash-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText}>₱{totalAmount} (₱{booking?.hourly_rate || booking?.hourlyRate || 300}/hr)</Text>
          </View>
        </View>

        {/* Location */}
        {address && (
          <TouchableOpacity style={styles.locationContainer} onPress={handleLocationPress}>
            <View style={styles.locationContent}>
              <Ionicons name="location-outline" size={16} color="#8B5CF6" />
              <Text style={styles.locationText} numberOfLines={2}>{address}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#8B5CF6" />
          </TouchableOpacity>
        )}

        {/* Children Info with Names */}
        {booking?.selected_children && booking.selected_children.length > 0 && (
          <View style={styles.childrenContainer}>
            <Ionicons name="people-outline" size={16} color="#6B7280" />
            <View style={styles.childrenInfo}>
              <Text style={styles.childrenCount}>
                {booking.selected_children.length} {booking.selected_children.length === 1 ? 'child' : 'children'}
              </Text>
              {booking.selected_children.slice(0, 3).map((child, index) => (
                <Text key={index} style={styles.childName}>
                  {typeof child === 'string' ? child : child.name || `Child ${index + 1}`}
                </Text>
              ))}
              {booking.selected_children.length > 3 && (
                <Text style={styles.moreChildren}>+{booking.selected_children.length - 3} more</Text>
              )}
            </View>
          </View>
        )}

        {/* Special Instructions */}
        {booking?.special_instructions && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Special Instructions:</Text>
            <Text style={styles.notesText} numberOfLines={2}>
              {booking.special_instructions}
            </Text>
          </View>
        )}

        {/* Contact Information */}
        {(booking?.contact_phone || booking?.emergency_contact) && (
          <View style={styles.contactContainer}>
            {booking?.contact_phone && (
              <View style={styles.contactRow}>
                <Ionicons name="call-outline" size={16} color="#6B7280" />
                <Text style={styles.contactText}>{booking.contact_phone}</Text>
              </View>
            )}
            {booking?.emergency_contact && (
              <View style={styles.emergencyContactRow}>
                <Ionicons name="warning-outline" size={16} color="#EF4444" />
                <Text style={styles.emergencyContactText}>Emergency: {booking.emergency_contact}</Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.detailsButton} 
            onPress={() => onViewBookingDetails && onViewBookingDetails(booking?.id || booking?._id)}
          >
            <Ionicons name="eye-outline" size={18} color="#FFFFFF" />
            <Text style={styles.buttonText}>Details</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.messageButton} onPress={handleMessagePress}>
            <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
            <Text style={styles.buttonText}>Message</Text>
          </TouchableOpacity>
          
          {canCancelBooking(booking?.status) && (
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => {
                console.log('🔍 Cancel button pressed for booking:', booking?.id || booking?._id, 'status:', booking?.status);
                if (onCancelBooking) {
                  onCancelBooking(booking?.id || booking?._id);
                } else {
                  console.warn('⚠️ onCancelBooking function not provided');
                  Alert.alert('Error', 'Cancel functionality not available');
                }
              }}
            >
              <Ionicons name="close-outline" size={18} color="#FFFFFF" />
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          )}
          {typeof onWriteReview === 'function' && caregiverIdValue && (booking?.status || '').toLowerCase() === 'completed' && (
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => onWriteReview({
                bookingId: booking?.id || booking?._id,
                caregiverId: caregiverIdValue,
                caregiverName,
                booking
              })}
            >
              <Ionicons name="star-outline" size={18} color="#FFFFFF" />
              <Text style={styles.buttonText}>Review</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  caregiverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  caregiverDetails: {
    flex: 1,
  },
  caregiverName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  bookingDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 0.48,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginLeft: 6,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F0FF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  childrenContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  childrenInfo: {
    marginLeft: 8,
    flex: 1,
  },
  childrenCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  childName: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 2,
    paddingLeft: 8,
  },
  moreChildren: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    paddingLeft: 8,
  },
  contactContainer: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  contactText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    fontWeight: '500',
  },
  emergencyContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  emergencyContactText: {
    fontSize: 13,
    color: '#EF4444',
    marginLeft: 8,
    fontWeight: '600',
  },
  notesContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  detailsButton: {
    backgroundColor: '#6B7280',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
    shadowColor: '#6B7280',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  messageButton: {
    backgroundColor: '#db2777',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
    shadowColor: '#db2777',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  cancelButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewButton: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default BookingItem;
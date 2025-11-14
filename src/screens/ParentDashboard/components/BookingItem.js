import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import {
  Alert,
  Image,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { getPaymentActions } from '../../../utils/paymentUtils';

const PARENT_HEADER_GRADIENT = ['#ca85b1ff', '#a094f2ff'];

const BookingItem = ({
  booking,
  user,
  onCancelBooking,
  onUploadPayment,
  onViewBookingDetails,
  onWriteReview,
  onMessageCaregiver,
  onCallCaregiver,
  onOpenContract,
  onCreateContract,
  contract: contractProp
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

  const caregiverData = booking.caregiver || booking.caregiverProfile || booking.assignedCaregiver;
  const caregiver = {
    ...(typeof caregiverData === 'object' && caregiverData !== null ? caregiverData : {}),
    _id: caregiverData?.id || caregiverData?._id || booking.caregiver_id || booking.caregiverId,
    allowDirectMessages: caregiverData?.allowDirectMessages ?? caregiverData?.privacySettings?.allowDirectMessages ?? true,
    showRatings: caregiverData?.showRatings ?? caregiverData?.privacySettings?.showRatings ?? true,
  };

  const caregiverIdValue =
    caregiver?._id ||
    caregiver?.id ||
    caregiverData?.id ||
    caregiverData?._id ||
    caregiverData?.caregiver_id ||
    caregiverData?.caregiverId ||
    booking?.caregiver_id ||
    booking?.caregiverId ||
    null;

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
    const resolveAllowDirectMessages = (value) => {
      if (value === false || value === 0) return false;
      if (value === true || value === 1) return true;
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['false', '0', 'off', 'no'].includes(normalized)) return false;
        if (['true', '1', 'on', 'yes'].includes(normalized)) return true;
      }
      return undefined;
    };

    const allowDirectMessages =
      resolveAllowDirectMessages(caregiverData?.allowDirectMessages) ??
      resolveAllowDirectMessages(caregiverData?.privacySettings?.allowDirectMessages) ??
      resolveAllowDirectMessages(caregiverData?.privacySettings?.allow_direct_messages) ??
      resolveAllowDirectMessages(caregiver?.allowDirectMessages) ??
      true;

    const normalizedCaregiver = {
      _id: caregiverData._id || caregiverData.id || caregiverData.caregiver_id,
      id: caregiverData.id || caregiverData._id || caregiverData.caregiver_id,
      name: caregiverData.name || caregiverData.caregiver_name || 'Caregiver',
      avatar: caregiverData.avatar || caregiverData.profileImage || caregiverData.profile_image,
      allowDirectMessages,
      privacySettings: caregiverData?.privacySettings || caregiver?.privacySettings,
    };

    console.log('🔍 BookingItem - Normalized caregiver:', normalizedCaregiver);

    if (!normalizedCaregiver._id && !normalizedCaregiver.id) {
      console.warn('⚠️ BookingItem - No valid caregiver ID found');
      Alert.alert('Error', 'Caregiver ID not available');
      return;
    }

    onMessageCaregiver(normalizedCaregiver);
  };



  const formatCurrency = (value) => {
    const numericValue = typeof value === 'number' ? value : Number(String(value || '').replace(/[^0-9.]/g, ''));

    if (!Number.isFinite(numericValue)) {
      return '₱0.00';
    }

    return `₱${numericValue.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const contract = useMemo(() => contractProp || booking?.contract || booking?.latestContract || null, [contractProp, booking?.contract, booking?.latestContract]);
  const supersededBy = contract?.metadata?.supersededBy || contract?.metadata?.superseded_by;
  const isSuperseded = Boolean(supersededBy);
  const isActiveContract = String(contract?.status || '').toLowerCase() === 'active';
  const caregiverName = caregiverData?.name || caregiverData?.caregiver_name || booking?.caregiver_name || 'Unknown Caregiver';
  const caregiverImage = caregiverData?.profileImage || caregiverData?.avatar || caregiverData?.profile_image;
  const bookingDate = formatDate(booking?.date);
  const startTime = formatTime(booking?.start_time || booking?.startTime);
  const endTime = formatTime(booking?.end_time || booking?.endTime);
  const timeDisplay = booking?.time || (startTime && endTime ? `${startTime} - ${endTime}` : '');
  const normalizedTotalAmount = booking?.totalCost ?? booking?.total_amount ?? booking?.amount ?? booking?.totalAmount ?? 0;
  const totalAmount = formatCurrency(normalizedTotalAmount);
  const hourlyRate = booking?.hourly_rate || booking?.hourlyRate || 300;
  const depositAmountValue = Number(normalizedTotalAmount) > 0 ? Number(normalizedTotalAmount) * 0.2 : 0;
  const depositAmount = formatCurrency(depositAmountValue);
  const address = booking?.address || booking?.location;
  const normalizedStatus = String(booking?.status || '').toLowerCase();
  const isDepositPaid = Boolean(booking?.deposit_paid || booking?.depositPaidAt || booking?.deposit_paid_at);
  const isFinalPaid = normalizedStatus === 'paid' || String(booking?.payment_status || '').toLowerCase() === 'paid';
  const paymentAction = (() => {
    if (!booking?.status) return null;
    const normalizedTotal = booking?.totalCost ?? booking?.total_amount ?? booking?.amount ?? normalizedTotalAmount;
    const actions = getPaymentActions({ status: booking.status, totalCost: normalizedTotal });
    return actions?.[0] || null;
  })();

  const contractStatusCopy = useMemo(() => {
    if (!contract) {
      return {
        label: 'No contract yet',
        action: 'Create contract',
        intent: 'primary',
        actionable: Boolean(onCreateContract)
      };
    }

    const status = String(contract.status || '').toLowerCase();
    switch (status) {
      case 'draft':
        return { label: 'Draft contract ready', action: 'Review contract', intent: 'primary', actionable: true };
      case 'sent':
        return { label: 'Awaiting signatures', action: 'Review contract', intent: 'primary', actionable: true };
      case 'signed_parent':
        return { label: 'Signed by you', action: 'Await caregiver', intent: 'neutral', actionable: true };
      case 'signed_caregiver':
        return { label: 'Caregiver signed', action: 'Sign now', intent: 'primary', actionable: true };
      case 'active':
        return { label: 'Contract active', action: 'View contract', intent: 'success', actionable: true };
      case 'completed':
        return { label: 'Contract completed', action: 'View contract', intent: 'neutral', actionable: true };
      case 'cancelled':
        return { label: 'Contract cancelled', action: 'View contract', intent: 'neutral', actionable: true };
      default:
        return { label: `Status: ${contract.status}`, action: 'View contract', intent: 'neutral', actionable: true };
    }
  }, [contract, onCreateContract]);

  const handleContractPress = () => {
    if (!contract) {
      // No contract exists, create new one
      if (onCreateContract) {
        onCreateContract(booking);
      }
    } else {
      // Contract exists, open for review
      if (onOpenContract) {
        onOpenContract(booking, contract);
      }
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={PARENT_HEADER_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.caregiverInfo}>
            <View style={styles.avatarWrapper}>
              {caregiverImage ? (
                <Image
                  source={{ uri: caregiverImage }}
                  style={styles.avatarImage}
                  onError={() => console.log('Avatar failed to load')}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Ionicons name="person" size={28} color="#FFFFFF" />
                </View>
              )}
            </View>
            <View style={styles.caregiverDetails}>
              <Text style={styles.caregiverName}>{caregiverName}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.metaText}>{bookingDate}</Text>
              </View>
              {timeDisplay ? (
                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.metaText}>{timeDisplay}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              { borderColor: 'rgba(255,255,255,0.45)' }
            ]}
          >
            <Text style={styles.statusText}>{getStatusText(booking?.status)}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.amountRow}>
          <View>
            <Text style={styles.sectionLabel}>Total amount</Text>
            <Text style={styles.amountValue}>{totalAmount}</Text>
          </View>
          <View>
            <Text style={styles.sectionLabel}>Hourly rate</Text>
            <Text style={styles.amountValue}>₱{hourlyRate}</Text>
          </View>
        </View>

        {depositAmountValue > 0 && (
          <View style={styles.depositSection}>
            <View style={styles.depositBadge}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#0EA5E9" />
              <Text style={styles.depositBadgeText}>20% deposit</Text>
            </View>
            <Text style={styles.depositAmount}>{depositAmount}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.contractRow, styles[`contractRow_${contractStatusCopy.intent}`]]}
          activeOpacity={contractStatusCopy.actionable ? 0.7 : 1}
          onPress={contractStatusCopy.actionable ? handleContractPress : undefined}
          disabled={!contractStatusCopy.actionable}
        >
          <View style={styles.contractRowLeft}>
            <View style={styles.contractIconWrapper}>
              <Ionicons
                name={contract ? 'document-text-outline' : 'document-outline'}
                size={20}
                color={contractStatusCopy.intent === 'primary' ? '#3B82F6' :
                  contractStatusCopy.intent === 'success' ? '#10B981' :
                    contractStatusCopy.intent === 'neutral' ? '#6B7280' : '#4338CA'}
              />
            </View>
            <View style={styles.contractInfo}>
              {contract && (isActiveContract || isSuperseded) && (
                <View
                  style={[
                    styles.contractStatusBadge,
                    isActiveContract && styles.contractStatusBadge_active,
                    isSuperseded && styles.contractStatusBadge_replaced
                  ]}
                >
                  <Text style={styles.contractStatusBadgeText}>
                    {isSuperseded ? 'Replaced contract' : 'Active contract'}
                  </Text>
                </View>
              )}
              <Text style={styles.contractTitle}>{contractStatusCopy.label}</Text>
              <Text style={styles.contractSubtitle} numberOfLines={1}>
                {contract ? `Version ${contract.version || 1}` : 'Tap to start a contract'}
              </Text>
            </View>
          </View>
          <View style={styles.contractAction}>
            <Text style={[styles.contractActionText, !contractStatusCopy.actionable && styles.contractActionTextDisabled]}>
              {contractStatusCopy.action}
            </Text>
            {contractStatusCopy.actionable && (
              <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
            )}
          </View>
        </TouchableOpacity>

        {address ? (
          <TouchableOpacity style={styles.locationContainer} onPress={handleLocationPress}>
            <View style={styles.locationContent}>
              <Ionicons name="location-outline" size={16} color="#7C3AED" />
              <Text style={styles.locationText} numberOfLines={2}>{address}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#7C3AED" />
          </TouchableOpacity>
        ) : null}

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

        {booking?.special_instructions ? (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Special instructions</Text>
            <Text style={styles.notesText} numberOfLines={2}>
              {booking.special_instructions}
            </Text>
          </View>
        ) : null}

        {(booking?.contact_phone || booking?.emergency_contact) ? (
          <View style={styles.contactContainer}>
            {booking?.contact_phone ? (
              <View style={styles.contactRow}>
                <Ionicons name="call-outline" size={16} color="#6B7280" />
                <Text style={styles.contactText}>{booking.contact_phone}</Text>
              </View>
            ) : null}
            {booking?.emergency_contact ? (
              <View style={styles.emergencyContactRow}>
                <Ionicons name="warning-outline" size={16} color="#EF4444" />
                <Text style={styles.emergencyContactText}>Emergency: {booking.emergency_contact}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Primary Actions - Always visible */}
        <View style={styles.primaryActions}>
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => onViewBookingDetails && onViewBookingDetails(booking?.id || booking?._id)}
            accessibilityLabel="View booking details"
            accessibilityRole="button"
          >
            <Ionicons name="eye-outline" size={18} color="#FFFFFF" />
            <Text style={styles.viewDetailsButtonText}>View Details</Text>
          </TouchableOpacity>

          {onMessageCaregiver && (
            <TouchableOpacity
              style={[
                styles.messageButton,
                caregiver.allowDirectMessages === false && styles.messageButtonDisabled,
              ]}
              onPress={caregiver.allowDirectMessages === false ? undefined : () => onMessageCaregiver(caregiver)}
              accessibilityState={{ disabled: caregiver.allowDirectMessages === false }}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
              <Text style={[styles.messageButtonText, caregiver.allowDirectMessages === false && styles.messageButtonTextDisabled]}>
                Message
              </Text>
            </TouchableOpacity>
          )}

          {caregiverData?.phone && (
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => onCallCaregiver && onCallCaregiver(caregiverData)}
              accessibilityLabel={`Call ${caregiverName}`}
              accessibilityRole="button"
              accessibilityHint="Opens phone dialer"
            >
              <Ionicons name="call-outline" size={18} color="#FFFFFF" />
              <Text style={styles.callButtonText}>Call</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Secondary Actions - Context dependent */}
        <View style={styles.secondaryActions}>
          {typeof onWriteReview === 'function' && caregiverIdValue && normalizedStatus === 'completed' && (
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => onWriteReview({
                bookingId: booking?.id || booking?._id,
                caregiverId: caregiverIdValue,
                caregiverName,
                booking
              })}
              accessibilityLabel="Write a review for this caregiver"
              accessibilityRole="button"
            >
              <Ionicons name="star-outline" size={18} color="#FFFFFF" />
              <Text style={styles.reviewButtonText}>Write Review</Text>
            </TouchableOpacity>
          )}

          {paymentAction && typeof onUploadPayment === 'function' && (
            (() => {
              if (paymentAction.type === 'deposit' && isDepositPaid) return null;
              if (paymentAction.type === 'final_payment' && isFinalPaid) return null;
              return (
                <TouchableOpacity
                  style={styles.paymentButton}
                  onPress={() => onUploadPayment(booking?.id || booking?._id, paymentAction.type)}
                  accessibilityLabel={`${paymentAction.label} for this booking`}
                  accessibilityRole="button"
                >
                  <Ionicons name="card-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.paymentButtonText}>{paymentAction.label}</Text>
                </TouchableOpacity>
              );
            })()
          )}

          {(!paymentAction || (paymentAction.type === 'deposit' && isDepositPaid) || (paymentAction.type === 'final_payment' && isFinalPaid)) && (
            <View style={styles.paymentStatusButton}>
              <Ionicons name="checkmark-done-outline" size={18} color="#FFFFFF" />
              <Text style={styles.paymentStatusText}>Payment Complete</Text>
            </View>
          )}

          {canCancelBooking(booking?.status) && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                if (onCancelBooking) {
                  onCancelBooking(booking?.id || booking?._id);
                } else {
                  Alert.alert('Error', 'Cancel functionality not available');
                }
              }}
              accessibilityLabel="Cancel this booking"
              accessibilityRole="button"
              accessibilityHint="This action cannot be undone"
            >
              <Ionicons name="close-outline" size={18} color="#FFFFFF" />
              <Text style={styles.cancelButtonText}>Cancel Booking</Text>
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
    borderRadius: 20,
    marginHorizontal: 1,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 14,
    paddingVertical: 12,
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
  avatarWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginRight: 14,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  caregiverDetails: {
    flex: 1,
  },
  caregiverName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    marginLeft: 6,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginLeft: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 5,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '600',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  depositSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  depositBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  depositBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0EA5E9',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  depositAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0369A1',
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
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  primaryActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 1,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 1,
    flexWrap: 'wrap',
  },
  viewDetailsButton: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#6B7280',
    shadowColor: '#6B7280',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  viewDetailsButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  messageButton: {
    flex: 1,
    minWidth: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  messageButtonDisabled: {
    borderColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
  },
  messageButtonTextDisabled: {
    color: '#9CA3AF',
  },
  callButton: {
    flex: 1,
    minWidth: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  reviewButton: {
    flex: 1,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  paymentButton: {
    flex: 1,
    minWidth: 110,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 2,
  },
  paymentStatusButton: {
    flex: 1,
    minWidth: 130,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 5,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentStatusText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 2,
  },
  cancelButton: {
    flex: 1,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 5,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 2,
  },
  contractRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contractRow_primary: {
    backgroundColor: '#F0F9FF',
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.1,
  },
  contractRow_neutral: {
    backgroundColor: '#F8FAFC',
    borderColor: '#6B7280',
  },
  contractRow_success: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.1,
  },
  contractRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contractIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contractInfo: {
    flex: 1,
  },
  contractStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 4,
  },
  contractStatusBadge_active: {
    backgroundColor: '#DCFCE7',
  },
  contractStatusBadge_replaced: {
    backgroundColor: '#FEF3C7',
  },
  contractStatusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
  },
  contractTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  contractSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 16,
  },
  contractAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contractActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3B82F6',
  },
  contractActionTextDisabled: {
    color: '#9CA3AF',
  },
});

export default BookingItem;
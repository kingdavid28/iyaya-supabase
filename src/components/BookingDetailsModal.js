import React, { useMemo } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, Linking, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import PropTypes from 'prop-types';

const formatTime = (timeString) => {
  if (!timeString) return '';
  try {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    if (Number.isNaN(hour)) return timeString;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes ?? '00'} ${ampm}`;
  } catch (error) {
    return timeString;
  }
};

const formatDateDisplay = (dateString) => {
  if (!dateString) return 'Date TBD';
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    return dateString;
  }
};

const formatDateTimeDisplay = (value) => {
  if (!value) return 'N/A';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    return value;
  }
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '₱0';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return `₱${value}`;
  return `₱${numeric.toLocaleString(undefined, {
    minimumFractionDigits: numeric % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
};

const parseTimeToMinutes = (value) => {
  if (!value || typeof value !== 'string') return null;
  const [hoursStr, minutesStr] = value.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const calculateDurationHours = (start, end) => {
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  if (startMinutes === null || endMinutes === null) return null;
  let diff = endMinutes - startMinutes;
  if (diff < 0) diff += 24 * 60;
  return Math.round((diff / 60) * 100) / 100;
};

const formatDuration = (value) => {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (typeof value === 'number') {
    return `${value} ${value === 1 ? 'hour' : 'hours'}`;
  }
  return String(value);
};

const getInitials = (name = '') => {
  if (!name) return 'CG';
  const parts = name.trim().split(' ').filter(Boolean);
  if (!parts.length) return 'CG';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return '#f59e0b';
    case 'confirmed':
      return '#10b981';
    case 'completed':
      return '#3b82f6';
    case 'cancelled':
      return '#ef4444';
    default:
      return '#9ca3af';
  }
};

const normalizeChildren = (booking) => {
  const children =
    booking?.selected_children ||
    booking?.selectedChildren ||
    booking?.childrenDetails ||
    booking?.children ||
    booking?.kids ||
    [];

  if (!Array.isArray(children)) return [];

  return children.map((child, index) => {
    if (typeof child === 'string') {
      return { id: index, name: child };
    }

    const childData = child?.child || child;

    return {
      id: childData?.id || index,
      name: childData?.name || child?.name || child?.childName || `Child ${index + 1}`,
      age: childData?.age || child?.age || child?.childAge,
      preferences: childData?.preferences || child?.preferences || child?.childPreferences,
      allergies: childData?.allergies || child?.allergies || child?.childAllergies,
      specialNeeds:
        childData?.special_needs ||
        child?.special_needs ||
        child?.specialNeeds ||
        child?.special_needs_description,
      specialInstructions:
        childData?.specialInstructions ||
        child?.specialInstructions ||
        child?.special_instructions ||
        child?.notes,
    };
  });
};

const extractSpecialInstructions = (booking) =>
  booking?.special_instructions ||
  booking?.specialInstructions ||
  booking?.notes ||
  booking?.instructions ||
  booking?.additional_notes ||
  booking?.parent_notes ||
  null;

const extractEmergencyContact = (booking) => {
  const emergency = booking?.emergency_contact || booking?.emergencyContact;

  if (!emergency) {
    return {
      name: null,
      phone: booking?.emergency_phone || booking?.emergency_contact_phone || null,
      relationship: booking?.emergency_contact_relationship || null,
    };
  }

  if (typeof emergency === 'string') {
    return {
      name: emergency,
      phone: booking?.emergency_phone || booking?.emergency_contact_phone || null,
      relationship: booking?.emergency_contact_relationship || null,
    };
  }

  return {
    name: emergency.name || emergency.contact_name || null,
    phone: emergency.phone || emergency.phone_number || null,
    relationship: emergency.relationship || emergency.relation || null,
  };
};

const extractRequirements = (booking) => {
  const requirementSources = [
    booking?.requirements,
    booking?.skills,
    booking?.job?.requirements,
    booking?.job?.preferredSkills,
  ];

  const collected = requirementSources
    .flatMap(item => (Array.isArray(item) ? item : []))
    .filter(Boolean);

  return Array.from(new Set(collected));
};

const enhanceBooking = (booking) => {
  if (!booking) return null;

  const caregiver =
    booking?.caregiver ||
    booking?.caregiverId ||
    booking?.caregiver_info ||
    booking?.job?.caregiver ||
    {};

  const parent = booking?.parent || booking?.clientId || booking?.family_details || {};

  const date = booking?.date || booking?.scheduled_date || booking?.booking_date;
  const startTime = booking?.start_time || booking?.startTime;
  const endTime = booking?.end_time || booking?.endTime;
  const duration = booking?.duration ?? calculateDurationHours(startTime, endTime);

  const timeDisplay = booking?.time || (startTime && endTime ? `${formatTime(startTime)} - ${formatTime(endTime)}` : 'Time TBD');

  const totalAmount =
    booking?.total_amount ||
    booking?.totalAmount ||
    booking?.totalCost ||
    booking?.summary?.totalAmount ||
    0;

  const hourlyRate =
    booking?.hourly_rate ||
    booking?.hourlyRate ||
    booking?.summary?.hourlyRate ||
    booking?.job?.hourlyRate ||
    caregiver?.hourlyRate ||
    caregiver?.rate ||
    0;

  const address = booking?.address || booking?.location || booking?.job?.location || null;

  return {
    id: booking?.id,
    status: booking?.status || 'pending',
    parentName: booking?.parent_name || parent?.name || booking?.family || booking?.client_name || 'Family Booking',
    caregiverName: caregiver?.name || caregiver?.full_name || booking?.caregiver_name || 'Caregiver',
    caregiverProfileImage:
      caregiver?.profileImage ||
      caregiver?.profile_image ||
      caregiver?.avatar ||
      booking?.caregiver_profile_image ||
      booking?.caregiver_avatar ||
      null,
    caregiverContact: {
      phone:
        caregiver?.phone ||
        caregiver?.contactNumber ||
        caregiver?.phone_number ||
        booking?.caregiver_phone ||
        null,
      email: caregiver?.email || booking?.caregiver_email || null,
    },
    contactPhone: booking?.contact_phone || parent?.phone || booking?.parent_phone || null,
    contactEmail: booking?.parent_email || parent?.email || booking?.client_email || null,
    date,
    formattedDate: formatDateDisplay(date),
    startTime,
    endTime,
    duration,
    formattedDuration: formatDuration(duration),
    timeDisplay,
    totalAmount,
    hourlyRate,
    address,
    locationLabel: booking?.job?.location_name || booking?.job?.city || null,
    childrenDetails: normalizeChildren(booking),
    specialInstructions: extractSpecialInstructions(booking),
    emergencyContact: extractEmergencyContact(booking),
    requirements: extractRequirements(booking),
    additionalNotes:
      booking?.additional_notes ||
      booking?.parent_notes ||
      booking?.caregiver_notes ||
      null,
    createdAt: booking?.created_at || booking?.createdAt || null,
    confirmedAt: booking?.confirmed_at || booking?.accepted_at || null,
    completedAt: booking?.completed_at || booking?.finished_at || null,
  };
};

const BookingDetailsModal = ({
  visible,
  onClose,
  booking,
  onMessage,
  onGetDirections,
  onCompleteBooking,
  onCancelBooking,
  showFooterActions = true,
  colors = ['#ebc5dd', '#ccc8e8']
}) => {
  if (!booking) return null;

  const enhancedBooking = useMemo(() => enhanceBooking(booking), [booking]);

  if (!enhancedBooking) return null;

  const statusColor = getStatusColor(enhancedBooking.status);
  const statusLower = (enhancedBooking.status || '').toLowerCase();
  const caregiverInitials = getInitials(enhancedBooking.caregiverName);
  const formattedHourlyRate = formatCurrency(enhancedBooking.hourlyRate);
  const formattedTotalAmount = formatCurrency(enhancedBooking.totalAmount);

  const handlePhonePress = (phoneNumber) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const handleEmailPress = (email) => {
    if (email) {
      Linking.openURL(`mailto:${email}`);
    }
  };

  const handleDirectionsPress = () => {
    if (enhancedBooking.address) {
      Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(enhancedBooking.address)}`);
      onGetDirections?.();
    }
  };

  const shouldShowFooter =
    showFooterActions && (onMessage || onGetDirections || onCompleteBooking || onCancelBooking);

  const sharedColors = {
    primary: colors[0] || '#ebc5dd',
    secondary: colors[1] || colors[0] || '#ccc8e8',
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>Booking Details</Text>
                <Text style={styles.headerSubtitle}>{enhancedBooking.parentName}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{enhancedBooking.status?.toUpperCase() || 'PENDING'}</Text>
            </View>
          </LinearGradient>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Caregiver Information</Text>
              <View style={styles.caregiverInfoCard}>
                <View style={styles.caregiverHeader}>
                  <View style={styles.caregiverAvatar}>
                    {enhancedBooking.caregiverProfileImage ? (
                      <Image
                        source={{ uri: enhancedBooking.caregiverProfileImage }}
                        style={styles.caregiverAvatarImage}
                      />
                    ) : (
                      <Text style={styles.caregiverInitials}>{caregiverInitials}</Text>
                    )}
                  </View>
                  <View style={styles.caregiverDetails}>
                    <Text style={styles.caregiverName}>{enhancedBooking.caregiverName}</Text>
                    <Text style={[styles.caregiverRate, { color: sharedColors.primary }]}>{`${formattedHourlyRate}/hour`}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Schedule Details</Text>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Ionicons name="calendar" size={20} color={sharedColors.primary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Date</Text>
                    <Text style={styles.infoValue}>{enhancedBooking.formattedDate}</Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <Ionicons name="time" size={20} color={sharedColors.primary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Time Range</Text>
                    <Text style={styles.infoValue}>{enhancedBooking.timeDisplay}</Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <Ionicons name="hourglass" size={20} color={sharedColors.primary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Duration</Text>
                    <Text style={styles.infoValue}>{enhancedBooking.formattedDuration}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cost Breakdown</Text>
              <View style={styles.costBreakdownCard}>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Hourly Rate</Text>
                  <Text style={styles.costValue}>{formattedHourlyRate}</Text>
                </View>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Duration</Text>
                  <Text style={styles.costValue}>{enhancedBooking.formattedDuration}</Text>
                </View>
                <View style={[styles.costRow, styles.totalCostRow]}>
                  <Text style={styles.totalCostLabel}>Total Amount</Text>
                  <Text style={styles.totalCostValue}>{formattedTotalAmount}</Text>
                </View>
              </View>
            </View>

            {enhancedBooking.address && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Location</Text>
                <View style={styles.locationCard}>
                  <Ionicons name="location" size={20} color="#ef4444" />
                  <View style={styles.locationContent}>
                    <Text style={styles.locationText}>{enhancedBooking.address}</Text>
                    {enhancedBooking.locationLabel && (
                      <Text style={styles.locationSubtext}>{enhancedBooking.locationLabel}</Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {enhancedBooking.requirements.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Requirements</Text>
                <View style={styles.requirementsList}>
                  {enhancedBooking.requirements.map((req, index) => (
                    <View key={index} style={styles.requirementItem}>
                      <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                      <Text style={styles.requirementText}>{req}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {enhancedBooking.childrenDetails.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Children Details ({enhancedBooking.childrenDetails.length})
                </Text>
                {enhancedBooking.childrenDetails.map((child, index) => (
                  <View key={child.id ?? index} style={styles.childCard}>
                    <View style={styles.childHeader}>
                      <Ionicons name="person" size={16} color="#8b5cf6" />
                      <Text style={styles.childName}>{child.name}</Text>
                      {child.age && <Text style={styles.childAge}>Age {child.age}</Text>}
                    </View>

                    {child.preferences && (
                      <View style={styles.childDetailRow}>
                        <Ionicons name="heart" size={14} color="#ec4899" />
                        <Text style={styles.childDetail}>
                          <Text style={styles.childDetailLabel}>Preferences: </Text>
                          {child.preferences}
                        </Text>
                      </View>
                    )}

                    {child.specialInstructions && (
                      <View style={styles.childDetailRow}>
                        <Ionicons name="document-text" size={14} color="#f59e0b" />
                        <Text style={styles.childDetail}>
                          <Text style={styles.childDetailLabel}>Instructions: </Text>
                          {child.specialInstructions}
                        </Text>
                      </View>
                    )}

                    {child.allergies && child.allergies !== 'None' && (
                      <View style={styles.allergyWarning}>
                        <Ionicons name="warning" size={14} color="#ef4444" />
                        <Text style={styles.allergyText}>
                          <Text style={styles.allergyLabel}>Allergies: </Text>
                          {child.allergies}
                        </Text>
                      </View>
                    )}

                    {child.specialNeeds && (
                      <View style={styles.specialNeedsRow}>
                        <Ionicons name="accessibility" size={14} color="#f59e0b" />
                        <Text style={styles.specialNeedsText}>
                          <Text style={styles.specialNeedsLabel}>Special needs: </Text>
                          {child.specialNeeds}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {enhancedBooking.specialInstructions && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Special Instructions</Text>
                <View style={styles.instructionsCard}>
                  <Ionicons name="document-text" size={20} color="#f59e0b" />
                  <Text style={styles.instructionsText}>{enhancedBooking.specialInstructions}</Text>
                </View>
              </View>
            )}

            {enhancedBooking.additionalNotes && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Additional Notes</Text>
                <View style={styles.notesCard}>
                  <Ionicons name="clipboard" size={20} color="#8b5cf6" />
                  <Text style={styles.notesText}>{enhancedBooking.additionalNotes}</Text>
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Information</Text>

              <View style={styles.contactItem}>
                <Ionicons name="person" size={18} color="#3b82f6" />
                <View style={styles.contactContent}>
                  <Text style={styles.contactLabel}>Parent Name</Text>
                  <Text style={styles.contactText}>{enhancedBooking.parentName}</Text>
                </View>
              </View>

              {enhancedBooking.contactPhone ? (
                <TouchableOpacity
                  style={styles.contactItem}
                  onPress={() => handlePhonePress(enhancedBooking.contactPhone)}
                >
                  <Ionicons name="call" size={18} color="#10b981" />
                  <View style={styles.contactContent}>
                    <Text style={styles.contactLabel}>Contact Phone</Text>
                    <Text style={[styles.contactText, styles.clickableText]}>
                      {enhancedBooking.contactPhone}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.contactItemMuted}>
                  <Ionicons name="call" size={18} color="#94a3b8" />
                  <View style={styles.contactContent}>
                    <Text style={styles.contactLabel}>Contact Phone</Text>
                    <Text style={styles.mutedText}>Not provided</Text>
                  </View>
                </View>
              )}

              {enhancedBooking.contactEmail ? (
                <TouchableOpacity
                  style={styles.contactItem}
                  onPress={() => handleEmailPress(enhancedBooking.contactEmail)}
                >
                  <Ionicons name="mail" size={18} color="#6366f1" />
                  <View style={styles.contactContent}>
                    <Text style={styles.contactLabel}>Email</Text>
                    <Text style={[styles.contactText, styles.clickableText]}>
                      {enhancedBooking.contactEmail}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.contactItemMuted}>
                  <Ionicons name="mail" size={18} color="#94a3b8" />
                  <View style={styles.contactContent}>
                    <Text style={styles.contactLabel}>Email</Text>
                    <Text style={styles.mutedText}>Not provided</Text>
                  </View>
                </View>
              )}
            </View>

            {(enhancedBooking.emergencyContact.name || enhancedBooking.emergencyContact.phone) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Emergency Contact</Text>
                <View style={styles.emergencyContactCard}>
                  {enhancedBooking.emergencyContact.name && (
                    <View style={styles.contactItem}>
                      <Ionicons name="medical" size={18} color="#ef4444" />
                      <View style={styles.contactContent}>
                        <Text style={styles.contactLabel}>Emergency Contact</Text>
                        <Text style={styles.contactText}>
                          {enhancedBooking.emergencyContact.name}
                          {enhancedBooking.emergencyContact.relationship && (
                            <Text>{` (${enhancedBooking.emergencyContact.relationship})`}</Text>
                          )}
                        </Text>
                      </View>
                    </View>
                  )}

                  {enhancedBooking.emergencyContact.phone && (
                    <TouchableOpacity
                      style={styles.contactItem}
                      onPress={() => handlePhonePress(enhancedBooking.emergencyContact.phone)}
                    >
                      <Ionicons name="call-outline" size={18} color="#ef4444" />
                      <View style={styles.contactContent}>
                        <Text style={styles.contactLabel}>Emergency Phone</Text>
                        <Text style={[styles.contactText, styles.clickableText]}>
                          {enhancedBooking.emergencyContact.phone}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Booking Timeline</Text>
              <View style={styles.timelineCard}>
                <View style={styles.timelineItem}>
                  <Ionicons name="add-circle" size={16} color="#10b981" />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>Booking Created</Text>
                    <Text style={styles.timelineDate}>{formatDateTimeDisplay(enhancedBooking.createdAt)}</Text>
                  </View>
                </View>

                {enhancedBooking.confirmedAt && (
                  <View style={styles.timelineItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#3b82f6" />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineLabel}>Confirmed</Text>
                      <Text style={styles.timelineDate}>{formatDateTimeDisplay(enhancedBooking.confirmedAt)}</Text>
                    </View>
                  </View>
                )}

                {enhancedBooking.completedAt && (
                  <View style={styles.timelineItem}>
                    <Ionicons name="trophy" size={16} color="#f59e0b" />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineLabel}>Completed</Text>
                      <Text style={styles.timelineDate}>{formatDateTimeDisplay(enhancedBooking.completedAt)}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {shouldShowFooter && (
            <View style={styles.footer}>
              {onMessage && (
                <TouchableOpacity style={[styles.actionButton, styles.messageButton]} onPress={onMessage}>
                  <Ionicons name="chatbubble-ellipses" size={18} color="#1d4ed8" />
                  <Text style={styles.actionButtonLabel}>Message Family</Text>
                </TouchableOpacity>
              )}

              {onGetDirections && enhancedBooking.address && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.directionsButton]}
                  onPress={handleDirectionsPress}
                >
                  <Ionicons name="navigate" size={18} color="#166534" />
                  <Text style={styles.actionButtonLabel}>Get Directions</Text>
                </TouchableOpacity>
              )}

              {onCompleteBooking && statusLower === 'confirmed' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.completeButton]}
                  onPress={onCompleteBooking}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={[styles.actionButtonLabel, styles.actionButtonLabelPrimary]}>Mark Complete</Text>
                </TouchableOpacity>
              )}

              {onCancelBooking && ['pending', 'confirmed'].includes(statusLower) && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={onCancelBooking}
                  >
                    <Text style={[styles.actionButtonLabel, styles.cancelButtonLabel]}>Cancel Booking</Text>
                  </TouchableOpacity>
                )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

BookingDetailsModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  booking: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onMessage: PropTypes.func,
  onGetDirections: PropTypes.func,
  onCompleteBooking: PropTypes.func,
  onCancelBooking: PropTypes.func,
  showFooterActions: PropTypes.bool,
};

BookingDetailsModal.defaultProps = {
  booking: null,
  onMessage: undefined,
  onGetDirections: undefined,
  onCompleteBooking: undefined,
  onCancelBooking: undefined,
  showFooterActions: true,
};

const styles = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '94%',
    minHeight: '60%',
  },
  header: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  closeButton: {
    padding: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  caregiverInfoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  caregiverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  caregiverAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  caregiverAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  caregiverInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5364d6',
  },
  caregiverDetails: {
    flex: 1,
  },
  caregiverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  caregiverRate: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  costBreakdownCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  costLabel: {
    fontSize: 14,
    color: '#374151',
  },
  costValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  totalCostRow: {
    borderTopWidth: 1,
    borderTopColor: '#93c5fd',
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  totalCostLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  totalCostValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  locationContent: {
    marginLeft: 12,
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    color: '#dc2626',
  },
  locationSubtext: {
    fontSize: 12,
    color: '#7f1d1d',
    marginTop: 2,
  },
  requirementsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  requirementText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#166534',
  },
  childCard: {
    backgroundColor: '#f5f3ff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  childName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
  },
  childAge: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  childDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  childDetail: {
    fontSize: 13,
    color: '#4b5563',
    marginLeft: 8,
    flex: 1,
  },
  childDetailLabel: {
    fontWeight: '600',
    color: '#374151',
  },
  allergyWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  allergyText: {
    fontSize: 12,
    color: '#ef4444',
    marginLeft: 4,
    flex: 1,
  },
  allergyLabel: {
    fontWeight: '600',
  },
  specialNeedsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    padding: 8,
    borderRadius: 6,
  },
  specialNeedsText: {
    fontSize: 12,
    color: '#92400e',
    marginLeft: 4,
    flex: 1,
  },
  specialNeedsLabel: {
    fontWeight: '600',
  },
  instructionsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
    gap: 12,
  },
  instructionsText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
    flex: 1,
  },
  notesCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f5f3ff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c4b5fd',
    gap: 12,
  },
  notesText: {
    fontSize: 14,
    color: '#7c3aed',
    flex: 1,
    lineHeight: 20,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  contactItemMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  contactContent: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  contactText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  clickableText: {
    color: '#3b82f6',
    textDecorationLine: 'underline',
  },
  mutedText: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  emergencyContactCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  timelineCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timelineContent: {
    marginLeft: 12,
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  timelineDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  actionButton: {
    flex: 1,
    minWidth: 140,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  actionButtonLabelPrimary: {
    color: '#fff',
  },
  messageButton: {
    backgroundColor: '#dbeafe',
  },
  directionsButton: {
    backgroundColor: '#dcfce7',
  },
  completeButton: {
    backgroundColor: '#3b82f6',
  },
  cancelButton: {
    backgroundColor: '#fee2e2',
  },
  cancelButtonLabel: {
    color: '#dc2626',
  },
};

export default BookingDetailsModal;
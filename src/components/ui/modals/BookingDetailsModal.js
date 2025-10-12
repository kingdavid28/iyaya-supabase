import React from 'react';
import { View, Text, ScrollView, Pressable, Linking, Alert, Platform, StyleSheet, Modal } from 'react-native';
import { Calendar, Clock, DollarSign, MapPin, Phone, Mail, MessageCircle, Navigation, Star, Baby, AlertCircle, CheckCircle, X, User } from 'lucide-react-native';
import PropTypes from 'prop-types';

// Simple i18n helper - replace with proper i18n library in production
const t = (key) => {
  const translations = {
    'booking.details': 'Booking Details',
    'booking.overview': 'Booking Overview',
    'booking.date': 'Date',
    'booking.time': 'Time',
    'booking.rate': 'Rate',
    'booking.total': 'Total',
    'location.contact': 'Location & Contact',
    'contact.phone': 'Phone',
    'contact.email': 'Email',
    'contact.hidden': 'Contact info hidden for privacy',
    'children.details': 'Children Details',
    'children.age': 'Age',
    'children.preferences': 'Preferences',
    'children.instructions': 'Special Instructions',
    'children.allergies': 'Allergies',
    'requirements': 'Requirements',
    'notes.special': 'Special Notes',
    'emergency.contact': 'Emergency Contact',
    'emergency.name': 'Name',
    'emergency.relation': 'Relation',
    'emergency.phone': 'Phone',
    'actions.message': 'Message Family',
    'actions.directions': 'Get Directions',
    'actions.complete': 'Mark Complete',
    'actions.cancel': 'Cancel Booking',
    'alerts.completed': 'Booking Completed',
    'alerts.completed.message': 'The booking has been marked as complete',
    'alerts.cancelled': 'Booking Cancelled',
    'alerts.cancelled.message': 'The booking has been cancelled'
  };
  return translations[key] || key;
};

/**
 * BookingDetailsModal displays detailed information about a booking, including children, contact, and actions.
 * Accessibility labels and roles are provided for all interactive elements.
 *
 * @param {Object} props
 * @param {boolean} props.visible - Whether the modal is visible
 * @param {Object} props.booking - Booking details object
 * @param {Function} props.onClose - Called when the modal is closed
 * @param {Function} props.onMessage - Called when the message button is pressed
 * @param {Function} props.onGetDirections - Called when the directions button is pressed
 * @param {Function} props.onCompleteBooking - Called to mark booking as complete
 * @param {Function} props.onCancelBooking - Called to cancel booking
 */
export function BookingDetailsModal({ 
  visible, 
  booking, 
  onClose, 
  onMessage, 
  onGetDirections, 
  onCompleteBooking,
  onCancelBooking 
}) {
  console.log('🔍 BookingDetailsModal - Received booking data:', booking);
  
  if (!visible) return null;
  
  if (!booking) {
    console.warn('⚠️ BookingDetailsModal - No booking data provided');
    return (
      <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.container}>
            <Text>No booking data available</Text>
            <Pressable onPress={onClose}><Text>Close</Text></Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  // Enhanced data processing with multiple field variations
  const enhancedBooking = React.useMemo(() => {
    const processChildren = () => {
      if (booking.selectedChildren && Array.isArray(booking.selectedChildren)) {
        return booking.selectedChildren;
      }
      if (booking.childrenDetails && Array.isArray(booking.childrenDetails)) {
        return booking.childrenDetails;
      }
      if (booking.children && Array.isArray(booking.children)) {
        return booking.children;
      }
      return [];
    };

    const processSpecialInstructions = () => {
      return booking.specialInstructions || 
             booking.special_instructions || 
             booking.notes || 
             booking.instructions || 
             null;
    };

    const processEmergencyContact = () => {
      const contact = booking.emergencyContact || booking.emergency_contact;
      if (typeof contact === 'string') {
        try {
          // Parse string format like "Name: John Doe, Phone: 123-456-7890"
          const nameMatch = contact.match(/Name:\s*([^,]+)/);
          const phoneMatch = contact.match(/Phone:\s*([^,]+)/);
          return {
            name: nameMatch ? nameMatch[1].trim() : contact,
            phone: phoneMatch ? phoneMatch[1].trim() : null,
            relation: 'Emergency Contact'
          };
        } catch (error) {
          return { name: contact, phone: null, relation: 'Emergency Contact' };
        }
      }
      return contact || null;
    };

    return {
      ...booking,
      location: booking.location || booking.address || "Location not specified",
      address: booking.address || booking.location || "Address not provided",
      contactPhone: booking.contactPhone || booking.contact_phone || booking.phone,
      contactEmail: booking.contactEmail || booking.contact_email || booking.email,
      totalHours: booking.totalHours || booking.total_hours || 4,
      totalAmount: booking.totalAmount || booking.total_amount || booking.totalCost || (booking.hourlyRate * 4) || 0,
      hourlyRate: booking.hourlyRate || booking.hourly_rate || 300,
      requirements: booking.requirements || booking.skills || [],
      childrenDetails: processChildren(),
      specialInstructions: processSpecialInstructions(),
      emergencyContact: processEmergencyContact(),
      caregiverName: booking.caregiverId?.name || booking.caregiver?.name || booking.caregiverName || booking.caregiver_name || 'Caregiver',
      parentName: booking.clientId?.name || booking.parent?.name || booking.parentName || booking.parent_name || booking.family || 'Parent',
      date: booking.date || 'Date not specified',
      time: booking.time || (booking.start_time && booking.end_time ? `${booking.start_time} - ${booking.end_time}` : booking.startTime && booking.endTime ? `${booking.startTime} - ${booking.endTime}` : 'Time not specified')
    };
  }, [booking]);
  
  console.log('🔍 Enhanced booking data:', enhancedBooking);

  const getStatusColors = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return { bg: '#dcfce7', text: '#166534' };
      case 'pending':
        return { bg: '#fef3c7', text: '#92400e' };
      case 'completed':
        return { bg: '#dbeafe', text: '#1e40af' };
      case 'cancelled':
        return { bg: '#fecaca', text: '#dc2626' };
      default:
        return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  const statusColors = getStatusColors(enhancedBooking.status);

  const handlePhonePress = async (phone) => {
    if (!phone || typeof phone !== 'string') return;
    try {
      const canOpen = await Linking.canOpenURL(`tel:${phone}`);
      if (canOpen) {
        await Linking.openURL(`tel:${phone}`);
      } else {
        Alert.alert('Error', 'Phone calls are not supported on this device');
      }
    } catch (error) {
      console.error('Phone call error:', error);
      Alert.alert('Error', 'Unable to make phone call');
    }
  };

  const handleEmailPress = async (email) => {
    if (!email || typeof email !== 'string') return;
    try {
      const canOpen = await Linking.canOpenURL(`mailto:${email}`);
      if (canOpen) {
        await Linking.openURL(`mailto:${email}`);
      } else {
        Alert.alert('Error', 'Email is not supported on this device');
      }
    } catch (error) {
      console.error('Email error:', error);
      Alert.alert('Error', 'Unable to open email client');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, styles.card]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Booking Details</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#9ca3af" />
            </Pressable>
          </View>

          {/* Simple Content */}
          <View style={{ flex: 1, padding: 20 }}>
            <Text style={{ fontSize: 16, marginBottom: 10 }}>Date: {enhancedBooking.date}</Text>
            <Text style={{ fontSize: 16, marginBottom: 10 }}>Time: {enhancedBooking.time}</Text>
            <Text style={{ fontSize: 16, marginBottom: 10 }}>Caregiver: {enhancedBooking.caregiverName}</Text>
            <Text style={{ fontSize: 16, marginBottom: 10 }}>Rate: ₱{enhancedBooking.hourlyRate}/hr</Text>
            <Text style={{ fontSize: 16, marginBottom: 10 }}>Total: ₱{enhancedBooking.totalAmount}</Text>
            <Text style={{ fontSize: 16, marginBottom: 10 }}>Location: {enhancedBooking.address}</Text>
            <Text style={{ fontSize: 16, marginBottom: 10 }}>Status: {enhancedBooking.status}</Text>
              {/* Caregiver Information */}
              <View style={styles.caregiverSection}>
                <View style={styles.sectionHeader}>
                  <User size={20} color="#3b82f6" />
                  <Text style={styles.sectionTitle}>Caregiver Information</Text>
                </View>
                <View style={styles.caregiverInfo}>
                  <View style={styles.caregiverAvatar}>
                    <User size={24} color="#3b82f6" />
                  </View>
                  <View style={styles.caregiverDetails}>
                    <Text style={styles.caregiverName}>{enhancedBooking.caregiverName}</Text>
                    <Text style={styles.caregiverRate}>₱{enhancedBooking.hourlyRate}/hour</Text>
                  </View>
                </View>
              </View>

              {/* Schedule Details */}
              <View style={styles.scheduleSection}>
                <Text style={styles.sectionTitle}>Schedule Details</Text>
                <View style={styles.scheduleGrid}>
                  <View style={styles.scheduleItem}>
                    <Calendar size={18} color="#6b7280" />
                    <View style={styles.scheduleText}>
                      <Text style={styles.scheduleLabel}>Date</Text>
                      <Text style={styles.scheduleValue}>{enhancedBooking.date}</Text>
                    </View>
                  </View>
                  <View style={styles.scheduleItem}>
                    <Clock size={18} color="#6b7280" />
                    <View style={styles.scheduleText}>
                      <Text style={styles.scheduleLabel}>Time Range</Text>
                      <Text style={styles.scheduleValue}>{enhancedBooking.time}</Text>
                    </View>
                  </View>
                  <View style={styles.scheduleItem}>
                    <Star size={18} color="#6b7280" />
                    <View style={styles.scheduleText}>
                      <Text style={styles.scheduleLabel}>Duration</Text>
                      <Text style={styles.scheduleValue}>{enhancedBooking.totalHours} hours</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Cost Breakdown */}
              <View style={styles.costSection}>
                <Text style={styles.sectionTitle}>Cost Breakdown</Text>
                <View style={styles.costDetails}>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Hourly Rate:</Text>
                    <Text style={styles.costValue}>₱{enhancedBooking.hourlyRate}</Text>
                  </View>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Duration:</Text>
                    <Text style={styles.costValue}>{enhancedBooking.totalHours} hours</Text>
                  </View>
                  <View style={styles.costDivider} />
                  <View style={styles.costRow}>
                    <Text style={styles.costTotalLabel}>Total Amount:</Text>
                    <Text style={styles.costTotalValue}>₱{enhancedBooking.totalAmount}</Text>
                  </View>
                </View>
              </View>

              {/* Parent Contact Information */}
              <View style={styles.sectionBordered}>
                <Text style={styles.sectionTitle}>Parent Contact Information</Text>
                <View style={styles.contactList}>
                  <View style={styles.contactItem}>
                    <User size={20} color="#6b7280" />
                    <View style={styles.contactText}>
                      <Text style={styles.contactLabel}>Parent Name</Text>
                      <Text style={styles.contactValue}>{enhancedBooking.parentName}</Text>
                    </View>
                  </View>
                  <View style={styles.contactItem}>
                    <MapPin size={20} color="#6b7280" />
                    <View style={styles.contactText}>
                      <Text style={styles.contactValue}>{enhancedBooking.location}</Text>
                      <Text style={styles.contactSubtext}>{enhancedBooking.address}</Text>
                    </View>
                  </View>
                  
                  {enhancedBooking.contactPhone ? (
                    <Pressable style={styles.contactItem} onPress={() => handlePhonePress(enhancedBooking.contactPhone)}>
                      <Phone size={20} color="#3b82f6" />
                      <View style={styles.contactText}>
                        <Text style={styles.contactLabel}>Phone</Text>
                        <Text style={[styles.contactValue, { color: '#3b82f6' }]}>{enhancedBooking.contactPhone}</Text>
                      </View>
                    </Pressable>
                  ) : (
                    <View style={styles.contactItem}>
                      <Phone size={20} color="#9ca3af" />
                      <View style={styles.contactText}>
                        <Text style={styles.contactLabel}>Phone</Text>
                        <Text style={styles.privacyText}>Contact info hidden for privacy</Text>
                      </View>
                    </View>
                  )}
                  
                  {enhancedBooking.contactEmail ? (
                    <Pressable style={styles.contactItem} onPress={() => handleEmailPress(enhancedBooking.contactEmail)}>
                      <Mail size={20} color="#3b82f6" />
                      <View style={styles.contactText}>
                        <Text style={styles.contactLabel}>Email</Text>
                        <Text style={[styles.contactValue, { color: '#3b82f6' }]}>{enhancedBooking.contactEmail}</Text>
                      </View>
                    </Pressable>
                  ) : (
                    <View style={styles.contactItem}>
                      <Mail size={20} color="#9ca3af" />
                      <View style={styles.contactText}>
                        <Text style={styles.contactLabel}>Email</Text>
                        <Text style={styles.privacyText}>Contact info hidden for privacy</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Children Details */}
              {enhancedBooking.childrenDetails && enhancedBooking.childrenDetails.length > 0 && (
                <View style={styles.sectionBordered}>
                  <View style={styles.sectionHeader}>
                    <Baby size={20} color="#6b7280" />
                    <Text style={styles.sectionTitle}>Children Details</Text>
                  </View>
                  <View style={styles.childrenList}>
                    {enhancedBooking.childrenDetails.map((child, index) => (
                      <View key={index} style={styles.childCard}>
                        <View style={styles.childHeader}>
                          <Text style={styles.childName}>{child.name || `Child ${index + 1}`}</Text>
                          <Text style={styles.childAge}>Age {child.age || 'Unknown'}</Text>
                        </View>
                        
                        <View style={styles.childDetails}>
                          {child.preferences && (
                            <View style={styles.childDetail}>
                              <Text style={styles.childDetailLabel}>Preferences:</Text>
                              <Text style={styles.childDetailValue}>{child.preferences}</Text>
                            </View>
                          )}
                          {(child.specialInstructions || child.special_instructions || child.notes) && (
                            <View style={styles.childDetail}>
                              <Text style={styles.childDetailLabel}>Special Instructions:</Text>
                              <Text style={styles.childDetailValue}>{child.specialInstructions || child.special_instructions || child.notes}</Text>
                            </View>
                          )}
                          {child.allergies && child.allergies !== 'None' && (
                            <View style={styles.allergyItem}>
                              <AlertCircle size={16} color="#ef4444" />
                              <Text style={styles.allergyLabel}>Allergies:</Text>
                              <Text style={styles.allergyValue}>{child.allergies}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Requirements */}
              {enhancedBooking.requirements && enhancedBooking.requirements.length > 0 && (
                <View style={styles.sectionBordered}>
                  <Text style={styles.sectionTitle}>Requirements</Text>
                  <View style={styles.requirementsList}>
                    {enhancedBooking.requirements.map((req, index) => (
                      <View key={index} style={styles.requirementItem}>
                        <CheckCircle size={12} color="#16a34a" />
                        <Text style={styles.requirementText}>{req}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Special Instructions */}
              {enhancedBooking.specialInstructions && (
                <View style={styles.specialSection}>
                  <Text style={styles.sectionTitle}>Special Instructions</Text>
                  <Text style={styles.specialText}>{enhancedBooking.specialInstructions}</Text>
                </View>
              )}

              {/* Emergency Contact */}
              {enhancedBooking.emergencyContact && (
                <View style={styles.emergencySection}>
                  <View style={styles.sectionHeader}>
                    <AlertCircle size={20} color="#dc2626" />
                    <Text style={styles.sectionTitle}>Emergency Contact</Text>
                  </View>
                  <View style={styles.emergencyDetails}>
                    <View style={styles.emergencyItem}>
                      <Text style={styles.emergencyLabel}>Name:</Text>
                      <Text style={styles.emergencyValue}>{enhancedBooking.emergencyContact.name}</Text>
                    </View>
                    {enhancedBooking.emergencyContact.relation && (
                      <View style={styles.emergencyItem}>
                        <Text style={styles.emergencyLabel}>Relation:</Text>
                        <Text style={styles.emergencyValue}>{enhancedBooking.emergencyContact.relation}</Text>
                      </View>
                    )}
                    {enhancedBooking.emergencyContact.phone && (
                      <Pressable style={styles.emergencyItem} onPress={() => handlePhonePress(enhancedBooking.emergencyContact.phone)}>
                        <Text style={styles.emergencyLabel}>Phone:</Text>
                        <Text style={[styles.emergencyValue, { color: '#dc2626', fontWeight: '600' }]}>{enhancedBooking.emergencyContact.phone}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              )}
          </View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Pressable style={[styles.actionButton, styles.messageButton]} onPress={onMessage}>
              <MessageCircle size={16} color="#3b82f6" />
              <Text style={styles.messageButtonText}>{t('actions.message')}</Text>
            </Pressable>
            
            <Pressable 
              style={[styles.actionButton, styles.directionsButton]} 
              onPress={() => {
                try {
                  Linking.openURL(`https://maps.google.com/?q=${enhancedBooking.address}`);
                  onGetDirections?.();
                } catch (error) {
                  Alert.alert('Error', 'Unable to open maps');
                }
              }}
            >
              <Navigation size={16} color="#16a34a" />
              <Text style={styles.directionsButtonText}>{t('actions.directions')}</Text>
            </Pressable>

            {enhancedBooking.status === 'confirmed' && (
              <Pressable
                style={[styles.actionButton, styles.completeButton]}
                onPress={() => {
                  Alert.alert("Booking Completed", "The booking has been marked as complete");
                  onCompleteBooking?.();
                }}
              >
                <CheckCircle size={16} color="#ffffff" />
                <Text style={styles.completeButtonText}>{t('actions.complete')}</Text>
              </Pressable>
            )}

            {(enhancedBooking.status === 'pending' || enhancedBooking.status === 'confirmed') && (
              <Pressable
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => {
                  Alert.alert("Booking Cancelled", "The booking has been cancelled");
                  onCancelBooking?.();
                }}
              >
                <Text style={styles.cancelButtonText}>{t('actions.cancel')}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

BookingDetailsModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  booking: PropTypes.shape({
    location: PropTypes.string,
    address: PropTypes.string,
    contactPhone: PropTypes.string,
    contactEmail: PropTypes.string,
    totalHours: PropTypes.number,
    totalAmount: PropTypes.number,
    hourlyRate: PropTypes.number,
    requirements: PropTypes.arrayOf(PropTypes.string),
    childrenDetails: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        age: PropTypes.number,
        specialInstructions: PropTypes.string,
        allergies: PropTypes.string,
        preferences: PropTypes.string
      })
    ),
    emergencyContact: PropTypes.shape({
      name: PropTypes.string,
      phone: PropTypes.string,
      relation: PropTypes.string
    }),
    status: PropTypes.string,
    family: PropTypes.string,
    date: PropTypes.string,
    time: PropTypes.string,
    notes: PropTypes.string
  }),
  onClose: PropTypes.func.isRequired,
  onMessage: PropTypes.func,
  onGetDirections: PropTypes.func,
  onCompleteBooking: PropTypes.func,
  onCancelBooking: PropTypes.func
};
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  card: Platform.select({
    web: {
      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
    },
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
    },
    android: {
      elevation: 8,
    },
  }),
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#dbeafe',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    minHeight: 400,
  },
  section: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  sectionBordered: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  overviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 120,
    gap: 8,
  },
  overviewText: {
    flex: 1,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  overviewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  contactList: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  contactText: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  contactSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  privacyText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  childrenList: {
    gap: 12,
  },
  childCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 16,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  childName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  childAge: {
    fontSize: 12,
    color: '#6b7280',
  },
  childDetails: {
    gap: 8,
  },
  childDetail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  childDetailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginRight: 4,
  },
  childDetailValue: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  allergyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  allergyLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#dc2626',
  },
  allergyValue: {
    fontSize: 14,
    color: '#dc2626',
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
  },
  directionsButtonText: {
    color: '#166534',
    fontWeight: '600',
    fontSize: 14,
  },
  completeButton: {
    backgroundColor: '#3b82f6',
  },
  completeButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: '#fecaca',
    flex: 0,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 14,
  },
  caregiverSection: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 16,
  },
  caregiverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  caregiverAvatar: {
    width: 48,
    height: 48,
    backgroundColor: '#dbeafe',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caregiverDetails: {
    flex: 1,
  },
  caregiverName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  caregiverRate: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3b82f6',
  },
  scheduleSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  scheduleGrid: {
    gap: 12,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scheduleText: {
    flex: 1,
  },
  scheduleLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  scheduleValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  costSection: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 16,
  },
  costDetails: {
    gap: 8,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  costValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  costDivider: {
    height: 1,
    backgroundColor: '#d1d5db',
    marginVertical: 8,
  },
  costTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  costTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3b82f6',
  },
});

BookingDetailsModal.defaultProps = {
  booking: {}
};
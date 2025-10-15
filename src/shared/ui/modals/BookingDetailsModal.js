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
      
      if (!contact) return null;

      // If it's already a properly formatted object
      if (typeof contact === 'object' && contact !== null) {
        return {
          name: contact.name || 'Not specified',
          phone: contact.phone || contact.phoneNumber || null,
          relation: contact.relation || contact.relationship || 'Emergency Contact'
        };
      }

      // If it's a string, try to parse it
      if (typeof contact === 'string') {
        try {
          const nameMatch = contact.match(/(?:Name:?\s*)([^,]+)/i);
          const phoneMatch = contact.match(/(?:Phone:?\s*)([^,]+)/i);
          const relationMatch = contact.match(/(?:Relation:?\s*|Relationship:?\s*)([^,]+)/i);
          
          return {
            name: nameMatch ? nameMatch[1].trim() : contact,
            phone: phoneMatch ? phoneMatch[1].trim() : null,
            relation: relationMatch ? relationMatch[1].trim() : 'Emergency Contact'
          };
        } catch (error) {
          return { 
            name: contact, 
            phone: null, 
            relation: 'Emergency Contact' 
          };
        }
      }
      
      return null;
    };

    const processContactInfo = () => {
      const phone = booking.contactPhone || booking.contact_phone || booking.phone || booking.parentPhone;
      const email = booking.contactEmail || booking.contact_email || booking.email || booking.parentEmail;
      
      return {
        phone: phone && typeof phone === 'string' ? phone.replace(/\s+/g, '') : null,
        email: email && typeof email === 'string' ? email.trim() : null
      };
    };

    const contactInfo = processContactInfo();

    return {
      ...booking,
      location: booking.location || booking.address || "Location not specified",
      address: booking.address || booking.location || "Address not provided",
      contactPhone: contactInfo.phone,
      contactEmail: contactInfo.email,
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
    
    // Clean phone number for dialing
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    
    try {
      const canOpen = await Linking.canOpenURL(`tel:${cleanPhone}`);
      if (canOpen) {
        await Linking.openURL(`tel:${cleanPhone}`);
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
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'The email address format is invalid');
      return;
    }

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

  // Format phone number for display
  const formatPhoneNumber = (phone) => {
    if (!phone) return null;
    
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Format based on length and country code
    if (cleaned.startsWith('+')) {
      return cleaned; // Keep international format as is
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 11) {
      return cleaned.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, '$1 ($2) $3-$4');
    }
    
    return phone; // Return original if format doesn't match
  };

  const ContactInfoItem = ({ icon: Icon, label, value, onPress, isPressable = false }) => {
    const Container = isPressable ? Pressable : View;
    
    return (
      <Container 
        style={styles.contactItem} 
        onPress={onPress}
        disabled={!isPressable}
      >
        <Icon size={20} color={isPressable ? '#3b82f6' : '#6b7280'} />
        <View style={styles.contactText}>
          <Text style={styles.contactLabel}>{label}</Text>
          <Text style={[
            styles.contactValue, 
            isPressable && styles.contactValuePressable
          ]}>
            {value}
          </Text>
        </View>
      </Container>
    );
  };

  const EmergencyContactItem = ({ label, value, isPhone = false }) => {
    const Container = isPhone && value ? Pressable : View;
    
    return (
      <Container 
        style={styles.emergencyItem} 
        onPress={isPhone ? () => handlePhonePress(value) : undefined}
        disabled={!isPhone}
      >
        <Text style={styles.emergencyLabel}>{label}</Text>
        <Text style={[
          styles.emergencyValue,
          isPhone && value && styles.emergencyPhoneValue
        ]}>
          {value || 'Not specified'}
        </Text>
      </Container>
    );
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
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <User size={24} color="#3b82f6" />
              </View>
              <View>
                <Text style={styles.headerTitle}>{t('booking.details')}</Text>
                <Text style={styles.headerSubtitle}>{enhancedBooking.parentName}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                <Text style={[styles.statusText, { color: statusColors.text }]}>
                  {enhancedBooking.status || 'Unknown'}
                </Text>
              </View>
              <Pressable 
                onPress={onClose} 
                style={styles.closeButton}
                accessibilityLabel="Close modal"
                accessibilityRole="button"
              >
                <X size={24} color="#9ca3af" />
              </Pressable>
            </View>
          </View>

          {/* Content */}
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
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
                  <ContactInfoItem
                    icon={User}
                    label="Parent Name"
                    value={enhancedBooking.parentName}
                  />
                  
                  <ContactInfoItem
                    icon={MapPin}
                    label="Location"
                    value={enhancedBooking.location}
                  />
                  
                  {enhancedBooking.contactPhone ? (
                    <ContactInfoItem
                      icon={Phone}
                      label="Phone"
                      value={formatPhoneNumber(enhancedBooking.contactPhone)}
                      onPress={() => handlePhonePress(enhancedBooking.contactPhone)}
                      isPressable={true}
                    />
                  ) : (
                    <ContactInfoItem
                      icon={Phone}
                      label="Phone"
                      value={t('contact.hidden')}
                    />
                  )}
                  
                  {enhancedBooking.contactEmail ? (
                    <ContactInfoItem
                      icon={Mail}
                      label="Email"
                      value={enhancedBooking.contactEmail}
                      onPress={() => handleEmailPress(enhancedBooking.contactEmail)}
                      isPressable={true}
                    />
                  ) : (
                    <ContactInfoItem
                      icon={Mail}
                      label="Email"
                      value={t('contact.hidden')}
                    />
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
                    <EmergencyContactItem
                      label="Name:"
                      value={enhancedBooking.emergencyContact.name}
                    />
                    
                    <EmergencyContactItem
                      label="Relation:"
                      value={enhancedBooking.emergencyContact.relation}
                    />
                    
                    <EmergencyContactItem
                      label="Phone:"
                      value={formatPhoneNumber(enhancedBooking.emergencyContact.phone)}
                      isPhone={true}
                    />
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Pressable 
              style={[styles.actionButton, styles.messageButton]} 
              onPress={onMessage}
              accessibilityLabel="Message family"
              accessibilityRole="button"
            >
              <MessageCircle size={16} color="#3b82f6" />
              <Text style={styles.messageButtonText}>{t('actions.message')}</Text>
            </Pressable>
            
            <Pressable 
              style={[styles.actionButton, styles.directionsButton]} 
              onPress={() => {
                try {
                  Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(enhancedBooking.address)}`);
                  onGetDirections?.();
                } catch (error) {
                  Alert.alert('Error', 'Unable to open maps');
                }
              }}
              accessibilityLabel="Get directions"
              accessibilityRole="button"
            >
              <Navigation size={16} color="#16a34a" />
              <Text style={styles.directionsButtonText}>{t('actions.directions')}</Text>
            </Pressable>

            {enhancedBooking.status === 'confirmed' && (
              <Pressable
                style={[styles.actionButton, styles.completeButton]}
                onPress={() => {
                  Alert.alert(
                    t('alerts.completed'),
                    t('alerts.completed.message'),
                    [{ text: 'OK', onPress: onCompleteBooking }]
                  );
                }}
                accessibilityLabel="Mark booking as complete"
                accessibilityRole="button"
              >
                <CheckCircle size={16} color="#ffffff" />
                <Text style={styles.completeButtonText}>{t('actions.complete')}</Text>
              </Pressable>
            )}

            {(enhancedBooking.status === 'pending' || enhancedBooking.status === 'confirmed') && (
              <Pressable
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => {
                  Alert.alert(
                    t('alerts.cancelled'),
                    t('alerts.cancelled.message'),
                    [{ text: 'OK', onPress: onCancelBooking }]
                  );
                }}
                accessibilityLabel="Cancel booking"
                accessibilityRole="button"
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
        age: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        specialInstructions: PropTypes.string,
        allergies: PropTypes.string,
        preferences: PropTypes.string
      })
    ),
    emergencyContact: PropTypes.oneOfType([
      PropTypes.shape({
        name: PropTypes.string,
        phone: PropTypes.string,
        relation: PropTypes.string
      }),
      PropTypes.string
    ]),
    status: PropTypes.string,
    family: PropTypes.string,
    date: PropTypes.string,
    time: PropTypes.string,
    notes: PropTypes.string,
    parentPhone: PropTypes.string,
    parentEmail: PropTypes.string
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
    gap: 16,
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
  },
  contactList: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 4,
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
  contactValuePressable: {
    color: '#3b82f6',
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
    marginLeft: 4,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  requirementText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '500',
  },
  specialSection: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 12,
    padding: 16,
  },
  specialText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  emergencySection: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 16,
  },
  emergencyDetails: {
    gap: 8,
  },
  emergencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  emergencyLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    width: 80,
    marginRight: 8,
  },
  emergencyValue: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
  },
  emergencyPhoneValue: {
    color: '#dc2626',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    minWidth: 120,
    justifyContent: 'center',
  },
  messageButton: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  messageButtonText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 14,
  },
  directionsButton: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
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

export default BookingDetailsModal;
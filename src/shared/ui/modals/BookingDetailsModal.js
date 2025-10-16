// @ts-nocheck
import React from 'react';
import { View, Text, ScrollView, Pressable, Linking, Alert, Platform, StyleSheet, Modal, SafeAreaView } from 'react-native';
import { Calendar, Clock, MapPin, Phone, Mail, MessageCircle, Navigation, Star, Baby, AlertCircle, CheckCircle, X, User } from 'lucide-react-native';
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
    'actions.message': 'Message Caregiver',
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

// Helper functions
const parseNumber = (value) => {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) : Number(value);
  return isNaN(num) ? null : num;
};

const formatDateDisplay = (dateString) => {
  if (!dateString) return 'Date not specified';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
};

const formatHours = (hours) => {
  if (!hours) return '0 hours';
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

const formatStatus = (status) => {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

// Contact Info Component
const ContactInfoItem = ({ icon: Icon, label, value, onPress, isPressable = false }) => {
  const Container = isPressable ? Pressable : View;
  
  return (
    <Container 
      style={styles.contactItem} 
      onPress={onPress}
      disabled={!isPressable}
    >
      <Icon size={18} color="#6b7280" />
      <View style={styles.contactText}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={[
          styles.contactValue,
          isPressable && value && styles.contactValuePressable
        ]}>
          {value || 'Not specified'}
        </Text>
      </View>
    </Container>
  );
};

// Emergency Contact Item Component
const EmergencyContactItem = ({ icon: Icon, label, value, onPress, isPressable = false }) => {
  const Container = isPressable ? Pressable : View;
  
  return (
    <Container 
      style={styles.emergencyContactItem} 
      onPress={onPress}
      disabled={!isPressable}
    >
      {Icon && <Icon size={16} color="#dc2626" />}
      <View style={styles.emergencyContactText}>
        <Text style={styles.emergencyContactLabel}>{label}</Text>
        <Text style={[
          styles.emergencyContactValue,
          isPressable && value && styles.emergencyContactValuePressable
        ]}>
          {value || 'Not specified'}
        </Text>
      </View>
    </Container>
  );
};

/**
 * BookingDetailsModal displays detailed information about a booking, including children, contact, and actions.
 * Accessibility labels and roles are provided for all interactive elements.
 */
export const BookingDetailsModal = ({
  visible,
  booking,
  onClose,
  onMessage,
  onGetDirections,
  onCompleteBooking,
  onCancelBooking,
  messageLabel = 'Message Caregiver',
  messageDisabled = false
}) => {
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
        const trimmedContact = contact.trim();

        if ((trimmedContact.startsWith('{') && trimmedContact.endsWith('}')) || (trimmedContact.startsWith('[') && trimmedContact.endsWith(']'))) {
          try {
            const parsed = JSON.parse(trimmedContact);
            if (parsed && typeof parsed === 'object') {
              return {
                name: parsed.name || 'Not specified',
                phone: parsed.phone || parsed.phoneNumber || null,
                relation: parsed.relation || parsed.relationship || 'Emergency Contact'
              };
            }
          } catch (error) {
            console.warn('Failed to parse emergency contact JSON string:', error);
          }
        }

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
    const rawHourlyRate = parseNumber(booking.hourlyRate ?? booking.hourly_rate);
    const rawTotalHours = parseNumber(booking.totalHours ?? booking.total_hours);
    const rawTotalAmount =
      parseNumber(booking.totalAmount) ??
      parseNumber(booking.total_amount) ??
      parseNumber(booking.totalCost);

    return {
      ...booking,
      location: booking.location || booking.address || "Location not specified",
      address: booking.address || booking.location || "Address not provided",
      contactPhone: contactInfo.phone,
      contactEmail: contactInfo.email,
      totalHours: rawTotalHours ?? 4,
      totalAmount: rawTotalAmount ?? ((rawHourlyRate ?? 300) * (rawTotalHours ?? 4)),
      hourlyRate: rawHourlyRate ?? 300,
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

  const childCount = React.useMemo(() => {
    if (Array.isArray(enhancedBooking.childrenDetails)) {
      return enhancedBooking.childrenDetails.length;
    }
    if (typeof enhancedBooking.children === 'number') {
      return enhancedBooking.children;
    }
    return 0;
  }, [enhancedBooking.childrenDetails, enhancedBooking.children]);

  const formattedDate = React.useMemo(
    () => formatDateDisplay(enhancedBooking.date),
    [enhancedBooking.date]
  );

  const formattedTime = React.useMemo(
    () => enhancedBooking.time || 'Time not specified',
    [enhancedBooking.time]
  );

  const formattedDuration = React.useMemo(
    () => formatHours(enhancedBooking.totalHours),
    [enhancedBooking.totalHours]
  );

  const hourlyRateCurrency = React.useMemo(
    () => formatCurrency(enhancedBooking.hourlyRate),
    [enhancedBooking.hourlyRate]
  );

  const totalAmountCurrency = React.useMemo(
    () => formatCurrency(enhancedBooking.totalAmount),
    [enhancedBooking.totalAmount]
  );

  const childSummary = React.useMemo(() => {
    if (!childCount) return 'No children listed';
    return `${childCount} ${childCount === 1 ? 'child' : 'children'}`;
  }, [childCount]);

  const summaryChips = React.useMemo(() => {
    const chips = [
      {
        key: 'date',
        icon: Calendar,
        label: 'Date',
        value: formattedDate,
        accent: '#3b82f6'
      },
      {
        key: 'time',
        icon: Clock,
        label: 'Time',
        value: formattedTime,
        accent: '#8b5cf6'
      },
      {
        key: 'children',
        icon: Baby,
        label: 'Children',
        value: childSummary,
        accent: '#ef4444'
      }
    ];

    if (enhancedBooking.location && enhancedBooking.location !== 'Location not specified') {
      chips.push({
        key: 'location',
        icon: MapPin,
        label: 'Location',
        value: enhancedBooking.location,
        accent: '#0ea5e9'
      });
    }

    chips.push({
      key: 'status',
      icon: CheckCircle,
      label: 'Status',
      value: formatStatus(enhancedBooking.status),
      accent: '#10b981'
    });

    return chips;
  }, [childSummary, enhancedBooking.location, enhancedBooking.status, formattedDate, formattedTime]);

  const canComplete = (enhancedBooking.status || '').toLowerCase() === 'confirmed';
  const canCancel = ['pending', 'confirmed'].includes((enhancedBooking.status || '').toLowerCase());

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

    const cleaned = phone.replace(/[^\d+]/g, '');

    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    }

    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, '$1 ($2) $3-$4');
    }

    return phone;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.container, styles.card]}>
            {/* Header - Fixed layout */}
            <View style={styles.header}>
              <View style={styles.headerMain}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconContainer}>
                    <User size={24} color="#3b82f6" />
                  </View>
                  <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{t('booking.details')}</Text>
                    <Text style={styles.headerSubtitle} numberOfLines={1}>{enhancedBooking.parentName}</Text>
                  </View>
                </View>
                <View style={styles.headerRight}>
                  <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                    <Text style={[styles.statusText, { color: statusColors.text }]}>
                      {formatStatus(enhancedBooking.status)}
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
            </View>

            {/* Content */}
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.content}>
                {/* Quick Summary */}
                <View style={styles.summaryChips}>
                  {summaryChips.map(({ key, icon: Icon, label, value, accent }) => (
                    <View key={key} style={styles.summaryChip}>
                      <View style={[styles.summaryChipIcon, { backgroundColor: `${accent}1A` }]}> 
                        <Icon size={16} color={accent} />
                      </View>
                      <View style={styles.summaryChipText}>
                        <Text style={styles.summaryChipLabel}>{label}</Text>
                        <Text style={styles.summaryChipValue} numberOfLines={1}>{value}</Text>
                      </View>
                    </View>
                  ))}
                </View>

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
                      <Text style={styles.caregiverRate}>
                        {hourlyRateCurrency === '—' ? 'Rate unavailable' : `${hourlyRateCurrency} / hr`}
                      </Text>
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
                        <Text style={styles.scheduleValue}>{formattedDate}</Text>
                      </View>
                    </View>
                    <View style={styles.scheduleItem}>
                      <Clock size={18} color="#6b7280" />
                      <View style={styles.scheduleText}>
                        <Text style={styles.scheduleLabel}>Time Range</Text>
                        <Text style={styles.scheduleValue}>{formattedTime}</Text>
                      </View>
                    </View>
                    <View style={styles.scheduleItem}>
                      <Star size={18} color="#6b7280" />
                      <View style={styles.scheduleText}>
                        <Text style={styles.scheduleLabel}>Duration</Text>
                        <Text style={styles.scheduleValue}>{formattedDuration}</Text>
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
                      <Text style={styles.costValue}>{hourlyRateCurrency}</Text>
                    </View>
                    <View style={styles.costRow}>
                      <Text style={styles.costLabel}>Duration:</Text>
                      <Text style={styles.costValue}>{formattedDuration}</Text>
                    </View>
                    <View style={styles.costDivider} />
                    <View style={styles.costRow}>
                      <Text style={styles.costTotalLabel}>Total Amount:</Text>
                      <Text style={styles.costTotalValue}>{totalAmountCurrency}</Text>
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

                {/* Emergency Contact - Improved UI */}
                {enhancedBooking.emergencyContact && (
                  <View style={styles.emergencySection}>
                    <View style={styles.emergencyHeader}>
                      <View style={styles.emergencyIconContainer}>
                        <AlertCircle size={20} color="#ffffff" />
                      </View>
                      <View style={styles.emergencyHeaderText}>
                        <Text style={styles.emergencyTitle}>Emergency Contact</Text>
                        <Text style={styles.emergencySubtitle}>Available in case of emergencies</Text>
                      </View>
                    </View>
                    
                    <View style={styles.emergencyContent}>
                      <EmergencyContactItem
                        icon={User}
                        label="Full Name"
                        value={enhancedBooking.emergencyContact.name}
                      />
                      
                      <EmergencyContactItem
                        icon={User}
                        label="Relationship"
                        value={enhancedBooking.emergencyContact.relation}
                      />
                      
                      <EmergencyContactItem
                        icon={Phone}
                        label="Phone Number"
                        value={formatPhoneNumber(enhancedBooking.emergencyContact.phone)}
                        onPress={() => handlePhonePress(enhancedBooking.emergencyContact.phone)}
                        isPressable={!!enhancedBooking.emergencyContact.phone}
                      />
                    </View>
                    
                    {enhancedBooking.emergencyContact.phone && (
                      <View style={styles.emergencyActions}>
                        <Pressable
                          style={styles.emergencyCallButton}
                          onPress={() => handlePhonePress(enhancedBooking.emergencyContact.phone)}
                          accessibilityLabel="Call emergency contact"
                          accessibilityRole="button"
                        >
                          <Phone size={16} color="#ffffff" />
                          <Text style={styles.emergencyCallButtonText}>Call Emergency Contact</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Footer Actions */}
            <View style={styles.footer}>
              <View style={styles.footerRow}>
                <Pressable 
                  style={[styles.actionButton, styles.messageButton, messageDisabled && styles.actionButtonDisabled]}
                  onPress={messageDisabled ? undefined : onMessage}
                  accessibilityLabel={messageLabel}
                  accessibilityRole="button"
                  disabled={messageDisabled}
                >
                  <MessageCircle size={16} color={messageDisabled ? '#9ca3af' : '#3b82f6'} />
                  <Text style={[styles.messageButtonText, messageDisabled && styles.messageButtonTextDisabled]}>{messageLabel}</Text>
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
              </View>

              {(canComplete || canCancel) && (
                <View style={styles.footerRow}>
                  {canComplete && (
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

                  {canCancel && (
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
                      <X size={16} color="#dc2626" />
                      <Text style={styles.cancelButtonText}>{t('actions.cancel')}</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </View>
        </SafeAreaView>
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
  onCancelBooking: PropTypes.func,
  messageLabel: PropTypes.string,
  messageDisabled: PropTypes.bool
};

BookingDetailsModal.defaultProps = {
  booking: {},
  messageLabel: 'Message Caregiver',
  messageDisabled: false
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    maxHeight: Platform.select({
      web: '90%',
      default: '95%'
    }),
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
  // Fixed Header Styles
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0, // Important for text truncation
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
  headerTextContainer: {
    flex: 1,
    minWidth: 0, // Important for text truncation
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
    marginLeft: 12,
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
  scrollContent: {
    paddingBottom: 32,
  },
  scrollView: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: Platform.select({
      web: 500,
      default: undefined
    }),
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
  // Improved Emergency Contact Styles
  emergencySection: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    overflow: 'hidden',
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    padding: 16,
    gap: 12,
  },
  emergencyIconContainer: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyHeaderText: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  emergencySubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  emergencyContent: {
    padding: 16,
    gap: 12,
  },
  emergencyContactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 4,
  },
  emergencyContactText: {
    flex: 1,
  },
  emergencyContactLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  emergencyContactValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  emergencyContactValuePressable: {
    color: '#dc2626',
  },
  emergencyActions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emergencyCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  emergencyCallButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  summaryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: 140,
    flex: 1,
    gap: 12,
  },
  summaryChipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryChipText: {
    flex: 1,
    gap: 2,
  },
  summaryChipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  summaryChipValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  footer: {
    padding: 20,
    gap: 12,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
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
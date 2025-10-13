import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Image,
  Modal,
} from 'react-native';
import { Button } from 'react-native-paper';
import { ModalWrapper } from '../../../shared/ui';
import KeyboardAvoidingWrapper from '../../../shared/ui/layout/KeyboardAvoidingWrapper';
import { 
  X, 
  Calendar, 
  Clock, 
  DollarSign, 
  MapPin, 
  Users, 
  Phone, 
  Mail, 
  MessageCircle, 
  Navigation, 
  Star, 
  Baby, 
  AlertCircle, 
  CheckCircle, 
  User 
} from 'lucide-react-native';
import CustomDateTimePicker from '../../../shared/ui/inputs/DateTimePicker';
import TimePicker from '../../../shared/ui/inputs/TimePicker';
import { formatAddress } from '../../../utils/addressUtils';
import { getCurrentDeviceLocation } from '../../../utils/locationUtils';
import { getImageSource } from '../../../utils/imageUtils';

const BookingModal = ({ caregiver, childrenList = [], onConfirm, onClose, visible }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    date: null,
    startTime: '',
    endTime: '',
    selectedChildren: [],
    specialInstructions: '',
    address: '',
    contactPhone: '',
    emergencyContact: {
      name: '',
      phone: '',
      relation: ''
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);

  const resolveHourlyRate = () => {
    if (typeof caregiver?.hourlyRate === 'number' && caregiver.hourlyRate > 0) return caregiver.hourlyRate;
    if (typeof caregiver?.rate === 'string') {
      const n = parseFloat(caregiver.rate.replace(/[^0-9.]/g, ''));
      return isNaN(n) || n <= 0 ? 150 : n;
    }
    return 150;
  };

  const calculateTotalCost = () => {
    if (!bookingData.startTime || !bookingData.endTime) return 0;
    
    // Convert to 24-hour format for calculation
    const startTime24 = convertTo24Hour(bookingData.startTime);
    const endTime24 = convertTo24Hour(bookingData.endTime);
    
    const start = new Date(`2024-01-01T${startTime24}`);
    const end = new Date(`2024-01-01T${endTime24}`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    return Math.max(0, hours * resolveHourlyRate());
  };

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const locationData = await getCurrentDeviceLocation();
      
      if (locationData && locationData.address) {
        const formattedAddress = `${locationData.address.street || ''} ${locationData.address.city || ''}, ${locationData.address.province || ''}`;
        setBookingData({ ...bookingData, address: formattedAddress.trim() });
      }
    } catch (error) {
      Alert.alert('Location Error', error.message || 'Failed to get current location.');
    } finally {
      setLocationLoading(false);
    }
  };

  const convertTo24Hour = (timeStr) => {
    if (!timeStr) return '';
    
    // If already in 24-hour format, return as is
    if (!/AM|PM/i.test(timeStr)) return timeStr;
    
    const [time, period] = timeStr.split(' ');
    const [hour, minute] = time.split(':');
    let hour24 = parseInt(hour);
    
    if (period.toUpperCase() === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (period.toUpperCase() === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minute}`;
  };

  const handleSubmit = async () => {
    setSubmitError('');
    setSubmitting(true);
    
    // Convert times to 24-hour format for backend
    const startTime24 = convertTo24Hour(bookingData.startTime);
    const endTime24 = convertTo24Hour(bookingData.endTime);
    
    // Validate time format before submission
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime24) || !timeRegex.test(endTime24)) {
      setSubmitError('Invalid time format. Please select valid times.');
      setSubmitting(false);
      return;
    }
    
    console.log('BookingModal - caregiver object:', caregiver);
    console.log('BookingModal - caregiver._id:', caregiver._id);
    console.log('BookingModal - caregiver.id:', caregiver.id);
    console.log('BookingModal - caregiverId type:', typeof (caregiver._id || caregiver.id));
    
    const finalBookingData = {
      ...bookingData,
      startTime: startTime24,
      endTime: endTime24,
      caregiver: caregiver.name,
      caregiverId: caregiver._id || caregiver.id || caregiver.userId,
      hourlyRate: resolveHourlyRate(),
      totalCost: calculateTotalCost(),
      time: `${bookingData.startTime} - ${bookingData.endTime}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('Final booking data being submitted:', finalBookingData);

    try {
      if (typeof onConfirm === 'function') {
        await onConfirm(finalBookingData);
      }
      onClose && onClose();
    } catch (e) {
      setSubmitError(e?.message || 'Failed to submit booking.');
    } finally {
      setSubmitting(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return bookingData.date && bookingData.startTime && bookingData.endTime;
      case 2:
        return bookingData.selectedChildren.length > 0;
      case 3:
        return bookingData.address && bookingData.contactPhone;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>Schedule Details</Text>
      
      <View style={styles.inputContainer}>
        <CustomDateTimePicker
          value={bookingData.date}
          mode="date"
          onDateChange={(date) => setBookingData({ ...bookingData, date })}
          label="Date"
          placeholder="Select date"
          minimumDate={new Date()}
          format="short"
        />
      </View>

      <View style={styles.timeContainer}>
        <View style={styles.timeInputContainer}>
          <TimePicker
            key="start-time-picker"
            value={bookingData.startTime}
            onTimeChange={(time) => {
              console.log('Start time selected:', time);
              setBookingData({ ...bookingData, startTime: time });
            }}
            label="Start Time"
            placeholder="Select start time"
            minuteInterval={30}
            format24Hour={false}
          />
        </View>
        <View style={styles.timeInputContainer}>
          <TimePicker
            key="end-time-picker"
            value={bookingData.endTime}
            onTimeChange={(time) => {
              console.log('End time selected:', time);
              setBookingData({ ...bookingData, endTime: time });
            }}
            label="End Time"
            placeholder="Select end time"
            minuteInterval={30}
            format24Hour={false}
          />
        </View>
      </View>

      {bookingData.startTime && bookingData.endTime && (
        <View style={styles.costContainer}>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Estimated Cost:</Text>
            <Text style={styles.costValue}>₱{calculateTotalCost()}</Text>
          </View>
          <Text style={styles.costDetail}>
            {`₱${resolveHourlyRate()}/hour × ${Math.max(0, Math.round((calculateTotalCost() / resolveHourlyRate()) * 100) / 100)} hours`}
          </Text>
        </View>
      )}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>Select Children</Text>
      
      <View style={styles.childrenList}>
        {childrenList.map((child, index) => (
          <View key={index} style={styles.childItem}>
            <TouchableOpacity
              onPress={() => {
                if (bookingData.selectedChildren.includes(child.name)) {
                  setBookingData({
                    ...bookingData,
                    selectedChildren: bookingData.selectedChildren.filter(name => name !== child.name)
                  });
                } else {
                  setBookingData({
                    ...bookingData,
                    selectedChildren: [...bookingData.selectedChildren, child.name]
                  });
                }
              }}
              style={styles.checkboxContainer}
            >
              <View style={[
                styles.checkbox,
                bookingData.selectedChildren.includes(child.name) && styles.checkboxSelected
              ]}>
                {bookingData.selectedChildren.includes(child.name) && (
                  <CheckCircle size={16} color="white" />
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.childInfo}>
            <Text style={styles.childHeaderName}>{child.name}</Text>
              <Text style={styles.childDetailsText}>{`Age ${child.age} • ${child.preferences}`}</Text>
              {child.allergies && child.allergies !== 'None' && (
                <Text style={styles.allergyWarning}>{`⚠️ Allergies: ${child.allergies}`}</Text>
              )}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Special Instructions</Text>
        <TextInput
          value={bookingData.specialInstructions}
          onChangeText={(text) => setBookingData({ ...bookingData, specialInstructions: text })}
          style={[styles.input, styles.multilineInput]}
          multiline
          placeholder="Any special instructions for the caregiver..."
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>Contact & Location</Text>
      
      <View style={styles.locationSection}>
        <Button
          mode="outlined"
          onPress={getCurrentLocation}
          loading={locationLoading}
          disabled={locationLoading}
          style={styles.gpsButton}
          icon="map-marker-outline"
        >
          {locationLoading ? 'Getting Location...' : 'Use Current Location (GPS)'}
        </Button>
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Address</Text>
        <TextInput
          value={bookingData.address}
          onChangeText={(text) => setBookingData({ ...bookingData, address: text })}
          style={[styles.input, styles.multilineInput]}
          multiline
          placeholder="Full address where care will be provided"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Contact Phone</Text>
        <TextInput
          value={bookingData.contactPhone}
          onChangeText={(text) => setBookingData({ ...bookingData, contactPhone: text })}
          style={styles.input}
          placeholder="Your phone number"
          keyboardType="phone-pad"
        />
      </View>

      <View>
        <Text style={styles.subsectionTitle}>Emergency Contact</Text>
        <View style={styles.emergencyContactContainer}>
          <TextInput
            value={bookingData.emergencyContact.name}
            onChangeText={(text) => setBookingData({
              ...bookingData,
              emergencyContact: { ...bookingData.emergencyContact, name: text }
            })}
            style={styles.input}
            placeholder="Emergency contact name"
          />
          <TextInput
            value={bookingData.emergencyContact.phone}
            onChangeText={(text) => setBookingData({
              ...bookingData,
              emergencyContact: { ...bookingData.emergencyContact, phone: text }
            })}
            style={styles.input}
            placeholder="Emergency contact phone"
            keyboardType="phone-pad"
          />
          <TextInput
            value={bookingData.emergencyContact.relation}
            onChangeText={(text) => setBookingData({
              ...bookingData,
              emergencyContact: { ...bookingData.emergencyContact, relation: text }
            })}
            style={styles.input}
            placeholder="Relationship (e.g., Spouse, Parent, Friend)"
          />
        </View>
      </View>
    </View>
  );

  const renderStep4 = () => {
    const calculateDuration = () => {
      if (!bookingData.startTime || !bookingData.endTime) return 0;
      const start = new Date(`2024-01-01T${convertTo24Hour(bookingData.startTime)}`);
      const end = new Date(`2024-01-01T${convertTo24Hour(bookingData.endTime)}`);
      return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
    };

    return (
      <ScrollView style={styles.reviewContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Review Booking Details</Text>
        
        {/* Caregiver Information */}
        <View style={styles.reviewCard}>
          <Text style={styles.reviewCardTitle}>Caregiver Information</Text>
          <View style={styles.caregiverHeader}>
            {caregiver?.avatar || caregiver?.profileImage ? (
              <Image 
                source={getImageSource(caregiver.avatar || caregiver.profileImage)}
                style={styles.reviewAvatar}
              />
            ) : (
              <View style={[styles.reviewAvatar, styles.avatarPlaceholder]}>
                <User size={24} color="#6b7280" />
              </View>
            )}
            <View style={styles.caregiverInfo}>
              <Text style={styles.caregiverName}>{caregiver.name}</Text>
              <Text style={styles.rateText}>₱{resolveHourlyRate()}/hour</Text>
            </View>
          </View>
        </View>

        {/* Schedule Details */}
        <View style={[styles.reviewCard, styles.scheduleCard]}>
          <Text style={styles.reviewCardTitle}>Schedule Details</Text>
          <View style={styles.scheduleDetails}>
            <View style={styles.scheduleRow}>
              <Calendar size={16} color="#3b82f6" />
              <Text style={styles.scheduleLabel}>Date:</Text>
              <Text style={styles.scheduleValue}>{bookingData.date ? new Date(bookingData.date).toLocaleDateString() : 'Not selected'}</Text>
            </View>
            <View style={styles.scheduleRow}>
              <Clock size={16} color="#3b82f6" />
              <Text style={styles.scheduleLabel}>Time:</Text>
              <Text style={styles.scheduleValue}>{bookingData.startTime} - {bookingData.endTime}</Text>
            </View>
            <View style={styles.scheduleRow}>
              <Clock size={16} color="#3b82f6" />
              <Text style={styles.scheduleLabel}>Duration:</Text>
              <Text style={styles.scheduleValue}>{calculateDuration().toFixed(1)} hours</Text>
            </View>
          </View>
        </View>

        {/* Children Details */}
        <View style={[styles.reviewCard, styles.childrenCard]}>
          <Text style={styles.reviewCardTitle}>Children Details</Text>
          <View style={styles.childrenReview}>
            {bookingData.selectedChildren.map((childName, index) => {
              const child = childrenList.find(c => c.name === childName);
              return (
                <View key={index} style={styles.childReviewItem}>
                  <View style={styles.childReviewHeader}>
                    <Baby size={16} color="#10b981" />
                    <Text style={styles.childReviewName}>{childName}</Text>
                    {child?.age && <Text style={styles.childReviewAge}>Age {child.age}</Text>}
                  </View>
                  {child?.allergies && child.allergies !== 'None' && (
                    <View style={styles.allergyReview}>
                      <AlertCircle size={14} color="#ef4444" />
                      <Text style={styles.allergyReviewText}>Allergies: {child.allergies}</Text>
                    </View>
                  )}
                  {child?.preferences && (
                    <Text style={styles.childPreferences}>Preferences: {child.preferences}</Text>
                  )}
                </View>
              );
            })}
          </View>
          {bookingData.specialInstructions && (
            <View style={styles.specialInstructionsReview}>
              <Text style={styles.instructionsLabel}>Special Instructions:</Text>
              <Text style={styles.instructionsText}>{bookingData.specialInstructions}</Text>
            </View>
          )}
        </View>

        {/* Location & Contact */}
        <View style={[styles.reviewCard, styles.locationCard]}>
          <Text style={styles.reviewCardTitle}>Location & Contact</Text>
          <View style={styles.locationReview}>
            <View style={styles.locationRow}>
              <MapPin size={16} color="#8b5cf6" />
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>Address:</Text>
                <Text style={styles.locationValue}>{bookingData.address}</Text>
              </View>
            </View>
            <View style={styles.locationRow}>
              <Phone size={16} color="#8b5cf6" />
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>Contact Phone:</Text>
                <Text style={styles.locationValue}>{bookingData.contactPhone}</Text>
              </View>
            </View>
          </View>
          
          {/* Emergency Contact */}
          {(bookingData.emergencyContact.name || bookingData.emergencyContact.phone) && (
            <View style={styles.emergencySummaryCard}>
              <View style={styles.emergencyContactHeader}>
                <AlertCircle size={16} color="#ef4444" />
                <Text style={styles.reviewCardTitle}>Emergency Contact</Text>
              </View>
              <View style={styles.emergencyContactReview}>
                {bookingData.emergencyContact.name && (
                  <Text style={styles.emergencyDetail}>
                    Name: {bookingData.emergencyContact.name}
                  </Text>
                )}
                {bookingData.emergencyContact.phone && (
                  <Text style={styles.emergencySummaryDetail}>
                  Phone: {bookingData.emergencyContact.phone}
                </Text>
                )}
                {bookingData.emergencyContact.relation && (
                  <Text style={styles.emergencyDetail}>
                    Relationship: {bookingData.emergencyContact.relation}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Cost Breakdown */}
        <View style={[styles.reviewCard, styles.costCard]}>
          <Text style={styles.reviewCardTitle}>Cost Breakdown</Text>
          <View style={styles.costBreakdown}>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Hourly Rate:</Text>
              <Text style={styles.costValue}>₱{resolveHourlyRate()}/hour</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Duration:</Text>
              <Text style={styles.costValue}>{calculateDuration().toFixed(1)} hours</Text>
            </View>
            <View style={[styles.costRow, styles.totalCostRow]}>
              <Text style={styles.totalCostLabel}>Total Amount:</Text>
              <Text style={styles.totalCostValue}>₱{calculateTotalCost()}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <ModalWrapper
      visible={visible}
      onClose={onClose}
      animationType="slide"
      style={styles.modalContainer}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        {/* Header */}
        <View style={styles.modalHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.caregiverAvatar}>
              {caregiver?.avatar || caregiver?.profileImage ? (
                <Image 
                  source={getImageSource(caregiver.avatar || caregiver.profileImage)}
                  style={styles.avatarImage} 
                />
              ) : (
                <User size={20} color="#6b7280" />
              )}
            </View>
            <View>
              <Text style={styles.modalTitle}>Book {caregiver?.name || "Caregiver"}</Text>
              <Text style={styles.stepIndicator}>Step {currentStep} of 4</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            {[1, 2, 3, 4].map((step) => (
              <View key={step} style={styles.progressStep}>
                <View style={[
                  styles.progressCircle,
                  step <= currentStep && styles.progressCircleActive
                ]}>
                  <Text style={[
                    styles.progressText,
                    step <= currentStep && styles.progressTextActive
                  ]}>
                    {step}
                  </Text>
                </View>
                {step < 4 && (
                  <View style={[
                    styles.progressLine,
                    step < currentStep && styles.progressLineActive
                  ]}/>
                )}
              </View>
            ))}
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>Schedule</Text>
            <Text style={styles.progressLabel}>Children</Text>
            <Text style={styles.progressLabel}>Contact</Text>
            <Text style={styles.progressLabel}>Review</Text>
          </View>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.contentContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </ScrollView>

        {submitError ? (
          <View style={styles.errorContainer}>
            <AlertCircle size={16} color="#ef4444" />
            <Text style={styles.errorText}>{submitError}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={styles.modalFooter}>
          <TouchableOpacity
            onPress={currentStep === 1 ? onClose : handlePrevStep}
            disabled={submitting}
            style={[
              styles.footerButton, 
              styles.secondaryButton, 
              submitting && styles.disabledButton
            ]}
          >
            <Text style={styles.secondaryButtonText}>{currentStep === 1 ? 'Close' : 'Previous'}</Text>
          </TouchableOpacity>
          
          {currentStep < 4 ? (
            <TouchableOpacity
              onPress={handleNextStep}
              disabled={!isStepValid() || submitting}
              style={[
                styles.footerButton, 
                styles.primaryButton, 
                (!isStepValid() || submitting) && styles.disabledButton
              ]}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={[
                styles.footerButton, 
                styles.successButton, 
                submitting && styles.disabledButton
              ]}
            >
              {submitting && <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />}
              <Text style={styles.primaryButtonText}>
                {submitting ? 'Submitting…' : 'Confirm Booking'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </ModalWrapper>
  );
};

const BookingDetailsModal = ({ 
  booking, 
  onClose, 
  onMessage, 
  onGetDirections, 
  onCompleteBooking,
  onCancelBooking,
  visible
}) => {
  
  // Enhanced booking data with defaults
  const enhancedBooking = booking;

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return { bg: '#e8f5e9', border: '#c8e6c9', text: '#2e7d32' };
      case 'pending':
        return { bg: '#fff8e1', border: '#ffecb3', text: '#ff8f00' };
      case 'completed':
        return { bg: '#e3f2fd', border: '#bbdefb', text: '#1976d2' };
      case 'cancelled':
        return { bg: '#ffebee', border: '#ffcdd2', text: '#d32f2f' };
      default:
        return { bg: '#f5f5f5', border: '#e0e0e0', text: '#616161' };
    }
  };

  const statusColors = getStatusColor(enhancedBooking.status);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, styles.detailsModalContainer]}>
          {/* Header */}
          <View style={[styles.modalHeader, styles.detailsHeader]}>
            <View style={styles.detailsHeaderContent}>
              <View style={styles.calendarIcon}>
                <Calendar size={24} color="#3b82f6" />
              </View>
              <View>
                <Text style={styles.modalTitle}>Booking Details</Text>
                <Text style={styles.stepIndicator}>{enhancedBooking.family}</Text>
              </View>
            </View>
            
            <View style={styles.headerRight}>
              <View 
                style={[
                  styles.statusBadge,
                  { 
                    backgroundColor: statusColors.bg,
                    borderColor: statusColors.border
                  }
                ]}
              >
                <Text style={[styles.statusText, { color: statusColors.text }]}>
                  {enhancedBooking.status.charAt(0).toUpperCase() + enhancedBooking.status.slice(1)}
                </Text>
              </View>
              
              <TouchableOpacity onPress={onClose}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.detailsContent}>
            {/* Booking Overview */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Booking Overview</Text>
              <View style={styles.overviewGrid}>
                <View style={styles.overviewItem}>
                  <Calendar size={20} color="#6b7280" />
                  <View>
                    <Text style={styles.overviewLabel}>Date</Text>
                    <Text style={styles.overviewValue}>{enhancedBooking.date}</Text>
                  </View>
                </View>
                <View style={styles.overviewItem}>
                  <Clock size={20} color="#6b7280" />
                  <View>
                    <Text style={styles.overviewLabel}>Time</Text>
                    <Text style={styles.overviewValue}>{enhancedBooking.time}</Text>
                  </View>
                </View>
                <View style={styles.overviewItem}>
                  <DollarSign size={20} color="#6b7280" />
                  <View>
                    <Text style={styles.overviewLabel}>Rate</Text>
                    <Text style={[styles.overviewValue, styles.rateValue]}>₱{enhancedBooking.hourlyRate}/hr</Text>
                  </View>
                </View>
                <View style={styles.overviewItem}>
                  <Star size={20} color="#6b7280" />
                  <View>
                    <Text style={styles.overviewLabel}>Total</Text>
                    <Text style={[styles.overviewValue, styles.totalValue]}>₱{enhancedBooking.totalAmount}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Location & Contact */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Location & Contact</Text>
              <View style={styles.contactSection}>
                <View style={styles.contactItem}>
                  <MapPin size={20} color="#6b7280" />
                  <View>
                    <Text style={styles.contactTitle}>{formatAddress(enhancedBooking.location)}</Text>
                    <Text style={styles.contactDetail}>{formatAddress(enhancedBooking.address)}</Text>
                  </View>
                </View>
                <View style={styles.contactItem}>
                  <Phone size={20} color="#6b7280" />
                  <View>
                    <Text style={styles.contactLabel}>Phone</Text>
                    <Text style={styles.contactValue}>{enhancedBooking.contactPhone}</Text>
                  </View>
                </View>
                <View style={styles.contactItem}>
                  <Mail size={20} color="#6b7280" />
                  <View>
                    <Text style={styles.contactLabel}>Email</Text>
                    <Text style={styles.contactValue}>{enhancedBooking.contactEmail}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Children Details */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Baby size={20} color="#10b981" />
                <Text style={styles.sectionTitle}>Children Details</Text>
              </View>
              <View style={styles.childrenSection}>
                {(booking?.selected_children || booking?.selectedChildren || enhancedBooking.childrenDetails)?.map((child, index) => {
                  const childData = typeof child === 'string' 
                    ? { name: child, age: 'Unknown', preferences: '', allergies: 'None' }
                    : child;
                  return (
                    <View key={index} style={styles.childCard}>
                      <View style={styles.childHeader}>
                        <Baby size={16} color="#10b981" />
                        <Text style={styles.childName}>{childData.name}</Text>
                        {childData.age && childData.age !== 'Unknown' && (
                          <Text style={styles.childAge}>Age {childData.age}</Text>
                        )}
                      </View>
                      
                      <View style={styles.childDetails}>
                        {childData.preferences && (
                          <Text style={styles.childDetail}>
                            <Text style={styles.detailLabel}>Preferences: </Text>
                            {childData.preferences}
                          </Text>
                        )}
                        {childData.specialInstructions && (
                          <Text style={styles.childDetail}>
                            <Text style={styles.detailLabel}>Special Instructions: </Text>
                            {childData.specialInstructions}
                          </Text>
                        )}
                        {childData.allergies && childData.allergies !== 'None' && (
                          <View style={styles.allergyContainer}>
                            <AlertCircle size={16} color="#ef4444" />
                            <Text style={styles.allergyText}>
                              <Text style={styles.allergyLabel}>Allergies: </Text>
                              {childData.allergies}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
              
              {/* Special Instructions */}
              {(booking?.special_instructions || booking?.specialInstructions) && (
                <View style={styles.specialInstructionsSection}>
                  <Text style={styles.instructionsLabel}>Special Instructions:</Text>
                  <Text style={styles.instructionsText}>
                    {booking.special_instructions || booking.specialInstructions}
                  </Text>
                </View>
              )}
            </View>

            {/* Requirements */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Requirements</Text>
              <View style={styles.requirementsContainer}>
                {enhancedBooking.requirements.map((req, index) => (
                  <View key={index} style={styles.requirementTag}>
                    <CheckCircle size={12} color="#10b981" />
                    <Text style={styles.requirementText}>{req}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Special Notes */}
            {enhancedBooking.notes && (
              <View style={styles.notesCard}>
                <Text style={styles.sectionTitle}>Special Notes</Text>
                <Text style={styles.notesText}>{enhancedBooking.notes}</Text>
              </View>
            )}

            {/* Emergency Contact */}
            <View style={styles.emergencyDetailsCard}>
              <View style={styles.sectionHeader}>
                <AlertCircle size={20} color="#ef4444" />
                <Text style={styles.sectionTitle}>Emergency Contact</Text>
              </View>
              <View style={styles.emergencyDetails}>
                <Text style={styles.emergencyDetail}>
                  <Text style={styles.detailLabel}>Name: </Text>
                  {enhancedBooking.emergencyContact.name}
                </Text>
                <Text style={styles.emergencyDetail}>
                  <Text style={styles.detailLabel}>Relation: </Text>
                  {enhancedBooking.emergencyContact.relation}
                </Text>
                <Text style={styles.emergencyDetailText}>
                <Text style={styles.detailLabel}>Phone: </Text>
                {enhancedBooking.emergencyContact.phone}
              </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.detailsFooter}>
            <TouchableOpacity
              onPress={onMessage}
              style={[styles.actionButton, styles.messageButton]}
            >
              <MessageCircle size={16} color="#3b82f6" />
              <Text style={styles.actionButtonText}>Message Family</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={onGetDirections}
              style={[styles.actionButton, styles.directionsButton]}
            >
              <Navigation size={16} color="#10b981" />
              <Text style={styles.actionButtonText}>Get Directions</Text>
            </TouchableOpacity>

            {enhancedBooking.status === 'confirmed' && (
              <TouchableOpacity
                onPress={onCompleteBooking}
                style={[styles.actionButton, styles.completeButton]}
              >
                <CheckCircle size={16} color="#ffffff" />
                <Text style={[styles.actionButtonText, styles.completeButtonText]}>Mark Complete</Text>
              </TouchableOpacity>
            )}

            {(enhancedBooking.status === 'pending' || enhancedBooking.status === 'confirmed') && (
              <TouchableOpacity
                onPress={onCancelBooking}
                style={[styles.actionButton, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancel Booking</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Common styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 10,
    width: '95%',
    maxWidth: 500,
    alignSelf: 'center',
    maxHeight: '95%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'white',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  caregiverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 15,
    padding: 1,
    fontWeight: '600',
    color: '#111827',
  },
  stepIndicator: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  closeButton: {
    padding: 1,
  },
  
  // BookingModal specific styles
  progressContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  progressCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircleActive: {
    backgroundColor: '#ec4899',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  progressTextActive: {
    color: 'white',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: '#ec4899',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  progressLabel: {
    fontSize: 10,
    color: '#6b7280',
    flex: 1,
    textAlign: 'center',
  },
  
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  stepContainer: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    minHeight: 44,
    width: '100%',
  },
  multilineInput: {
    minHeight: 50,
    textAlignVertical: 'top',
  },
  timeContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  timeInputContainer: {
    flex: 1,
    gap: 8,
  },
  costContainer: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 8,
    gap: 4,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costLabel: {
    color: '#374151',
  },
  costValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  costDetail: {
    fontSize: 14,
    color: '#4b5563',
  },
  
  childrenList: {
    gap: 12,
  },
  childItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#ec4899',
    borderColor: '#ec4899',
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontWeight: '600',
    color: '#111827',
  },
  childDetailsText: {
    fontSize: 14,
    color: '#6b7280',
  },
  allergyWarning: {
    fontSize: 14,
    color: '#ef4444',
  },
  
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  emergencyContactContainer: {
    gap: 12,
  },
  // Styles
childHeaderName: {
  fontWeight: '600',
  color: '#111827',
  flex: 1,
},
emergencySummaryDetail: {
  fontSize: 14,
  color: '#991b1b',
  fontWeight: '500',
},
emergencyDetailText: {
  fontSize: 14,
  color: '#991b1b',
},
  
  caregiverSummary: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
  },
  reviewContainer: {
    flex: 1,
  },
  reviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  scheduleCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  childrenCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  locationCard: {
    backgroundColor: '#faf5ff',
    borderColor: '#e9d5ff',
  },
  emergencyCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  costCard: {
    backgroundColor: '#f9fafb',
    borderColor: '#d1d5db',
  },
  reviewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleDetails: {
    gap: 8,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleLabel: {
    fontSize: 14,
    color: '#6b7280',
    minWidth: 60,
  },
  scheduleValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  childrenReview: {
    gap: 12,
  },
  childReviewItem: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  childReviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  childReviewName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  childReviewAge: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  allergyReview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    padding: 6,
    borderRadius: 6,
  },
  allergyReviewText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  childPreferences: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  specialInstructionsReview: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  instructionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 14,
    color: '#92400e',
  },
  locationReview: {
    gap: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  locationValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  emergencyContactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  emergencySummaryCard: {
    marginTop: 12,
    padding: 12,
  emergencyContactReview: {
    gap: 6,
  },
  emergencySummaryDetail: {
    fontSize: 14,
    color: '#991b1b',
    fontWeight: '500',
  },
  emergencyDetailText: {
    fontSize: 14,
    color: '#991b1b',
  },
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    minHeight: 36,
    flex: 1,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontWeight: '500',
    fontSize: 13,
  },
  messageButton: {
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  directionsButton: {
    backgroundColor: '#d1fae5',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  completeButton: {
    backgroundColor: '#3b82f6',
  },
  completeButtonText: {
    color: 'white',
    fontSize: 13,
  },
  cancelButton: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  cancelButtonText: {
    color: '#ef4444',
    fontWeight: '500',
    fontSize: 13,
  },
  specialInstructionsSection: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  
  // Location functionality styles
  locationSection: {
    marginBottom: 16,
  },
  gpsButton: {
    width: '100%',
  },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: '#e5e7eb',
      backgroundColor: 'white',
      gap: 12,
    },
    
    footerButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    
    secondaryButton: {
      backgroundColor: '#f3f4f6',
      borderWidth: 1,
      borderColor: '#d1d5db',
    },
    
    primaryButton: {
      backgroundColor: '#ec4899',
    },
    
    successButton: {
      backgroundColor: '#10b981',
      flexDirection: 'row',
      alignItems: 'center',
    },
    
    disabledButton: {
      opacity: 0.6,
    },
    
    secondaryButtonText: {
      color: '#374151',
      fontSize: 16,
      fontWeight: '500',
    },
    
    primaryButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
});

export default BookingModal;
export { BookingDetailsModal };
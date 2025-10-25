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
  Keyboard,
  Dimensions,
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
import SimpleDatePicker from '../../../shared/ui/inputs/SimpleDatePicker';
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
    });
    const keyboardWillHideListener = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, []);

  // Helper function to convert time to 24-hour format
  const convertTo24Hour = (time12h) => {
    if (!time12h) return '';
    
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    
    if (hours === '12') {
      hours = '00';
    }
    
    if (modifier === 'PM') {
      hours = parseInt(hours, 10) + 12;
    }
    
    return `${hours.padStart(2, '0')}:${minutes}`;
  };

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
        setBookingData(prev => ({ ...prev, address: formattedAddress.trim() }));
      }
    } catch (error) {
      Alert.alert('Location Error', error.message || 'Failed to get current location.');
    } finally {
      setLocationLoading(false);
    }
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
        <SimpleDatePicker
          label="Date"
          value={bookingData.date}
          onDateChange={(date) => setBookingData(prev => ({ ...prev, date }))}
          minimumDate={new Date()}
          placeholder="Select date"
          error={null}
          id="booking-date-picker"
        />
      </View>

      <View style={styles.timeContainer}>
        <View style={styles.timeInputContainer}>
          <TimePicker
            key="start-time-picker"
            value={bookingData.startTime}
            onTimeChange={(time) => {
              console.log('Start time selected:', time);
              setBookingData(prev => ({ ...prev, startTime: time }));
            }}
            label="Start Time"
            placeholder="Start"
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
              setBookingData(prev => ({ ...prev, endTime: time }));
            }}
            label="End Time"
            placeholder="End"
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
      
      {/* Step Navigation Buttons */}
      <View style={styles.stepNavigation}>
        <TouchableOpacity
          onPress={onClose}
          disabled={submitting}
          style={[
            styles.footerButton,
            styles.secondaryButton,
            submitting && styles.disabledButton
          ]}
        >
          <Text style={styles.secondaryButtonText}>Close</Text>
        </TouchableOpacity>

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
      </View>
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
                  setBookingData(prev => ({
                    ...prev,
                    selectedChildren: prev.selectedChildren.filter(name => name !== child.name)
                  }));
                } else {
                  setBookingData(prev => ({
                    ...prev,
                    selectedChildren: [...prev.selectedChildren, child.name]
                  }));
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
              <Text style={styles.childHeaderName} numberOfLines={1} ellipsizeMode="tail">
                {child.name}
              </Text>
              <Text style={styles.childDetailsText}>{`Age ${child.age} • ${child.preferences}`}</Text>
              {child.allergies && child.allergies !== 'None' && (
                <Text style={styles.allergyWarning} numberOfLines={2} ellipsizeMode="tail">
                  {`⚠️ Allergies: ${child.allergies}`}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Special Instructions</Text>
        <TextInput
          value={bookingData.specialInstructions}
          onChangeText={(text) => setBookingData(prev => ({ ...prev, specialInstructions: text }))}
          style={[styles.input, styles.multilineInput]}
          multiline
          placeholder="Any special instructions for the caregiver..."
        />
      </View>

      {/* Step Navigation Buttons */}
      <View style={styles.stepNavigation}>
        <TouchableOpacity
          onPress={handlePrevStep}
          disabled={submitting}
          style={[
            styles.footerButton,
            styles.secondaryButton,
            submitting && styles.disabledButton
          ]}
        >
          <Text style={styles.secondaryButtonText}>Previous</Text>
        </TouchableOpacity>

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
          onChangeText={(text) => setBookingData(prev => ({ ...prev, address: text }))}
          style={[styles.input, styles.multilineInput]}
          multiline
          placeholder="Full address where care will be provided"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Contact Phone</Text>
        <TextInput
          value={bookingData.contactPhone}
          onChangeText={(text) => setBookingData(prev => ({ ...prev, contactPhone: text }))}
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
            onChangeText={(text) => setBookingData(prev => ({
              ...prev,
              emergencyContact: { ...prev.emergencyContact, name: text }
            }))}
            style={styles.input}
            placeholder="Emergency contact name"
          />
          <TextInput
            value={bookingData.emergencyContact.phone}
            onChangeText={(text) => setBookingData(prev => ({
              ...prev,
              emergencyContact: { ...prev.emergencyContact, phone: text }
            }))}
            style={styles.input}
            placeholder="Emergency contact phone"
            keyboardType="phone-pad"
          />
          <TextInput
            value={bookingData.emergencyContact.relation}
            onChangeText={(text) => setBookingData(prev => ({
              ...prev,
              emergencyContact: { ...prev.emergencyContact, relation: text }
            }))}
            style={styles.input}
            placeholder="Relationship (e.g., Spouse, Parent, Friend)"
          />
        </View>
      </View>

      {/* Step Navigation Buttons */}
      <View style={styles.stepNavigation}>
        <TouchableOpacity
          onPress={handlePrevStep}
          disabled={submitting}
          style={[
            styles.footerButton,
            styles.secondaryButton,
            submitting && styles.disabledButton
          ]}
        >
          <Text style={styles.secondaryButtonText}>Previous</Text>
        </TouchableOpacity>

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
      <View style={styles.stepContainer}>
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
              <Text style={styles.caregiverName} numberOfLines={2} ellipsizeMode="tail">
                {caregiver.name}
              </Text>
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
                    <Text style={styles.childReviewName} numberOfLines={1} ellipsizeMode="tail">
                      {childName}
                    </Text>
                    {child?.age && <Text style={styles.childReviewAge}>Age {child.age}</Text>}
                  </View>
                  {child?.allergies && child.allergies !== 'None' && (
                    <View style={styles.allergyReview}>
                      <AlertCircle size={14} color="#ef4444" />
                      <Text style={styles.allergyReviewText}>Allergies: {child.allergies}</Text>
                    </View>
                  )}
                  {child?.preferences && (
                    <Text style={styles.childPreferences} numberOfLines={2} ellipsizeMode="tail">
                      Preferences: {child.preferences}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
          {bookingData.specialInstructions && (
            <View style={styles.specialInstructionsReview}>
              <Text style={styles.instructionsLabel}>Special Instructions:</Text>
              <Text style={styles.instructionsText} numberOfLines={3} ellipsizeMode="tail">
                {bookingData.specialInstructions}
              </Text>
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
                <Text style={styles.locationValue} numberOfLines={2} ellipsizeMode="tail">
                  {bookingData.address}
                </Text>
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
                  <Text style={styles.emergencyDetail} numberOfLines={1} ellipsizeMode="tail">
                    Name: {bookingData.emergencyContact.name}
                  </Text>
                )}
                {bookingData.emergencyContact.phone && (
                  <Text style={styles.emergencyDetail} numberOfLines={1} ellipsizeMode="tail">
                    Phone: {bookingData.emergencyContact.phone}
                  </Text>
                )}
                {bookingData.emergencyContact.relation && (
                  <Text style={styles.emergencyDetail} numberOfLines={1} ellipsizeMode="tail">
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
      </View>
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
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
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">
                Book {caregiver?.name || "Caregiver"}
              </Text>
              <Text style={styles.stepIndicator}>Step {currentStep} of 4</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityLabel="Close booking modal"
            accessibilityRole="button"
            accessibilityHint="Closes the booking form"
            activeOpacity={0.7}
          >
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

        {/* Content with Navigation */}
        <ScrollView
          style={styles.contentContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && (
            <View style={styles.stepContainer}>
              {renderStep4()}

              {/* Final Submit Button */}
              <View style={styles.stepNavigation}>
                <TouchableOpacity
                  onPress={handlePrevStep}
                  disabled={submitting}
                  style={[
                    styles.footerButton,
                    styles.secondaryButton,
                    submitting && styles.disabledButton
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>Previous</Text>
                </TouchableOpacity>

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
                    {submitting ? 'Submitting…' : 'Confirm'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {submitError ? (
          <View style={styles.errorContainer}>
            <AlertCircle size={16} color="#ef4444" />
            <Text style={styles.errorText}>{submitError}</Text>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </ModalWrapper>
  );
};

const styles = StyleSheet.create({
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
    paddingHorizontal: 0, // Ensure no horizontal padding conflicts
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'white',
    minHeight: 64,
    paddingRight: 8, // Extra padding for close button
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12, // Space between content and close button
    minWidth: 0,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    minWidth: 0, // Allow text to shrink but don't expand
  },
  stepIndicator: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 20,
    backgroundColor: '#f8fafc', // Subtle background for visibility
    borderWidth: 1,
    borderColor: '#e5e7eb',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    paddingHorizontal: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
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
    marginBottom: 16,
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
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  timeContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  timeInputContainer: {
    flex: 1,
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
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
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
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
  },
  checkboxContainer: {
    marginRight: 12,
    marginTop: 2,
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
    minWidth: 0, // Allow text to shrink
  },
  childHeaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  childDetailsText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  allergyWarning: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
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
  stepNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
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
  caregiverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  caregiverInfo: {
    flex: 1,
    minWidth: 0, // Allow text to shrink
    justifyContent: 'center',
  },
  caregiverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 20,
  },
  rateText: {
    fontSize: 14,
    color: '#ec4899',
    fontWeight: '500',
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
  costCard: {
    backgroundColor: '#f9fafb',
    borderColor: '#d1d5db',
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
    minWidth: 0, // Allow text to shrink
  },
  childReviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0, // Allow text to shrink
  },
  childReviewName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    minWidth: 0, // Allow text to shrink
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
    minWidth: 0, // Allow text to shrink
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
  emergencySummaryCard: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  emergencyContactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  emergencyContactReview: {
    gap: 4,
  },
  emergencyDetail: {
    fontSize: 14,
    color: '#991b1b',
  },
  costBreakdown: {
    gap: 8,
  },
  totalCostRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    marginTop: 4,
  },
  totalCostLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  totalCostValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  locationSection: {
    marginBottom: 16,
  },
  gpsButton: {
    borderColor: '#3b82f6',
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
});

export default BookingModal;
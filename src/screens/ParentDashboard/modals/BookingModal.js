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
import { getCurrentDeviceLocation, searchLocation } from '../../../utils/locationUtils';
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
  const [locationSearchVisible, setLocationSearchVisible] = useState(false);
  const [locationSearchText, setLocationSearchText] = useState('');
  const [locationSearchResults, setLocationSearchResults] = useState([]);
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);

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

  const handleLocationSearch = async () => {
    if (!locationSearchText.trim()) return;
    
    try {
      setLocationSearchLoading(true);
      const result = await searchLocation(locationSearchText);
      setLocationSearchResults([result]);
    } catch (error) {
      Alert.alert('Search Failed', error.message || 'Failed to search location.');
    } finally {
      setLocationSearchLoading(false);
    }
  };

  const selectLocationFromSearch = (location) => {
    if (location && location.address) {
      const formattedAddress = `${location.address.street || ''} ${location.address.city || ''}, ${location.address.province || ''}`;
      setBookingData({ ...bookingData, address: formattedAddress.trim() });
      setLocationSearchVisible(false);
      setLocationSearchText('');
      setLocationSearchResults([]);
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
      status: 'pending_confirmation',
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
              <Text style={styles.childName}>{child.name}</Text>
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
        
        <Button
          mode="outlined"
          onPress={() => setLocationSearchVisible(true)}
          style={styles.searchButton}
          icon="magnify"
        >
          Search Location
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

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>Booking Summary</Text>
      
      {/* Caregiver Info */}
      <View style={styles.caregiverSummary}>
        <View style={styles.caregiverHeader}>
          {caregiver?.avatar || caregiver?.profileImage ? (
            <Image 
              source={getImageSource(caregiver.avatar || caregiver.profileImage)}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }]}>
              <User size={32} color="#6b7280" />
            </View>
          )}
          <View style={styles.caregiverInfo}>
            <Text style={styles.caregiverName}>{caregiver.name}</Text>
            <Text style={styles.rateText}>₱{resolveHourlyRate()}/hr</Text>
          </View>
        </View>
      </View>
      
      <View style={[styles.summaryRow, styles.totalRow]}>
        <Text style={styles.totalLabel}>Total Amount:</Text>
        <Text style={styles.totalAmount}>₱{calculateTotalCost()}</Text>
      </View>
    </View>
  );

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
      
      {/* Location Search Modal */}
      <Modal
        visible={locationSearchVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLocationSearchVisible(false)}
      >
        <View style={styles.searchModalOverlay}>
          <View style={styles.searchModalContainer}>
            <View style={styles.searchModalHeader}>
              <Text style={styles.searchModalTitle}>Search Location</Text>
              <TouchableOpacity onPress={() => setLocationSearchVisible(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchModalContent}>
              <TextInput
                value={locationSearchText}
                onChangeText={setLocationSearchText}
                style={styles.searchInput}
                placeholder="Enter address or location"
                onSubmitEditing={handleLocationSearch}
                returnKeyType="search"
              />
              
              <Button
                mode="contained"
                onPress={handleLocationSearch}
                loading={locationSearchLoading}
                style={styles.searchSubmitButton}
              >
                Search
              </Button>
              
              {locationSearchLoading && (
                <View style={styles.searchLoading}>
                  <ActivityIndicator size="small" color="#3b82f6" />
                  <Text style={styles.searchLoadingText}>Searching...</Text>
                </View>
              )}
              
              {locationSearchResults.length > 0 && (
                <View style={styles.searchResults}>
                  {locationSearchResults.map((result, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.searchResultItem}
                      onPress={() => selectLocationFromSearch(result)}
                    >
                      <MapPin size={20} color="#3b82f6" />
                      <Text style={styles.searchResultText}>
                        {result.address.formatted}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </ModalWrapper>
  );
}

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
  const enhancedBooking = {
    ...booking,
    location: booking.location || "Cebu City",
    address: booking.address || "123 Osmeña Blvd, Cebu City, 6000 Cebu",
    contactPhone: booking.contactPhone || "0917 123 4567",
    contactEmail: booking.contactEmail || "delacruz.family@email.ph",
    totalHours: booking.totalHours || 4,
    totalAmount: booking.totalAmount || (booking.hourlyRate * 4),
    requirements: booking.requirements || ["CPR Certified", "Background Check", "Non-smoker"],
    childrenDetails: booking.childrenDetails || [
      {
        name: "Maya",
        age: 3,
        specialInstructions: "Loves puzzles and quiet activities",
        allergies: "None",
        preferences: "Story time before nap"
      },
      {
        name: "Miguel", 
        age: 5,
        specialInstructions: "Needs help with homework",
        allergies: "Peanuts",
        preferences: "Outdoor play, building blocks"
      }
    ],
    emergencyContact: booking.emergencyContact || {
      name: "Dra. Ana Dela Cruz",
      phone: "0918 987 6543",
      relation: "Mother"
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return { bg: '#e8f5e9', border: '#c8e6c9', text: '#2e7d32' };
      case 'pending':
      case 'pending_confirmation':
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
                <Baby size={20} color="#6b7280" />
                <Text style={styles.sectionTitle}>Children Details</Text>
              </View>
              <View style={styles.childrenSection}>
                {enhancedBooking.childrenDetails.map((child, index) => (
                  <View key={index} style={styles.childCard}>
                    <View style={styles.childHeader}>
                      <Text style={styles.childName}>{child.name}</Text>
                      <Text style={styles.childAge}>Age {child.age}</Text>
                    </View>
                    
                    <View style={styles.childDetails}>
                      <Text style={styles.childDetail}>
                        <Text style={styles.detailLabel}>Preferences: </Text>
                        {child.preferences}
                      </Text>
                      <Text style={styles.childDetail}>
                        <Text style={styles.detailLabel}>Special Instructions: </Text>
                        {child.specialInstructions}
                      </Text>
                      {child.allergies && child.allergies !== 'None' && (
                        <View style={styles.allergyContainer}>
                          <AlertCircle size={16} color="#ef4444" />
                          <Text style={styles.allergyText}>
                            <Text style={styles.allergyLabel}>Allergies: </Text>
                            {child.allergies}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
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
            <View style={styles.emergencyCard}>
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
                <Text style={styles.emergencyDetail}>
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

            {(enhancedBooking.status === 'pending_confirmation' || enhancedBooking.status === 'confirmed') && (
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
}

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
  
  caregiverSummary: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
  },
  caregiverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  caregiverName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#111827',
  },
  rateText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  
  summaryDetails: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: '#6b7280',
  },
  summaryValue: {
    fontWeight: '500',
    color: '#111827',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#111827',
  },
  totalAmount: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#10b981',
  },
  
  modalFooter: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: 'white',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fef2f2',
    borderTopWidth: 1,
    borderTopColor: '#fecaca',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    flex: 1,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 44,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: '500',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  successButton: {
    backgroundColor: '#10b981',
  },
  
  // BookingDetailsModal specific styles
  detailsModalContainer: {
    maxWidth: 500,
    marginHorizontal: 20,
    marginVertical: 40,
    borderRadius: 20,
    maxHeight: '90%',
  },
  detailsHeader: {
    backgroundColor: '#eff6ff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  detailsHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calendarIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontWeight: '500',
    fontSize: 14,
  },
  
  detailsContent: {
    padding: 16,
  },
  sectionCard: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  overviewItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overviewLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  overviewValue: {
    fontWeight: '500',
    color: '#111827',
  },
  rateValue: {
    color: '#3b82f6',
  },
  totalValue: {
    color: '#10b981',
  },
  
  contactSection: {
    gap: 16,
  },
  contactItem: {
    flexDirection: 'row',
    gap: 12,
  },
  contactTitle: {
    fontWeight: '600',
    color: '#111827',
  },
  contactDetail: {
    fontSize: 14,
    color: '#6b7280',
  },
  contactLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  contactValue: {
    fontWeight: '500',
    color: '#111827',
  },
  
  childrenSection: {
    gap: 12,
  },
  childCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
  },
  childHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  childAge: {
    fontSize: 14,
    color: '#6b7280',
  },
  childDetails: {
    gap: 4,
  },
  childDetail: {
    fontSize: 14,
    color: '#374151',
  },
  detailLabel: {
    fontWeight: '500',
  },
  allergyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  allergyText: {
    fontSize: 14,
    color: '#ef4444',
  },
  allergyLabel: {
    fontWeight: '500',
  },
  
  requirementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  requirementTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  requirementText: {
    fontSize: 14,
    color: '#065f46',
  },
  
  notesCard: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  notesText: {
    color: '#92400e',
  },
  
  emergencyCard: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  emergencyDetails: {
    gap: 8,
  },
  emergencyDetail: {
    fontSize: 14,
    color: '#991b1b',
  },
  
  detailsFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
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
  
  // Location functionality styles
  locationSection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  gpsButton: {
    flex: 1,
  },
  searchButton: {
    flex: 1,
  },
  
  // Location search modal styles
  searchModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchModalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  searchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  searchModalContent: {
    padding: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  searchSubmitButton: {
    marginBottom: 16,
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  searchLoadingText: {
    color: '#6b7280',
  },
  searchResults: {
    gap: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  searchResultText: {
    flex: 1,
    color: '#374151',
  },
});

export default BookingModal;
export { BookingDetailsModal };

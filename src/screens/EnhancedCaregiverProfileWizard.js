import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  StyleSheet,
} from 'react-native';
import {
  TextInput,
  Button,
  Chip,
  Card,
  ProgressBar,
  Snackbar,
  Portal,
  Dialog,
  Avatar,
  HelperText,
  Divider,
  Badge,
  IconButton,
  Switch,
  Menu,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomDateTimePicker from '../shared/ui/inputs/DateTimePicker';
import TimePicker from '../shared/ui/inputs/TimePicker';
import { useAuth } from '../contexts/AuthContext';
import { VALIDATION, CURRENCY, FEATURES } from '../config/constants';
import { styles } from './styles/EnhancedCaregiverProfileWizard.styles';
import { getCurrentDeviceLocation, searchLocation, validateLocation, formatLocationForDisplay } from '../utils/locationUtils';
import { handleUploadError } from '../utils/imageUploadUtils';
import { supabase } from '../config/supabase';
import { supabaseService } from '../services/supabaseService';
import imageUploadService from '../services/imageUploadService';

const { width } = Dimensions.get('window');

const ENHANCED_STEPS = [
  { id: 'basic', title: 'Basic Information', icon: 'person-outline' },
  { id: 'location', title: 'Address & Location', icon: 'map-marker-outline' },
  { id: 'professional', title: 'Professional Details', icon: 'briefcase-outline' },
  { id: 'skills', title: 'Skills & Certifications', icon: 'school-outline' },
  { id: 'documents', title: 'Legal Documents', icon: 'document-text-outline' },
  { id: 'ageCare', title: 'Age Care Specialization', icon: 'heart-outline' },
  { id: 'portfolio', title: 'Portfolio & Gallery', icon: 'images-outline' },
  { id: 'availability', title: 'Availability Calendar', icon: 'calendar-outline' },
  { id: 'emergency', title: 'Emergency Contacts', icon: 'call-outline' },
  { id: 'verification', title: 'Background Check', icon: 'shield-checkmark-outline' },
  { id: 'review', title: 'Review & Submit', icon: 'checkmark-circle-outline' },
];

const SUGGESTED_SKILLS = [
  'Infant Care', 'Toddler Care', 'School Age Care', 'Special Needs Care',
  'Meal Preparation', 'Light Housekeeping', 'Homework Help', 'Transportation',
  'First Aid Certified', 'CPR Certified', 'Early Childhood Education',
  'Bilingual', 'Pet Care', 'Overnight Care', 'Emergency Care', 'Newborn Care',
  'Potty Training', 'Sleep Training', 'Behavioral Management', 'Arts & Crafts'
];

const DOCUMENT_TYPES = [
  { key: 'government_id', label: 'Government ID', required: true, description: 'Driver\'s License, Passport, or National ID' },
  { key: 'birth_certificate', label: 'Birth Certificate', required: false, description: 'Official birth certificate' },
  { key: 'first_aid_cert', label: 'First Aid Certificate', required: false, description: 'Valid first aid certification' },
  { key: 'cpr_cert', label: 'CPR Certificate', required: false, description: 'Valid CPR certification' },
  { key: 'childcare_cert', label: 'Childcare Certificate', required: false, description: 'Early childhood education or childcare certification' },
  { key: 'medical_clearance', label: 'Medical Clearance', required: false, description: 'Health certificate or medical clearance' },
  { key: 'police_clearance', label: 'Police Clearance', required: false, description: 'Background check or police clearance' },
  { key: 'other', label: 'Other Documents', required: false, description: 'Any other relevant documents' }
];

// Map frontend document keys to backend enum values expected by Mongoose schema
// Backend enums: ['id', 'certification', 'reference', 'medical', 'insurance', 'other']
const DOCUMENT_TYPE_MAP = {
  government_id: 'id',
  birth_certificate: 'id',
  first_aid_cert: 'certification',
  cpr_cert: 'certification',
  childcare_cert: 'certification',
  medical_clearance: 'medical',
  police_clearance: 'reference',
  other: 'other',
};

// Allowed age care enums as per backend schema
const ALLOWED_AGE_CARE_ENUMS = ['INFANT', 'TODDLER', 'PRESCHOOL', 'SCHOOL_AGE', 'TEEN'];

const AGE_CARE_RANGES = [
  { key: 'INFANT', label: 'Infants (0-12 months)', description: 'Newborn care, feeding, diaper changes' },
  { key: 'TODDLER', label: 'Toddlers (1-3 years)', description: 'Active supervision, potty training' },
  { key: 'PRESCHOOL', label: 'Preschoolers (3-5 years)', description: 'Educational activities, social skills' },
  { key: 'SCHOOL_AGE', label: 'School Age (5-12 years)', description: 'Homework help, after-school care' },
  { key: 'TEEN', label: 'Teenagers (12-18 years)', description: 'Mentoring, transportation, supervision' },
];

const PORTFOLIO_CATEGORIES = [
  { key: 'activity', label: 'Activities', icon: 'game-controller-outline' },
  { key: 'meal_prep', label: 'Meal Prep', icon: 'restaurant-outline' },
  { key: 'educational', label: 'Educational', icon: 'book-outline' },
  { key: 'outdoor', label: 'Outdoor', icon: 'leaf-outline' },
  { key: 'craft', label: 'Arts & Crafts', icon: 'brush-outline' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const EnhancedCaregiverProfileWizard = ({ navigation, route }) => {
  const { user } = useAuth();
  const { isEdit = false, existingProfile = null } = route.params || {};
  
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  
  // Location search state
  const [locationSearchVisible, setLocationSearchVisible] = useState(false);
  const [locationSearchText, setLocationSearchText] = useState('');
  const [locationSearchResults, setLocationSearchResults] = useState([]);
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);
  
  // Additional state variables
  const [bioMenuVisible, setBioMenuVisible] = useState(false);
  const [experienceMenuVisible, setExperienceMenuVisible] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [documentUploading, setDocumentUploading] = useState(false);

  const autoSaveTimer = useRef(null);
  const scrollRef = useRef(null);

  // Enhanced form state
  const [formData, setFormData] = useState({
    // Basic Information
    name: existingProfile?.name || '',
    email: existingProfile?.email || user?.email || '',
    phone: existingProfile?.phone || '',
    bio: existingProfile?.bio || '',
    profileImage: existingProfile?.profileImage || '',
    
    // Professional Details
    experience: {
      years: existingProfile?.experience?.years || 0,
      months: existingProfile?.experience?.months || 0,
      description: existingProfile?.experience?.description || '',
    },
    hourlyRate: existingProfile?.hourlyRate?.toString() || '',
    education: existingProfile?.education || '',
    languages: existingProfile?.languages || [],
    
    // Skills & Certifications
    skills: existingProfile?.skills || [],
    certifications: existingProfile?.certifications || [],
    
    // Age Care Specialization
    ageCareRanges: existingProfile?.ageCareRanges || [],
    
    // Portfolio
    portfolio: {
      images: existingProfile?.portfolio?.images || [],
      videos: existingProfile?.portfolio?.videos || [],
    },
    
    // Enhanced Availability
    availability: {
      days: existingProfile?.availability?.days || [],
      hours: existingProfile?.availability?.hours || { start: '08:00', end: '18:00' },
      flexible: existingProfile?.availability?.flexible || false,
      weeklySchedule: existingProfile?.availability?.weeklySchedule || {},
      notes: existingProfile?.availability?.notes || '',
    },
    
    // Emergency Contacts
    emergencyContacts: existingProfile?.emergencyContacts || [],
    
    // Address & Location
    address: {
      street: existingProfile?.address?.street || '',
      city: existingProfile?.address?.city || '',
      province: existingProfile?.address?.province || '',
      zipCode: existingProfile?.address?.zipCode || '',
      country: existingProfile?.address?.country || 'Philippines',
      coordinates: existingProfile?.address?.coordinates || null,
      useCurrentLocation: false,
    },

    // Legal Documents
    documents: existingProfile?.documents || [],

    // Background Check
    backgroundCheck: {
      requestBackgroundCheck: false,
      agreeToTerms: false,
    },
  });

  const [tempInputs, setTempInputs] = useState({
    newSkill: '',
    newCertification: '',
    newLanguage: '',
    portfolioCaption: '',
    emergencyContactForm: {
      name: '',
      relationship: '',
      phone: '',
      email: '',
      address: '',
      isPrimary: false,
    },
    certificateFile: null,
    certIssueDate: null,
    certExpiryDate: null,
  });



// Enhanced profile image upload using Supabase
const handleProfileImageUpload = async () => {
  try {
    setUploading(true);
    const result = await imageUploadService.pickAndUploadProfileImage(user.id);
    
    if (result?.url) {
      updateFormData('profileImage', result.url);
      showSnackbar('Profile image uploaded successfully');
    }
  } catch (error) {
    console.error('Profile image upload failed:', error);
    Alert.alert('Upload Failed', error.message || 'Failed to upload profile image');
  } finally {
    setUploading(false);
  }
};

  // Enhanced validation with childcare-specific rules
  const validateField = (field, value) => {
    const newErrors = { ...errors };
    
    switch (field) {
      case 'name':
        if (!value || value.length < VALIDATION.NAME_MIN_LENGTH) {
          newErrors.name = `Name must be at least ${VALIDATION.NAME_MIN_LENGTH} characters`;
        } else {
          delete newErrors.name;
        }
        break;
        
      case 'experience.years': {
        const years = parseInt(value);
        if (isNaN(years) || years < 0 || years > VALIDATION.EXPERIENCE_MAX_YEARS) {
          newErrors.experienceYears = `Experience must be between 0 and ${VALIDATION.EXPERIENCE_MAX_YEARS} years`;
        } else {
          delete newErrors.experienceYears;
        }
        break;
      }
        
      case 'experience.description':
        if (!value || value.length < 50) {
          newErrors.experienceDescription = 'Please provide at least 50 characters describing your experience';
        } else {
          delete newErrors.experienceDescription;
        }
        break;
        
      case 'ageCareRanges':
        if (!value || value.length === 0) {
          newErrors.ageCareRanges = 'Please select at least one age range you can care for';
        } else {
          delete newErrors.ageCareRanges;
        }
        break;
        
      case 'emergencyContacts':
        if (!value || value.length < VALIDATION.EMERGENCY_CONTACTS_MIN) {
          newErrors.emergencyContacts = `Please add at least ${VALIDATION.EMERGENCY_CONTACTS_MIN} emergency contact`;
        } else {
          delete newErrors.emergencyContacts;
        }
        break;
        
      case 'phone':
        if (!value || value.trim() === '' || value === '+63') {
          newErrors.phone = 'Please enter a valid phone number';
        } else {
          delete newErrors.phone;
        }
        break;
        
      case 'bio':
        if (!value || value.length < 20) {
          newErrors.bio = 'Please provide a bio with at least 20 characters';
        } else {
          delete newErrors.bio;
        }
        break;
        
      case 'hourlyRate': {
        const rate = parseFloat(value);
        if (isNaN(rate) || rate < VALIDATION.HOURLY_RATE_MIN || rate > VALIDATION.HOURLY_RATE_MAX) {
          newErrors.hourlyRate = `Hourly rate must be between ${VALIDATION.HOURLY_RATE_MIN} and ${VALIDATION.HOURLY_RATE_MAX}`;
        } else {
          delete newErrors.hourlyRate;
        }
        break;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateFormData = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, value);
  };

  // Optimized portfolio image upload using Supabase
  const handlePortfolioImageUpload = async () => {
    try {
      if (formData.portfolio.images.length >= VALIDATION.PORTFOLIO_MAX_IMAGES) {
        Alert.alert('Limit Reached', `You can only upload up to ${VALIDATION.PORTFOLIO_MAX_IMAGES} images`);
        return;
      }

      setUploading(true);
      const result = await imageUploadService.pickAndUploadProfileImage(user.id);
      
      if (result?.url) {
        const newImage = {
          url: result.url,
          caption: tempInputs.portfolioCaption || '',
          category: 'other',
          uploadedAt: new Date(),
        };
        
        updateFormData('portfolio', {
          ...formData.portfolio,
          images: [...formData.portfolio.images, newImage]
        });
        
        setTempInputs(prev => ({ ...prev, portfolioCaption: '' }));
        showSnackbar('Portfolio image added successfully');
      }
    } catch (error) {
      console.error('Portfolio image upload failed:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload portfolio image');
    } finally {
      setUploading(false);
    }
  };

  // Emergency contact management
  const addEmergencyContact = () => {
    const contact = tempInputs.emergencyContactForm;
    if (!contact.name || !contact.relationship || !contact.phone) {
      Alert.alert('Missing Information', 'Please fill in name, relationship, and phone number');
      return;
    }

    if (formData.emergencyContacts.length >= VALIDATION.EMERGENCY_CONTACTS_MAX) {
      Alert.alert('Limit Reached', `You can only add up to ${VALIDATION.EMERGENCY_CONTACTS_MAX} emergency contacts`);
      return;
    }

    const newContact = { ...contact, id: Date.now().toString() };
    updateFormData('emergencyContacts', [...formData.emergencyContacts, newContact]);
    
    setTempInputs(prev => ({
      ...prev,
      emergencyContactForm: {
        name: '',
        relationship: '',
        phone: '',
        email: '',
        address: '',
        isPrimary: false,
      }
    }));
  };

  const removeEmergencyContact = (contactId) => {
    updateFormData('emergencyContacts', 
      formData.emergencyContacts.filter(contact => contact.id !== contactId)
    );
  };

  // GPS Location functionality
  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      
      const locationData = await getCurrentDeviceLocation();
      
      if (locationData && locationData.address) {
        updateFormData('address', {
          ...formData.address,
          street: locationData.address.street || '',
          city: locationData.address.city || '',
          province: locationData.address.province || '',
          country: locationData.address.country || 'Philippines',
          zipCode: locationData.address.postalCode || '',
          coordinates: locationData.coordinates,
        });
        showSnackbar('Location updated successfully');
      }
    } catch (error) {
      console.error('Location fetch failed:', error);
      Alert.alert('Location Error', error.message || 'Failed to get current location. Please try again.');
    } finally {
      setLocationLoading(false);
    }
  };

  // Location search functionality
  const handleLocationSearch = async () => {
    if (!locationSearchText.trim()) return;
    
    try {
      setLocationSearchLoading(true);
      const result = await searchLocation(locationSearchText);
      setLocationSearchResults([result]); // Convert to array for consistency
    } catch (error) {
      console.error('Location search failed:', error);
      Alert.alert('Search Failed', error.message || 'Failed to search location. Please try again.');
    } finally {
      setLocationSearchLoading(false);
    }
  };

  const selectLocationFromSearch = (location) => {
    if (location && location.address) {
      updateFormData('address', {
        ...formData.address,
        street: location.address.street || '',
        city: location.address.city || '',
        province: location.address.province || '',
        country: location.address.country || 'Philippines',
        zipCode: location.address.postalCode || '',
        coordinates: location.coordinates,
      });
      setLocationSearchVisible(false);
      setLocationSearchText('');
      setLocationSearchResults([]);
      showSnackbar('Location selected successfully');
    }
  };

  // Document upload functionality using Supabase
  const handleDocumentUpload = async (documentType) => {
    try {
      setDocumentUploading(true);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Check file size (max 10MB)
        if (asset.size > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select a file smaller than 10MB.');
          return;
        }

        // Convert document to base64 for upload
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: 'base64',
        });

        console.log('📄 Uploading document:', documentType.label);
        const response = await supabaseService.uploadProfileImage(user.id, base64);
        
        if (response?.url) {
          const newDocument = {
            id: Date.now().toString(),
            type: documentType.key,
            label: documentType.label,
            url: response.url,
            fileName: asset.name,
            uploadedAt: new Date(),
            verified: false,
          };
          
          const updatedDocuments = [...formData.documents, newDocument];
          updateFormData('documents', updatedDocuments);
          showSnackbar(`${documentType.label} uploaded successfully`);
        }
      }
    } catch (error) {
      console.error('Document upload failed:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload document. Please try again.');
    } finally {
      setDocumentUploading(false);
    }
  };

  // Certificate upload with file attachment using Supabase
  const addCertificationWithFile = async () => {
    const certName = tempInputs.newCertification.trim();
    if (!certName) {
      Alert.alert('Missing Information', 'Please enter a certification name.');
      return;
    }

    try {
      let certificateUrl = null;
      
      if (tempInputs.certificateFile) {
        setUploading(true);
        const response = await supabaseService.uploadProfileImage(user.id, tempInputs.certificateFile);
        certificateUrl = response?.url;
      }

      const newCertification = {
        id: Date.now().toString(),
        name: certName,
        fileUrl: certificateUrl,
        uploadedAt: new Date(),
        verified: false,
      };

      updateFormData('certifications', [...formData.certifications, newCertification]);
      setTempInputs(prev => ({ 
        ...prev, 
        newCertification: '', 
        certificateFile: null 
      }));
      showSnackbar('Certification added successfully');
    } catch (error) {
      console.error('Certificate upload failed:', error);
      Alert.alert('Upload Failed', 'Failed to upload certificate. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Background check request (UI only)
  const requestBackgroundCheck = async () => {
    try {
      setLoading(true);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      showSnackbar('Background check request submitted successfully');
      updateFormData('backgroundCheck', {
        ...formData.backgroundCheck,
        requestBackgroundCheck: true
      });
      
      Alert.alert(
        'Request Submitted',
        'Your background check request has been submitted. You will be notified once the verification is complete.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Background check request failed:', error);
      Alert.alert('Request Failed', 'Failed to submit background check request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    const step = ENHANCED_STEPS[currentStep];
    
    switch (step.id) {
      case 'basic':
        return renderBasicInformation();
      case 'location':
        return renderAddressLocation();
      case 'professional':
        return renderProfessionalDetails();
      case 'skills':
        return renderSkillsAndCertifications();
      case 'documents':
        return renderLegalDocuments();
      case 'ageCare':
        return renderAgeCareSpecialization();
      case 'portfolio':
        return renderPortfolioGallery();
      case 'availability':
        return renderAvailabilityCalendar();
      case 'emergency':
        return renderEmergencyContacts();
      case 'verification':
        return renderBackgroundCheck();
      case 'review':
        return renderReview();
      default:
        return null;
    }
  };

  const renderAgeCareSpecialization = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Age Care Specialization</Text>
      <Text style={styles.stepDescription}>
        Select the age ranges you're comfortable caring for. This helps parents find the right caregiver for their children.
      </Text>

      <View style={styles.ageCareContainer}>
        {AGE_CARE_RANGES.map((range) => (
          <TouchableOpacity
            key={range.key}
            style={[
              styles.ageCareCard,
              formData.ageCareRanges.includes(range.key) && styles.ageCareCardSelected
            ]}
            onPress={() => {
              const ranges = formData.ageCareRanges.includes(range.key)
                ? formData.ageCareRanges.filter(r => r !== range.key)
                : [...formData.ageCareRanges, range.key];
              updateFormData('ageCareRanges', ranges);
            }}
          >
            <View style={styles.ageCareHeader}>
              <Text style={[
                styles.ageCareLabel,
                formData.ageCareRanges.includes(range.key) && styles.ageCareSelectedText
              ]}>
                {range.label}
              </Text>
              {formData.ageCareRanges.includes(range.key) && (
                <Ionicons name="checkmark-circle" size={24} color="#6366f1" />
              )}
            </View>
            <Text style={styles.ageCareDescription}>{range.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <HelperText type="error" visible={!!errors.ageCareRanges}>
        {errors.ageCareRanges}
      </HelperText>
    </View>
  );

  const renderPortfolioGallery = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Portfolio & Gallery</Text>
      <Text style={styles.stepDescription}>
        Showcase your childcare experience with photos of activities, meals, and educational moments.
      </Text>

      <View style={styles.portfolioUploadSection}>
        <TextInput
          label="Photo Caption (Optional)"
          value={tempInputs.portfolioCaption}
          onChangeText={(text) => setTempInputs(prev => ({ ...prev, portfolioCaption: text }))}
          mode="outlined"
          style={styles.input}
          placeholder="Describe this photo..."
        />
        
        <Button
          mode="contained"
          onPress={handlePortfolioImageUpload}
          loading={uploading}
          disabled={uploading || formData.portfolio.images.length >= VALIDATION.PORTFOLIO_MAX_IMAGES}
          style={styles.uploadButton}
          icon="camera"
        >
          Add Portfolio Photo ({formData.portfolio.images.length}/{VALIDATION.PORTFOLIO_MAX_IMAGES})
        </Button>
      </View>

      <View style={styles.portfolioGrid}>
        {formData.portfolio.images.map((image, index) => (
          <View key={index} style={styles.portfolioItem}>
            <Image source={{ uri: image.url }} style={styles.portfolioImage} />
            <Text style={styles.portfolioCaption} numberOfLines={2}>
              {image.caption || 'No caption'}
            </Text>
            <IconButton
              icon="close"
              size={20}
              onPress={() => {
                const updatedImages = formData.portfolio.images.filter((_, i) => i !== index);
                updateFormData('portfolio', { ...formData.portfolio, images: updatedImages });
              }}
              style={styles.portfolioRemoveButton}
            />
          </View>
        ))}
      </View>
    </View>
  );

  const renderEmergencyContacts = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Emergency Contacts</Text>
      <Text style={styles.stepDescription}>
        Provide emergency contact information for safety and trust.
      </Text>

      <Card style={styles.emergencyContactForm}>
        <Card.Content>
          <Text style={styles.formSectionTitle}>Add Emergency Contact</Text>
          
          <TextInput
            label="Full Name *"
            value={tempInputs.emergencyContactForm.name}
            onChangeText={(text) => setTempInputs(prev => ({
              ...prev,
              emergencyContactForm: { ...prev.emergencyContactForm, name: text }
            }))}
            mode="outlined"
            style={styles.input}
          />
          
          <TextInput
            label="Relationship *"
            value={tempInputs.emergencyContactForm.relationship}
            onChangeText={(text) => setTempInputs(prev => ({
              ...prev,
              emergencyContactForm: { ...prev.emergencyContactForm, relationship: text }
            }))}
            mode="outlined"
            style={styles.input}
            placeholder="e.g., Mother, Father, Spouse, Friend"
          />
          
          <TextInput
            label="Phone Number *"
            value={tempInputs.emergencyContactForm.phone}
            onChangeText={(text) => setTempInputs(prev => ({
              ...prev,
              emergencyContactForm: { ...prev.emergencyContactForm, phone: text }
            }))}
            mode="outlined"
            style={styles.input}
            keyboardType="phone-pad"
          />
          
          <Button
            mode="contained"
            onPress={addEmergencyContact}
            style={styles.addButton}
            disabled={formData.emergencyContacts.length >= VALIDATION.EMERGENCY_CONTACTS_MAX}
          >
            Add Contact
          </Button>
        </Card.Content>
      </Card>

      <View style={styles.emergencyContactsList}>
        <Text style={styles.formSectionTitle}>
          Emergency Contacts ({formData.emergencyContacts.length})
        </Text>
        
        {formData.emergencyContacts.map((contact, index) => (
          <Card key={contact.id || index} style={styles.emergencyContactCard}>
            <Card.Content>
              <View style={styles.emergencyContactHeader}>
                <Text style={styles.emergencyContactName}>{contact.name}</Text>
                <IconButton
                  icon="close"
                  size={20}
                  onPress={() => removeEmergencyContact(contact.id)}
                />
              </View>
              <Text style={styles.emergencyContactDetail}>
                {contact.relationship} • {contact.phone}
              </Text>
              {contact.email && (
                <Text style={styles.emergencyContactDetail}>{contact.email}</Text>
              )}
            </Card.Content>
          </Card>
        ))}
      </View>

      <HelperText type="error" visible={!!errors.emergencyContacts}>
        {errors.emergencyContacts}
      </HelperText>
    </View>
  );

  const renderBackgroundCheck = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Background Check & Verification</Text>
      <Text style={styles.stepDescription}>
        Complete your background check to build trust with parents and increase your bookings.
      </Text>

      <Card style={styles.backgroundCheckCard}>
        <Card.Content>
          <View style={styles.backgroundCheckHeader}>
            <Ionicons name="shield-checkmark" size={48} color="#6366f1" />
            <Text style={styles.backgroundCheckTitle}>Professional Background Check</Text>
          </View>
          
          <Text style={styles.backgroundCheckDescription}>
            Our background check includes:
          </Text>
          
          <View style={styles.backgroundCheckFeatures}>
            <Text style={styles.backgroundCheckFeature}>• Criminal history verification</Text>
            <Text style={styles.backgroundCheckFeature}>• Identity verification</Text>
            <Text style={styles.backgroundCheckFeature}>• Employment history check</Text>
            <Text style={styles.backgroundCheckFeature}>• Reference verification</Text>
          </View>
          
          <View style={styles.backgroundCheckActions}>
            <View style={styles.checkboxContainer}>
              <Switch
                value={formData.backgroundCheck.agreeToTerms}
                onValueChange={(value) => updateFormData('backgroundCheck', {
                  ...formData.backgroundCheck,
                  agreeToTerms: value
                })}
              />
              <Text style={styles.checkboxLabel}>
                I agree to the background check terms and conditions
              </Text>
            </View>
            
            <Button
              mode="contained"
              onPress={requestBackgroundCheck}
              disabled={!formData.backgroundCheck.agreeToTerms || formData.backgroundCheck.requestBackgroundCheck}
              loading={loading}
              style={styles.backgroundCheckButton}
            >
              {formData.backgroundCheck.requestBackgroundCheck ? 'Background Check Requested' : 'Request Background Check'}
            </Button>
          </View>
        </Card.Content>
      </Card>
    </View>
  );

  // Auto-save functionality - optimized to reduce refreshes
  useEffect(() => {
    const saveToStorage = async () => {
      try {
        await AsyncStorage.setItem(
          `@enhanced_caregiver_profile_draft_${user?.id}`,
          JSON.stringify({ formData, currentStep, timestamp: Date.now() })
        );
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    };

    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = setTimeout(() => {
      if (Object.keys(touched).length > 0) {
        setAutoSaving(true);
        saveToStorage().finally(() => {
          setTimeout(() => setAutoSaving(false), 100);
        });
      }
    }, 20000); // Set to 20 seconds

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [formData, currentStep, user?.id, touched]);

  // Reset profile image error when image URL changes
  useEffect(() => {
    setProfileImageError(false);
  }, [formData.profileImage]);

  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  // Normalize certifications on component mount
  useEffect(() => {
    if (formData.certifications.some(cert => typeof cert === 'object')) {
      const stringCerts = formData.certifications
        .filter(cert => cert && (typeof cert === 'string' || cert.name))
        .map(cert => typeof cert === 'string' ? cert : cert.name);
      updateFormData('certifications', stringCerts);
    }
  }, []);

  const validateCurrentStep = () => {
    const step = ENHANCED_STEPS[currentStep];
    let isValid = true;
    
    switch (step.id) {
      case 'basic':
        isValid = validateField('name', formData.name) && 
                 validateField('phone', formData.phone) &&
                 validateField('bio', formData.bio);
        break;
      case 'location':
        // Enhanced location validation
        isValid = validateLocation(formData.address);
        if (!isValid) {
          setErrors(prev => ({
            ...prev,
            location: 'Please provide at least city and province information'
          }));
        } else {
          setErrors(prev => ({ ...prev, location: undefined }));
        }
        break;
      case 'ageCare':
        isValid = formData.ageCareRanges && formData.ageCareRanges.length > 0;
        if (!isValid) {
          setErrors(prev => ({ ...prev, ageCareRanges: 'Please select at least one age range you can care for' }));
        } else {
          setErrors(prev => ({ ...prev, ageCareRanges: undefined }));
        }
        break;
      case 'emergency':
        isValid = formData.emergencyContacts && formData.emergencyContacts.length > 0;
        if (!isValid) {
          setErrors(prev => ({ ...prev, emergencyContacts: 'Please add at least 1 emergency contact' }));
        } else {
          setErrors(prev => ({ ...prev, emergencyContacts: undefined }));
        }
        break;
      case 'professional': {
        const experienceValid = formData.experience.description && formData.experience.description.length >= 50;
        const hourlyRateValid = formData.hourlyRate && parseFloat(formData.hourlyRate) >= 50 && parseFloat(formData.hourlyRate) <= 2000;
        
        if (!experienceValid) {
          setErrors(prev => ({ ...prev, experienceDescription: 'Please provide at least 50 characters describing your experience' }));
        }
        if (!hourlyRateValid) {
          setErrors(prev => ({ ...prev, hourlyRate: 'Hourly rate must be between 50 and 2000' }));
        }
        
        isValid = experienceValid && hourlyRateValid;
        break;
      }
      case 'skills':
        isValid = formData.skills.length > 0;
        if (!isValid) {
          setErrors(prev => ({ ...prev, skills: 'Please add at least one skill' }));
        } else {
          setErrors(prev => ({ ...prev, skills: undefined }));
        }
        break;
    }
    
    return isValid;
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      if (currentStep < ENHANCED_STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
    } else {
      Alert.alert('Validation Error', 'Please complete all required fields before proceeding.');
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const submitProfile = async () => {
    if (!validateCurrentStep()) {
      Alert.alert('Validation Error', 'Please complete all required fields before submitting.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Validate location
      if (!validateLocation(formData.address)) {
        Alert.alert('Location Error', 'Please provide a valid location with at least city and province information.');
        setLoading(false);
        return;
      }
      
      // Normalize enums and required fields to match backend expectations
      const normalizedCertifications = formData.certifications
        .filter(cert => cert && (typeof cert === 'string' || cert.name))
        .map(cert => typeof cert === 'string' ? cert : cert.name);

      const normalizedAgeCareRanges = (formData.ageCareRanges || [])
        .map(v => (typeof v === 'string' ? v.trim().toUpperCase() : ''))
        .filter(v => ALLOWED_AGE_CARE_ENUMS.includes(v));

      const normalizedDocuments = (formData.documents || []).map(doc => {
        const frontendType = typeof doc.type === 'string' ? doc.type : '';
        const mappedType = DOCUMENT_TYPE_MAP[frontendType] || 'other';
        return {
          ...doc,
          type: mappedType,
          name: doc.name || doc.label || doc.fileName || 'Document',
        };
      });

      // Split data between users table and caregiver_profiles table
      const userProfileData = {
        name: formData.name,
        phone: formData.phone && formData.phone.trim() !== '+63' ? formData.phone : '+639123456789',
        bio: formData.bio,
        profile_image: formData.profileImage,
        address: [formData.address.street, formData.address.city, formData.address.province].filter(Boolean).join(', '),
        location: [formData.address.city, formData.address.province].filter(Boolean).join(', '),
        role: 'caregiver',
        hourly_rate: parseFloat(formData.hourlyRate) || 0,
        skills: formData.skills,
        experience: formData.experience.description || '',
      };

      const caregiverProfileData = {
        user_id: user.id,
        bio: formData.bio,
        experience: formData.experience.description || '',
        skills: formData.skills,
        certifications: normalizedCertifications,
        hourly_rate: parseFloat(formData.hourlyRate) || 0,
        availability: formData.availability,
        background_check_status: formData.backgroundCheck?.requestBackgroundCheck ? 'requested' : 'pending',
        // Store complex data structures as JSONB
        age_care_ranges: normalizedAgeCareRanges,
        emergency_contacts: formData.emergencyContacts,
        portfolio: formData.portfolio,
        documents: normalizedDocuments,
        education: formData.education,
        languages: formData.languages,
        address: {
          street: formData.address.street,
          city: formData.address.city,
          province: formData.address.province,
          zipCode: formData.address.zipCode,
          country: formData.address.country,
          coordinates: formData.address.coordinates
        }
      };

      console.log('📤 USER PROFILE DATA:', JSON.stringify(userProfileData, null, 2));
      console.log('📤 CAREGIVER PROFILE DATA:', JSON.stringify(caregiverProfileData, null, 2));

      // Update user profile first
      console.log('🔄 Updating user profile...');
      await supabaseService.updateProfile(user.id, userProfileData);
      
      // All complex data is now stored in caregiver_profiles table above
      
      // Then create/update caregiver profile
      console.log('🔄 Creating/updating caregiver profile...');
      const { data, error } = await supabase
        .from('caregiver_profiles')
        .upsert(caregiverProfileData, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('📦 Caregiver profile data stored:', JSON.stringify(caregiverProfileData, null, 2));
      
      const result = data;
      console.log('✅ CAREGIVER PROFILE SUCCESS');
      
      if (!isEdit) {
        await AsyncStorage.removeItem(`@enhanced_caregiver_profile_draft_${user?.id}`);
      }
      
      if (result) {
        showSnackbar(isEdit ? 'Profile updated successfully' : 'Profile created successfully');
        
        setTimeout(() => {
          navigation.navigate('CaregiverDashboard', { refreshProfile: Date.now() });
        }, 1000);
      }

    } catch (error) {
      console.error('❌ Profile submission failed:', error);
      
      let errorMessage = 'Failed to save profile. Please try again.';
      if (error.response?.status === 404) {
        errorMessage = 'Profile endpoint not found. Please check backend.';
      } else if (error.response?.status === 401 || error.message.includes('401')) {
        errorMessage = 'Session expired. Please login again.';
        setTimeout(() => {
          navigation.navigate('Welcome');
        }, 2000);
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Submission Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderProgressIndicator = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>
          Step {currentStep + 1} of {ENHANCED_STEPS.length}
        </Text>
        <Text style={styles.progressSubtitle}>
          {ENHANCED_STEPS[currentStep].title}
        </Text>
        {autoSaving && (
          <View style={styles.autoSaveIndicator}>
            <ActivityIndicator size="small" color="#6366f1" />
            <Text style={styles.autoSaveText}>Auto-saving...</Text>
          </View>
        )}
      </View>
      <ProgressBar 
        progress={(currentStep + 1) / ENHANCED_STEPS.length} 
        color="#6366f1"
        style={styles.progressBar}
      />
    </View>
  );



  const renderBasicInformation = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      <Text style={styles.stepDescription}>
        Let's start with your basic information to create your caregiver profile.
      </Text>

      <Card style={styles.profileImageCard}>
        <Card.Content>
          <Text style={styles.cardTitle}>Profile Photo</Text>
          <View style={styles.photoSection}>
            <TouchableOpacity onPress={handleProfileImageUpload} disabled={uploading}>
              {uploading ? (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator size="large" color="#6366f1" />
                  <Text style={styles.uploadingText}>Uploading...</Text>
                </View>
              ) : formData.profileImage && !profileImageError ? (
                <View style={styles.profileImageContainer}>
                  <Image 
                    source={{ 
                      uri: formData.profileImage.startsWith('/') 
                        ? `${getCurrentSocketURL() || ''}${formData.profileImage}` 
                        : formData.profileImage,
                      cache: 'reload'
                    }}
                    style={styles.profileImageDisplay}
                    onError={(error) => {
                      console.log('Profile image load error:', error);
                      setProfileImageError(true);
                    }}
                    onLoad={() => setProfileImageError(false)}
                  />
                </View>
              ) : (
                <Avatar.Icon 
                  size={120} 
                  icon="camera" 
                  style={styles.profileImagePlaceholder}
                />
              )}
            </TouchableOpacity>
            <Text style={styles.photoHint}>Tap to add profile photo</Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.basicInfoCard}>
        <Card.Content>
          <Text style={styles.cardTitle}>Personal Information</Text>
          
          <TextInput
            label="Full Name *"
            value={formData.name}
            onChangeText={(text) => updateFormData('name', text)}
            mode="outlined"
            style={styles.input}
            error={!!errors.name}
            left={<TextInput.Icon icon="account" />}
          />
          <HelperText type="error" visible={!!errors.name}>
            {errors.name}
          </HelperText>

          <TextInput
            label="Phone Number *"
            value={formData.phone}
            onChangeText={(text) => updateFormData('phone', text)}
            mode="outlined"
            style={styles.input}
            keyboardType="phone-pad"
            error={!!errors.phone}
            left={<TextInput.Icon icon="phone" />}
          />
          <HelperText type="error" visible={!!errors.phone}>
            {errors.phone}
          </HelperText>
        </Card.Content>
      </Card>

      <Card style={styles.bioCard}>
        <Card.Content>
          <Text style={styles.cardTitle}>About Me</Text>
          
          <Menu
            visible={bioMenuVisible}
            onDismiss={() => setBioMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setBioMenuVisible(true)}
                style={[styles.input, { marginBottom: 8 }]}
                contentStyle={{ justifyContent: 'flex-start' }}
                icon="format-list-bulleted"
              >
                Choose bio template or write custom
              </Button>
            }
          >
            <Menu.Item
              onPress={() => {
                updateFormData('bio', "Hi! I'm a caring and experienced nanny who loves working with children. I create fun, educational activities and prioritize safety. I'm reliable, patient, and committed to helping your family.");
                setBioMenuVisible(false);
              }}
              title="Caring & Experienced Nanny"
            />
            <Menu.Item
              onPress={() => {
                updateFormData('bio', "Professional childcare provider with CPR certification. I specialize in infant care, meal prep, and homework help. Your children's safety and happiness are my top priorities.");
                setBioMenuVisible(false);
              }}
              title="Professional Childcare Provider"
            />
            <Menu.Item
              onPress={() => {
                updateFormData('bio', "Energetic babysitter who loves creating fun activities for kids! I'm great with bedtime routines, outdoor play, and keeping children engaged. References available upon request.");
                setBioMenuVisible(false);
              }}
              title="Energetic Babysitter"
            />
          </Menu>

          <TextInput
            label="Bio / About Me"
            value={formData.bio}
            onChangeText={(text) => updateFormData('bio', text)}
            mode="outlined"
            style={styles.input}
            multiline
            numberOfLines={4}
            placeholder="Tell parents about yourself, your experience, and what makes you special..."
            error={!!errors.bio}
            left={<TextInput.Icon icon="text" />}
          />
          <HelperText type="error" visible={!!errors.bio}>
            {errors.bio}
          </HelperText>
        </Card.Content>
      </Card>
    </View>
  );

  const renderProfessionalDetails = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Professional Details</Text>
      <Text style={styles.stepDescription}>
        Share your professional background and experience with childcare.
      </Text>

      <View style={styles.experienceSection}>
        <Text style={styles.sectionTitle}>Experience *</Text>
        <View style={styles.experienceRow}>
          <TextInput
            label="Years"
            value={formData.experience.years.toString()}
            onChangeText={(text) => updateFormData('experience.years', parseInt(text) || 0)}
            mode="outlined"
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            keyboardType="numeric"
            error={!!errors.experienceYears}
          />
          <TextInput
            label="Months"
            value={formData.experience.months.toString()}
            onChangeText={(text) => updateFormData('experience.months', parseInt(text) || 0)}
            mode="outlined"
            style={[styles.input, { flex: 1, marginLeft: 8 }]}
            keyboardType="numeric"
          />
        </View>
        <HelperText type="error" visible={!!errors.experienceYears}>
          {errors.experienceYears}
        </HelperText>
      </View>

      <View>
        <Menu
          visible={experienceMenuVisible}
          onDismiss={() => setExperienceMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setExperienceMenuVisible(true)}
              style={[styles.input, { marginBottom: 8 }]}
              contentStyle={{ justifyContent: 'flex-start' }}
              icon="format-list-bulleted"
            >
              Choose template or write custom
            </Button>
          }
        >
          <Menu.Item
            onPress={() => {
              updateFormData('experience.description', "I have 2+ years of professional childcare experience working with children aged 6 months to 12 years. I'm skilled in creating engaging activities, managing daily routines, and ensuring child safety at all times.");
              setExperienceMenuVisible(false);
            }}
            title="2+ Years Professional Experience"
          />
          <Menu.Item
            onPress={() => {
              updateFormData('experience.description', "With 5+ years of experience as a nanny and babysitter, I specialize in infant care, meal preparation, and educational activities. I hold CPR certification and have excellent references from previous families.");
              setExperienceMenuVisible(false);
            }}
            title="5+ Years Nanny & Babysitter"
          />
          <Menu.Item
            onPress={() => {
              updateFormData('experience.description', "I'm an experienced childcare provider with 3+ years working in daycare centers and private homes. I excel at managing multiple children, homework assistance, and maintaining structured schedules while keeping kids happy and engaged.");
              setExperienceMenuVisible(false);
            }}
            title="3+ Years Daycare & Private Homes"
          />
        </Menu>
        
        <TextInput
          label="Experience Description *"
          value={formData.experience.description}
          onChangeText={(text) => updateFormData('experience.description', text)}
          mode="outlined"
          style={styles.input}
          multiline
          numberOfLines={4}
          placeholder="Describe your childcare experience in detail (minimum 50 characters)..."
          error={!!errors.experienceDescription}
          left={<TextInput.Icon icon="briefcase" />}
        />
      </View>
      <HelperText type="error" visible={!!errors.experienceDescription}>
        {errors.experienceDescription}
      </HelperText>

      <TextInput
        label={`Hourly Rate (${CURRENCY.SYMBOL}) *`}
        value={formData.hourlyRate}
        onChangeText={(text) => updateFormData('hourlyRate', text)}
        mode="outlined"
        style={styles.input}
        keyboardType="numeric"
        placeholder={`${VALIDATION.HOURLY_RATE_MIN} - ${VALIDATION.HOURLY_RATE_MAX}`}
        error={!!errors.hourlyRate}
        left={<TextInput.Icon icon="currency-php" />}
      />
      <HelperText type="error" visible={!!errors.hourlyRate}>
        {errors.hourlyRate}
      </HelperText>

      <TextInput
        label="Education Background"
        value={formData.education}
        onChangeText={(text) => updateFormData('education', text)}
        mode="outlined"
        style={styles.input}
        placeholder="e.g., Bachelor's in Early Childhood Education"
        left={<TextInput.Icon icon="school" />}
      />
    </View>
  );

  const renderSkillsAndCertifications = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Skills & Certifications</Text>
      <Text style={styles.stepDescription}>
        Highlight your skills and certifications to stand out to parents.
      </Text>

      <View style={styles.skillsSection}>
        <Text style={styles.sectionTitle}>Skills *</Text>
        <View style={styles.suggestedSkills}>
          <Text style={styles.suggestedTitle}>Suggested Skills:</Text>
          <View style={styles.chipContainer}>
            {SUGGESTED_SKILLS.map((skill) => (
              <Chip
                key={skill}
                mode={formData.skills.includes(skill) ? 'flat' : 'outlined'}
                selected={formData.skills.includes(skill)}
                onPress={() => {
                  if (formData.skills.includes(skill)) {
                    updateFormData('skills', formData.skills.filter(s => s !== skill));
                  } else {
                    updateFormData('skills', [...formData.skills, skill]);
                  }
                }}
                style={styles.chip}
              >
                {skill}
              </Chip>
            ))}
          </View>
        </View>

        <View style={styles.addSkillContainer}>
          <TextInput
            label="Add Custom Skill"
            value={tempInputs.newSkill}
            onChangeText={(text) => setTempInputs(prev => ({ ...prev, newSkill: text }))}
            mode="outlined"
            style={styles.addInput}
            onSubmitEditing={() => {
              const skill = tempInputs.newSkill.trim();
              if (skill && !formData.skills.includes(skill)) {
                updateFormData('skills', [...formData.skills, skill]);
                setTempInputs(prev => ({ ...prev, newSkill: '' }));
              }
            }}
            returnKeyType="done"
          />
          <Button
            mode="contained"
            onPress={() => {
              const skill = tempInputs.newSkill.trim();
              if (skill && !formData.skills.includes(skill)) {
                updateFormData('skills', [...formData.skills, skill]);
                setTempInputs(prev => ({ ...prev, newSkill: '' }));
              }
            }}
            disabled={!tempInputs.newSkill.trim()}
            style={styles.addButton}
          >
            Add
          </Button>
        </View>

        <View style={styles.selectedSkills}>
          <Text style={styles.selectedTitle}>Your Skills ({formData.skills.length}):</Text>
          <View style={styles.chipContainer}>
            {formData.skills.map((skill) => (
              <Chip
                key={skill}
                mode="flat"
                onClose={() => updateFormData('skills', formData.skills.filter(s => s !== skill))}
                style={styles.selectedChip}
              >
                {skill}
              </Chip>
            ))}
          </View>
        </View>
      </View>

      <Divider style={styles.divider} />

      <View style={styles.certificationsSection}>
        <Text style={styles.sectionTitle}>Certifications</Text>
        <View style={styles.addSkillContainer}>
          <TextInput
            label="Add Certification"
            value={tempInputs.newCertification}
            onChangeText={(text) => setTempInputs(prev => ({ ...prev, newCertification: text }))}
            mode="outlined"
            style={styles.addInput}
            placeholder="e.g., CPR Certified, First Aid"
          />
          
          <Button
            mode="contained"
            onPress={() => {
              const cert = tempInputs.newCertification.trim();
              if (cert) {
                updateFormData('certifications', [...formData.certifications, cert]);
                setTempInputs(prev => ({ ...prev, newCertification: '' }));
              }
            }}
            disabled={!tempInputs.newCertification.trim()}
            style={styles.addButton}
          >
            Add Certificate
          </Button>
        </View>

        <View style={styles.selectedSkills}>
          <Text style={styles.selectedTitle}>Your Certifications ({formData.certifications.length}):</Text>
          <View style={styles.certificationsContainer}>
            {formData.certifications.map((cert, index) => (
              <Card key={index} style={styles.certificationCard}>
                <Card.Content>
                  <View style={styles.certificationHeader}>
                    <Text style={styles.certificationName}>
                      {typeof cert === 'string' ? cert : (cert?.name || 'Unnamed Certificate')}
                    </Text>
                    <IconButton
                      icon="close"
                      size={20}
                      onPress={() => {
                        const updatedCerts = formData.certifications.filter((_, i) => i !== index);
                        updateFormData('certifications', updatedCerts);
                      }}
                    />
                  </View>
                  {cert?.verified && (
                    <Badge style={styles.verifiedBadge}>Verified</Badge>
                  )}
                </Card.Content>
              </Card>
            ))}
          </View>
        </View>
      </View>
    </View>
  );

  // Address & Location render function
  const renderAddressLocation = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Address & Location</Text>
      <Text style={styles.stepDescription}>
        Provide your address information to help parents find caregivers in their area.
      </Text>

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

      {/* Location Search Dialog */}
      <Portal>
        <Dialog 
          visible={locationSearchVisible} 
          onDismiss={() => setLocationSearchVisible(false)}
          style={styles.locationDialog}
        >
          <Dialog.Title>Search Location</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Enter address or location"
              value={locationSearchText}
              onChangeText={setLocationSearchText}
              mode="outlined"
              style={styles.input}
              onSubmitEditing={handleLocationSearch}
              returnKeyType="search"
            />
            
            {locationSearchLoading && (
              <View style={styles.searchLoading}>
                <ActivityIndicator size="small" color="#6366f1" />
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
                    <Ionicons name="location-outline" size={20} color="#6366f1" />
                    <Text style={styles.searchResultText}>
                      {result.address?.formatted || 'Unknown location'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLocationSearchVisible(false)}>Cancel</Button>
            <Button onPress={handleLocationSearch} loading={locationSearchLoading}>
              Search
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <TextInput
        label="Street Address"
        value={formData.address.street}
        onChangeText={(text) => updateFormData('address', { ...formData.address, street: text })}
        mode="outlined"
        style={styles.input}
        placeholder="123 Main Street, Barangay Name"
        left={<TextInput.Icon icon="home" />}
      />

      <View style={styles.addressRow}>
        <TextInput
          label="City *"
          value={formData.address.city}
          onChangeText={(text) => updateFormData('address', { ...formData.address, city: text })}
          mode="outlined"
          style={[styles.input, { flex: 1, marginRight: 8 }]}
          placeholder="Cebu City"
          error={!!errors.location}
        />
        <TextInput
          label="Province *"
          value={formData.address.province}
          onChangeText={(text) => updateFormData('address', { ...formData.address, province: text })}
          mode="outlined"
          style={[styles.input, { flex: 1, marginLeft: 8 }]}
          placeholder="Cebu"
          error={!!errors.location}
        />
      </View>

      <HelperText type="error" visible={!!errors.location}>
        {errors.location}
      </HelperText>

      <View style={styles.addressRow}>
        <TextInput
          label="ZIP Code"
          value={formData.address.zipCode}
          onChangeText={(text) => updateFormData('address', { ...formData.address, zipCode: text })}
          mode="outlined"
          style={[styles.input, { flex: 1, marginRight: 8 }]}
          keyboardType="numeric"
          placeholder="6000"
        />
        <TextInput
          label="Country"
          value={formData.address.country}
          onChangeText={(text) => updateFormData('address', { ...formData.address, country: text })}
          mode="outlined"
          style={[styles.input, { flex: 1, marginLeft: 8 }]}
          placeholder="Philippines"
        />
      </View>

      {formData.address.coordinates && (
        <View style={styles.coordinatesDisplay}>
          <Ionicons name="location" size={16} color="#6366f1" />
          <Text style={styles.coordinatesText}>
            GPS: {formData.address.coordinates.latitude?.toFixed(6) || 'N/A'}, {formData.address.coordinates.longitude?.toFixed(6) || 'N/A'}
          </Text>
        </View>
      )}
    </View>
  );

  // Legal Documents render function
  const renderLegalDocuments = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Legal Documents</Text>
      <Text style={styles.stepDescription}>
        Upload your legal documents to build trust with parents and verify your identity.
      </Text>

      <View style={styles.documentsGrid}>
        {DOCUMENT_TYPES.map((docType) => {
          const existingDoc = formData.documents.find(doc => doc.type === docType.key);
          
          return (
            <Card key={docType.key} style={styles.documentCard}>
              <Card.Content>
                <View style={styles.documentHeader}>
                  <Text style={styles.documentTitle}>
                    {docType.label}
                    {docType.required && <Text style={styles.requiredText}> *</Text>}
                  </Text>
                  {existingDoc && (
                    <Badge style={styles.uploadedBadge}>Uploaded</Badge>
                  )}
                </View>
                
                <Text style={styles.documentDescription}>{docType.description}</Text>
                
                {existingDoc ? (
                  <View style={styles.uploadedDocument}>
                    <View style={styles.documentInfo}>
                      <Ionicons name="document-text" size={20} color="#6366f1" />
                      <Text style={styles.documentFileName}>{existingDoc.fileName}</Text>
                    </View>
                    <View style={styles.documentActions}>
                      {existingDoc.verified && (
                        <Badge style={styles.verifiedBadge}>Verified</Badge>
                      )}
                      <IconButton
                        icon="close"
                        size={16}
                        onPress={() => {
                          const updatedDocs = formData.documents.filter(doc => doc.id !== existingDoc.id);
                          updateFormData('documents', updatedDocs);
                        }}
                      />
                    </View>
                  </View>
                ) : (
                  <Button
                    mode="outlined"
                    onPress={() => handleDocumentUpload(docType)}
                    loading={documentUploading}
                    disabled={documentUploading}
                    style={styles.uploadButton}
                    icon="upload"
                  >
                    Upload {docType.label}
                  </Button>
                )}
              </Card.Content>
            </Card>
          );
        })}
      </View>

      <View style={styles.documentsSummary}>
        <Text style={styles.summaryTitle}>Upload Summary</Text>
        <Text style={styles.summaryText}>
          {formData.documents.length} of {DOCUMENT_TYPES.length} document types uploaded
        </Text>
        <Text style={styles.summarySubtext}>
          Required documents: {DOCUMENT_TYPES.filter(dt => dt.required).length} | 
          Uploaded required: {formData.documents.filter(doc => DOCUMENT_TYPES.find(dt => dt.key === doc.type && dt.required)).length}
        </Text>
      </View>
    </View>
  );

  const renderAvailabilityCalendar = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Availability Calendar</Text>
      <Text style={styles.stepDescription}>
        Let parents know when you're available to provide childcare services.
      </Text>

      <View style={styles.availabilitySection}>
        <Text style={styles.sectionTitle}>Available Days *</Text>
        <View style={styles.daysContainer}>
          {DAYS_OF_WEEK.map((day) => (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayButton,
                formData.availability.days.includes(day) && styles.dayButtonSelected
              ]}
              onPress={() => {
                const days = formData.availability.days.includes(day)
                  ? formData.availability.days.filter(d => d !== day)
                  : [...formData.availability.days, day];
                updateFormData('availability', { ...formData.availability, days });
              }}
            >
              <Text style={[
                styles.dayButtonText,
                formData.availability.days.includes(day) && styles.dayButtonTextSelected
              ]}>
                {day.substring(0, 3)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.hoursSection}>
          <Text style={styles.sectionTitle}>Available Hours *</Text>
          <View style={styles.hoursContainer}>
            <TimePicker
              label="Start Time"
              value={formData.availability.hours.start}
              onTimeChange={(time) => updateFormData('availability', {
                ...formData.availability,
                hours: { ...formData.availability.hours, start: time }
              })}
              style={styles.timeInput}
              placeholder="08:00"
              minuteInterval={30}
            />
            <Text style={styles.timeSeparator}>to</Text>
            <TimePicker
              label="End Time"
              value={formData.availability.hours.end}
              onTimeChange={(time) => updateFormData('availability', {
                ...formData.availability,
                hours: { ...formData.availability.hours, end: time }
              })}
              style={styles.timeInput}
              placeholder="18:00"
              minuteInterval={30}
            />
          </View>
        </View>

        <View style={styles.flexibilitySection}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => updateFormData('availability', {
              ...formData.availability,
              flexible: !formData.availability.flexible
            })}
          >
            <Ionicons
              name={formData.availability.flexible ? 'checkbox' : 'checkbox-outline'}
              size={24}
              color="#6366f1"
            />
            <Text style={styles.checkboxLabel}>
              I'm flexible with my schedule
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          label="Availability Notes"
          value={formData.availability.notes}
          onChangeText={(text) => updateFormData('availability', {
            ...formData.availability,
            notes: text
          })}
          mode="outlined"
          style={styles.input}
          multiline
          numberOfLines={3}
          placeholder="Any additional notes about your availability..."
        />
      </View>
    </View>
  );

  const renderReview = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Review & Submit</Text>
      <Text style={styles.stepDescription}>
        Please review your information before submitting your profile.
      </Text>

      <Card style={styles.reviewCard}>
        <Card.Content>
          <Text style={styles.reviewSectionTitle}>Profile Summary</Text>
          
          <View style={styles.reviewImageContainer}>
            {formData.profileImage && !profileImageError ? (
              <Image 
                source={{ 
                  uri: formData.profileImage.startsWith('/') 
                    ? `${getCurrentSocketURL()}${formData.profileImage}` 
                    : formData.profileImage,
                  cache: 'reload'
                }}
                style={styles.reviewImage}
                onError={(error) => {
                  console.log('Profile image load error (review):', error);
                  setProfileImageError(true);
                }}
                onLoad={() => setProfileImageError(false)}
              />
            ) : (
              <Avatar.Icon size={80} icon="account" style={styles.reviewPlaceholderImage} />
            )}
          </View>
          
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Name:</Text>
            <Text style={styles.reviewValue}>{formData.name}</Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Email:</Text>
            <Text style={styles.reviewValue}>{formData.email}</Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Phone:</Text>
            <Text style={styles.reviewValue}>{formData.phone}</Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Experience:</Text>
            <Text style={styles.reviewValue}>
              {formData.experience?.years || 0} years, {formData.experience?.months || 0} months
            </Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Hourly Rate:</Text>
            <Text style={styles.reviewValue}>{CURRENCY.SYMBOL}{formData.hourlyRate}</Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Location:</Text>
            <Text style={styles.reviewValue}>
              {formatLocationForDisplay(formData.address)}
            </Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Skills:</Text>
            <Text style={styles.reviewValue}>{formData.skills.join(', ')}</Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Age Care Ranges:</Text>
            <Text style={styles.reviewValue}>
              {formData.ageCareRanges.map(range => 
                AGE_CARE_RANGES.find(r => r.key === range)?.label
              ).filter(Boolean).join(', ')}
            </Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Available Days:</Text>
            <Text style={styles.reviewValue}>{formData.availability.days.join(', ')}</Text>
          </View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Emergency Contacts:</Text>
            <Text style={styles.reviewValue}>{formData.emergencyContacts.length} contacts</Text>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.finalChecks}>
        <Text style={styles.finalChecksTitle}>Before you submit:</Text>
        <View style={styles.checklistItem}>
          <Ionicons 
            name={formData.profileImage ? 'checkmark-circle' : 'ellipse-outline'} 
            size={20} 
            color={formData.profileImage ? '#10b981' : '#9ca3af'} 
          />
          <Text style={styles.checklistText}>Profile photo uploaded</Text>
        </View>
        <View style={styles.checklistItem}>
          <Ionicons 
            name={formData.skills.length > 0 ? 'checkmark-circle' : 'ellipse-outline'} 
            size={20} 
            color={formData.skills.length > 0 ? '#10b981' : '#9ca3af'} 
          />
          <Text style={styles.checklistText}>Skills added</Text>
        </View>
        <View style={styles.checklistItem}>
          <Ionicons 
            name={formData.ageCareRanges.length > 0 ? 'checkmark-circle' : 'ellipse-outline'} 
            size={20} 
            color={formData.ageCareRanges.length > 0 ? '#10b981' : '#9ca3af'} 
          />
          <Text style={styles.checklistText}>Age care ranges selected</Text>
        </View>
        <View style={styles.checklistItem}>
          <Ionicons 
            name={validateLocation(formData.address) ? 'checkmark-circle' : 'ellipse-outline'} 
            size={20} 
            color={validateLocation(formData.address) ? '#10b981' : '#9ca3af'} 
          />
          <Text style={styles.checklistText}>Location provided</Text>
        </View>
        <View style={styles.checklistItem}>
          <Ionicons 
            name={formData.emergencyContacts.length > 0 ? 'checkmark-circle' : 'ellipse-outline'} 
            size={20} 
            color={formData.emergencyContacts.length > 0 ? '#10b981' : '#9ca3af'} 
          />
          <Text style={styles.checklistText}>Emergency contacts added</Text>
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView 
        ref={scrollRef}
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {renderProgressIndicator()}
        {renderStepContent()}
        
        <View style={styles.navigationContainer}>
          <Button
            mode="outlined"
            onPress={prevStep}
            disabled={currentStep === 0}
            style={styles.navButton}
          >
            Previous
          </Button>
          
          {currentStep === ENHANCED_STEPS.length - 1 ? (
            <Button
              mode="contained"
              onPress={submitProfile}
              loading={loading}
              disabled={loading}
              style={styles.navButton}
            >
              {isEdit ? 'Update Profile' : 'Create Profile'}
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={nextStep}
              style={styles.navButton}
            >
              Next
            </Button>
          )}
        </View>
      </ScrollView>

      <Portal>
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
        >
          {snackbarMessage}
        </Snackbar>
      </Portal>
    </KeyboardAvoidingView>
  );
};

export default EnhancedCaregiverProfileWizard;
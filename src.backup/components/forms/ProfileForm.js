import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  TouchableOpacity 
} from 'react-native';
import { 
  Button, 
  Divider, 
  Text, 
  useTheme, 
  TextInput, 
  IconButton, 
  ActivityIndicator 
} from 'react-native-paper';
import { validator } from '../../utils/validation';
import ValidatedInput from '../ui/inputs/ValidatedInput';
import DocumentUpload from './DocumentUpload';
import { Rating } from 'react-native-ratings';
import { formatLocationForDisplay } from '../../utils/locationUtils';

const ProfileForm = ({ onSubmit, initialValues = {}, isCaregiver = false }) => {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    firstName: initialValues.firstName || '',
    lastName: initialValues.lastName || '',
    email: initialValues.email || '',
    phone: initialValues.phone || '',
    location: initialValues.location || '',
    documents: initialValues.documents || {
      id: '',
      policeClearance: '',
      resume: '',
    },
    rating: initialValues.rating || 0,
    skills: initialValues.skills || [],
    bio: initialValues.bio || '',
    verificationStatus: initialValues.verificationStatus || 'unverified'
  });
  
  const [editingRating, setEditingRating] = useState(false);
  const [tempRating, setTempRating] = useState(formData.rating);
  const [formattedLocation, setFormattedLocation] = useState(
    initialValues.location ? formatLocationForDisplay(initialValues.location) : ''
  );

  useEffect(() => {
    if (initialValues.location) {
      setFormattedLocation(formatLocationForDisplay(initialValues.location));
    }
  }, [initialValues.location]);

  const handleSubmit = () => {
    try {
      // Validate all fields
      validator.validateName(formData.firstName);
      validator.validateName(formData.lastName);
      validator.validateEmail(formData.email);
      validator.validatePhone(formData.phone);
      
      if (isCaregiver) {
        validator.validateBio(formData.bio);
        
        // Validate location for caregivers
        if (!formData.location || !formData.location.trim()) {
          throw new Error('Please enter your location');
        }
        
        // If caregiver is submitting for verification, check documents
        if (formData.verificationStatus !== 'verified') {
          if (!formData.documents.id || !formData.documents.policeClearance) {
            throw new Error('Please upload all required documents for verification');
          }
        }
      }
      
      // If we get here, validation passed
      onSubmit(formData);
    } catch (error) {
      Alert.alert('Validation Error', error.message || 'Please check your input');
      console.error('Form validation failed:', error);
    }
  };
  
  const handleDocumentUpload = (url, documentType) => {
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [documentType]: url
      },
      verificationStatus: 'pending' // Set status to pending when documents are uploaded
    }));
  };
  
  const handleRatingChange = (rating) => {
    setTempRating(rating);
  };
  
  const handleRatingComplete = (rating) => {
    setFormData(prev => ({
      ...prev,
      rating: rating
    }));
    setEditingRating(false);
  };
  
  const handleAddSkill = (skill) => {
    if (skill.trim() && !formData.skills.includes(skill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skill.trim()]
      }));
    }
  };
  
  const removeSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const updateField = (field) => (value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <ValidatedInput
          label="First Name"
          value={formData.firstName}
          onChangeText={updateField('firstName')}
          validator={validator.validateName}
          placeholder="Enter your first name"
        />

        <ValidatedInput
          label="Last Name"
          value={formData.lastName}
          onChangeText={updateField('lastName')}
          validator={validator.validateName}
          placeholder="Enter your last name"
        />

        <ValidatedInput
          label="Email"
          value={formData.email}
          onChangeText={updateField('email')}
          validator={validator.validateEmail}
          placeholder="your.email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!initialValues.email} // Don't allow editing email if it's already set
        />

        <ValidatedInput
          label="Phone Number"
          value={formData.phone}
          onChangeText={updateField('phone')}
          validator={validator.validatePhone}
          placeholder="+1 (555) 123-4567"
          keyboardType="phone-pad"
        />
        
        {isCaregiver && (
          <>
            <Divider style={styles.divider} />
            <Text style={styles.sectionTitle}>Professional Information</Text>
            
            {/* Location Input */}
            <View style={styles.locationContainer}>
              <Text style={styles.label}>Location</Text>
              <ValidatedInput
                label="Address"
                value={formData.location}
                onChangeText={updateField('location')}
                placeholder="City, Province"
              />
              {formattedLocation ? (
                <Text style={styles.locationHint}>
                  Current: {formattedLocation}
                </Text>
              ) : null}
            </View>
            
            <ValidatedInput
              label="Bio"
              value={formData.bio}
              onChangeText={updateField('bio')}
              placeholder="Tell us about yourself and your experience"
              multiline
              numberOfLines={4}
              style={styles.bioInput}
            />
            
            {/* Skills Management */}
            <View style={styles.skillsContainer}>
              <Text style={styles.label}>Skills</Text>
              <View style={styles.skillsList}>
                {formData.skills.map((skill, index) => (
                  <View key={index} style={styles.skillTag}>
                    <Text style={styles.skillText}>{skill}</Text>
                    <IconButton 
                      icon="close" 
                      size={16} 
                      onPress={() => removeSkill(skill)}
                      style={styles.removeSkillButton}
                    />
                  </View>
                ))}
              </View>
              <View style={styles.addSkillContainer}>
                <TextInput
                  style={styles.skillInput}
                  placeholder="Add a skill and press Enter"
                  onSubmitEditing={(e) => {
                    handleAddSkill(e.nativeEvent.text);
                    e.target.clear();
                  }}
                />
              </View>
            </View>
            
            {/* Rating Display/Edit */}
            <View style={styles.ratingContainer}>
              <Text style={styles.label}>Your Rating</Text>
              {editingRating ? (
                <View style={styles.ratingEditContainer}>
                  <Rating
                    type="star"
                    ratingCount={5}
                    imageSize={30}
                    showRating
                    startingValue={tempRating}
                    onFinishRating={handleRatingComplete}
                    style={styles.ratingStars}
                  />
                  <Button 
                    mode="text" 
                    onPress={() => setEditingRating(false)}
                    style={styles.cancelRatingButton}
                  >
                    Cancel
                  </Button>
                </View>
              ) : (
                <TouchableOpacity 
                  onPress={() => {
                    setTempRating(formData.rating);
                    setEditingRating(true);
                  }}
                  style={styles.ratingDisplay}
                >
                  <Rating
                    type="star"
                    ratingCount={5}
                    imageSize={24}
                    readonly
                    startingValue={formData.rating}
                    style={styles.ratingStars}
                  />
                  <Text style={styles.editRatingText}>Tap to edit</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Document Uploads */}
            <Divider style={styles.divider} />
            <Text style={styles.sectionTitle}>Verification Documents</Text>
            <Text style={styles.sectionSubtitle}>
              {formData.verificationStatus === 'verified' 
                ? '✓ Your documents have been verified'
                : 'Please upload the required documents for verification'}
            </Text>
            
            <DocumentUpload
              label="Government-issued ID"
              documentType="id"
              onUploadComplete={(url) => handleDocumentUpload(url, 'id')}
              initialUri={formData.documents?.id}
            />
            
            <DocumentUpload
              label="Police Clearance"
              documentType="policeClearance"
              onUploadComplete={(url) => handleDocumentUpload(url, 'policeClearance')}
              initialUri={formData.documents?.policeClearance}
            />
            
            <DocumentUpload
              label="Resume (Optional)"
              documentType="resume"
              onUploadComplete={(url) => handleDocumentUpload(url, 'resume')}
              initialUri={formData.documents?.resume}
            />
            
            {formData.verificationStatus === 'pending' && (
              <View style={styles.pendingVerification}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.pendingText}>Verification in progress</Text>
              </View>
            )}
          </>
        )}
        
        <Button 
          mode="contained" 
          onPress={handleSubmit}
          style={styles.submitButton}
        >
          {isCaregiver && formData.verificationStatus === 'pending' 
            ? 'Submit for Verification' 
            : 'Save Changes'}
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 16,
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  divider: {
    marginVertical: 24,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  skillsContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  skillText: {
    fontSize: 14,
    color: '#1976d2',
  },
  removeSkillButton: {
    margin: 0,
    padding: 0,
    marginLeft: 4,
  },
  addSkillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skillInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  ratingContainer: {
    marginBottom: 24,
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingEditContainer: {
    alignItems: 'flex-start',
  },
  ratingStars: {
    alignSelf: 'flex-start',
  },
  editRatingText: {
    marginLeft: 12,
    color: '#666',
    fontSize: 14,
  },
  cancelRatingButton: {
    marginTop: 8,
  },
  pendingVerification: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff8e1',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  pendingText: {
    marginLeft: 8,
    color: '#ff8f00',
    fontSize: 14,
  },
  submitButton: {
    marginTop: 32,
    marginBottom: 20,
    padding: 8,
  },
  locationContainer: {
    marginBottom: 20,
  },
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#1976d2',
  }
});

export default ProfileForm;

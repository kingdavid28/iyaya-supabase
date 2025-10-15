import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import {
  X,
  Clock,
  MapPin,
  DollarSign,
  Calendar,
  Check,
  AlertCircle,
  Plus
} from 'lucide-react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import jobService from '../../../services/jobService';
import { useAuth } from '../../../contexts/AuthContext';
import { getCurrentDeviceLocation } from '../../../utils/locationUtils';

import CustomDateTimePicker from '../../../shared/ui/inputs/DateTimePicker';

const SUGGESTED_SKILLS = [
  'CPR Certified',
  'First Aid Training',
  'Experience with Infants',
  'Meal Preparation',
  'Light Housekeeping'
];

const JobPostingModal = ({ visible, onClose, onJobPosted }) => {
  const { user } = useAuth();
  const headerHeight = useHeaderHeight?.() ?? 0;
  const keyboardOffset = useMemo(() => {
    const baseOffset = headerHeight || 64;
    if (Platform.OS === 'ios') {
      return baseOffset + 20;
    }
    return baseOffset;
  }, [headerHeight]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [locationLoading, setLocationLoading] = useState(false);
  
  const [jobData, setJobData] = useState({
    title: '',
    description: '',
    location: '',
    rate: '',
    startDate: '',
    endDate: '',
    workingHours: '',
    requirements: [],
    children: [],
    status: 'open',
    parentId: '',
    createdAt: null,
    updatedAt: null,
    applicants: [],
  });

  // Set parent ID when component mounts
  useEffect(() => {
    const userId = user?.uid || user?.id;
    if (userId) {
      setJobData(prev => ({
        ...prev,
        parentId: userId,
        parentName: user.displayName || user.name || 'Parent',
        parentPhoto: user.photoURL || user.profileImage || null
      }));
    }
  }, [user]);

  const formatDate = (date) => {
    if (!date) return '';
    try {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return '';
      // YYYY-MM-DD
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch (_) {
      return '';
    }
  };

  const validateStep = () => {
    const newErrors = {};
    
    if (step === 1) {
      if (!jobData.title.trim()) newErrors.title = 'Job title is required';
      if (!jobData.description.trim()) newErrors.description = 'Description is required';
      if (!jobData.location.trim()) newErrors.location = 'Location is required';
      if (!jobData.rate) newErrors.rate = 'Hourly rate is required';
      if (isNaN(jobData.rate)) newErrors.rate = 'Rate must be a number';
    } 
    else if (step === 2) {
      if (!jobData.startDate) newErrors.startDate = 'Start date is required';
      if (!jobData.workingHours) newErrors.workingHours = 'Working hours are required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    setErrors({});
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleAddRequirement = () => {
    if (jobData.requirementsInput && jobData.requirementsInput.trim() !== '') {
      setJobData(prev => ({
        ...prev,
        requirements: [...prev.requirements, prev.requirementsInput.trim()],
        requirementsInput: ''
      }));
    }
  };

  const handleRemoveRequirement = (index) => {
    setJobData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const locationData = await getCurrentDeviceLocation();
      
      if (locationData && locationData.address) {
        const formattedAddress = `${locationData.address.street || ''} ${locationData.address.city || ''}, ${locationData.address.province || ''}`;
        setJobData({ ...jobData, location: formattedAddress.trim() });
      }
    } catch (error) {
      Alert.alert('Location Error', error.message || 'Failed to get current location.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Prepare payload for backend
      const payload = {
        title: jobData.title.trim(),
        description: jobData.description.trim(),
        location: jobData.location.trim(),
        salary: Number(jobData.rate), // Backend expects 'salary' not 'rate'
        rate: Number(jobData.rate), // Keep both for compatibility
        startDate: jobData.startDate,
        endDate: jobData.endDate || undefined,
        workingHours: jobData.workingHours,
        requirements: jobData.requirements || [],

        parentId: user?.uid || user?.id,
        parentName: user?.displayName || user?.name || 'Parent',
        parentPhoto: user?.photoURL || user?.profileImage || user?.profile_image || null,
        status: 'open'
      };
      
      console.log('📱 [MOBILE] Job payload:', payload);

      // Use jobService.createJobPost directly for reliability
      const response = await jobService.createJobPost(payload);
      console.log('📱 [MOBILE] Job creation response:', response);

      setLoading(false);
      
      // Pass the created job data back to parent
      const createdJob = response?.data?.job || { ...payload, id: Date.now(), _id: Date.now() };
      if (onJobPosted) onJobPosted(createdJob);
      
      // Reset form first
      setJobData({
        title: '',
        description: '',
        location: '',
        rate: '',
        startDate: '',
        endDate: '',
        workingHours: '',
        requirements: [],
        children: [],
      });
      setStep(1);
      setErrors({});
      
      // Close modal and notify parent
      if (onClose) {
        onClose();
      }
      
      // Show success message after modal closes
      setTimeout(() => {
        Alert.alert('Success', 'Job posted successfully!');
      }, 300);
      
    } catch (error) {
      console.error('Error posting job:', error);
      setLoading(false);
      const msg = error?.response?.data?.message || error.message || 'Failed to post job. Please try again.';
      Alert.alert('Error', msg);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '—';
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return value;
    }

    return `₱${numeric.toLocaleString('en-PH', { minimumFractionDigits: 0 })} / hour`;
  };

  const renderSummaryRow = ({ icon, label, value, multiline = false }) => (
    <View key={label} style={styles.summaryRow}>
      {icon && React.cloneElement(icon, { style: styles.summaryIcon })}
      <View style={styles.summaryTextContainer}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text
          style={[styles.summaryValue, multiline && styles.summaryValueMultiline]}
          numberOfLines={multiline ? undefined : 2}
        >
          {value || '—'}
        </Text>
      </View>
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Job Details</Text>
            
            <View>
              <Text style={styles.label}>Job Title *</Text>
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                placeholder="e.g., Full-time Nanny Needed"
                value={jobData.title}
                onChangeText={(text) => setJobData({ ...jobData, title: text })}
              />
              {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
            </View>
            
            <View>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea, errors.description && styles.inputError]}
                placeholder="Describe the job responsibilities and expectations..."
                multiline
                numberOfLines={4}
                value={jobData.description}
                onChangeText={(text) => setJobData({ ...jobData, description: text })}
              />
              {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
            </View>
            
            <View>
              <Text style={styles.label}>Location *</Text>
              <View style={styles.locationSection}>
                <TouchableOpacity
                  style={styles.gpsButton}
                  onPress={getCurrentLocation}
                  disabled={locationLoading}
                >
                  <MapPin size={16} color="#4F46E5" />
                  <Text style={styles.gpsButtonText}>
                    {locationLoading ? 'Getting Location...' : 'Use GPS'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, errors.location && styles.inputError]}>
                <MapPin size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputWithIcon]}
                  placeholder="e.g., 123 Main St, City"
                  value={jobData.location}
                  onChangeText={(text) => setJobData({ ...jobData, location: text })}
                />
              </View>
              {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
            </View>

            <View>
              <Text style={styles.label}>Hourly Rate (₱) *</Text>
              <View style={[styles.inputGroup, errors.rate && styles.inputError]}>
                <Text style={styles.pesoSign}>₱</Text>
                <TextInput
                  style={[styles.input, styles.inputWithIcon]}
                  placeholder="e.g., 150"
                  keyboardType="numeric"
                  value={jobData.rate}
                  onChangeText={(text) => setJobData({ ...jobData, rate: text.replace(/[^0-9]/g, '') })}
                />
              </View>
              {errors.rate && <Text style={styles.errorText}>{errors.rate}</Text>}
            </View>

            <View style={styles.sectionDivider} />

            <View>
              <Text style={styles.label}>Skills & Requirements</Text>
              <Text style={styles.labelHint}>Select all that apply or add your own.</Text>
              <View style={styles.suggestedSkillsContainer}>
                {SUGGESTED_SKILLS.map((skill) => {
                  const isSelected = jobData.requirements.includes(skill);
                  return (
                    <TouchableOpacity
                      key={skill}
                      style={[styles.skillChip, isSelected && styles.skillChipSelected]}
                      onPress={() => {
                        if (isSelected) {
                          setJobData((prev) => ({
                            ...prev,
                            requirements: prev.requirements.filter((req) => req !== skill)
                          }));
                        } else {
                          setJobData((prev) => ({
                            ...prev,
                            requirements: [...prev.requirements, skill]
                          }));
                        }
                      }}
                    >
                      <Text style={[styles.skillChipText, isSelected && styles.skillChipTextSelected]}>
                        {skill}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.requirementInputContainer}>
                <TextInput
                  style={[styles.input, styles.requirementInput]}
                  placeholder="e.g., Tutoring Experience"
                  value={jobData.requirementsInput || ''}
                  onChangeText={(text) => setJobData({ ...jobData, requirementsInput: text })}
                  onSubmitEditing={handleAddRequirement}
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddRequirement}
                >
                  <Plus size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              {jobData.requirements.length > 0 && (
                <View style={styles.requirementsList}>
                  {jobData.requirements.map((req, index) => (
                    <View key={`${req}-${index}`} style={styles.requirementItem}>
                      <Check size={16} color="#10B981" style={styles.requirementIcon} />
                      <Text style={styles.requirementText}>{req}</Text>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveRequirement(index)}
                      >
                        <X size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.noteContainer}>
                <AlertCircle size={16} color="#6B7280" style={styles.noteIcon} />
                <Text style={styles.noteText}>
                  Adding clear skills helps you find the best match for your family's needs.
                </Text>
              </View>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Schedule</Text>

            <CustomDateTimePicker
              label="Start Date *"
              value={jobData.startDate ? new Date(jobData.startDate) : new Date()}
              onDateChange={(date) => setJobData({ ...jobData, startDate: date.toISOString().split('T')[0] })}
              minimumDate={new Date()}
              format="long"
              error={errors.startDate}
            />

            <CustomDateTimePicker
              label="End Date (Optional)"
              value={jobData.endDate ? new Date(jobData.endDate) : new Date()}
              onDateChange={(date) => setJobData({ ...jobData, endDate: date.toISOString().split('T')[0] })}
              minimumDate={jobData.startDate ? new Date(jobData.startDate) : new Date()}
              format="long"
            />

            <View>
              <Text style={styles.label}>Working Hours *</Text>
              <View style={[styles.inputGroup, errors.workingHours && styles.inputError]}>
                <Clock size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputWithIcon]}
                  placeholder="e.g., 9:00 AM - 5:00 PM, Monday to Friday"
                  value={jobData.workingHours}
                  onChangeText={(text) => setJobData({ ...jobData, workingHours: text })}
                />
              </View>
              {errors.workingHours && <Text style={styles.errorText}>{errors.workingHours}</Text>}
            </View>
          </View>
        );
        
              case 3:
                return (
                  <View style={styles.stepContainer}>
                    <Text style={styles.stepTitle}>Review & Post</Text>
                    <Text style={styles.reviewDescription}>
                      Please review your job posting below. Your job will be visible to qualified caregivers in your area.
                    </Text>
        
                    {/* Job Details Card */}
                    <View style={styles.summaryCard}>
                      <View style={styles.summaryCardHeader}>
                        <Text style={styles.summarySectionTitle}>Job Details</Text>
                        <TouchableOpacity 
                          style={styles.editButton}
                          onPress={() => setStep(1)}
                        >
                          <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                      </View>
                      
                      <View style={styles.summaryGrid}>
                        <View style={styles.summaryItem}>
                          <View style={styles.summaryIconContainer}>
                            <MapPin size={16} color="#4F46E5" />
                          </View>
                          <View style={styles.summaryContent}>
                            <Text style={styles.summaryLabel}>Location</Text>
                            <Text style={styles.summaryValue} numberOfLines={2}>
                              {jobData.location?.trim() || 'Not specified'}
                            </Text>
                          </View>
                        </View>
        
                        <View style={styles.summaryItem}>
                          <View style={styles.summaryIconContainer}>
                            <DollarSign size={16} color="#10B981" />
                          </View>
                          <View style={styles.summaryContent}>
                            <Text style={styles.summaryLabel}>Hourly Rate</Text>
                            <Text style={styles.summaryValue}>
                              {formatCurrency(jobData.rate)}
                            </Text>
                          </View>
                        </View>
                      </View>
        
                      <View style={styles.summaryItemFull}>
                        <Text style={styles.summaryLabel}>Job Title</Text>
                        <Text style={styles.summaryTitle}>{jobData.title || '—'}</Text>
                      </View>
        
                      <View style={styles.summaryItemFull}>
                        <Text style={styles.summaryLabel}>Description</Text>
                        <Text style={styles.summaryDescription} numberOfLines={4}>
                          {jobData.description?.trim() || 'No description provided'}
                        </Text>
                      </View>
                    </View>
        
                    {/* Schedule Card */}
                    <View style={styles.summaryCard}>
                      <View style={styles.summaryCardHeader}>
                        <Text style={styles.summarySectionTitle}>Schedule</Text>
                        <TouchableOpacity 
                          style={styles.editButton}
                          onPress={() => setStep(2)}
                        >
                          <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                      </View>
        
                      <View style={styles.summaryGrid}>
                        <View style={styles.summaryItem}>
                          <View style={styles.summaryIconContainer}>
                            <Calendar size={16} color="#8B5CF6" />
                          </View>
                          <View style={styles.summaryContent}>
                            <Text style={styles.summaryLabel}>Start Date</Text>
                            <Text style={styles.summaryValue}>
                              {formatDate(jobData.startDate) || 'Not specified'}
                            </Text>
                          </View>
                        </View>
        
                        <View style={styles.summaryItem}>
                          <View style={styles.summaryIconContainer}>
                            <Calendar size={16} color="#F59E0B" />
                          </View>
                          <View style={styles.summaryContent}>
                            <Text style={styles.summaryLabel}>End Date</Text>
                            <Text style={styles.summaryValue}>
                              {jobData.endDate ? formatDate(jobData.endDate) : 'Not specified'}
                            </Text>
                          </View>
                        </View>
                      </View>
        
                      <View style={styles.summaryItemFull}>
                        <View style={styles.summaryIconContainer}>
                          <Clock size={16} color="#EF4444" />
                        </View>
                        <View style={styles.summaryContent}>
                          <Text style={styles.summaryLabel}>Working Hours</Text>
                          <Text style={styles.summaryValue}>
                            {jobData.workingHours?.trim() || 'Not specified'}
                          </Text>
                        </View>
                      </View>
                    </View>
        
                    {/* Requirements Card */}
                    <View style={styles.summaryCard}>
                      <View style={styles.summaryCardHeader}>
                        <Text style={styles.summarySectionTitle}>Skills & Requirements</Text>
                        <TouchableOpacity 
                          style={styles.editButton}
                          onPress={() => setStep(1)}
                        >
                          <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                      </View>
        
                      {jobData.requirements.length > 0 ? (
                        <View style={styles.requirementsGrid}>
                          {jobData.requirements.map((req, index) => (
                            <View key={`${req}-${index}`} style={styles.requirementChip}>
                              <Check size={14} color="#10B981" style={styles.chipIcon} />
                              <Text style={styles.requirementChipText}>{req}</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <View style={styles.emptyState}>
                          <AlertCircle size={24} color="#9CA3AF" />
                          <Text style={styles.emptyStateText}>
                            No skills or requirements added
                          </Text>
                        </View>
                      )}
                    </View>
        
                    {/* Final Note */}
                    <View style={styles.finalNote}>
                      <AlertCircle size={16} color="#6B7280" />
                      <Text style={styles.finalNoteText}>
                        Once posted, your job will be visible to caregivers. You can edit or close it anytime from your job listings.
                      </Text>
                    </View>
                  </View>
                );
                
              default:
                return null;
            }
          };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={() => {
        if (!loading) {
          onClose();
        }
      }}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={keyboardOffset}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {step === 1 ? 'Job Details' : step === 2 ? 'Schedule' : 'Review & Post'}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  if (!loading) {
                    onClose();
                  }
                }} 
                style={[styles.closeButton, loading && { opacity: 0.5 }]}
                disabled={loading}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.stepIndicatorContainer}>
                {[1, 2, 3].map((stepNum) => (
                  <React.Fragment key={stepNum}>
                    <View
                      style={[
                        styles.stepIndicator,
                        step === stepNum && styles.stepIndicatorActive,
                        step > stepNum && styles.stepIndicatorCompleted,
                      ]}
                    >
                      {step > stepNum ? (
                        <Check size={16} color="#fff" />
                      ) : (
                        <Text
                          style={[
                            styles.stepText,
                            (step === stepNum || step < stepNum) && styles.stepTextActive,
                          ]}
                        >
                          {stepNum}
                        </Text>
                      )}
                    </View>
                    {stepNum < 3 && <View style={styles.stepLine} />}
                  </React.Fragment>
                ))}
              </View>

              {renderStep()}
            </ScrollView>

            <View style={styles.modalFooter}>
              <View style={styles.footerContent}>
                {step > 1 && (
                  <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={handleBack}
                    disabled={loading}
                  >
                    <Text style={styles.secondaryButtonText}>Back</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={handleNext}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {step === 3 ? 'Post Job' : 'Continue'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 16,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 16,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicatorActive: {
    backgroundColor: '#4F46E5',
  },
  stepIndicatorCompleted: {
    backgroundColor: '#10B981',
  },
  stepText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  stepTextActive: {
    color: '#fff',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E5E7EB',
  },
  stepContainer: {
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  labelHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  inputIcon: {
    marginLeft: 12,
  },
  pesoSign: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 12,
  },
  inputWithIcon: {
    flex: 1,
    borderWidth: 0,
    marginBottom: 0,
    marginLeft: 8,
  },
  requirementInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  requirementInput: {
    flex: 1,
    marginRight: 8,
    marginBottom: 0,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requirementsList: {
    marginBottom: 16,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  requirementIcon: {
    marginRight: 8,
  },
  requirementText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  removeButton: {
    padding: 4,
  },
  noteContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  noteIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
  },
  suggestedSkillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  skillChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  skillChipSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  skillChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  skillChipTextSelected: {
    color: '#fff',
  },
  locationSection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
  },
  gpsButtonText: {
    fontWeight: '500',
  },
  summaryPlaceholder: {
    fontSize: 13,
    color: '#6B7280',
  },
  reviewDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summarySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  editButtonText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 140,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryItemFull: {
    marginBottom: 16,
  },
  summaryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 4,
  },
  summaryDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  requirementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  requirementChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  chipIcon: {
    marginRight: 6,
  },
  requirementChipText: {
    fontSize: 13,
    color: '#065F46',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyStateText: {
    fontSize: 13,
    color: '#6B7280',
  },
  finalNote: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  finalNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
});

export default JobPostingModal;

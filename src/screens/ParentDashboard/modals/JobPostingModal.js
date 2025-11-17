import { useHeaderHeight } from '@react-navigation/elements';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  DollarSign,
  MapPin,
  Plus,
  User,
  X
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import jobService from '../../../services/jobService';
import { getCurrentDeviceLocation } from '../../../utils/locationUtils';

import {
  SkeletonBlock,
  SkeletonCard,
  SkeletonCircle,
  SkeletonPill
} from '../../../components/common/SkeletonPlaceholder';
import CustomDateTimePicker from '../../../shared/ui/inputs/DateTimePicker';
import SimpleDatePicker from '../../../shared/ui/inputs/SimpleDatePicker';
import { formatTimeRange } from '../../../utils/dateUtils';

const SUGGESTED_SKILLS = [
  'CPR Certified',
  'First Aid Training',
  'Experience with Infants',
  'Meal Preparation',
  'Light Housekeeping'
];

const JobPostingModal = ({ visible, onClose, onJobPosted, childrenList = [] }) => {
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
    startDate: null,
    endDate: null,
    workingHours: '',
    startTime: null,
    endTime: null,
    requirements: [],
    children: [],
    status: 'open',
    parentId: '',
    createdAt: null,
    updatedAt: null,
    applicants: [],
    urgent: false,
    requirementsInput: '',
  });

  const normalizedChildren = useMemo(() => {
    return childrenList.map((child) => ({
      id: child.id || child._id,
      name: child.name,
      age: child.age,
      allergies: child.allergies,
      notes: child.notes,
    }));
  }, [childrenList]);

  const hasChildrenRecords = normalizedChildren.length > 0;

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

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setStep(1);
      setJobData({
        title: '',
        description: '',
        location: '',
        rate: '',
        startDate: null,
        endDate: null,
        workingHours: '',
        startTime: null,
        endTime: null,
        requirements: [],
        children: [],
        status: 'open',
        parentId: user?.uid || user?.id || '',
        createdAt: null,
        updatedAt: null,
        applicants: [],
        urgent: false,
        requirementsInput: '',
      });
      setErrors({});
    }
  }, [visible, user]);

  const formatDate = (date) => {
    if (!date) return '';
    try {
      // Handle both string and Date object inputs
      const d = typeof date === 'string' ? new Date(date) : date;
      if (Number.isNaN(d.getTime())) return '';

      // YYYY-MM-DD format for backend
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch (error) {
      console.error('Date formatting error:', error);
      return '';
    }
  };

  const parseDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return Number.isNaN(date.getTime()) ? null : date;
    } catch (error) {
      console.error('Date parsing error:', error);
      return null;
    }
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return '';

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Display date formatting error:', error);
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
      if (!jobData.startTime) newErrors.startTime = 'Start time is required';
      if (!jobData.endTime) newErrors.endTime = 'End time is required';

      if (jobData.startTime && jobData.endTime) {
        const start = jobData.startTime instanceof Date ? jobData.startTime : new Date(jobData.startTime);
        const end = jobData.endTime instanceof Date ? jobData.endTime : new Date(jobData.endTime);
        if (start && end && end <= start) {
          newErrors.endTime = 'End time must be after start time';
        }
      }

      // Validate end date if provided
      if (jobData.endDate && jobData.startDate) {
        const start = new Date(jobData.startDate);
        const end = new Date(jobData.endDate);
        if (end < start) {
          newErrors.endDate = 'End date cannot be before start date';
        }
      }
    } else if (step === 3) {
      if (hasChildrenRecords && jobData.children.length === 0) {
        newErrors.children = 'Please select at least one child';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const totalSteps = hasChildrenRecords ? 4 : 3;

  const handleNext = () => {
    if (!validateStep()) return;

    if (step < totalSteps) {
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

  const handleToggleChild = (child) => {
    if (!child?.id) return;

    setJobData(prev => {
      const isSelected = prev.children?.some(selected => selected.id === child.id);

      return {
        ...prev,
        children: isSelected
          ? prev.children.filter(selected => selected.id !== child.id)
          : [...(prev.children || []), child]
      };
    });
  };

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const locationData = await getCurrentDeviceLocation();

      if (locationData && locationData.address) {
        const formattedAddress = `${locationData.address.street || ''} ${locationData.address.city || ''}, ${locationData.address.province || ''}`;
        setJobData(prev => ({ ...prev, location: formattedAddress.trim() }));
      }
    } catch (error) {
      Alert.alert('Location Error', error.message || 'Failed to get current location.');
    } finally {
      setLocationLoading(false);
    }
  };

  const formatChildForPayload = (child) => ({
    id: child?.id,
    name: child?.name || '',
    age: child?.age ?? null,
    allergies: child?.allergies || '',
    notes: child?.notes || '',
  });

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const selectedChildren = (jobData.children || [])
        .filter(child => child?.id)
        .map(formatChildForPayload);

      // Prepare payload for backend
      const payload = {
        title: jobData.title.trim(),
        description: jobData.description.trim(),
        location: jobData.location.trim(),
        salary: Number(jobData.rate),
        rate: Number(jobData.rate),
        startDate: jobData.startDate,
        endDate: jobData.endDate || undefined,
        workingHours: jobData.workingHours,
        startTime: formatTimeForPayload(jobData.startTime) || undefined,
        endTime: formatTimeForPayload(jobData.endTime) || undefined,
        requirements: jobData.requirements || [],
        children: selectedChildren,
        parentId: user?.uid || user?.id,
        parentName: user?.displayName || user?.name || 'Parent',
        parentPhoto: user?.photoURL || user?.profileImage || user?.profile_image || null,
        status: 'open',
        urgent: Boolean(jobData.urgent),
      };

      console.log('📱 [MOBILE] Job payload:', payload);

      const response = await jobService.createJobPost(payload);
      console.log('📱 [MOBILE] Job creation response:', response);

      setLoading(false);

      // Pass the created job data back to parent
      const createdJob = response?.data?.job || { ...payload, id: Date.now(), _id: Date.now() };
      if (onJobPosted) onJobPosted(createdJob);

      // Reset form and close modal
      setJobData({
        title: '',
        description: '',
        location: '',
        rate: '',
        startDate: '',
        endDate: '',
        workingHours: '',
        startTime: null,
        endTime: null,
        requirements: [],
        children: [],
        status: 'open',
        parentId: user?.uid || user?.id || '',
        createdAt: null,
        updatedAt: null,
        applicants: [],
        urgent: false,
        requirementsInput: '',
      });
      setStep(1);
      setErrors({});

      if (onClose) {
        onClose();
      }

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

  const renderSkeleton = () => (
    <ScrollView contentContainerStyle={styles.modalSkeletonContainer}>
      <SkeletonCard style={styles.modalSkeletonCard}>
        <SkeletonBlock width="60%" height={22} style={styles.modalSkeletonHeading} />
        <View style={styles.modalSkeletonField}>
          <SkeletonBlock width="35%" height={14} />
          <SkeletonBlock width="100%" height={44} />
        </View>
        <View style={styles.modalSkeletonField}>
          <SkeletonBlock width="40%" height={14} />
          <SkeletonBlock width="100%" height={90} />
        </View>
        <View style={styles.modalSkeletonField}>
          <SkeletonBlock width="40%" height={14} />
          <SkeletonBlock width="100%" height={44} />
        </View>
      </SkeletonCard>

      <SkeletonCard style={styles.modalSkeletonCard}>
        <SkeletonBlock width="55%" height={18} style={styles.modalSkeletonHeading} />
        <View style={styles.modalSkeletonRow}>
          <SkeletonCircle size={48} />
          <SkeletonCircle size={48} />
          <SkeletonCircle size={48} />
        </View>
        <SkeletonBlock width="65%" height={14} />
        <SkeletonBlock width="75%" height={14} />
      </SkeletonCard>

      <SkeletonCard style={styles.modalSkeletonActions}>
        <SkeletonPill width="45%" height={44} />
        <SkeletonPill width="45%" height={44} />
      </SkeletonCard>
    </ScrollView>
  );

  const formatTimeForPayload = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatTimeLabel = (date) => {
    if (!date) return 'Select time';
    try {
      const d = date instanceof Date ? date : new Date(date);
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Select time';
    }
  };

  const updateWorkingHours = (start, end) => {
    if (!start || !end) return '';
    const startStr = formatTimeForPayload(start);
    const endStr = formatTimeForPayload(end);
    if (!startStr || !endStr) return '';
    return formatTimeRange(startStr, endStr);
  };

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
                placeholder="e.g., Full-time Yaya Needed"
                value={jobData.title}
                onChangeText={(text) => setJobData(prev => ({ ...prev, title: text }))}
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
                onChangeText={(text) => setJobData(prev => ({ ...prev, description: text }))}
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
                  onChangeText={(text) => setJobData(prev => ({ ...prev, location: text }))}
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
                  onChangeText={(text) => setJobData(prev => ({ ...prev, rate: text.replace(/[^0-9]/g, '') }))}
                />
              </View>
              {errors.rate && <Text style={styles.errorText}>{errors.rate}</Text>}
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextContainer}>
                <Text style={styles.label}>Mark as urgent</Text>
                <Text style={styles.toggleDescription}>
                  Urgent jobs are highlighted for caregivers and surface in the urgent filter.
                </Text>
              </View>
              <Switch
                value={Boolean(jobData.urgent)}
                onValueChange={(value) => setJobData((prev) => ({ ...prev, urgent: value }))}
                trackColor={{ false: '#D1D5DB', true: '#FECACA' }}
                thumbColor={jobData.urgent ? '#EF4444' : '#F9FAFB'}
              />
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
                  onChangeText={(text) => setJobData(prev => ({ ...prev, requirementsInput: text }))}
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

            <SimpleDatePicker
              id="startDate"
              label="Start Date *"
              value={parseDate(jobData.startDate)}
              onDateChange={(date) => {
                console.log('Start date selected:', date);
                if (date) {
                  const formattedDate = formatDate(date);
                  setJobData(prev => ({
                    ...prev,
                    startDate: formattedDate
                  }));

                  // Clear end date error if start date changes
                  if (errors.endDate) {
                    setErrors(prev => ({ ...prev, endDate: undefined }));
                  }

                  // If end date exists and is now before the new start date, clear it
                  if (jobData.endDate) {
                    const endDate = new Date(jobData.endDate);
                    if (date > endDate) {
                      setJobData(prev => ({ ...prev, endDate: '' }));
                    }
                  }
                }
              }}
              error={errors.startDate}
              minimumDate={new Date()} // Can't select past dates
            />

            <SimpleDatePicker
              id="endDate"
              label="End Date (Optional)"
              value={parseDate(jobData.endDate)}
              onDateChange={(date) => {
                console.log('End date selected:', date);
                if (date) {
                  const formattedDate = formatDate(date);
                  setJobData(prev => ({
                    ...prev,
                    endDate: formattedDate
                  }));

                  // Clear end date error when new date is selected
                  if (errors.endDate) {
                    setErrors(prev => ({ ...prev, endDate: undefined }));
                  }
                } else {
                  setJobData(prev => ({ ...prev, endDate: '' }));
                }
              }}
              error={errors.endDate}
              minimumDate={jobData.startDate ? new Date(jobData.startDate) : new Date()}
            />

            <View style={styles.timePickerSection}>
              <Text style={styles.label}>Working Hours *</Text>
              <View style={styles.timePickerRow}>
                <CustomDateTimePicker
                  mode="time"
                  label="Start Time"
                  value={jobData.startTime || null}
                  onDateChange={(selected) => {
                    setJobData((prev) => {
                      const nextWorkingHours = updateWorkingHours(selected, prev.endTime);
                      return {
                        ...prev,
                        startTime: selected,
                        workingHours: nextWorkingHours || prev.workingHours,
                      };
                    });
                    if (errors.startTime) {
                      setErrors((prev) => ({ ...prev, startTime: undefined }));
                    }
                  }}
                  placeholder="Select start"
                  style={styles.timePickerField}
                  textStyle={styles.timePickerText}
                />
                <CustomDateTimePicker
                  mode="time"
                  label="End Time"
                  value={jobData.endTime || null}
                  onDateChange={(selected) => {
                    setJobData((prev) => {
                      const nextWorkingHours = updateWorkingHours(prev.startTime, selected);
                      return {
                        ...prev,
                        endTime: selected,
                        workingHours: nextWorkingHours || prev.workingHours,
                      };
                    });
                    if (errors.endTime) {
                      setErrors((prev) => ({ ...prev, endTime: undefined }));
                    }
                  }}
                  placeholder="Select end"
                  style={styles.timePickerField}
                  textStyle={styles.timePickerText}
                  minimumDate={jobData.startTime || undefined}
                />
              </View>
              {(errors.startTime || errors.endTime) && (
                <Text style={styles.errorText}>
                  {errors.startTime || errors.endTime}
                </Text>
              )}
            </View>
          </View>
        );

      case 3:
        if (hasChildrenRecords) {
          return (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Select Children</Text>
              <Text style={styles.childrenSubtitle}>
                Choose the children this job is intended for.
              </Text>

              <View style={styles.childrenList}>
                {normalizedChildren.map((child) => {
                  const isSelected = jobData.children.some(selected => selected.id === child.id);
                  return (
                    <TouchableOpacity
                      key={child.id}
                      style={[styles.childCard, isSelected && styles.childCardSelected]}
                      onPress={() => handleToggleChild(child)}
                    >
                      <View style={styles.childIconContainer}>
                        <User size={16} color={isSelected ? '#FFFFFF' : '#4F46E5'} />
                      </View>
                      <View style={styles.childInfo}>
                        <Text style={styles.childName}>{child.name}</Text>
                        <Text style={styles.childMeta}>
                          {child.age !== null && child.age !== undefined ? `Age ${child.age}` : 'Age not specified'}
                        </Text>
                        {(child.allergies || child.notes) && (
                          <Text style={styles.childNotes}>
                            {[child.allergies && `Allergies: ${child.allergies}`, child.notes].filter(Boolean).join(' • ')}
                          </Text>
                        )}
                      </View>
                      <View style={[styles.childCheckmark, isSelected && styles.childCheckmarkSelected]}>
                        {isSelected && <Check size={16} color="#FFFFFF" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {errors.children && <Text style={styles.errorText}>{errors.children}</Text>}
            </View>
          );
        }
      // If no children but somehow reached step 3, fall through to review
      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Review Job Post</Text>
            <Text style={styles.reviewDescription}>
              Please review all the details before posting your job.
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

                <View style={styles.summaryItem}>
                  <View style={styles.summaryIconContainer}>
                    <AlertTriangle size={16} color={jobData.urgent ? '#DC2626' : '#9CA3AF'} />
                  </View>
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryLabel}>Urgency</Text>
                    <Text style={styles.summaryValue}>
                      {jobData.urgent ? 'Marked as urgent' : 'Standard priority'}
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
                      {formatDisplayDate(jobData.startDate) || 'Not specified'}
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
                      {jobData.endDate ? formatDisplayDate(jobData.endDate) : 'Not specified'}
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

            {/* Children Card (if applicable) */}
            {hasChildrenRecords && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryCardHeader}>
                  <Text style={styles.summarySectionTitle}>Selected Children</Text>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setStep(3)}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                </View>

                {jobData.children.length > 0 ? (
                  <View style={styles.childrenSummary}>
                    {jobData.children.map((child) => (
                      <View key={child.id} style={styles.childSummaryItem}>
                        <View style={styles.childSummaryIcon}>
                          <User size={14} color="#4F46E5" />
                        </View>
                        <Text style={styles.childSummaryText}>
                          {child.name} {child.age ? `(Age ${child.age})` : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <AlertCircle size={24} color="#9CA3AF" />
                    <Text style={styles.emptyStateText}>
                      No children selected
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Final Note */}
            <View style={styles.finalNote}>
              <AlertCircle size={16} color="#6B7280" />
              <Text style={styles.finalNoteText}>
                Once posted, your job will be visible to caregivers. You can edit or close it anytime from your job listings.
              </Text>
            </View>
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardOffset}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Post a New Job</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={22} color="#111827" />
            </TouchableOpacity>
          </View>

          {loading ? (
            renderSkeleton()
          ) : (
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              {renderStep()}

              <View style={styles.footerActions}>
                {step > 1 && (
                  <TouchableOpacity
                    style={[styles.footerButton, styles.secondaryButton]}
                    onPress={handleBack}
                    disabled={loading}
                  >
                    <Text style={styles.secondaryButtonText}>Back</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.footerButton, styles.secondaryButton]}
                  onPress={onClose}
                  disabled={loading}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.footerButton, styles.primaryButton, loading && styles.primaryButtonDisabled]}
                  onPress={handleNext}
                  disabled={loading}
                >
                  <Text style={styles.primaryButtonText}>
                    {step === totalSteps ? 'Post Job' : 'Continue'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  stepContainer: {
    gap: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  labelHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
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
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 16,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleDescription: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
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
    color: '#4F46E5',
    marginLeft: 4,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
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
  footerActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
  },
  primaryButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Skeleton styles
  modalSkeletonContainer: {
    padding: 20,
  },
  modalSkeletonCard: {
    marginBottom: 16,
    padding: 16,
  },
  modalSkeletonHeading: {
    marginBottom: 16,
  },
  modalSkeletonField: {
    marginBottom: 16,
    gap: 8,
  },
  modalSkeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  modalSkeletonActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  childrenSubtitle: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
  },
  childrenList: {
    marginTop: 12,
    gap: 12,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 12,
  },
  childCardSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  childIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childInfo: {
    flex: 1,
    gap: 4,
  },
  childName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  childMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  childNotes: {
    fontSize: 12,
    color: '#6B7280',
  },
  childCheckmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childCheckmarkSelected: {
    backgroundColor: '#4F46E5',
  },
  childrenSummary: {
    gap: 8,
  },
  childSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  childSummaryIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childSummaryText: {
    fontSize: 14,
    color: '#374151',
  },
});

export default JobPostingModal;
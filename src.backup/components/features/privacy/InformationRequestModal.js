import { Eye, Lock, Shield, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { usePrivacy } from './PrivacyManager';
import { useProfileData } from './ProfileDataManager';

const EMPTY_SET = new Set();
const DISALLOWED_FIELDS_BY_USER_TYPE = {
  caregiver: new Set(['ageCareRanges']),
};

const InformationRequestModal = ({
  visible,
  onClose,
  targetUser,
  userType = 'parent',
  availableTargets = [],
  onTargetChange,
  onSuccess,
}) => {
  const { requestInformation, DATA_LEVELS } = usePrivacy();
  const { dataClassification } = useProfileData();
  const [selectedFields, setSelectedFields] = useState([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTarget, setActiveTarget] = useState(targetUser || null);

  const disallowedFields = DISALLOWED_FIELDS_BY_USER_TYPE[userType] || EMPTY_SET;

  const allowedTargetIds = useMemo(
    () =>
      (Array.isArray(availableTargets) ? availableTargets : [])
        .map((target) => (target?.id != null ? String(target.id).trim() : ''))
        .filter((id) => id.length > 0),
    [availableTargets],
  );

  // Use existing profile data classification from ProfileDataManager
  const fields = useMemo(() => {
    const shouldOmitChildFields = userType === 'parent';

    return Object.keys(dataClassification).reduce((acc, key) => {
      const level = dataClassification[key];

      if (shouldOmitChildFields && key.toLowerCase().includes('child')) {
        return acc;
      }

      if (disallowedFields.has(key)) {
        return acc;
      }

      if (level === DATA_LEVELS.PRIVATE || level === DATA_LEVELS.SENSITIVE) {
        let label = key;
        let icon = '📄';

        switch (key) {
          case 'phone':
            label = 'Phone Number';
            icon = '📞';
            break;
          case 'address':
            label = 'Full Address';
            icon = '🏠';
            break;
          case 'profileImage':
            label = 'Profile Photo';
            icon = '📸';
            break;
          case 'portfolio':
            label = 'Portfolio & Gallery';
            icon = '🖼️';
            break;
          case 'availability':
            label = 'Availability Schedule';
            icon = '📅';
            break;
          case 'languages':
            label = 'Languages Spoken';
            icon = '🗣️';
            break;
          case 'emergencyContacts':
            label = 'Emergency Contacts';
            icon = '🚨';
            break;
          case 'documents':
            label = 'Legal Documents';
            icon = '📋';
            break;
          case 'backgroundCheck':
            label = 'Background Check Details';
            icon = '🔍';
            break;
          case 'ageCareRanges':
            if (disallowedFields.has(key)) return acc;
            label = 'Age Care Specialization';
            icon = '👶';
            break;
          case 'emergencyContact':
            label = 'Emergency Contact';
            icon = '🚨';
            break;
          case 'childMedicalInfo':
            label = 'Child Medical Information';
            icon = '🏥';
            break;
          case 'childAllergies':
            label = 'Child Allergies';
            icon = '⚠️';
            break;
          case 'childBehaviorNotes':
            label = 'Child Behavior Notes';
            icon = '📝';
            break;
          case 'financialInfo':
            label = 'Financial Information';
            icon = '💰';
            break;
          default:
            label = key
              .charAt(0)
              .toUpperCase() +
              key.slice(1).replace(/([A-Z])/g, ' $1');
            break;
        }

        if (shouldOmitChildFields && key.toLowerCase().includes('child')) {
          return acc;
        }

        if (disallowedFields.has(key)) {
          return acc;
        }

        acc.push({ key, label, level, icon });
      }

      return acc;
    }, []);
  }, [DATA_LEVELS.PRIVATE, DATA_LEVELS.SENSITIVE, dataClassification, disallowedFields, userType]);

  const allowedFieldKeys = useMemo(() => fields.map((field) => field.key), [fields]);

  useEffect(() => {
    setSelectedFields((prev) => prev.filter((key) => allowedFieldKeys.includes(key)));
  }, [allowedFieldKeys]);

  useEffect(() => {
    if (targetUser?.id) {
      setActiveTarget(targetUser);
    }
  }, [targetUser?.id, targetUser]);

  useEffect(() => {
    if (!targetUser?.id && availableTargets.length) {
      setActiveTarget(availableTargets[0]);
    }
  }, [availableTargets, targetUser?.id]);

  const handleSelectTarget = (target) => {
    if (!target?.id) {
      return;
    }
    setActiveTarget(target);
    onTargetChange?.(target);
  };

  const toggleField = (fieldKey) => {
    if (!allowedFieldKeys.includes(fieldKey)) {
      return;
    }

    setSelectedFields((prev) =>
      prev.includes(fieldKey)
        ? prev.filter((key) => key !== fieldKey)
        : [...prev, fieldKey],
    );
  };

  const handleSubmitRequest = async () => {
    if (selectedFields.length === 0) {
      Alert.alert('Error', 'Please select at least one field to request.');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for this request.');
      return;
    }

    const targetIdRaw = activeTarget?.id;
    const targetId =
      typeof targetIdRaw === 'string'
        ? targetIdRaw.trim()
        : targetIdRaw != null
          ? String(targetIdRaw).trim()
          : '';

    if (!targetId || targetId === 'sample') {
      Alert.alert(
        'Invalid recipient',
        'We need a valid user to send your request. Please choose a real profile before submitting.',
      );
      return;
    }

    if (userType === 'caregiver' && !allowedTargetIds.includes(targetId)) {
      Alert.alert(
        'Unavailable recipient',
        'You can only request information from families connected through your bookings or job applications.',
      );
      return;
    }

    setLoading(true);
    try {
      const success = await requestInformation(targetId, selectedFields, reason.trim(), {
        allowedTargetIds: userType === 'caregiver' ? allowedTargetIds : undefined,
      });
      if (success) {
        setSelectedFields([]);
        setReason('');
        onTargetChange?.(activeTarget);
        onSuccess?.(activeTarget);
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case DATA_LEVELS.PRIVATE:
        return '#f59e0b';
      case DATA_LEVELS.SENSITIVE:
        return '#ef4444';
      default:
        return '#10b981';
    }
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case DATA_LEVELS.PRIVATE:
        return <Eye size={16} color="#f59e0b" />;
      case DATA_LEVELS.SENSITIVE:
        return <Shield size={16} color="#ef4444" />;
      default:
        return <Lock size={16} color="#10b981" />;
    }
  };

  const headerSubtitleText = useMemo(() => {
    if (userType === 'caregiver') {
      return 'Ask a family to securely share details you need for upcoming care.';
    }
    return 'Send a structured request for specific information in a secure way.';
  }, [userType]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.title}>Request Information</Text>
            <Text style={styles.headerSubtitle}>{headerSubtitleText}</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close request information modal"
          >
            <X size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* User info */}
        <View style={styles.userInfo}>
          <Text style={styles.userInfoText}>
            Requesting information from:{' '}
            <Text style={styles.userName}>
              {activeTarget?.name || 'Select a family'}
            </Text>
          </Text>
          <Text style={styles.privacyNote}>
            🔒 All requests require approval and follow privacy guidelines
          </Text>
        </View>

        {/* Target selector chips */}
        {availableTargets.length > 1 && (
  <ScrollView
    horizontal
    style={styles.targetSelectorScroll}
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.targetSelector}
  >
    {availableTargets.map((target) => {
      const isSelected = activeTarget?.id === target.id;
      return (
        <TouchableOpacity
          key={target.id}
          style={[
            styles.targetChip,
            isSelected && styles.targetChipSelected,
          ]}
          onPress={() => handleSelectTarget(target)}
        >
          <Text
            style={[
              styles.targetChipText,
              isSelected && styles.targetChipTextSelected,
            ]}
          >
            {target.name || 'Family'}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
)}

        {/* Main content */}
        <ScrollView style={styles.content}>
          <Text style={styles.sectionTitle}>Select Information to Request:</Text>

          {fields.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No private information available</Text>
              <Text style={styles.emptySubtitle}>
                There are no additional details marked as private or sensitive on
                this profile yet.
              </Text>
            </View>
          ) : (
            fields.map((field) => (
              <TouchableOpacity
                key={field.key}
                style={[
                  styles.fieldItem,
                  selectedFields.includes(field.key) && styles.fieldItemSelected,
                ]}
                onPress={() => toggleField(field.key)}
              >
                <View style={styles.fieldHeader}>
                  <View style={styles.fieldInfo}>
                    <Text style={styles.fieldIcon}>{field.icon}</Text>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                  </View>
                  <View style={styles.fieldLevel}>
                    {getLevelIcon(field.level)}
                    <Text
                      style={[
                        styles.levelText,
                        { color: getLevelColor(field.level) },
                      ]}
                    >
                      {field.level.toUpperCase()}
                    </Text>
                  </View>
                </View>
                {selectedFields.includes(field.key) && (
                  <View style={styles.selectedIndicator}>
                    <Text style={styles.selectedText}>✓ Selected</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}

          {/* Reason section */}
          <View style={styles.reasonSection}>
            <Text style={styles.sectionTitle}>Reason for Request:</Text>
            <Text style={styles.sectionDescription}>
              This reason will be shared with the recipient so they understand why
              you're asking.
            </Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Please explain why you need this information..."
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Footer actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel information request"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.submitButton,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSubmitRequest}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={
              loading ? 'Sending information request' : 'Send information request'
            }
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Sending...' : 'Send Request'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = {
targetSelectorScroll: {
  // keeps the horizontal row compact
  maxHeight: 54,      // adjust up/down if needed
},
targetSelector: {
  paddingHorizontal: 20,
  paddingTop: 10,
  paddingBottom: 0,
  gap: 4,
},
  targetChip: {
  flexDirection: 'row',
  alignItems: 'center',
  marginRight: 8,
  paddingHorizontal: 14,
  paddingVertical: 6,
  height: 36,
  borderWidth: 1,
  borderColor: '#e5e7eb',
  borderRadius: 16,
  backgroundColor: '#fff',
},

targetChipSelected: {
  backgroundColor: '#fdf2f8',
  borderColor: '#db2777',
},

targetChipText: {
  fontSize: 14,
  fontWeight: '500',
  color: '#4b5563',
},

targetChipTextSelected: {
  color: '#db2777',
},
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerSubtitle: {
    marginTop: 14,
    fontSize: 13,
    color: '#6b7280',
  },
  closeButton: {
    padding: 4,
  },
  userInfo: {
  paddingHorizontal: 20,
  paddingVertical: 12,   // was 20
  backgroundColor: '#f9fafb',
  borderBottomWidth: 1,
  borderBottomColor: '#e5e7eb',
},
  userInfoText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  userName: {
    fontWeight: '600',
    color: '#db2777',
  },
  privacyNote: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  content: {
  flex: 1,
  paddingHorizontal: 20,
  paddingTop: 8,        // was 20
  paddingBottom: 20,
},
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  emptyState: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#f9fafb',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  fieldItem: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  fieldItemSelected: {
    borderColor: '#db2777',
    backgroundColor: '#fdf2f8',
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fieldIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  fieldLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  selectedIndicator: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  selectedText: {
    color: '#db2777',
    fontWeight: '500',
  },
  reasonSection: {
    marginTop: 24,
  },
  sectionDescription: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    backgroundColor: '#fff',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    marginBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    backgroundColor: '#db2777',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
};

export default InformationRequestModal;
import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { X, Lock, Shield, Eye } from 'lucide-react-native';
import { usePrivacy } from './PrivacyManager';
import { useProfileData } from './ProfileDataManager';

const InformationRequestModal = ({ visible, onClose, targetUser, userType = 'parent' }) => {
  const { requestInformation, DATA_LEVELS } = usePrivacy();
  const { dataClassification } = useProfileData();
  const [selectedFields, setSelectedFields] = useState([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  // Use existing profile data classification from ProfileDataManager
  const getAvailableFields = () => {
    const fields = [];
    
    Object.keys(dataClassification).forEach(key => {
      const level = dataClassification[key];
      
      // Only show PRIVATE and SENSITIVE fields for requests
      if (level === DATA_LEVELS.PRIVATE || level === DATA_LEVELS.SENSITIVE) {
        let label = key;
        let icon = '📄';
        
        // Map field keys to user-friendly labels
        switch (key) {
          case 'phone': label = 'Phone Number'; icon = '📞'; break;
          case 'address': label = 'Full Address'; icon = '🏠'; break;
          case 'profileImage': label = 'Profile Photo'; icon = '📸'; break;
          case 'portfolio': label = 'Portfolio & Gallery'; icon = '🖼️'; break;
          case 'availability': label = 'Availability Schedule'; icon = '📅'; break;
          case 'languages': label = 'Languages Spoken'; icon = '🗣️'; break;
          case 'emergencyContacts': label = 'Emergency Contacts'; icon = '🚨'; break;
          case 'documents': label = 'Legal Documents'; icon = '📋'; break;
          case 'backgroundCheck': label = 'Background Check Details'; icon = '🔍'; break;
          case 'ageCareRanges': label = 'Age Care Specialization'; icon = '👶'; break;
          case 'emergencyContact': label = 'Emergency Contact'; icon = '🚨'; break;
          case 'childMedicalInfo': label = 'Child Medical Information'; icon = '🏥'; break;
          case 'childAllergies': label = 'Child Allergies'; icon = '⚠️'; break;
          case 'childBehaviorNotes': label = 'Child Behavior Notes'; icon = '📝'; break;
          case 'financialInfo': label = 'Financial Information'; icon = '💰'; break;
          default: label = key.charAt(0).toUpperCase() + key.slice(1); break;
        }
        
        fields.push({ key, label, level, icon });
      }
    });
    
    return fields;
  };

  const fields = getAvailableFields();

  const toggleField = (fieldKey) => {
    setSelectedFields(prev => 
      prev.includes(fieldKey) 
        ? prev.filter(key => key !== fieldKey)
        : [...prev, fieldKey]
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

    setLoading(true);
    try {
      const success = await requestInformation(targetUser.id, selectedFields, reason.trim());
      if (success) {
        setSelectedFields([]);
        setReason('');
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case DATA_LEVELS.PRIVATE: return '#f59e0b';
      case DATA_LEVELS.SENSITIVE: return '#ef4444';
      default: return '#10b981';
    }
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case DATA_LEVELS.PRIVATE: return <Eye size={16} color="#f59e0b" />;
      case DATA_LEVELS.SENSITIVE: return <Shield size={16} color="#ef4444" />;
      default: return <Lock size={16} color="#10b981" />;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Request Information</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userInfoText}>
            Requesting information from: <Text style={styles.userName}>{targetUser?.name}</Text>
          </Text>
          <Text style={styles.privacyNote}>
            🔒 All requests require approval and follow privacy guidelines
          </Text>
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.sectionTitle}>Select Information to Request:</Text>
          
          {fields.map((field) => (
            <TouchableOpacity
              key={field.key}
              style={[
                styles.fieldItem,
                selectedFields.includes(field.key) && styles.fieldItemSelected
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
                  <Text style={[styles.levelText, { color: getLevelColor(field.level) }]}>
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
          ))}

          <View style={styles.reasonSection}>
            <Text style={styles.sectionTitle}>Reason for Request:</Text>
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

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.submitButton, loading && styles.buttonDisabled]}
            onPress={handleSubmitRequest}
            disabled={loading}
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
  closeButton: {
    padding: 4,
  },
  userInfo: {
    padding: 20,
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
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
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

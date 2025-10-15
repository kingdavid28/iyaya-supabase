import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { settingsService } from '../../../services/settingsService';
import { useTheme } from '@react-navigation/native';

const FIELD_OPTIONS = [
  { id: 'email', label: 'Email Address', icon: 'mail-outline' },
  { id: 'phone', label: 'Phone Number', icon: 'call-outline' },
  { id: 'address', label: 'Home Address', icon: 'location-outline' },
  { id: 'emergencyContact', label: 'Emergency Contact', icon: 'alert-circle-outline' },
  { id: 'dateOfBirth', label: 'Date of Birth', icon: 'calendar-outline' },
  { id: 'children', label: 'Children Information', icon: 'people-outline' },
];

export function RequestInfoModal({ visible, onClose, targetUser, onSuccess }) {
  const { colors } = useTheme();
  const [selectedFields, setSelectedFields] = useState([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (visible) {
      // Reset form when modal becomes visible
      setSelectedFields([]);
      setReason('');
      setError('');
      setSuccess(false);
    }
  }, [visible]);

  const toggleField = (fieldId) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
    // Clear any previous errors when user interacts
    if (error) setError('');
  };

  const handleSubmit = async () => {
    if (selectedFields.length === 0) {
      setError('Please select at least one field to request');
      return;
    }
    
    if (!reason.trim()) {
      setError('Please provide a reason for your request');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const { success, message } = await settingsService.requestInformation({
        targetUserId: targetUser._id || targetUser.id,
        requestedFields: selectedFields,
        reason: reason.trim(),
      });
      
      if (success) {
        setSuccess(true);
        // Show success message for 1.5 seconds before closing
        setTimeout(() => {
          setSuccess(false);
          onClose();
          if (onSuccess) onSuccess();
        }, 1500);
      } else {
        throw new Error(message || 'Failed to send request');
      }
    } catch (error) {
      console.error('Failed to send request:', error);
      setError(error.message || 'Failed to send request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Request Information</Text>
          <TouchableOpacity 
            onPress={onClose}
            style={styles.closeButton}
            disabled={loading}
          >
            <Ionicons 
              name="close" 
              size={24} 
              color={colors.text} 
              style={{ opacity: loading ? 0.5 : 1 }}
            />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={[styles.subtitle, { color: colors.text }]}>
            Request information from {targetUser?.name || 'this user'}
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Information</Text>
          <View style={styles.fieldsContainer}>
            {FIELD_OPTIONS.map(field => (
              <TouchableOpacity
                key={field.id}
                style={[
                  styles.fieldOption,
                  selectedFields.includes(field.id) && [
                    styles.fieldOptionSelected,
                    { borderColor: colors.primary, backgroundColor: `${colors.primary}10` }
                  ],
                  { borderColor: colors.border }
                ]}
                onPress={() => toggleField(field.id)}
                disabled={loading}
              >
                <Ionicons 
                  name={field.icon} 
                  size={20} 
                  color={selectedFields.includes(field.id) ? colors.primary : colors.text} 
                  style={{ marginRight: 12 }}
                />
                <Text 
                  style={[
                    styles.fieldLabel,
                    { 
                      color: selectedFields.includes(field.id) ? colors.primary : colors.text,
                      flex: 1 
                    }
                  ]}
                >
                  {field.label}
                </Text>
                {selectedFields.includes(field.id) && (
                  <Ionicons 
                    name="checkmark-circle" 
                    size={20} 
                    color={colors.primary} 
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Reason for Request</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              Let {targetUser?.name || 'the user'} know why you need this information
            </Text>
            <TextInput
              style={[
                styles.reasonInput, 
                { 
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border,
                }
              ]}
              placeholder="Please explain why you need this information..."
              placeholderTextColor={colors.text + '80'}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!loading}
            />
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="warning-outline" size={18} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          
          {success ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.successText}>Request sent successfully!</Text>
            </View>
          ) : null}
        </ScrollView>
        
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.submitButton,
              { 
                backgroundColor: colors.primary,
                opacity: (selectedFields.length === 0 || !reason.trim() || loading) ? 0.5 : 1
              }
            ]}
            onPress={handleSubmit}
            disabled={selectedFields.length === 0 || !reason.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {success ? 'Success!' : 'Send Request'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 60,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginRight: 24, // Balance close button space
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Extra space for the footer
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 12,
  },
  fieldsContainer: {
    marginBottom: 24,
  },
  fieldOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  fieldOptionSelected: {
    borderWidth: 1.5,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minHeight: 140,
    textAlignVertical: 'top',
    fontSize: 16,
    lineHeight: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#B91C1C',
    marginLeft: 8,
    flex: 1,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    color: '#065F46',
    marginLeft: 8,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
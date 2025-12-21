import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform
} from 'react-native'
import { TextInput } from 'react-native-paper'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { reportService } from '../services/supabase/reportService'

const CreateReportScreen = ({ navigation, route }) => {
  const { reportedUserId, reportedUserName, bookingId, jobId, onReportSubmitted } = route.params || {}
  
  const [formData, setFormData] = useState({
    reported_user_id: reportedUserId,
    report_type: 'other',
    title: '',
    description: '',
    severity: 'medium',
    booking_id: bookingId || null,
    job_id: jobId || null
  })
  const [loading, setLoading] = useState(false)

  const reportTypes = [
    { value: 'caregiver_misconduct', label: 'Caregiver Misconduct', icon: 'person-remove' },
    { value: 'parent_maltreatment', label: 'Parent Maltreatment', icon: 'warning' },
    { value: 'inappropriate_behavior', label: 'Inappropriate Behavior', icon: 'alert-circle' },
    { value: 'safety_concern', label: 'Safety Concern', icon: 'shield-outline' },
    { value: 'payment_dispute', label: 'Payment Dispute', icon: 'card-outline' },
    { value: 'other', label: 'Other', icon: 'ellipsis-horizontal' }
  ]

  const severityLevels = [
    { value: 'low', label: 'Low', color: '#10B981', icon: 'information-circle' },
    { value: 'medium', label: 'Medium', color: '#F59E0B', icon: 'alert-circle' },
    { value: 'high', label: 'High', color: '#EF4444', icon: 'warning' },
    { value: 'critical', label: 'Critical', color: '#DC2626', icon: 'alert' }
  ]

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      Alert.alert('Missing Information', 'Please fill in all required fields')
      return
    }

    if (!formData.reported_user_id) {
      Alert.alert('Error', 'Missing user information. Please try again.')
      return
    }

    setLoading(true)
    try {
      const result = await reportService.createReport(formData)
      console.log('Report created:', result)
      
      if (onReportSubmitted) {
        onReportSubmitted()
      }
      
      Alert.alert(
        'Report Submitted',
        'Your report has been submitted successfully. We will review it and take appropriate action.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      )
    } catch (error) {
      console.error('Report submission error:', error)
      Alert.alert('Submission Failed', error.message || 'Failed to submit report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderTypeSelector = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Report Type *</Text>
      <View style={styles.optionsGrid}>
        {reportTypes.map(type => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.optionCard,
              formData.report_type === type.value && styles.selectedOption
            ]}
            onPress={() => setFormData({...formData, report_type: type.value})}
          >
            <Ionicons 
              name={type.icon} 
              size={24} 
              color={formData.report_type === type.value ? '#FFFFFF' : '#6B7280'} 
            />
            <Text style={[
              styles.optionText,
              formData.report_type === type.value && styles.selectedOptionText
            ]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  const renderSeveritySelector = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Severity Level</Text>
      <View style={styles.severityRow}>
        {severityLevels.map(level => (
          <TouchableOpacity
            key={level.value}
            style={[
              styles.severityCard,
              { borderColor: level.color },
              formData.severity === level.value && { backgroundColor: level.color }
            ]}
            onPress={() => setFormData({...formData, severity: level.value})}
          >
            <Ionicons 
              name={level.icon} 
              size={20} 
              color={formData.severity === level.value ? '#FFFFFF' : level.color} 
            />
            <Text style={[
              styles.severityText,
              { color: formData.severity === level.value ? '#FFFFFF' : level.color }
            ]}>
              {level.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Report User</Text>
            {reportedUserName && (
              <Text style={styles.headerSubtitle}>Reporting: {reportedUserName}</Text>
            )}
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {renderTypeSelector()}

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Report Title *</Text>
            <TextInput
              value={formData.title}
              onChangeText={(text) => setFormData({...formData, title: text})}
              mode="outlined"
              style={styles.textInput}
              placeholder="Brief summary of the issue"
              maxLength={255}
              outlineColor="#E5E7EB"
              activeOutlineColor="#3B82F6"
            />
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Detailed Description *</Text>
            <TextInput
              value={formData.description}
              onChangeText={(text) => setFormData({...formData, description: text})}
              mode="outlined"
              multiline
              numberOfLines={6}
              style={[styles.textInput, styles.textArea]}
              placeholder="Please provide detailed information about the incident, including when it occurred and any relevant context..."
              outlineColor="#E5E7EB"
              activeOutlineColor="#3B82F6"
            />
          </View>

          {renderSeveritySelector()}

          <View style={styles.disclaimerContainer}>
            <Ionicons name="information-circle" size={20} color="#6B7280" />
            <Text style={styles.disclaimerText}>
              All reports are reviewed by our moderation team. False reports may result in account restrictions.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.submitButtonText}>Submitting...</Text>
              </View>
            ) : (
              <>
                <Ionicons name="flag" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Submit Report</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  keyboardView: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  backButton: {
    padding: 8,
    marginRight: 8
  },
  headerContent: {
    flex: 1
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16
  },
  sectionContainer: {
    marginTop: 24
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  optionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    gap: 8
  },
  selectedOption: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6'
  },
  optionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center'
  },
  selectedOptionText: {
    color: '#FFFFFF'
  },
  textInput: {
    backgroundColor: '#FFFFFF'
  },
  textArea: {
    minHeight: 120
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8
  },
  severityCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    gap: 4
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600'
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 12
  },
  disclaimerText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  submitButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  }
})

export default CreateReportScreen
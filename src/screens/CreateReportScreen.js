import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity
} from 'react-native'
import { TextInput, Button } from 'react-native-paper'
import { Picker } from '@react-native-picker/picker'
import { reportService } from '../services/supabase/reportService'

const CreateReportScreen = ({ navigation, route }) => {
  const { reportedUserId, reportedUserName, bookingId, jobId } = route.params || {}
  
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
    { value: 'caregiver_misconduct', label: 'Caregiver Misconduct' },
    { value: 'parent_maltreatment', label: 'Parent Maltreatment' },
    { value: 'inappropriate_behavior', label: 'Inappropriate Behavior' },
    { value: 'safety_concern', label: 'Safety Concern' },
    { value: 'payment_dispute', label: 'Payment Dispute' },
    { value: 'other', label: 'Other' }
  ]

  const severityLevels = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ]

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      await reportService.createReport(formData)
      Alert.alert(
        'Report Submitted',
        'Your report has been submitted successfully. We will review it and take appropriate action.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      )
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Report User</Text>
        
        {reportedUserName && (
          <Text style={styles.subtitle}>Reporting: {reportedUserName}</Text>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Report Type *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.report_type}
              onValueChange={(value) => setFormData({...formData, report_type: value})}
            >
              {reportTypes.map(type => (
                <Picker.Item key={type.value} label={type.label} value={type.value} />
              ))}
            </Picker>
          </View>
        </View>

        <TextInput
          label="Title *"
          value={formData.title}
          onChangeText={(text) => setFormData({...formData, title: text})}
          mode="outlined"
          style={styles.input}
          maxLength={255}
        />

        <TextInput
          label="Description *"
          value={formData.description}
          onChangeText={(text) => setFormData({...formData, description: text})}
          mode="outlined"
          multiline
          numberOfLines={6}
          style={styles.input}
          placeholder="Please provide detailed information about the incident..."
        />

        <View style={styles.field}>
          <Text style={styles.label}>Severity</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.severity}
              onValueChange={(value) => setFormData({...formData, severity: value})}
            >
              {severityLevels.map(level => (
                <Picker.Item key={level.value} label={level.label} value={level.value} />
              ))}
            </Picker>
          </View>
        </View>

        <Text style={styles.note}>
          * Required fields. All reports are reviewed by our moderation team.
        </Text>

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.submitButton}
        >
          Submit Report
        </Button>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  content: {
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20
  },
  field: {
    marginBottom: 16
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    backgroundColor: 'white'
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white'
  },
  note: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 20
  },
  submitButton: {
    paddingVertical: 8
  }
})

export default CreateReportScreen
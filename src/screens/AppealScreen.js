import React, { useState } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native'
import { useAuth } from '../contexts/AuthContext'
import { supabaseService } from '../services/supabase'

const AppealScreen = ({ navigation, route }) => {
  const { user } = useAuth()
  const { suspensionDetails } = route.params || {}
  
  const [appealText, setAppealText] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmitAppeal = async () => {
    if (!appealText.trim()) {
      Alert.alert('Error', 'Please provide a reason for your appeal.')
      return
    }

    setLoading(true)
    try {
      // Create a notification for admins about the appeal
      await supabaseService.createNotification({
        user_id: 'admin', // This would be replaced with actual admin user IDs
        type: 'appeal',
        title: 'Suspension Appeal Submitted',
        message: `User ${user.email} has submitted an appeal for their suspension.`,
        data: {
          user_id: user.id,
          user_email: user.email,
          appeal_text: appealText,
          suspension_reason: suspensionDetails?.reason,
          suspension_start: suspensionDetails?.startDate,
          suspension_end: suspensionDetails?.endDate
        }
      })

      Alert.alert(
        'Appeal Submitted',
        'Your appeal has been submitted successfully. We will review it and get back to you within 24-48 hours.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      )
    } catch (error) {
      console.error('Error submitting appeal:', error)
      Alert.alert('Error', 'Failed to submit appeal. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Appeal Suspension</Text>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Suspension Reason:</Text>
          <Text style={styles.infoText}>
            {suspensionDetails?.reason || 'Account violation'}
          </Text>
        </View>

        {suspensionDetails?.endDate && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoLabel}>Suspension Period:</Text>
            <Text style={styles.infoText}>
              Until {new Date(suspensionDetails.endDate).toLocaleDateString()}
            </Text>
          </View>
        )}

        <Text style={styles.instructionText}>
          Please explain why you believe this suspension should be reversed. 
          Provide any relevant context or evidence that supports your case.
        </Text>

        <TextInput
          style={styles.textInput}
          multiline
          numberOfLines={8}
          placeholder="Enter your appeal explanation here..."
          value={appealText}
          onChangeText={setAppealText}
          maxLength={1000}
          textAlignVertical="top"
        />

        <Text style={styles.characterCount}>
          {appealText.length}/1000 characters
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.disabledButton]} 
            onPress={handleSubmitAppeal}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Submitting...' : 'Submit Appeal'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimerText}>
          Appeals are reviewed by our moderation team. Submitting false information 
          may result in permanent account suspension.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  scrollView: {
    flex: 1
  },
  content: {
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center'
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4
  },
  infoText: {
    fontSize: 16,
    color: '#333'
  },
  instructionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginVertical: 20
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#333',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 20
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#666',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#1976d2',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  disabledButton: {
    backgroundColor: '#ccc'
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  disclaimerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18
  }
})

export default AppealScreen
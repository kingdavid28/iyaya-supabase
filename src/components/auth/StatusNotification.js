import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native'
import { formatSuspensionReason, getSuspensionTimeRemaining, canAppealSuspension } from '../../utils/statusUtils'

const StatusNotification = ({ 
  visible, 
  statusData, 
  suspensionDetails, 
  onClose, 
  onAppeal 
}) => {
  if (!visible || !statusData) return null

  const renderSuspensionContent = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Account Suspended</Text>
      <Text style={styles.message}>
        {formatSuspensionReason(suspensionDetails?.reason)}
      </Text>
      
      {suspensionDetails?.endDate && (
        <Text style={styles.timeRemaining}>
          {getSuspensionTimeRemaining(suspensionDetails.endDate)}
        </Text>
      )}
      
      {suspensionDetails?.adminNotes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Additional Information:</Text>
          <Text style={styles.notes}>{suspensionDetails.adminNotes}</Text>
        </View>
      )}
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>OK</Text>
        </TouchableOpacity>
        
        {canAppealSuspension(suspensionDetails) && (
          <TouchableOpacity style={styles.appealButton} onPress={onAppeal}>
            <Text style={styles.appealButtonText}>Appeal</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )

  const renderBanContent = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Account Banned</Text>
      <Text style={styles.message}>
        {formatSuspensionReason(suspensionDetails?.reason)}
      </Text>
      
      {suspensionDetails?.adminNotes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Additional Information:</Text>
          <Text style={styles.notes}>{suspensionDetails.adminNotes}</Text>
        </View>
      )}
      
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>OK</Text>
      </TouchableOpacity>
    </View>
  )

  const renderReactivationContent = () => (
    <View style={styles.content}>
      <Text style={[styles.title, styles.successTitle]}>Welcome Back!</Text>
      <Text style={styles.message}>
        Your account has been reactivated. You can now access all features.
      </Text>
      
      <TouchableOpacity style={[styles.closeButton, styles.successButton]} onPress={onClose}>
        <Text style={styles.closeButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  )

  const getContent = () => {
    if (statusData.isBanned) return renderBanContent()
    if (statusData.isSuspended) return renderSuspensionContent()
    if (statusData.status === 'active') return renderReactivationContent()
    return null
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {getContent()}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxWidth: 400,
    width: '100%'
  },
  content: {
    padding: 24
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 12,
    textAlign: 'center'
  },
  successTitle: {
    color: '#2e7d32'
  },
  message: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 16,
    textAlign: 'center'
  },
  timeRemaining: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic'
  },
  notesContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  notes: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  closeButton: {
    flex: 1,
    backgroundColor: '#666',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center'
  },
  successButton: {
    backgroundColor: '#2e7d32'
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  appealButton: {
    flex: 1,
    backgroundColor: '#1976d2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center'
  },
  appealButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  }
})

export default StatusNotification
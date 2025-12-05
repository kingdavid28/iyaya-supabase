import React, { useEffect } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useUserStatus } from '../../hooks/useUserStatus'
import { useAuth } from '../../contexts/AuthContext'

const StatusGuard = ({ children }) => {
  const { user } = useAuth()
  const { statusData, loading, isActive } = useUserStatus()

  // Don't render guard for unauthenticated users
  if (!user) {
    return children
  }

  // Show loading while checking status
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Checking account status...</Text>
      </View>
    )
  }

  // Block access for suspended/banned users
  if (!isActive) {
    return (
      <View style={styles.blockedContainer}>
        <Text style={styles.blockedTitle}>Account Access Restricted</Text>
        <Text style={styles.blockedMessage}>
          Your account access has been restricted. Please check your email for more information.
        </Text>
      </View>
    )
  }

  // Allow access for active users
  return children
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },
  blockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  blockedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 16,
    textAlign: 'center'
  },
  blockedMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24
  }
})

export default StatusGuard
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { userStatusService } from '../services/supabase/userStatusService'
import { Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'

export const useUserStatus = () => {
  const { user, signOut } = useAuth()
  const navigation = useNavigation()
  const [statusData, setStatusData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState(null)

  const checkStatus = useCallback(async () => {
    if (!user?.id) {
      setStatusData({
        status: 'active',
        isSuspended: false,
        isBanned: false,
        suspensionData: null,
        canAccess: true
      })
      setLoading(false)
      return
    }

    try {
      const status = await userStatusService.checkUserStatus(user.id)
      setStatusData(status)
      
      if (!status.canAccess) {
        await handleStatusViolation(status)
      }
    } catch (error) {
      console.warn('Error checking user status:', error)
      // Set safe defaults on error
      setStatusData({
        status: 'active',
        isSuspended: false,
        isBanned: false,
        suspensionData: null,
        canAccess: true
      })
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  const handleStatusViolation = async (status) => {
    if (status.isSuspended) {
      const details = await userStatusService.getUserSuspensionDetails(user.id)
      showSuspensionAlert(details)
    } else if (status.isBanned) {
      showBanAlert(status.suspensionData)
    }
    
    // Force logout for suspended/banned users
    setTimeout(() => signOut(), 2000)
  }

  const showSuspensionAlert = (details) => {
    const message = details?.reason || 'Your account has been suspended.'
    const endDate = details?.endDate ? new Date(details.endDate).toLocaleDateString() : null
    
    Alert.alert(
      'Account Suspended',
      endDate 
        ? `${message}\n\nSuspension ends: ${endDate}`
        : message,
      [
        { text: 'OK', onPress: () => {} },
        ...(details?.appealable ? [{ text: 'Appeal', onPress: () => handleAppeal() }] : [])
      ]
    )
  }

  const showBanAlert = (suspensionData) => {
    const message = suspensionData?.reason || 'Your account has been permanently banned.'
    
    Alert.alert(
      'Account Banned',
      message,
      [{ text: 'OK', onPress: () => {} }]
    )
  }

  const handleAppeal = async () => {
    try {
      const details = await userStatusService.getUserSuspensionDetails(user.id)
      navigation.navigate('Appeal', { suspensionDetails: details })
    } catch (error) {
      console.error('Error navigating to appeal:', error)
      Alert.alert('Error', 'Unable to open appeal form. Please try again.')
    }
  }

  const handleStatusUpdate = useCallback((update) => {
    const action = userStatusService.handleStatusChange(update)
    
    switch (action.action) {
      case 'suspend':
        showSuspensionAlert(action.details)
        if (action.shouldLogout) {
          setTimeout(() => signOut(), 2000)
        }
        break
      case 'ban':
        showBanAlert(action.details)
        if (action.shouldLogout) {
          setTimeout(() => signOut(), 2000)
        }
        break
      case 'reactivate':
        Alert.alert('Welcome Back', action.message)
        checkStatus() // Refresh status
        break
    }
  }, [signOut, checkStatus])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  useEffect(() => {
    if (!user?.id) return

    const sub = userStatusService.subscribeToStatusChanges(user.id, handleStatusUpdate)
    setSubscription(sub)

    return () => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe()
      }
    }
  }, [user?.id, handleStatusUpdate])

  return {
    statusData,
    loading,
    isActive: statusData?.canAccess || false,
    isSuspended: statusData?.isSuspended || false,
    isBanned: statusData?.isBanned || false,
    checkStatus,
    refreshStatus: checkStatus
  }
}
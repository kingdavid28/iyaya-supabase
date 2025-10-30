import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

const ONBOARDING_KEY = 'hasSeenOnboarding'

const getStorageItem = async (key) => {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key)
      }
    } catch (error) {
      console.error('Error accessing onboarding status in localStorage:', error)
    }
    return null
  }

  return AsyncStorage.getItem(key)
}

const setStorageItem = async (key, value) => {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value)
        return true
      }
    } catch (error) {
      console.error('Error saving onboarding status to localStorage:', error)
      return false
    }
    return false
  }

  try {
    await AsyncStorage.setItem(key, value)
    return true
  } catch (error) {
    console.error('Error saving onboarding status to AsyncStorage:', error)
    return false
  }
}

export const hasSeenOnboarding = async () => {
  try {
    const value = await getStorageItem(ONBOARDING_KEY)
    return value === 'true'
  } catch (error) {
    console.error('Error checking onboarding status:', error)
    return false
  }
}

export const setOnboardingComplete = async () => {
  const stored = await setStorageItem(ONBOARDING_KEY, 'true')
  return stored
}


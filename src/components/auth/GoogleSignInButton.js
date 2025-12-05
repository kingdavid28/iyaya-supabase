import React, { useEffect } from 'react'
import { TouchableOpacity, Text, StyleSheet, View, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'

// Try to import Google Sign-In, but handle gracefully if not available
let GoogleSignin = null
try {
  if (Platform.OS !== 'web') {
    GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin
  }
} catch (error) {
  console.log('Google Sign-In not available:', error.message)
}

const GoogleSignInButton = ({ onPress, loading, style, textStyle }) => {
  useEffect(() => {
    // Configure Google Sign-In if available
    if (GoogleSignin && !loading) {
      try {
        const webClientId = Constants.expoConfig?.extra?.googleWebClientId
        if (webClientId) {
          GoogleSignin.configure({
            webClientId,
            offlineAccess: true,
          })
        }
      } catch (error) {
        console.warn('Google Sign-In configuration failed:', error)
      }
    }
  }, [loading])

  const handlePress = async () => {
    if (GoogleSignin && Platform.OS !== 'web') {
      try {
        // Use native Google Sign-In
        await GoogleSignin.hasPlayServices()
        const userInfo = await GoogleSignin.signIn()
        
        // Call the provided onPress with Google user info
        if (onPress) {
          onPress(userInfo)
        }
      } catch (error) {
        console.error('Native Google Sign-In failed:', error)
        // Fallback to web OAuth
        if (onPress) {
          onPress()
        }
      }
    } else {
      // Use web OAuth or fallback
      if (onPress) {
        onPress()
      }
    }
  }

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handlePress}
      disabled={loading}
      accessibilityLabel="Sign in with Google"
    >
      <View style={styles.content}>
        <Ionicons name="logo-google" size={20} color="#4285F4" />
        <Text style={[styles.text, textStyle]}>
          {loading ? 'Signing in...' : 'Continue with Google'}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#dadce0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 8
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#3c4043'
  }
})

export default GoogleSignInButton
import React from 'react'
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const GoogleSignInButton = ({ onPress, loading, style, textStyle }) => {
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
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
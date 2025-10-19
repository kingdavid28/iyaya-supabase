// src/components/auth/FacebookSignInButton.js
import React, { useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import facebookAuthService from '../../services/facebookAuthService';
import { useAuth } from '../../contexts/AuthContext';

const FacebookSignInButton = ({ 
  onSuccess, 
  onError, 
  userRole = 'parent',
  style,
  textStyle,
  disabled = false,
  mode = 'signin', // 'signin' or 'link'
  onPress,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithFacebook } = useAuth();

  const handleFacebookSignIn = async () => {
    if (disabled || isLoading) return;
    
    setIsLoading(true);
    onPress?.(); // Call onPress if provided
    
    try {
      console.log('🔵 Facebook sign-in button pressed for role:', userRole);
      
      // Attempt real Facebook authentication first
      const result = await facebookAuthService.signInWithFacebook(userRole);
      console.log('✅ Facebook auth service result:', result);
      
      // Process the result through AuthContext
      await loginWithFacebook(result);
      console.log('✅ Facebook login processed by AuthContext');
      
      // Show success message
      Alert.alert(
        'Facebook Sign-In Successful!', 
        `Welcome ${result.user.name}! You are now signed in as a ${userRole}.`,
        [{ text: 'OK' }]
      );
      
      onSuccess?.(result);
      
    } catch (error) {
      console.error('❌ Facebook sign-in failed:', error);
      
      Alert.alert(
        'Facebook Sign-In Failed',
        error.message || 'Unable to sign in with Facebook. Please try again.',
        [{ text: 'OK' }]
      );
      
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonText = mode === 'link' 
    ? 'Link Facebook Account' 
    : `Continue with Facebook`;

  return (
    <TouchableOpacity
      style={[styles.button, style, disabled && styles.disabled]}
      onPress={handleFacebookSignIn}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" style={styles.icon} />
        ) : (
          <Ionicons name="logo-facebook" size={20} color="#FFFFFF" style={styles.icon} />
        )}
        <Text style={[styles.text, textStyle]}>
          {isLoading ? 'Connecting...' : buttonText}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#1877F2', // Facebook blue
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabled: {
    backgroundColor: '#B0B0B0',
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default FacebookSignInButton;

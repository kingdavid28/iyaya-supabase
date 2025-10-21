// src/components/auth/FacebookSignInButton.js
import React, { useState, useCallback, memo } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import facebookAuthService from '../../services/facebookAuthService';
import { useAuth } from '../../contexts/AuthContext';

/**
 * FacebookSignInButton - A reusable component for Facebook authentication
 *
 * @component
 * @param {Object} props - Component props
 * @param {Function} props.onSuccess - Callback fired on successful authentication
 * @param {Function} props.onError - Callback fired on authentication error
 * @param {string} props.userRole - User role ('parent' or 'caregiver')
 * @param {Object} props.style - Custom styles for the button
 * @param {Object} props.textStyle - Custom styles for the button text
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {string} props.mode - Button mode ('signin' or 'link')
 * @param {Function} props.onPress - Additional onPress callback
 */
const FacebookSignInButton = ({
  onSuccess,
  onError,
  userRole = 'parent',
  style,
  textStyle,
  disabled = false,
  mode = 'signin',
  onPress,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithFacebook } = useAuth();

  /**
   * Handles the Facebook sign-in process
   * Includes comprehensive logging for debugging
   */
  const handleFacebookSignIn = useCallback(async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    onPress?.();

    console.log('🔵 FACEBOOK BUTTON PRESSED! Role:', userRole);
    console.log('🔵 Environment check:', {
      isDev: __DEV__,
      testMode: process.env.EXPO_PUBLIC_FACEBOOK_TEST_MODE
    });

    try {
      console.log('🔵 Facebook sign-in button pressed for role:', userRole);

      // Attempt Facebook authentication
      const result = await facebookAuthService.signInWithFacebook(userRole);

      console.log('✅ Facebook auth service result:', result);
      console.log('🔍 Result structure:', {
        success: result?.success,
        hasUser: !!result?.user,
        userId: result?.user?.id,
        isTestMode: result?.isTestMode,
        role: result?.role
      });

      // Process the result through AuthContext
      console.log('🔄 Calling loginWithFacebook with result...');
      const processedResult = await loginWithFacebook(result);

      console.log('✅ Facebook login processed by AuthContext');
      console.log('🔍 Processed result:', {
        hasUser: !!processedResult,
        userId: processedResult?.id,
        role: processedResult?.role
      });

      // Show success message
      const userName = processedResult.name || processedResult.user_metadata?.name || 'User';
      Alert.alert(
        'Facebook Sign-In Successful!',
        `Welcome ${userName}! You are now signed in as a ${userRole}.`,
        [{ text: 'OK' }]
      );

      onSuccess?.(processedResult);

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
  }, [disabled, isLoading, userRole, loginWithFacebook, onSuccess, onError, onPress]);

  const buttonText = mode === 'link'
    ? 'Link Facebook Account'
    : `Continue with Facebook`;

  return (
    <TouchableOpacity
      style={[styles.button, style, disabled && styles.disabled]}
      onPress={handleFacebookSignIn}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      accessibilityLabel={`Facebook sign-in button for ${userRole}`}
      accessibilityHint="Tap to sign in with your Facebook account"
      accessibilityRole="button"
    >
      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color="#FFFFFF"
            style={styles.icon}
            accessibilityLabel="Loading"
          />
        ) : (
          <Ionicons
            name="logo-facebook"
            size={20}
            color="#FFFFFF"
            style={styles.icon}
            accessibilityLabel="Facebook icon"
          />
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

export default memo(FacebookSignInButton);

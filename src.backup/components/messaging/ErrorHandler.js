import React, { useState, useCallback } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Error types and their user-friendly messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: {
    title: 'Connection Error',
    message: 'Unable to connect to the server. Please check your internet connection.',
    icon: 'cloud-offline',
    color: '#ef4444',
  },
  FIREBASE_ERROR: {
    title: 'Service Unavailable',
    message: 'Messaging service is temporarily unavailable. Please try again in a moment.',
    icon: 'server',
    color: '#f59e0b',
  },
  PERMISSION_ERROR: {
    title: 'Permission Denied',
    message: 'You don\'t have permission to perform this action.',
    icon: 'shield-checkmark',
    color: '#ef4444',
  },
  VALIDATION_ERROR: {
    title: 'Invalid Input',
    message: 'Please check your message and try again.',
    icon: 'warning',
    color: '#f59e0b',
  },
  UNKNOWN_ERROR: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again.',
    icon: 'alert-circle',
    color: '#6b7280',
  },
};

// Error handling service
export class MessagingErrorHandler {
  static getUserFriendlyError(error) {
    if (!error) return ERROR_MESSAGES.UNKNOWN_ERROR;

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toLowerCase() || '';

    // Network-related errors
    if (errorMessage.includes('network') || errorMessage.includes('connection') ||
        errorCode.includes('unavailable') || errorCode.includes('offline')) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }

    // Firebase errors
    if (errorMessage.includes('firebase') || errorMessage.includes('database') ||
        errorCode.includes('permission') || errorCode.includes('auth')) {
      return ERROR_MESSAGES.FIREBASE_ERROR;
    }

    // Validation errors
    if (errorMessage.includes('invalid') || errorMessage.includes('required') ||
        errorMessage.includes('empty')) {
      return ERROR_MESSAGES.VALIDATION_ERROR;
    }

    // Permission errors
    if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
      return ERROR_MESSAGES.PERMISSION_ERROR;
    }

    return ERROR_MESSAGES.UNKNOWN_ERROR;
  }

  static logError(error, context = '') {
    console.error(`🚨 Messaging Error ${context}:`, {
      message: error.message,
      code: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}

// Toast notification component
const ToastNotification = ({ visible, type, message, onHide }) => {
  const [slideAnim] = useState(new Animated.Value(visible ? 1 : 0));

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      // Auto-hide after 4 seconds
      const timer = setTimeout(() => {
        hideToast();
      }, 4000);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = useCallback(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start(() => {
      onHide();
    });
  }, [slideAnim, onHide]);

  const errorConfig = ERROR_MESSAGES[type] || ERROR_MESSAGES.UNKNOWN_ERROR;

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[styles.toastContent, { borderLeftColor: errorConfig.color }]}>
        <View style={styles.toastIconContainer}>
          <Ionicons name={errorConfig.icon} size={20} color={errorConfig.color} />
        </View>
        <View style={styles.toastTextContainer}>
          <Text style={styles.toastTitle}>{errorConfig.title}</Text>
          <Text style={styles.toastMessage}>{message || errorConfig.message}</Text>
        </View>
        <TouchableOpacity onPress={hideToast} style={styles.toastCloseButton}>
          <Ionicons name="close" size={16} color="#9ca3af" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// Error feedback hook
export const useErrorHandler = () => {
  const [error, setError] = useState(null);

  const showError = useCallback((error, context = '') => {
    const errorConfig = MessagingErrorHandler.getUserFriendlyError(error);
    MessagingErrorHandler.logError(error, context);

    setError({
      ...errorConfig,
      message: error.message || errorConfig.message,
      context,
    });
  }, []);

  const hideError = useCallback(() => {
    setError(null);
  }, []);

  const ErrorToast = error ? (
    <ToastNotification
      visible={!!error}
      type={error.type}
      message={error.message}
      onHide={hideError}
    />
  ) : null;

  return {
    showError,
    hideError,
    ErrorToast,
    hasError: !!error,
  };
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  toastContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  toastIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  toastTextContainer: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  toastMessage: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  toastCloseButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default ToastNotification;

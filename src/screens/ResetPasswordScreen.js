import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../config/api';
import {
  AuthStatusSkeleton,
  AuthActionSkeleton
} from '../components/auth/AuthSkeletons';

const ResetPasswordScreen = ({ navigation, route }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const { token } = route.params || {};

  useEffect(() => {
    if (!token) {
      Alert.alert('Error', 'Invalid reset link', [
        { text: 'OK', onPress: () => navigation.navigate('WelcomeScreen') }
      ]);
    }
  }, [token]);

  const validatePassword = (password) => {
    const minLength = __DEV__ ? 8 : 12;
    const errors = [];

    if (password.length < minLength) {
      errors.push(`At least ${minLength} characters`);
    }

    if (!__DEV__) {
      if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
      if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
      if (!/\d/.test(password)) errors.push('One number');
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('One symbol');
    }

    return errors;
  };

  const handlePasswordChange = (password) => {
    setNewPassword(password);
    const validationErrors = validatePassword(password);
    setErrors(prev => ({
      ...prev,
      password: validationErrors.length > 0 ? validationErrors : null
    }));
  };

  const handleConfirmPasswordChange = (password) => {
    setConfirmPassword(password);
    setErrors(prev => ({
      ...prev,
      confirmPassword: password !== newPassword ? 'Passwords do not match' : null
    }));
  };

  const handleSubmit = async () => {
    const passwordErrors = validatePassword(newPassword);
    const confirmError = newPassword !== confirmPassword ? 'Passwords do not match' : null;

    if (passwordErrors.length > 0 || confirmError) {
      setErrors({
        password: passwordErrors.length > 0 ? passwordErrors : null,
        confirmPassword: confirmError
      });
      return;
    }

    try {
      setLoading(true);
      const response = await authAPI.confirmPasswordReset(token, newPassword);

      if (response.success) {
        Alert.alert(
          'Success',
          'Your password has been reset successfully. You can now log in with your new password.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('WelcomeScreen')
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient 
        colors={["#fce8f4", "#f3e8ff"]}
        style={[styles.container, styles.gradient]}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#db2777" />
            </TouchableOpacity>
            <Text style={styles.title}>Reset Password</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.card}>
              <View style={styles.iconContainer}>
                <Ionicons name="lock-closed" size={48} color="#db2777" />
              </View>

              <Text style={styles.subtitle}>Create New Password</Text>
              <Text style={styles.description}>
                Your new password must be secure and different from your previous password.
              </Text>

              <TextInput
                label="New Password"
                value={newPassword}
                onChangeText={handlePasswordChange}
                mode="outlined"
                style={styles.input}
                secureTextEntry={!showPassword}
                right={
                  <TextInput.Icon 
                    icon={showPassword ? "eye-off" : "eye"} 
                    onPress={() => setShowPassword(!showPassword)}
                    color="#db2777"
                  />
                }
                theme={{ colors: { primary: '#db2777' } }}
                error={!!errors.password}
              />
              {errors.password && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorTitle}>Password must have:</Text>
                  {errors.password.map((error, index) => (
                    <Text key={index} style={styles.errorText}>• {error}</Text>
                  ))}
                </View>
              )}

              <TextInput
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={handleConfirmPasswordChange}
                mode="outlined"
                style={styles.input}
                secureTextEntry={!showConfirmPassword}
                right={
                  <TextInput.Icon 
                    icon={showConfirmPassword ? "eye-off" : "eye"} 
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    color="#db2777"
                  />
                }
                theme={{ colors: { primary: '#db2777' } }}
                error={!!errors.confirmPassword}
              />
              {errors.confirmPassword && (
                <Text style={styles.singleError}>{errors.confirmPassword}</Text>
              )}

              <Button 
                mode="contained" 
                onPress={handleSubmit}
                disabled={loading || !newPassword || !confirmPassword}
                style={styles.submitButton}
                labelStyle={styles.submitButtonLabel}
              >
                Reset Password
              </Button>
            </View>
          </View>
        </ScrollView>
        {loading && (
          <View style={styles.skeletonOverlay}>
            <AuthStatusSkeleton />
            <AuthActionSkeleton />
          </View>
        )}
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { position: 'relative' },
  scrollContent: { flexGrow: 1, padding: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 40,
  },
  backButton: { padding: 8, marginRight: 16 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#db2777',
  },
  formContainer: { flex: 1, justifyContent: 'center' },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    padding: 12,
    marginBottom: 16,
    borderRadius: 4,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    marginLeft: 8,
  },
  singleError: {
    color: '#dc2626',
    fontSize: 13,
    marginTop: -12,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#db2777',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 8,
  },
  submitButtonLabel: {
    color: 'white',
    fontWeight: 'bold',
  },
  skeletonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(243, 232, 255, 0.88)'
  },
});

export default ResetPasswordScreen;

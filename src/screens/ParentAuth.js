import { Ionicons } from "@expo/vector-icons";
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from "expo-linear-gradient";
import Constants from 'expo-constants';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Button, TextInput, useTheme } from "react-native-paper";
import { useApp } from "../contexts/AppContext";
import { useAuth } from '../contexts/AuthContext';
import { useAuthForm } from '../hooks/useAuthForm';
import { useAuthSubmit } from '../hooks/useAuthSubmit';
import CustomDateTimePicker from '../shared/ui/inputs/DateTimePicker';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';

const ParentAuth = ({ navigation, route }) => {
  const theme = useTheme();
  const { dispatch } = useApp();
  const { user: authUser, signIn, signUp, signInWithGoogle, verifyEmailToken } = useAuth();

  // Navigation is now handled by AuthContext, no need for focus effect

  const [mode, setMode] = useState(route.params?.mode || 'login');
  const { formData, formErrors, handleChange, validateForm: validateCurrentForm, resetForm } = useAuthForm();
  const { handleSubmit: handleFormSubmit, handleManualVerification, isSubmitting } = useAuthSubmit(navigation);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Calculate age from birth date
  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      if (mode === 'signup') {
        // Validate age requirement
        if (formData.birthDate) {
          const age = calculateAge(formData.birthDate);
          if (age < 18) {
            Alert.alert(
              'Age Requirement',
              'You must be at least 18 years old to create an account.',
              [{ text: 'OK' }]
            );
            return;
          }
        }

        const userData = {
          name: `${formData.firstName} ${formData.lastName}`,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          role: 'parent'
        };
        await signUp(formData.email, formData.password, userData);

        // Show email verification notification
        Alert.alert(
          'Check Your Email',
          `We've sent a verification link to ${formData.email}. Please check your email and click the link to verify your account before signing in.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Switch to login mode after signup
                setMode('login');
                resetForm();
              }
            }
          ]
        );
      } else if (mode === 'login') {
        await signIn(formData.email, formData.password);
      }
    } catch (error) {
      console.error('Auth error:', error?.message);

      const friendlyMessage = error?.message?.includes('Invalid login credentials')
        ? 'Invalid email or password. Please try again.'
        : error?.message || 'Unable to complete the request. Please try again.';

      Alert.alert('Authentication Failed', friendlyMessage, [
        { text: 'OK' }
      ]);
      return;
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    resetForm();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 })}
    >
      <LinearGradient
        colors={["#fce8f4", "#f3e8ff"]}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color="#db2777" />
            </TouchableOpacity>

            <View style={styles.logoContainer}>
              <LinearGradient
                colors={["#fbcfe8", "#f9a8d4"]}
                style={styles.logoBackground}
              >
                <Image
                  source={require('../../assets/icon.png')}
                  style={styles.logo}
                  resizeMode="contain"
                  accessibilityLabel="iYaya logo"
                />
              </LinearGradient>
              <Text style={styles.appTitle}>iYaya</Text>
            </View>
          </View>

          <View style={styles.authContainer}>
            <View style={[styles.authCard, styles.parentCard]}>
              <View style={styles.userTypeIndicator}>
                <LinearGradient
                  colors={["#fce7f3", "#fbcfe8"]}
                  style={styles.parentIconContainer}
                >
                  <Ionicons name="happy-outline" size={32} color="#db2777" />
                </LinearGradient>
                <Text style={styles.authTitle}>
                  {mode === 'signup' ? 'Create Parent Account' : mode === 'reset' ? 'Reset Password' : 'Welcome Back Parent'}
                </Text>
              </View>

              <View style={styles.formContainer}>
                <Text style={styles.requiredFieldsNote}>* Required fields</Text>
                <Text style={styles.emailNote}>Please use a unique email address that hasn't been registered before.</Text>
                <Text style={styles.passwordNote}>Password must be at least 12 characters with uppercase, lowercase, number, and symbol.</Text>

                {/* Name fields for signup */}
                {mode === 'signup' && (
                  <>
                    <TextInput
                      label="First Name *"
                      value={formData.firstName}
                      onChangeText={(text) => handleChange('firstName', text)}
                      mode="outlined"
                      style={styles.input}
                      left={<TextInput.Icon icon="account" color="#db2777" />}
                      theme={{ colors: { primary: '#db2777', background: 'white' } }}
                      error={!!formErrors.firstName}
                    />
                    {formErrors.firstName && <Text style={styles.errorText}>{formErrors.firstName}</Text>}

                    <View style={styles.nameRow}>
                      <TextInput
                        label="Last Name *"
                        value={formData.lastName}
                        onChangeText={(text) => handleChange('lastName', text)}
                        mode="outlined"
                        style={[styles.input, styles.lastNameInput]}
                        theme={{ colors: { primary: '#db2777', background: 'white' } }}
                        error={!!formErrors.lastName}
                      />
                      <TextInput
                        label="M.I."
                        value={formData.middleInitial}
                        onChangeText={(text) => handleChange('middleInitial', text.toUpperCase())}
                        mode="outlined"
                        style={[styles.input, styles.middleInitialInput]}
                        maxLength={1}
                        theme={{ colors: { primary: '#db2777', background: 'white' } }}
                      />
                    </View>
                    {formErrors.lastName && <Text style={styles.errorText}>{formErrors.lastName}</Text>}

                    <CustomDateTimePicker
                      label="Birth Date *"
                      value={formData.birthDate ? new Date(formData.birthDate) : null}
                      onDateChange={(date) => {
                        if (date && !isNaN(date.getTime())) {
                          handleChange('birthDate', date.toISOString().split('T')[0])
                        }
                      }}
                      mode="date"
                      placeholder="Select birth date"
                      maximumDate={new Date()}
                      error={formErrors.birthDate}
                      style={styles.input}
                    />
                    {formErrors.birthDate && <Text style={styles.errorText}>{formErrors.birthDate}</Text>}

                    <TextInput
                      label="Phone Number *"
                      value={formData.phone}
                      onChangeText={(text) => handleChange('phone', text)}
                      mode="outlined"
                      style={styles.input}
                      keyboardType="phone-pad"
                      left={<TextInput.Icon icon="phone" color="#db2777" />}
                      theme={{ colors: { primary: '#db2777', background: 'white' } }}
                      error={!!formErrors.phone}
                    />
                    {formErrors.phone && <Text style={styles.errorText}>{formErrors.phone}</Text>}
                  </>
                )}

                {/* Email */}
                <TextInput
                  label="Email *"
                  value={formData.email}
                  onChangeText={(text) => handleChange('email', text)}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  left={<TextInput.Icon icon="email" color="#db2777" />}
                  theme={{ colors: { primary: '#db2777', background: 'white' } }}
                  accessibilityLabel="Email input"
                  error={!!formErrors.email}
                />
                {formErrors.email && <Text style={styles.errorText}>{formErrors.email}</Text>}

                {/* Passwords (skip for reset mode) */}
                {mode !== 'reset' && (
                  <>
                    <TextInput
                      label="Password *"
                      value={formData.password}
                      onChangeText={(text) => handleChange('password', text)}
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
                      theme={{ colors: { primary: '#db2777', background: 'white' } }}
                      accessibilityLabel="Password input"
                      error={!!formErrors.password}
                    />
                    {formErrors.password && <Text style={styles.errorText}>{formErrors.password}</Text>}

                    {mode === 'signup' && (
                      <>
                        <TextInput
                          label="Confirm Password *"
                          value={formData.confirmPassword}
                          onChangeText={(text) => handleChange('confirmPassword', text)}
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
                          theme={{ colors: { primary: '#db2777', background: 'white' } }}
                          accessibilityLabel="Confirm password input"
                          error={!!formErrors.confirmPassword}
                        />
                        {formErrors.confirmPassword && <Text style={styles.errorText}>{formErrors.confirmPassword}</Text>}
                      </>
                    )}
                  </>
                )}

                {/* Primary action button */}
                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  style={[styles.authButton, styles.parentAuthButton]}
                  labelStyle={styles.authButtonLabel}
                  contentStyle={{ height: 48 }}
                  accessibilityLabel={mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}
                >
                  {mode === 'signup' ? 'Create Account' : mode === 'reset' ? 'Send Reset Link' : 'Sign In'}
                </Button>

                {/* Google Sign In - only for login and signup */}
                {mode !== 'reset' && (
                  <>
                    <View style={styles.divider}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>or</Text>
                      <View style={styles.dividerLine} />
                    </View>
                    
                    <GoogleSignInButton
                      onPress={() => signInWithGoogle('parent')}
                      loading={isSubmitting}
                    />
                  </>
                )}

                {/* Footer links */}
                {mode !== 'reset' ? (
                  <>
                    <TouchableOpacity
                      onPress={() => setMode('reset')}
                      accessibilityLabel="Reset password"
                    >
                      <Text style={styles.smallLink}>Forgot password?</Text>
                    </TouchableOpacity>

                    <View style={styles.authFooter}>
                      <Text style={styles.authFooterText}>
                        {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
                      </Text>
                      <Button
                        mode="outlined"
                        onPress={toggleMode}
                        style={[styles.toggleButton, mode === 'login' ? styles.signUpButton : styles.signInButton]}
                        labelStyle={mode === 'login' ? styles.signUpButtonLabel : styles.signInButtonLabel}
                        accessibilityLabel={mode === 'signup' ? 'Switch to sign in' : 'Switch to sign up'}
                      >
                        {mode === 'signup' ? 'Sign In' : 'Sign Up'}
                      </Button>
                    </View>
                  </>
                ) : (
                  <TouchableOpacity
                    onPress={() => setMode('login')}
                    accessibilityLabel="Back to sign in"
                  >
                    <Text style={styles.smallLink}>Back to Sign In</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 40,
    padding: 8,
    zIndex: 1,
  },
  logoContainer: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 50, height: 50 },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#db2777',
    marginTop: 8,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40
  },
  authCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  parentCard: { borderTopWidth: 4, borderTopColor: '#fbcfe8' },
  userTypeIndicator: { alignItems: 'center', marginBottom: 24 },
  parentIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  authTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#db2777',
    textAlign: 'center'
  },
  formContainer: { marginTop: 16 },
  input: { marginBottom: 8, backgroundColor: 'white' },
  authButton: {
    marginTop: 16,
    borderRadius: 8,
    paddingVertical: 8
  },
  parentAuthButton: { backgroundColor: '#db2777' },
  authButtonLabel: { color: 'white', fontWeight: 'bold' },
  authFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    flexWrap: 'wrap'
  },
  authFooterText: {
    color: '#6b7280',
    marginRight: 8
  },
  toggleButton: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  signUpButton: {
    borderColor: '#10b981', // Emerald green for sign up
    backgroundColor: 'transparent'
  },
  signUpButtonLabel: {
    color: '#10b981', // Emerald green for sign up
  },
  signInButton: {
    borderColor: '#db2777', // Pink for sign in
    backgroundColor: 'transparent'
  },
  signInButtonLabel: {
    color: '#db2777', // Pink for sign in
  },
  smallLink: {
    color: '#db2777',
    textAlign: 'center',
    marginTop: 8
  },
  requiredFieldsNote: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lastNameInput: {
    flex: 3,
    marginRight: 8,
  },
  middleInitialInput: {
    flex: 1,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 12,
    marginTop: -4,
  },
  emailNote: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  passwordNote: {
    fontSize: 11,
    color: '#db2777',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb'
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#6b7280',
    fontSize: 14
  },
  mobileOAuthNote: {
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginTop: 8
  },
  mobileOAuthText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic'
  }
});

export default ParentAuth;
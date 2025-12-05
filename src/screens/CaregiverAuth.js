import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { authAPI } from '../config/api';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useAuthForm } from '../hooks/useAuthForm';
import { useAuthSubmit } from '../hooks/useAuthSubmit';
import CustomDateTimePicker from '../shared/ui/inputs/DateTimePicker';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import { navigateToUserDashboard } from '../utils/navigationUtils';

const CaregiverAuth = ({ navigation }) => {
  const [mode, setMode] = useState('login');
  const { dispatch } = useApp();
  const { user: authUser, signIn, signUp, signInWithGoogle, verifyEmailToken } = useAuth();
  const { formData, formErrors, handleChange, validateForm: validateCurrentForm, resetForm } = useAuthForm();
  const { handleSubmit: handleAuthSubmit, isSubmitting } = useAuthSubmit(navigation);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Execute function for handling async operations
  const execute = async (asyncFunc, options = {}) => {
    try {
      const result = await asyncFunc();
      return result;
    } catch (error) {
      if (options.onError) {
        options.onError(error);
      } else {
        console.error('Error:', error);
      }
      throw error;
    }
  };

  // Navigate when user becomes authenticated
  useFocusEffect(
    React.useCallback(() => {
      if (authUser?.role) {
        const timer = setTimeout(() => {
          navigateToUserDashboard(navigation, authUser.role);
        }, 50);
        return () => clearTimeout(timer);
      }
    }, [authUser, navigation])
  );

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

  const handleFormSubmit = async () => {
    try {
      Keyboard.dismiss();
    } catch (e) {
      // Keyboard might not be available on web
    }

    if (!validateCurrentForm(mode)) {
      return;
    }

    const { email, password, firstName, lastName, middleInitial, birthDate, phone } = formData;
    const fullName = `${firstName} ${middleInitial ? middleInitial + '. ' : ''}${lastName}`.trim();

    const result = await execute(async () => {
      if (mode === 'signup') {
        // Validate age requirement
        if (birthDate) {
          const age = calculateAge(birthDate);
          if (age < 18) {
            Alert.alert(
              'Age Requirement',
              'You must be at least 18 years old to create an account.',
              [{ text: 'OK' }]
            );
            return;
          }
        }

        // Proceed with signup - backend will handle duplicate emails
        console.log('🚀 Proceeding with signup for:', email, 'as caregiver');

        const userData = {
          name: fullName,
          firstName,
          lastName,
          middleInitial,
          birthDate,
          phone,
          role: 'caregiver'
        };
        const result = await signUp(email, password, userData);

        // Show email verification notification
        Alert.alert(
          'Check Your Email',
          `We've sent a verification link to ${email}. Please check your email and click the link to verify your account before signing in.`,
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

        return result;
      } else if (mode === 'reset') {
        const result = await authAPI.resetPassword(email);
        Alert.alert("Reset Link Sent", "If an account with that email exists, a password reset link has been sent. Check the server console for the reset URL in development mode.");
        setMode('login');
        return result;
      } else {
        const result = await signIn(email, password);

        // Don't override role - use the role from login response

        // Navigate after successful login
        if (result?.success && result?.user?.role) {
          navigateToUserDashboard(navigation, result.user.role);
        }

        return result;
      }
    }, {
      onError: (error) => {
        const errorMessage = error?.message || "Authentication failed";
        if (errorMessage.includes('already exists') || errorMessage.includes('duplicate') || errorMessage.includes('E11000')) {
          Alert.alert("Email Already Exists", "This email is already registered. Please use a different email or try signing in.");
        } else if (errorMessage.includes('verify your email') || errorMessage.includes('verification')) {
          Alert.alert("Email Not Verified", "Please check your email and click the verification link before logging in.");
        } else {
          Alert.alert("Error", errorMessage);
        }
      }
    });
  };

  const toggleAuthMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    resetForm();
  };

  const onSubmit = () => {
    const formWithRole = { ...formData, role: 'caregiver' };
    const result = handleAuthSubmit(mode, formWithRole, validateCurrentForm);
    if (mode === 'reset' && result) {
      setMode('login');
    }
  };

  const keyboardOffset = Platform.select({ ios: 80, android: 0 });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 })}
    >
      <LinearGradient
        colors={["#e0f2fe", "#f3e8ff"]}
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
              <Ionicons name="arrow-back" size={24} color="#2563eb" />
            </TouchableOpacity>

            <View style={styles.logoContainer}>
              <LinearGradient
                colors={["#bfdbfe", "#a5b4fc"]}
                style={styles.logoBackground}
              >
                <Image
                  source={require('../../assets/logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                  accessibilityLabel="iYaya logo"
                />
              </LinearGradient>
              <Text style={styles.appTitle}>iYaya</Text>
            </View>
          </View>

          <View style={styles.authContainer}>
            <View style={[styles.authCard, styles.caregiverCard]}>
              <View style={styles.userTypeIndicator}>
                <LinearGradient
                  colors={["#e0f2fe", "#bae6fd"]}
                  style={styles.caregiverIconContainer}
                >
                  <Ionicons name="person-outline" size={32} color="#2563eb" />
                </LinearGradient>
                <Text style={styles.authTitle}>
                  {mode === 'signup' ? 'Create Caregiver Account' : mode === 'reset' ? 'Reset Password' : 'Welcome Back Caregiver'}
                </Text>
              </View>

              <View style={styles.formContainer}>
                <Text style={styles.requiredFieldsNote}>* Required fields</Text>
                <Text style={styles.emailNote}>Please use a unique email address that hasn't been registered before.</Text>
                <Text style={styles.passwordNote}>Password must be at least 12 characters with uppercase, lowercase, number, and symbol.</Text>
                {mode === 'signup' && (
                  <>
                    <TextInput
                      label="First Name *"
                      value={formData.firstName}
                      onChangeText={(text) => handleChange('firstName', text)}
                      mode="outlined"
                      style={styles.input}
                      left={<TextInput.Icon icon="account" color="#2563eb" />}
                      theme={{ colors: { primary: '#2563eb', background: 'white' } }}
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
                        theme={{ colors: { primary: '#2563eb', background: 'white' } }}
                        error={!!formErrors.lastName}
                      />
                      <TextInput
                        label="M.I."
                        value={formData.middleInitial}
                        onChangeText={(text) => handleChange('middleInitial', text.toUpperCase())}
                        mode="outlined"
                        style={[styles.input, styles.middleInitialInput]}
                        maxLength={1}
                        theme={{ colors: { primary: '#2563eb', background: 'white' } }}
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

                    <TextInput
                      label="Phone Number *"
                      value={formData.phone}
                      onChangeText={(text) => handleChange('phone', text)}
                      mode="outlined"
                      style={styles.input}
                      keyboardType="phone-pad"
                      left={<TextInput.Icon icon="phone" color="#2563eb" />}
                      theme={{ colors: { primary: '#2563eb', background: 'white' } }}
                      error={!!formErrors.phone}
                    />
                    {formErrors.phone && <Text style={styles.errorText}>{formErrors.phone}</Text>}
                  </>
                )}

                <TextInput
                  label="Email *"
                  value={formData.email}
                  onChangeText={(text) => handleChange('email', text)}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  left={<TextInput.Icon icon="email" color="#2563eb" />}
                  theme={{ colors: { primary: '#2563eb', background: 'white' } }}
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
                          color="#2563eb"
                        />
                      }
                      theme={{ colors: { primary: '#2563eb', background: 'white' } }}
                      accessibilityLabel="Password input"
                      error={!!formErrors.password}
                    />
                    {formErrors.password && <Text style={styles.errorText}>{formErrors.password}</Text>}

                    {mode === 'signup' && (
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
                            color="#2563eb"
                          />
                        }
                        theme={{ colors: { primary: '#2563eb', background: 'white' } }}
                        accessibilityLabel="Confirm password input"
                        error={!!formErrors.confirmPassword}
                      />
                    )}
                    {formErrors.confirmPassword && <Text style={styles.errorText}>{formErrors.confirmPassword}</Text>}
                  </>
                )}

                <Button
                  mode="contained"
                  onPress={handleFormSubmit}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  style={[styles.authButton, styles.caregiverAuthButton]}
                  labelStyle={styles.authButtonLabel}
                  accessibilityLabel={mode === 'signup' ? 'Create account button' : mode === 'reset' ? 'Send reset link button' : 'Sign in button'}
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
                      onPress={async (googleUserInfo) => {
                        try {
                          await signInWithGoogle(googleUserInfo)
                        } catch (error) {
                          Alert.alert('Google Sign In Failed', error.message)
                        }
                      }}
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
                        onPress={toggleAuthMode}
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
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 50,
  },
  header: {
    flexDirection: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 40,
    padding: 8,
  },
  logoContainer: {
    marginTop: 50,
    flex: 1,
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
  logo: {
    width: 50,
    height: 50,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
    marginTop: 8,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
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
  caregiverCard: {
    borderTopWidth: 4,
    borderTopColor: '#bfdbfe',
  },
  userTypeIndicator: {
    alignItems: 'center',
    marginBottom: 24,
  },
  caregiverIconContainer: {
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
    color: '#2563eb',
    textAlign: 'center',
  },
  formContainer: {
    marginTop: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  authButton: {
    marginTop: 16,
    borderRadius: 8,
    paddingVertical: 8,
  },
  caregiverAuthButton: {
    backgroundColor: '#2563eb',
  },
  authButtonLabel: {
    color: 'white',
    fontWeight: 'bold',
  },
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
    borderColor: '#2563eb', // Blue for sign in
    backgroundColor: 'transparent'
  },
  signInButtonLabel: {
    color: '#2563eb', // Blue for sign in
  },
  smallLink: {
    color: '#2563eb',
    textAlign: 'center',
    marginTop: 8,
  },
  requiredFieldsNote: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 16,
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
    marginBottom: 8,
    marginTop: -8,
  },
  emailNote: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  passwordNote: {
    fontSize: 11,
    color: '#2563eb',
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
  }
});

export default CaregiverAuth;
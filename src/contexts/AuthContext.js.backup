import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { authAPI } from "../config/api";
import { STORAGE_KEYS } from "../config/constants";
import { firebaseAuthService } from "../services/firebaseAuthService";

// Import safety functions for Firebase initialization - FIXED: Only initialize once
import { getAuthSync, initializeFirebase } from '../config/firebase';

// Global flag to prevent multiple initializations across the app
let globalAuthInitialized = false;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [hasLoggedOut, setHasLoggedOut] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Normalize user object to ensure consistent property names
  const normalizeUser = (userData) => {
    if (!userData) return null;

    return {
      // Use id consistently (prefer _id from MongoDB if available)
      id: userData._id || userData.id || userData.uid,
      // Preserve all other properties
      ...userData,
      // Ensure we don't have duplicate properties
      _id: undefined,
      uid: undefined,
    };
  };

  useEffect(() => {
    let unsubscribe = null;

    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing AuthContext with safety checks...');

        // Only initialize Firebase once globally
        if (!globalAuthInitialized) {
          await initializeFirebase();
          globalAuthInitialized = true;
        }

        // Get auth instance safely
        const auth = getAuthSync();
        console.log('✅ AuthContext: Firebase initialized, setting up listener');

        // Set up auth state listener with error handling
        unsubscribe = firebaseAuthService.onAuthStateChanged(async (user) => {
          console.log('🔐 Auth state changed:', user ? 'User logged in' : 'User logged out');

          if (user && user.emailVerified) {
            try {
              const token = await user.getIdToken();
              await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
              console.log('💾 Token stored in auth listener:', !!token);

              // Get user profile from MongoDB
              const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.9:5000'}/api/auth/firebase-profile`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              let profile = {};
              if (response.ok) {
                profile = await response.json();
                console.log('🔍 Profile data received in auth listener:', profile);
              } else {
                console.log('❌ Profile fetch failed in auth listener:', response.status);
              }

              const normalizedUser = normalizeUser({
                id: user.uid,
                email: user.email,
                name: user.displayName || profile.name,
                emailVerified: user.emailVerified,
                role: profile.role,
                firstName: profile.firstName,
                lastName: profile.lastName,
                middleInitial: profile.middleInitial,
                birthDate: profile.birthDate,
                phone: profile.phone,
                ...profile
              });
              
              setUser(normalizedUser);
            } catch (profileError) {
              console.error('❌ Error fetching user profile:', profileError);
              // Fallback to basic user data if profile fetch fails
              setUser(normalizeUser({
                id: user.uid,
                email: user.email,
                name: user.displayName,
                emailVerified: user.emailVerified,
                role: null
              }));
            }
          } else {
            setUser(null);
            await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
            console.log('🚪 User logged out or email not verified');
          }
          
          setIsLoading(false);
        });

        setAuthInitialized(true);

      } catch (error) {
        console.error('❌ AuthContext initialization failed:', error);
        setError(error.message);
        setIsLoading(false);
        setAuthInitialized(true); // Mark as initialized anyway to avoid blocking
      }
    };

    initializeAuth();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      setError(null);
      setHasLoggedOut(false);

      console.log('🔐 Attempting Firebase login with:', { email });
      const res = await firebaseAuthService.login(email, password);
      console.log('✅ Firebase login successful:', res);

      if (res?.token) {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, res.token);
        console.log('💾 Token stored successfully:', !!res.token);
      } else {
        console.log('⚠️ No token in login response');
      }

      // Normalize the user object before setting it
      if (res.user) {
        setUser(normalizeUser(res.user));
      }

      return { success: true, user: res.user };
    } catch (err) {
      console.log('❌ Login error:', err.message);
      const errorMessage = err?.message || "Login failed";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Facebook login method
  const loginWithFacebook = async (facebookResult) => {
    try {
      setIsLoading(true);
      setError(null);
      setHasLoggedOut(false);

      console.log('🔐 Processing Facebook login result:', facebookResult);

      // Store the token if available
      if (facebookResult?.token) {
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, facebookResult.token);
        console.log('💾 Facebook token stored successfully');
      }

      // Normalize and set the user
      if (facebookResult.user) {
        const normalizedUser = normalizeUser(facebookResult.user);
        setUser(normalizedUser);
        console.log('✅ Facebook user set in context:', normalizedUser);
      }

      return { success: true, user: facebookResult.user };
    } catch (err) {
      console.log('❌ Facebook login error:', err.message);
      const errorMessage = err?.message || "Facebook login failed";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData) => {
    try {
      setIsLoading(true);
      setError(null);
      setHasLoggedOut(false);

      console.log('🚀 Starting Firebase signup for:', userData.email);

      const res = await firebaseAuthService.signup(userData);
      console.log('✅ Firebase signup successful:', res);

      return res;
    } catch (err) {
      console.error('❌ Signup error:', err.message);
      const errorMessage = err?.message || "Signup failed";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Safe sign out function with Firebase safety checks
  const signOut = async () => {
    try {
      console.log('🚪 Starting Firebase signOut with safety checks...');
      setIsLoading(true);

      // Use Firebase auth service which has safety checks
      await firebaseAuthService.signOut();
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);

      setUser(null);
      setError(null);
      setHasLoggedOut(true);
      console.log('✅ Firebase signOut completed');
    } catch (err) {
      console.log('❌ Logout error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmailToken = async (token) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔐 Verifying email token:', token);
      const result = await authAPI.verifyEmail(token);
      console.log('✅ Verification API response:', result);

      if (result.success && result.token) {
        // Store the new token
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, result.token);
        console.log('💾 Token stored successfully');

        // Use user data from verification response if available
        let userData = result.user;

        // If no user data in response, fetch profile
        if (!userData) {
          const profile = await authAPI.getProfile();
          userData = profile?.data || profile;
        }

        console.log('👤 Setting user data:', userData);
        // Normalize the user object before setting it
        setUser(normalizeUser(userData));
        return { success: true, user: userData };
      }

      throw new Error(result.message || 'Email verification failed');
    } catch (error) {
      console.error('❌ Email verification error:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email) => {
    try {
      setError(null);
      const result = await firebaseAuthService.resetPassword(email);
      return result;
    } catch (err) {
      const errorMessage = err?.message || "Password reset failed";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const value = {
    user,
    loading: isLoading || !authInitialized, // Include auth initialization state
    error,
    login,
    loginWithFacebook,
    signup,
    signOut,
    resetPassword,
    verifyEmailToken,
    // Safe current user getter
    getCurrentUser: () => {
      try {
        return firebaseAuthService.getCurrentUser();
      } catch (error) {
        console.error('❌ Get current user error:', error);
        return null;
      }
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
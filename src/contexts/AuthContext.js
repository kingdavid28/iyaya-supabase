import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Platform, View } from 'react-native'
import Constants from 'expo-constants'
import * as Linking from 'expo-linking'

import supabase from '../config/supabase'
import { tokenManager } from '../utils/tokenManager'
import { userStatusService } from '../services/supabase/userStatusService'
import { trackUserRegistration, trackUserLogin } from '../utils/analytics'

// Constants
const getRedirectUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Use current domain for web
    const origin = window.location.origin;
    // Ensure we use the correct domain for production
    if (origin.includes('localhost') || origin.includes('192.168')) {
      return origin + '/auth/callback';
    }
    return 'https://iyaya-supabase.vercel.app/auth/callback';
  }
  // Fallback for development and native
  return Constants.expoConfig?.extra?.redirectUrl || 'http://localhost:3000/auth/callback'
}

const REDIRECT_URL = getRedirectUrl()

const MAX_RETRIES = 3
const RETRY_DELAY = 1000

// Error types for better error handling
const AuthErrorTypes = {
  NETWORK: 'network_error',
  UNAUTHORIZED: 'unauthorized',
  INVALID_CREDENTIALS: 'invalid_credentials',
  SESSION_EXPIRED: 'session_expired',
  USER_RESTRICTED: 'user_restricted',
  DATABASE_ERROR: 'DATABASE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  EMAIL_NOT_VERIFIED: 'email_not_verified',
  UNKNOWN: 'unknown_error'
}

// Custom error class
class AuthError extends Error {
  constructor(message, type = AuthErrorTypes.UNKNOWN, originalError = null) {
    super(message)
    this.type = type
    this.originalError = originalError
    this.name = 'AuthError'
  }
}

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const sessionRef = useRef(null)
  const isMountedRef = useRef(true)

  // Initialize mount status
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Helper to safely update state only if mounted
  const safeSetState = useCallback((setter, value) => {
    if (isMountedRef.current) {
      setter(value)
    }
  }, [])

  // Retry mechanism with exponential backoff
  const retryWithBackoff = async (fn, retries = MAX_RETRIES, delay = RETRY_DELAY) => {
    try {
      return await fn()
    } catch (error) {
      if (retries === 0) throw error

      console.log(`Retrying operation, ${retries} attempts left...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return retryWithBackoff(fn, retries - 1, delay * 2)
    }
  }

  const fetchUserWithProfile = useCallback(async (authUser) => {
    try {
      console.log('🔍 Fetching profile for user:', {
        id: authUser.id,
        email: authUser.email
      });

      // Remove the .timeout() method and use a Promise.race for timeout
      const profilePromise = supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      // Add a timeout using Promise.race
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );

      const { data: profile, error } = await Promise.race([
        profilePromise,
        timeoutPromise
      ]);

      if (error) {
        console.error('❌ Supabase error:', error);
        throw new AuthError('Failed to fetch user profile', AuthErrorTypes.DATABASE_ERROR, error);
      }

      if (!profile?.role) {
        console.error('❌ No role found in profile:', profile);
        throw new AuthError('User role not found', AuthErrorTypes.VALIDATION_ERROR);
      }

      console.log('✅ Fetched profile:', {
        id: profile.id,
        role: profile.role,
        email: profile.email
      });

      return {
        ...authUser,
        role: profile.role,
        name: profile?.name || authUser.user_metadata?.name,
        profile,
        status: 'active'
      };
    } catch (err) {
      console.error('❌ Error in fetchUserWithProfile:', err);
      throw err; // Re-throw to be handled by the caller
    }
  }, []);

  const ensureUserProfileExists = useCallback(async (authUser, role) => {
    // Validate role is provided
    if (!role) {
      throw new Error('Role is required when creating a user profile');
    }

    const MAX_RETRIES = 2;
    const RETRY_DELAY = 3000;

    // Quick check if profile exists first
    const quickCheck = async () => {
      try {
        const query = supabase
          .from('users')
          .select('id, role')
          .eq('id', authUser.id)
          .maybeSingle();

        const { data } = await Promise.race([
          query,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout')), 5000)
          )
        ]);

        if (data) {
          console.log('✅ Profile exists with role:', data.role);
        }
        return data;
      } catch (error) {
        console.warn('Quick profile check failed, will retry:', error.message);
        return null;
      }
    };

    // Create or update profile with retry logic
    const createOrUpdateProfile = async (attempt = 1) => {
      try {
        console.log(`🔄 Profile creation/update attempt ${attempt}/${MAX_RETRIES + 1}`);

        const now = new Date().toISOString();

        const profileData = {
          id: authUser.id,
          email: authUser.email || authUser.user_metadata?.email,
          role: role,
          first_name: authUser.user_metadata?.first_name ||
            authUser.user_metadata?.given_name ||
            authUser.user_metadata?.firstName ||
            null,
          last_name: authUser.user_metadata?.last_name ||
            authUser.user_metadata?.family_name ||
            authUser.user_metadata?.lastName ||
            null,
          name: authUser.user_metadata?.name ||
            authUser.user_metadata?.full_name ||
            `${authUser.user_metadata?.first_name || ''} ${authUser.user_metadata?.last_name || ''}`.trim() ||
            authUser.email?.split('@')[0] ||
            'User',
          auth_provider: authUser.app_metadata?.provider || 'supabase',
          created_at: now,
          updated_at: now
        };

        // Use upsert to handle both insert and update cases
        const query = supabase
          .from('users')
          .upsert(profileData, { onConflict: 'id' })
          .select()
          .single();

        const { data, error } = await Promise.race([
          query,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout')), 10000)
          )
        ]);

        if (error) throw error;
        console.log(`✅ Profile ${data.id} created/updated with role: ${data.role}`);
        return data;

      } catch (error) {
        if (error.code === '23505') { // Unique violation - profile exists
          console.log('ℹ️ Profile already exists, fetching...');
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();
          if (data) return data;
        }

        if (attempt <= MAX_RETRIES) {
          const delay = RETRY_DELAY * attempt;
          console.log(`⏳ Retry ${attempt}/${MAX_RETRIES} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return createOrUpdateProfile(attempt + 1);
        }

        console.error('❌ Failed to create/update profile after retries:', error);
        throw error;
      }
    };

    try {
      // 1. Quick check if profile exists
      const existingProfile = await quickCheck();

      // 2. If profile exists but has no role, we'll update it
      if (existingProfile && !existingProfile.role) {
        console.log('🔄 Profile exists but has no role, updating...');
        return await createOrUpdateProfile();
      }

      // 3. If profile doesn't exist, create it
      if (!existingProfile) {
        console.log('🔄 No profile found, creating new one...');
        return await createOrUpdateProfile();
      }

      return existingProfile;

    } catch (error) {
      console.error('⚠️ Could not ensure profile exists:', error.message);
      throw error;
    }
  }, []);

  const initializeSession = useCallback(async () => {
    try {
      // Handle OAuth callback on web
      if (Platform.OS === 'web' && window.location.hash) {
        console.log('🔄 Handling OAuth callback...')
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error('❌ OAuth callback error:', error)
        } else if (data?.session) {
          console.log('✅ OAuth session established')
        }
      }

      const { data, error } = await retryWithBackoff(() =>
        supabase.auth.getSession()
      )

      if (error) {
        console.warn('Session fetch error:', error.message)
        // Clear invalid tokens on 400 errors
        if (error.status === 400 || error.message?.includes('refresh_token')) {
          console.log('🧹 Clearing invalid session tokens')
          await supabase.auth.signOut().catch(() => {})
          if (Platform.OS === 'web') {
            localStorage.clear()
            sessionStorage.clear()
          }
        }
        sessionRef.current = null
        safeSetState(setUser, null)
        safeSetState(setError, null)
        return
      }

      const session = data?.session || null
      sessionRef.current = session

      if (session?.user) {
        // Get role hint for OAuth users
        let roleHint = null
        if (Platform.OS === 'web') {
          const storedRole = sessionStorage.getItem('pendingRole')
          if (storedRole) {
            roleHint = storedRole
            sessionStorage.removeItem('pendingRole')
          }
        }

        // Ensure profile exists for OAuth users
        if (roleHint) {
          await ensureUserProfileExists(session.user, roleHint)
        }

        const userWithProfile = await fetchUserWithProfile(session.user)
        safeSetState(setUser, userWithProfile)
      } else {
        safeSetState(setUser, null)
      }

      safeSetState(setError, null)
    } catch (err) {
      console.error('❌ Initial session fetch failed:', err)
      sessionRef.current = null

      // Clear tokens on error
      await tokenManager.logout().catch(console.warn)
      await supabase.auth.signOut().catch(console.warn)

      safeSetState(setUser, null)
      safeSetState(setError, null) // Don't show error to user on initialization
    } finally {
      safeSetState(setLoading, false)
    }
  }, [fetchUserWithProfile, safeSetState, ensureUserProfileExists])

  useEffect(() => {
    let unsubscribe

    const setupAuth = async () => {
      await initializeSession()

      // Subscribe to auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth event:', event)
          sessionRef.current = session || null

          try {
            if (event === 'SIGNED_OUT') {
              await tokenManager.logout()
            }

            if (event === 'TOKEN_REFRESHED') {
              tokenManager.clearCache()
            }

            if (session?.user) {
              // Get role hint from storage for OAuth users
              let roleHint = null
              if (Platform.OS === 'web') {
                const storedRole = sessionStorage.getItem('pendingRole')
                if (storedRole) {
                  roleHint = storedRole
                  sessionStorage.removeItem('pendingRole')
                  console.log('🎯 Using stored role hint:', roleHint)
                }
              }

              // Always ensure profile exists with correct role if we have a role hint
              if (roleHint) {
                await ensureUserProfileExists(session.user, roleHint)
              }

              const userWithProfile = await fetchUserWithProfile(session.user)
              safeSetState(setUser, userWithProfile)
              safeSetState(setError, null)

              // Track login
              if (event === 'SIGNED_IN') {
                const isOAuth = session.user.app_metadata?.provider !== 'email'
                trackUserLogin(isOAuth ? 'oauth' : 'email')
              }
            } else {
              safeSetState(setUser, null)
            }
          } catch (authError) {
            console.error('❌ Auth state handling error:', authError)
            safeSetState(setError, authError?.message || 'Authentication error')
          } finally {
            safeSetState(setLoading, false)
          }
        }
      )

      unsubscribe = subscription.unsubscribe
    }

    setupAuth()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [initializeSession, fetchUserWithProfile, safeSetState, ensureUserProfileExists])

  const signUp = async (email, password, userData) => {
    // Validate role is provided
    if (!userData?.role) {
      throw new AuthError('Role is required', AuthErrorTypes.VALIDATION_ERROR);
    }

    try {
      safeSetState(setError, null)
      safeSetState(setLoading, true)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: REDIRECT_URL,
          data: {
            name: userData.name,
            role: userData.role,
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone: userData.phone,
          }
        }
      })

      if (error) {
        throw new AuthError(error.message, AuthErrorTypes.INVALID_CREDENTIALS, error)
      }

      // Create user profile and get user with role
      let userWithRole = data.user;
      if (data.user) {
        console.log('🔄 Creating user profile for:', data.user.id)

        // Track user registration
        trackUserRegistration(userData.role)

        try {
          await ensureUserProfileExists(data.user, userData.role)
          console.log('✅ Profile created successfully')
          // Fetch the profile to get complete user data with role
          userWithRole = await fetchUserWithProfile(data.user)
        } catch (profileError) {
          console.error('❌ Profile creation failed:', profileError)
          // Still return user with role from userData even if profile creation fails
          userWithRole = {
            ...data.user,
            role: userData.role
          }
        }
      }

      return {
        ...data,
        success: true,
        requiresVerification: !data.user?.email_confirmed_at,
        user: userWithRole
      }
    } catch (err) {
      safeSetState(setError, err.message)
      throw err
    } finally {
      safeSetState(setLoading, false)
    }
  }

  const signIn = async (email, password) => {
    try {
      safeSetState(setError, null)
      safeSetState(setLoading, true)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        throw new AuthError(error.message, AuthErrorTypes.INVALID_CREDENTIALS, error)
      }

      // Check if email is verified (optional - can be enabled later)
      // if (data.user && !data.user.email_confirmed_at) {
      //   await supabase.auth.signOut()
      //   throw new AuthError('Please verify your email before signing in.', AuthErrorTypes.EMAIL_NOT_VERIFIED)
      // }

      // Get user profile with role
      let userWithProfile = data.user;
      if (data.user) {
        userWithProfile = await fetchUserWithProfile(data.user)
        trackUserLogin(userWithProfile?.role || 'unknown')
      }

      // Return user data with profile/role information
      return {
        ...data,
        success: true,
        user: userWithProfile
      }
    } catch (err) {
      safeSetState(setError, err.message)
      throw err
    } finally {
      safeSetState(setLoading, false)
    }
  }

  const signOut = async () => {
    try {
      safeSetState(setError, null)
      safeSetState(setLoading, true)

      console.log('🚪 Starting logout process...')

      // Clear token manager
      await tokenManager.logout()

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()

      if (error && !(error?.name === 'AuthSessionMissingError' || error?.message?.toLowerCase().includes('auth session missing'))) {
        console.warn('Sign out error:', error.message)
      }

      // Clear local state
      safeSetState(setUser, null)
      sessionRef.current = null

      // Aggressive cleanup for web
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // Clear all storage
        localStorage.clear()
        sessionStorage.clear()

        // Clear cookies
        document.cookie.split(';').forEach(cookie => {
          const eqPos = cookie.indexOf('=')
          const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        })

        console.log('✅ Logout complete, reloading page...')

        // Force page reload to clear all state
        setTimeout(() => {
          window.location.href = '/'
        }, 100)
      }

      return { success: true }
    } catch (err) {
      console.error('❌ Logout failed:', err)
      safeSetState(setError, err.message)

      // Force reload even on error
      if (Platform.OS === 'web') {
        setTimeout(() => {
          window.location.href = '/'
        }, 100)
      }

      throw err
    } finally {
      safeSetState(setLoading, false)
    }
  }

  const resetPassword = async (email) => {
    try {
      safeSetState(setError, null)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: REDIRECT_URL.replace('/auth/callback', '/reset-password')
      })

      if (error) {
        throw new AuthError(error.message, AuthErrorTypes.UNKNOWN, error)
      }

      return { success: true }
    } catch (err) {
      safeSetState(setError, err.message)
      throw err
    }
  }

  const resendVerification = async (email) => {
    try {
      safeSetState(setError, null)
      console.log('🔄 Resending verification email to:', email)

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: REDIRECT_URL
        }
      })

      if (error) {
        console.error('❌ Resend error:', error)
        throw new AuthError(error.message, AuthErrorTypes.UNKNOWN, error)
      }

      console.log('✅ Verification email resent successfully')
      return { success: true, message: 'Verification email sent. Please check your inbox and spam folder.' }
    } catch (err) {
      console.error('❌ Resend failed:', err)
      safeSetState(setError, err.message)
      throw err
    }
  }

  const updatePassword = async (newPassword) => {
    try {
      safeSetState(setError, null)
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        throw new AuthError(error.message, AuthErrorTypes.UNKNOWN, error)
      }

      return { success: true }
    } catch (err) {
      safeSetState(setError, err.message)
      throw err
    }
  }

  const signInWithProvider = async (provider) => {
    try {
      safeSetState(setError, null)
      safeSetState(setLoading, true)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: REDIRECT_URL,
          skipBrowserRedirect: Platform.OS !== 'web',
        }
      })

      if (error) {
        throw new AuthError(error.message, AuthErrorTypes.UNAUTHORIZED, error)
      }

      return data
    } catch (err) {
      safeSetState(setError, err.message)
      throw err
    } finally {
      safeSetState(setLoading, false)
    }
  }

  const signInWithGoogle = async (roleHint = null) => {
    try {
      safeSetState(setError, null)
      safeSetState(setLoading, true)

      console.log('🔄 Starting Google Sign-In...', {
        platform: Platform.OS,
        roleHint: 'caregiver',
        supabaseUrl: supabase?.supabaseUrl
      })

      // Test Supabase connection first
      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)

      if (testError) {
        console.error('❌ Supabase connection test failed:', testError)
        throw new AuthError('Failed to connect to authentication service', AuthErrorTypes.NETWORK, testError)
      }

      console.log('🧪 Supabase connection test:', { error: testError, hasData: !!testData })

      // Use production redirect URL for web
      const redirectTo = Platform.OS === 'web' 
        ? 'https://iyaya-supabase.vercel.app/auth/callback'
        : getRedirectUrl()

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) {
        console.error('❌ Google OAuth error:', {
          message: error.message,
          status: error.status,
          details: error
        })
        throw new AuthError(error.message, AuthErrorTypes.UNAUTHORIZED, error)
      }

      console.log('✅ Google OAuth response:', data)
      
      // Redirect to OAuth URL on web, open in browser on mobile
      if (data?.url) {
        if (Platform.OS === 'web') {
          console.log('🔄 Redirecting to OAuth URL...')
          window.location.href = data.url
        } else {
          console.log('🌐 Opening OAuth URL in browser...')
          Linking.openURL(data.url).catch(err => {
            console.error('Failed to open OAuth URL:', err)
            throw new AuthError('Could not open OAuth URL', AuthErrorTypes.AUTH_ERROR, err)
          })
        }
        return data
      }
      
      return data
    } catch (err) {
      console.error('❌ Google Sign-In failed:', {
        message: err.message,
        stack: err.stack,
        error: err
      })
      safeSetState(setError, err.message)
      throw err
    } finally {
      safeSetState(setLoading, false)
    }
  }

  const handleOAuthCallback = async (roleHint = null) => {
    try {
      safeSetState(setError, null)
      safeSetState(setLoading, true)

      console.log('🔄 Handling OAuth callback...', { roleHint })

      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error('❌ OAuth callback error:', error)
        throw new AuthError(error.message, AuthErrorTypes.UNAUTHORIZED, error)
      }

      if (data?.session?.user) {
        console.log('✅ OAuth session found, ensuring profile exists...')

        // Ensure user profile exists with role hint if provided
        if (roleHint) {
          await ensureUserProfileExists(data.session.user, roleHint)
        }

        // Track successful OAuth login
        trackUserLogin('oauth')

        return data.session
      }

      throw new AuthError('No session found after OAuth callback', AuthErrorTypes.SESSION_EXPIRED)
    } catch (err) {
      console.error('❌ OAuth callback failed:', err)
      safeSetState(setError, err.message)
      throw err
    } finally {
      safeSetState(setLoading, false)
    }
  }

  const requireAuthSession = useCallback(async () => {
    if (sessionRef.current?.user) {
      return sessionRef.current
    }

    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      console.warn('requireAuthSession error:', sessionError)
      return null
    }

    sessionRef.current = data?.session || null
    return sessionRef.current
  }, [])

  const ensureAuthenticated = useCallback(async () => {
    const session = await requireAuthSession()
    if (!session?.user?.id) {
      return null
    }

    if (!user) {
      const userWithProfile = await fetchUserWithProfile(session.user)
      safeSetState(setUser, userWithProfile)
      return userWithProfile
    }

    return user
  }, [requireAuthSession, user, fetchUserWithProfile, safeSetState])

  const getUserProfile = async () => {
    if (!user) return null

    try {
      // Try the users table first (has more fields including profile_image)
      let { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      // User not found in users table
      if (error && error.code === 'PGRST116') {
        console.log('User not found in users table')
        throw error

      }

      if (error) throw error
      return data
    } catch (err) {
      console.error('❌ Error fetching user profile:', {
        message: err?.message || String(err),
        code: err?.code,
        details: err?.details,
        hint: err?.hint
      })
      return null
    }
  }

  const clearError = useCallback(() => {
    safeSetState(setError, null)
  }, [safeSetState])

  const value = useMemo(() => ({
    user,
    loading,
    isLoading: loading, // Alias for better semantics
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    resendVerification,
    signInWithGoogle,
    handleOAuthCallback,
    requireAuthSession,
    ensureAuthenticated,
    getUserProfile,
    clearError,
    isAuthenticated: !!user
  }), [
    user,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    resendVerification,
    signInWithGoogle,
    handleOAuthCallback,
    requireAuthSession,
    ensureAuthenticated,
    getUserProfile,
    clearError
  ])

  if (loading && !user) {
    // Force loading to complete after a reasonable timeout
    const timeoutId = setTimeout(() => {
      console.warn('⏱️ Auth loading timeout (5s), forcing completion');
      safeSetState(setLoading, false);
    }, 5000); // 5 second timeout - more reasonable for slow networks

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
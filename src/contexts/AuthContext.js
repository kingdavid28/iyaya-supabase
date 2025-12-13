import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Platform, View } from 'react-native'
import Constants from 'expo-constants'

import supabase from '../config/supabase'
import { tokenManager } from '../utils/tokenManager'
import { userStatusService } from '../services/supabase/userStatusService'
import { trackUserRegistration, trackUserLogin } from '../utils/analytics'

// Constants
const getRedirectUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Use current domain for web
    return window.location.origin + '/auth/callback'
  }
  // Fallback for development and native
  return Constants.expoConfig?.extra?.redirectUrl || 'http://localhost:3000/auth/callback'
}

const REDIRECT_URL = getRedirectUrl()

const DEFAULT_ROLE = 'parent'
const MAX_RETRIES = 3
const RETRY_DELAY = 1000

// Error types for better error handling
const AuthErrorTypes = {
  NETWORK: 'network_error',
  UNAUTHORIZED: 'unauthorized',
  INVALID_CREDENTIALS: 'invalid_credentials',
  SESSION_EXPIRED: 'session_expired',
  USER_RESTRICTED: 'user_restricted',
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
        email: authUser.email,
        authUserKeys: Object.keys(authUser)
      })

      const { data, error } = await retryWithBackoff(() =>
        supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
      )

      if (error) {
        console.error('❌ Error fetching user profile:', {
          message: error?.message,
          code: error?.code
        })
        // Return minimal user object with default role
        return { 
          ...authUser, 
          role: DEFAULT_ROLE,
          profile: null 
        }
      }

      const profile = data && data.length > 0 ? data[0] : null
      console.log('👤 User profile found:', profile ? 'Yes' : 'No')

      // Check user status asynchronously
      let statusData = { canAccess: true }
      try {
        statusData = await userStatusService.checkUserStatus(authUser.id)
        if (!statusData.canAccess) {
          console.warn('⚠️ User access restricted:', statusData)
        }
      } catch (statusError) {
        console.error('Error checking user status:', statusError)
      }

      const userWithProfile = {
        ...authUser,
        role: profile?.role || DEFAULT_ROLE,
        name: profile?.name || authUser.user_metadata?.name,
        profile,
        status: profile?.status || 'active',
        statusData
      }

      console.log('✅ Final user object:', {
        id: userWithProfile.id,
        email: userWithProfile.email,
        role: userWithProfile.role
      })
      
      return userWithProfile
    } catch (err) {
      console.error('❌ Error in fetchUserWithProfile:', err)
      return { 
        ...authUser, 
        role: DEFAULT_ROLE,
        profile: null 
      }
    }
  }, [])

  const ensureUserProfileExists = useCallback(async (authUser, roleHint = DEFAULT_ROLE) => {
    try {
      if (!authUser?.id) {
        console.warn('⚠️ Cannot ensure profile without auth user ID')
        return null
      }

      // Check if profile exists
      const { data: existingProfile, error: selectError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('❌ Failed to check existing profile:', selectError)
        throw new AuthError('Failed to check user profile', AuthErrorTypes.UNKNOWN, selectError)
      }

      if (existingProfile) {
        console.log('ℹ️ Profile already exists for user:', authUser.id)
        return existingProfile
      }

      // Prepare profile data
      const role = roleHint || authUser.user_metadata?.role || DEFAULT_ROLE
      const firstName = authUser.user_metadata?.first_name
        || authUser.user_metadata?.given_name
        || authUser.user_metadata?.firstName
        || null
      const lastName = authUser.user_metadata?.last_name
        || authUser.user_metadata?.family_name
        || authUser.user_metadata?.lastName
        || null
      const derivedName = [firstName, lastName].filter(Boolean).join(' ')
      const name = authUser.user_metadata?.name
        || authUser.user_metadata?.full_name
        || authUser.user_metadata?.fullName
        || derivedName
        || authUser.email?.split('@')?.[0]
        || 'User'

      // Determine auth provider
      const authProvider = authUser.app_metadata?.provider || 'supabase'
      
      const profilePayload = {
        id: authUser.id,
        email: authUser.email,
        name,
        role,
        first_name: firstName,
        last_name: lastName,
        phone: authUser.user_metadata?.phone || null,
        auth_provider: authProvider,
        status: 'active',
        email_verified: !!authUser.email_confirmed_at,
        profile_image: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Remove undefined values
      const cleanedPayload = Object.fromEntries(
        Object.entries(profilePayload).filter(([, value]) => value !== undefined)
      )

      // Insert profile
      const { data: upsertData, error: upsertError } = await supabase
        .from('users')
        .upsert([cleanedPayload], { onConflict: 'id' })
        .select()

      if (upsertError) {
        console.error('❌ Failed to create profile:', upsertError)
        throw new AuthError('Failed to create user profile', AuthErrorTypes.UNKNOWN, upsertError)
      }

      console.log('✅ Profile created for user:', authUser.id)
      return Array.isArray(upsertData) ? upsertData[0] : upsertData
    } catch (error) {
      console.error('❌ ensureUserProfileExists error:', error)
      throw error
    }
  }, [])

  const initializeSession = useCallback(async () => {
    try {
      const { data, error } = await retryWithBackoff(() => 
        supabase.auth.getSession()
      )

      if (error) {
        console.warn('Session fetch error:', error.message)
        // Don't throw on session errors, just clear state
        sessionRef.current = null
        safeSetState(setUser, null)
        safeSetState(setError, null)
        return
      }

      const session = data?.session || null
      sessionRef.current = session

      if (session?.user) {
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
  }, [fetchUserWithProfile, safeSetState])

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
              // Get role hint from storage for new OAuth users
              let roleHint = DEFAULT_ROLE
              if (Platform.OS === 'web' && event === 'SIGNED_IN') {
                const storedRole = sessionStorage.getItem('pendingRole')
                if (storedRole) {
                  roleHint = storedRole
                  sessionStorage.removeItem('pendingRole')
                }
              }
              
              // Ensure profile exists with correct role for new users
              if (event === 'SIGNED_IN') {
                await ensureUserProfileExists(session.user, roleHint)
              }
              
              const userWithProfile = await fetchUserWithProfile(session.user)
              safeSetState(setUser, userWithProfile)
              safeSetState(setError, null)
              
              // Track OAuth login
              if (event === 'SIGNED_IN') {
                trackUserLogin('oauth')
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
  }, [initializeSession, fetchUserWithProfile, safeSetState])

  const signUp = async (email, password, userData) => {
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

      // Create user profile
      if (data.user) {
        console.log('🔄 Creating user profile for:', data.user.id)
        
        // Track user registration
        trackUserRegistration(userData.role)

        try {
          await ensureUserProfileExists(data.user, userData.role)
          console.log('✅ Profile created successfully')
        } catch (profileError) {
          console.error('❌ Profile creation failed:', profileError)
          // Don't throw - user can still sign in, profile might be created later
        }
      }

      return data
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

      // Track user login
      if (data.user) {
        const userWithProfile = await fetchUserWithProfile(data.user)
        trackUserLogin(userWithProfile?.role || 'unknown')
      }

      return data
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

      await tokenManager.logout()
      
      const { error } = await supabase.auth.signOut()
      
      // Ignore missing session errors
      if (error && !(error?.name === 'AuthSessionMissingError' || error?.message?.toLowerCase().includes('auth session missing'))) {
        throw new AuthError(error.message, AuthErrorTypes.UNKNOWN, error)
      }

      safeSetState(setUser, null)
      sessionRef.current = null
      
      return { success: true }
    } catch (err) {
      safeSetState(setError, err.message)
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

  const signInWithGoogle = async (roleHint = DEFAULT_ROLE) => {
    try {
      safeSetState(setError, null)
      safeSetState(setLoading, true)
      
      console.log('🔄 Starting Google Sign-In...', { platform: Platform.OS, roleHint })
      
      // Store role hint for later use
      if (Platform.OS === 'web') {
        sessionStorage.setItem('pendingRole', roleHint)
      }
      
      const result = await signInWithProvider('google')
      
      console.log('✅ Google OAuth initiated')
      return result
    } catch (err) {
      console.error('❌ Google Sign-In failed:', err)
      safeSetState(setError, err.message)
      throw err
    } finally {
      safeSetState(setLoading, false)
    }
  }

  const handleOAuthCallback = async (roleHint = DEFAULT_ROLE) => {
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
        
        // Ensure user profile exists with role hint
        await ensureUserProfileExists(data.session.user, roleHint)
        
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
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)

      if (error) throw error
      return data && data.length > 0 ? data[0] : null
    } catch (err) {
      console.error('Error fetching user profile:', err)
      return null
    }
  }

  const clearError = useCallback(() => {
    safeSetState(setError, null)
  }, [safeSetState])

  const value = useMemo(() => ({
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
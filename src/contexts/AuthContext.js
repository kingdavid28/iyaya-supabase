import React, { createContext, useContext, useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { ActivityIndicator, View, Platform } from 'react-native'
import Constants from 'expo-constants'
import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '../config/supabase'
import { tokenManager } from '../utils/tokenManager'

WebBrowser.maybeCompleteAuthSession()

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const sessionRef = useRef(null)

  useEffect(() => {
    let isMounted = true

    const initializeSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error

        const session = data?.session || null
        sessionRef.current = session

        if (!isMounted) return

        setError(null)

        if (session?.user) {
          const userWithProfile = await fetchUserWithProfile(session.user)
          if (!isMounted) return
          setUser(userWithProfile)
        } else {
          setUser(null)
        }
      } catch (err) {
        console.error('❌ Initial session fetch failed:', err)
        sessionRef.current = null
        await tokenManager.logout()
        const { error: signOutError } = await supabase.auth.signOut()
        if (signOutError) {
          console.warn('Supabase signOut failed during session reset:', signOutError)
        }

        if (isMounted) {
          setUser(null)
          const friendlyMessage = err?.message?.includes('Invalid Refresh Token')
            ? 'Your session expired. Please sign in again.'
            : err?.message
          setError(friendlyMessage || null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initializeSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event)
        sessionRef.current = session || null

        if (!isMounted) return

        try {
          if (event === 'SIGNED_OUT') {
            await tokenManager.logout()
          }

          if (event === 'TOKEN_REFRESHED') {
            tokenManager.clearCache()
          }

          if (session?.user) {
            const userWithProfile = await fetchUserWithProfile(session.user)
            if (!isMounted) return
            setUser(userWithProfile)
            setError(null)
          } else {
            setUser(null)
          }
        } catch (authError) {
          console.error('❌ Auth state handling error:', authError)
          setError(authError?.message || 'Authentication error')
        } finally {
          if (isMounted) {
            setLoading(false)
          }
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const fetchUserWithProfile = async (authUser) => {
    try {
      console.log('🔍 Fetching profile for user:', {
        id: authUser.id,
        email: authUser.email,
        authUserKeys: Object.keys(authUser)
      })
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
      
      if (error) {
        console.error('❌ Error fetching user profile:', {
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          error: error
        })
        return { ...authUser, role: 'parent' } // Default role
      }
      
      const profile = data && data.length > 0 ? data[0] : null
      console.log('👤 User profile found:', profile)
      
      const userWithProfile = {
        ...authUser,
        role: profile?.role || 'parent',
        name: profile?.name || authUser.user_metadata?.name,
        profile
      }
      
      console.log('✅ Final user object:', {
        id: userWithProfile.id,
        email: userWithProfile.email,
        role: userWithProfile.role,
        keys: Object.keys(userWithProfile)
      })
      return userWithProfile
    } catch (err) {
      console.error('❌ Error fetching user profile:', {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        error: err
      })
      return { ...authUser, role: 'parent' } // Default role
    }
  }

  const signUp = async (email, password, userData) => {
    try {
      setError(null)
      setLoading(true)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://myiyrmiiywwgismcpith.supabase.co/auth/v1/callback',
          data: {
            name: userData.name,
            role: userData.role,
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone: userData.phone,
          }
        }
      })
      
      if (error) throw error

      // Create user profile in public.users table using service role
      if (data.user) {
        console.log('🔄 Creating user profile for:', data.user.id)
        
        try {
          // Use service role client to bypass RLS during signup
          const { createClient } = await import('@supabase/supabase-js')
          const serviceClient = createClient(
            process.env.EXPO_PUBLIC_SUPABASE_URL,
            process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
          )
          
          const { data: profileData, error: profileError } = await serviceClient
            .from('users')
            .insert([{
              id: data.user.id,
              email: data.user.email,
              name: userData.name,
              role: userData.role,
              first_name: userData.firstName,
              last_name: userData.lastName,
              phone: userData.phone,
              email_verified: false,
              auth_provider: 'supabase',
              status: 'active'
            }])
            .select()

          if (profileError) {
            if (profileError.code === '23505') {
              console.log('✅ User profile already exists, skipping creation')
            } else {
              console.error('❌ Profile creation failed:', profileError)
            }
          } else {
            console.log('✅ Profile created successfully:', profileData)
          }
        } catch (serviceError) {
          console.error('❌ Service client error:', serviceError)
        }
      }

      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    try {
      setError(null)
      setLoading(true)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error

      // Check if email is verified (temporarily disabled)
      // if (data.user && !data.user.email_confirmed_at) {
      //   await supabase.auth.signOut()
      //   throw new Error('Please verify your email before signing in. Check your inbox for the verification link.')
      // }

      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setError(null)
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email) => {
    try {
      setError(null)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'your-app://reset-password'
      })
      if (error) throw error
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const resendVerification = async (email) => {
    try {
      setError(null)
      console.log('🔄 Resending verification email to:', email)
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: 'https://myiyrmiiywwgismcpith.supabase.co/auth/v1/callback'
        }
      })
      if (error) {
        console.error('❌ Resend error:', error)
        throw error
      }
      console.log('✅ Verification email resent successfully')
      return { success: true, message: 'Verification email sent. Please check your inbox and spam folder.' }
    } catch (err) {
      console.error('❌ Resend failed:', err)
      setError(err.message)
      throw err
    }
  }

  const updatePassword = async (newPassword) => {
    try {
      setError(null)
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (error) throw error
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const signInWithOAuth = async (provider) => {
    const isExpoGo = Constants.appOwnership === 'expo'

    const redirectTo = AuthSession.makeRedirectUri({
      path: 'auth',
      native: 'iyaya-app://auth',
      preferLocalhost: false,
      useProxy: isExpoGo,
    })

    console.log('🔁 OAuth redirect URI:', redirectTo)

    const shouldUseAuthSession = Platform.OS !== 'web'

    try {
      setError(null)
      setLoading(true)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: shouldUseAuthSession,
        }
      })

      if (error) throw error

      if (!shouldUseAuthSession) {
        return data
      }

      if (!data?.url) {
        throw new Error('Unable to start authentication flow. Please try again.')
      }

      const authResult = await AuthSession.startAsync({
        authUrl: data.url,
        returnUrl: redirectTo,
      })

      if (authResult.type !== 'success') {
        if (authResult.type === 'cancel' || authResult.type === 'dismiss') {
          throw new Error('Authentication cancelled.')
        }
        throw new Error('Authentication failed. Please try again.')
      }

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session?.user) {
        throw new Error('No active session found after authentication.')
      }

      const userWithProfile = await fetchUserWithProfile(sessionData.session.user)
      setUser(userWithProfile)
      return userWithProfile
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const signInWithFacebook = () => signInWithOAuth('facebook')
  const signInWithGoogle = () => signInWithOAuth('google')

  // Facebook login with user profile creation
  const loginWithFacebook = async (facebookResult) => {
    try {
      setError(null)
      setLoading(true)

      console.log('🔄 Processing Facebook login result:', facebookResult)
      console.log('🔄 Facebook result structure:', Object.keys(facebookResult))

      // Check if the result has success and user properties (from facebookAuthService)
      if (facebookResult?.success && facebookResult?.user) {
        console.log('✅ Processing real Facebook authentication from facebookAuthService')

        // The user is already authenticated via Supabase OAuth
        const user = facebookResult.user
        console.log('🔍 Supabase user found:', user?.id ? 'yes' : 'no')

        if (user) {
          console.log('🔍 Fetching user profile...')
          const userWithProfile = await fetchUserWithProfile(user)
          setUser(userWithProfile)
          console.log('✅ User with profile set:', userWithProfile)
          return userWithProfile
        }

        console.log('❌ No user found in Facebook result')
        throw new Error('Facebook authentication failed - no user data')
      }

      // Handle test mode results - check for isTestMode flag
      if (facebookResult?.isTestMode === true && facebookResult?.user) {
        console.log('🧪 Processing test mode Facebook authentication')

        const user = facebookResult.user
        console.log('🔍 Test user found:', user?.id ? 'yes' : 'no')
        console.log('🔍 Test user details:', {
          id: user?.id,
          email: user?.email,
          role: user?.role,
          isTestMode: facebookResult.isTestMode
        })

        if (user && user.id) {
          console.log('🔍 Setting test user profile...')
          setUser(user)
          console.log('✅ Test user set:', user)
          return user
        }

        console.log('❌ No valid user found in test mode result')
        throw new Error('Test mode authentication failed - no valid user data')
      }

      // Fallback: check current Supabase user
      console.log('🔍 Checking current Supabase user as fallback...')
      const currentUser = await supabase.auth.getUser()
      console.log('🔍 Current user from Supabase:', currentUser?.data?.user ? 'found' : 'not found')

      if (currentUser.data.user) {
        console.log('🔍 Fetching user profile from fallback...')
        const userWithProfile = await fetchUserWithProfile(currentUser.data.user)
        setUser(userWithProfile)
        console.log('✅ User with profile set from fallback:', userWithProfile)
        return userWithProfile
      }

      console.log('❌ No user found after Facebook authentication')
      throw new Error('Facebook authentication failed')
    } catch (err) {
      console.error('❌ Facebook login error:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const getCurrentUser = () => {
    return user
  }

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
      setUser(userWithProfile)
      return userWithProfile
    }
    return user
  }, [requireAuthSession, user])

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
    getCurrentUser,
    getUserProfile,
    signInWithFacebook,
    signInWithGoogle,
    loginWithFacebook,
    requireAuthSession,
    ensureAuthenticated
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
    signInWithFacebook,
    signInWithGoogle,
    loginWithFacebook,
    requireAuthSession,
    ensureAuthenticated
  ])

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        children
      )}
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

export default AuthContext
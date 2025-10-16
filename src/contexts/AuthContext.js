import React, { createContext, useContext, useEffect, useState } from 'react'
import { ActivityIndicator, View, Platform } from 'react-native'
import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '../config/supabase'

WebBrowser.maybeCompleteAuthSession()

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Get initial session and user profile
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const userWithProfile = await fetchUserWithProfile(session.user)
        setUser(userWithProfile)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event)
        if (session?.user) {
          const userWithProfile = await fetchUserWithProfile(session.user)
          setUser(userWithProfile)
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
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
    const redirectTo = AuthSession.makeRedirectUri({
      scheme: 'com.iyaya.app',
      path: 'auth/callback',
      preferLocalhost: false,
    })

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
      
      // If it's a mock auth result, handle it differently
      if (facebookResult.isMockAuth) {
        console.log('⚠️ Processing mock Facebook authentication')
        
        // Create a mock user object that matches our expected structure
        const mockUser = {
          ...facebookResult.user,
          id: facebookResult.user.uid,
          email_confirmed_at: new Date().toISOString(),
          user_metadata: {
            name: facebookResult.user.name,
            role: facebookResult.user.role
          }
        }
        
        setUser(mockUser)
        return mockUser
      }
      
      // For real Facebook auth, the user should already be authenticated via Supabase OAuth
      // Just fetch the updated profile
      const currentUser = await supabase.auth.getUser()
      if (currentUser.data.user) {
        const userWithProfile = await fetchUserWithProfile(currentUser.data.user)
        setUser(userWithProfile)
        return userWithProfile
      }
      
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

  const value = {
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
    getCurrentUser,
    getUserProfile
  }

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
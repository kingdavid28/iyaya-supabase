import React, { createContext, useContext, useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { supabase } from '../config/supabase'

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
      console.log('🔍 Fetching profile for user:', authUser.id)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
      
      if (error) {
        console.error('❌ Error fetching user profile:', error)
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
      
      console.log('✅ Final user object with role:', userWithProfile.role)
      return userWithProfile
    } catch (err) {
      console.error('❌ Error fetching user profile:', err)
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
            console.error('❌ Profile creation failed:', profileError)
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
    try {
      setError(null)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'https://myiyrmiiywwgismcpith.supabase.co/auth/v1/callback'
        }
      })
      if (error) throw error
      return data
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  const signInWithFacebook = () => signInWithOAuth('facebook')
  const signInWithGoogle = () => signInWithOAuth('google')

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
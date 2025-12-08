import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { ActivityIndicator, Platform, View } from 'react-native'

import { supabase } from '../config/supabase'
import { userStatusService } from '../services/supabase/userStatusService'
import { tokenManager } from '../utils/tokenManager'

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
        // On web, handle OAuth callback in URL hash
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const hash = window.location.hash
          console.log('🌐 Web OAuth hash detected:', hash ? 'present' : 'none')
          
          // If we have an access_token in the hash, Supabase should handle it automatically
          // But we can also check if the session was created from the callback
          if (hash && hash.includes('access_token')) {
            console.log('🔐 OAuth callback detected, waiting for session...')
            // Give Supabase a moment to process the OAuth callback
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }

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

      // Check user status
      const statusData = await userStatusService.checkUserStatus(authUser.id)
      if (!statusData.canAccess) {
        console.warn('⚠️ User access restricted:', statusData)
        // Don't throw error here, let StatusGuard handle it
      }

      const userWithProfile = {
        ...authUser,
        role: profile?.role || 'parent',
        name: profile?.name || authUser.user_metadata?.name,
        profile,
        status: profile?.status || 'active',
        statusData
      }

      console.log('✅ Final user object:', {
        id: userWithProfile.id,
        email: userWithProfile.email,
        role: userWithProfile.role,
        status: userWithProfile.status,
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

  const ensureUserProfileExists = async (authUser, roleHint) => {
    try {
      if (!authUser?.id) {
        console.warn('⚠️ Cannot ensure profile without auth user ID')
        return null
      }

      const { data: existingProfile, error: selectError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('❌ Failed to check existing profile:', selectError)
        return null
      }

      if (existingProfile) {
        console.log('ℹ️ Profile already exists for user:', authUser.id)
        return existingProfile
      }

      const serviceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL

      if (!serviceRoleKey || !supabaseUrl) {
        console.warn('⚠️ Service role key or Supabase URL missing; cannot create profile automatically')
        return null
      }

      const role = roleHint || authUser.user_metadata?.role || 'parent'
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
        || 'Iyaya User'

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

      const cleanedPayload = Object.fromEntries(
        Object.entries(profilePayload).filter(([, value]) => value !== undefined)
      )

      const { createClient } = await import('@supabase/supabase-js')
      const serviceClient = createClient(supabaseUrl, serviceRoleKey)

      const { data: upsertData, error: upsertError } = await serviceClient
        .from('users')
        .upsert([cleanedPayload], { onConflict: 'id' })
        .select()

      if (upsertError) {
        console.error('❌ Failed to create profile via service client:', upsertError)
        return null
      }

      console.log('✅ Profile created for user:', authUser.id)

      return Array.isArray(upsertData) ? upsertData[0] : upsertData
    } catch (error) {
      console.error('❌ ensureUserProfileExists error:', error)
      return null
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

      await tokenManager.logout()
      const { error } = await supabase.auth.signOut()

      if (error) {
        const isMissingSession = error?.name === 'AuthSessionMissingError' || error?.message?.toLowerCase().includes('auth session missing')
        if (!isMissingSession) {
          throw error
        }
        console.warn('⚠️ Ignoring AuthSessionMissingError during sign out — no active session to clear.')
      }

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
      setLoading(true)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window?.location?.origin || 'https://myiyrmiiywwgismcpith.supabase.co'}/auth/callback`,
          skipBrowserRedirect: false,
        }
      })

      if (error) throw error
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    try {
      setError(null)
      setLoading(true)

      console.log('🔄 Starting Google Sign-In (Expo Go compatible)...')
      console.log('🌍 Platform:', Platform.OS)

      // Use platform-specific redirect URLs
      const isWeb = Platform.OS === 'web'
      let redirectUrl
      
      if (isWeb) {
        // On web, redirect to the app root - Supabase will append the OAuth hash automatically
        // e.g., https://iyaya-supabase.vercel.app/#access_token=...
        redirectUrl = 'https://iyaya-supabase.vercel.app/'
        console.log('🌐 Web OAuth redirect:', redirectUrl)
      } else {
        // On native, use the deep link scheme
        redirectUrl = 'iyaya-app://auth/callback'
        console.log('📱 Native OAuth redirect:', redirectUrl)
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false, // Let browser handle it (Supabase will redirect)
        }
      })

      console.log('📊 OAuth response:', { data, error })
      if (error) {
        console.error('❌ OAuth error:', error)
        throw error
      }
      console.log('✅ Google Sign-In initiated successfully')
      return data
    } catch (err) {
      console.error('❌ Google Sign-In failed:', err)
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
    signInWithGoogle,
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
    signInWithGoogle,
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
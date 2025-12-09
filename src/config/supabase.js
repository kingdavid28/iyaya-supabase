import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

const deriveStorageKey = () => {
  try {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    return `sb-${projectRef}-auth-token`
  } catch (error) {
    console.warn('⚠️ Unable to derive Supabase storage key:', error?.message)
    return 'supabase.auth.token'
  }
}

const SUPABASE_STORAGE_KEY = deriveStorageKey()

// Diagnostic logging (disabled in production)
if (__DEV__) {
  console.log('🔧 Supabase Configuration:')
  console.log('  - URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING')
  console.log('  - Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING')
}

let supabase
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('  - EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'present' : 'MISSING')
  console.error('  - EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'present' : 'MISSING')
  console.error('⚠️ Creating mock Supabase client to prevent app crash')
  // Create a mock client that will fail gracefully at runtime
  supabase = {
    auth: {
      getSession: async () => ({ data: null, error: new Error('Supabase not configured - missing environment variables') }),
      signInWithOAuth: async () => ({ data: null, error: new Error('Supabase not configured') }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({ select: () => Promise.reject(new Error('Supabase not configured')) }),
  }
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'iyaya-mobile-app',
      },
    },
    db: {
      schema: 'public',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  })
}

export { supabase }

const clearStaleSession = async () => {
  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch (signOutError) {
    console.warn('⚠️ Local sign-out failed while clearing stale session:', signOutError?.message)
  }

  try {
    await AsyncStorage.removeItem(SUPABASE_STORAGE_KEY)
  } catch (storageError) {
    console.warn('⚠️ Failed to remove Supabase session storage key:', storageError?.message)
  }
}

const runInitialSessionCheck = async () => {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error('❌ Supabase session check failed:', error.message)
      const message = error.message?.toLowerCase() || ''
      const isInvalidRefresh = message.includes('invalid refresh token') || message.includes('refresh token not found')
      if (isInvalidRefresh) {
        console.warn('🧹 Clearing invalid Supabase session from storage')
        await clearStaleSession()
      }
      return
    }

    if (__DEV__) {
      console.log('✅ Supabase client initialized successfully')
      console.log('  - Session:', data.session ? 'Active' : 'No session')
    }
  } catch (err) {
    console.error('❌ Supabase connection test failed:', err.message)
  }
}

runInitialSessionCheck()

export default supabase
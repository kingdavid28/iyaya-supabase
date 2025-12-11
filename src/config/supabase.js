import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Environment variables with fallbacks
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Enhanced storage key derivation with versioning
const deriveStorageKey = () => {
  try {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
    return `sb-${projectRef}-v1-auth-token`; // Added versioning
  } catch (error) {
    console.warn('⚠️ Unable to derive Supabase storage key, using fallback');
    return 'supabase-v1-auth-token';
  }
};

const SUPABASE_STORAGE_KEY = deriveStorageKey();

// Secure logging
const secureLog = (key, value) => {
  if (__DEV__) {
    console.log(`🔧 ${key}:`, value ? `${value.substring(0, 5)}...` : 'NOT SET');
  }
};

// Configuration validation
const validateConfig = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    const error = new Error('Missing Supabase environment variables');
    error.code = 'MISSING_CONFIG';
    throw error;
  }

  try {
    new URL(supabaseUrl);
  } catch (e) {
    const error = new Error('Invalid Supabase URL');
    error.code = 'INVALID_URL';
    throw error;
  }
};

// Custom storage implementation with error handling
const customStorage = {
  getItem: async (key) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Storage setItem error:', error);
    }
  },
  removeItem: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Storage removeItem error:', error);
    }
  }
};

// Initialize Supabase client
let supabase;

try {
  validateConfig();

  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: customStorage,
      storageKey: SUPABASE_STORAGE_KEY,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
    global: {
      headers: {
        'X-Client-Info': `iyaya-app/${process.env.APP_VERSION || '1.0.0'}`,
        'X-Requested-With': 'XMLHttpRequest',
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
  });

  // Add response interceptor
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event);
  });

} catch (error) {
  console.error('❌ Supabase initialization failed:', error.message);
  if (error.code === 'MISSING_CONFIG') {
    console.error('Please check your environment variables:');
    console.error('EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set');
  }
  // Create a mock client in development to prevent app crashes
  if (__DEV__) {
    console.warn('⚠️ Creating mock Supabase client for development');
    supabase = {
      auth: {
        signIn: () => Promise.resolve({ error: { message: 'Mock client - not implemented' } }),
        signOut: () => Promise.resolve({ error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
    };
  } else {
    throw error;
  }
}

// Session management utilities
export const clearAuthSession = async () => {
  try {
    await supabase.auth.signOut();
    await customStorage.removeItem(SUPABASE_STORAGE_KEY);
    return { error: null };
  } catch (error) {
    console.error('Failed to clear auth session:', error);
    return { error };
  }
};

// Initial session check
const initializeSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('Session check failed, clearing storage');
      await clearAuthSession();
      return;
    }

    if (session) {
      console.log('Active session found for user:', session.user?.email);
    } else {
      console.log('No active session found');
    }
  } catch (error) {
    console.error('Session initialization error:', error);
  }
};

// Run initial checks
if (supabase) {
  initializeSession().catch(console.error);
}

export default supabase;
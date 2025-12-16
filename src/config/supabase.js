import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import * as Network from 'expo-network';
import Constants from 'expo-constants';

// Environment variables with fallbacks
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://myiyrmiiywwgismcpith.supabase.co';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15aXlybWlpeXd3Z2lzbWNwaXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MDgzNDYsImV4cCI6MjA3NTM4NDM0Nn0.DGRKcZmPvatheWOlukc7sjGU8ufYlSiW03L47Q_YWyI';

// Enhanced storage key derivation with versioning
const deriveStorageKey = () => {
  try {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
    return `sb-${projectRef}-v1-auth-token`;
  } catch (error) {
    console.warn('Using fallback storage key');
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

// Custom storage with web compatibility
const createStorage = () => {
  if (Platform.OS === 'web') {
    return {
      getItem: async (key) => {
        try {
          return localStorage.getItem(key);
        } catch (error) {
          console.error('Storage getItem error:', error);
          return null;
        }
      },
      setItem: async (key, value) => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.error('Storage setItem error:', error);
        }
      },
      removeItem: async (key) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error('Storage removeItem error:', error);
        }
      }
    };
  }
  
  return {
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
};

const customStorage = createStorage();

// Network status check with web compatibility
const checkNetworkStatus = async () => {
  try {
    if (Platform.OS === 'web') {
      return navigator.onLine;
    }
    const networkState = await Network.getNetworkStateAsync();
    if (!networkState.isConnected) {
      console.warn('No internet connection detected');
      return false;
    }
    return true;
  } catch (error) {
    console.warn('Network check error:', error.message);
    return true; // Assume connected if check fails
  }
};

// Initialize Supabase client
let supabase;

try {
  // Validate configuration
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration. Please check your environment variables.');
  }

  // Log configuration in dev mode
  if (__DEV__) {
    secureLog('Supabase URL', supabaseUrl);
    secureLog('Storage Key', SUPABASE_STORAGE_KEY);
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: customStorage,
      storageKey: SUPABASE_STORAGE_KEY,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      headers: {
        'X-Client-Info': 'iyaya-mobile/1.0.0',
        'X-Platform': Platform.OS,
      },
    }
  });

  // Add response interceptor
  supabase.auth.onAuthStateChange((event, session) => {
    if (__DEV__) {
      console.log('Auth state changed:', event);
    }
    
    if (event === 'SIGNED_OUT' || event === 'USER_DELETED' || event === 'TOKEN_REFRESHED') {
      // Handle session cleanup on sign out
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        customStorage.removeItem(SUPABASE_STORAGE_KEY).catch(console.error);
      }
    }
  });

} catch (error) {
  console.error('❌ Supabase initialization failed:', error.message);
  
  // Create a minimal working client to prevent crashes
  console.warn('⚠️ Creating fallback Supabase client');
  supabase = {
    auth: {
      signIn: () => Promise.resolve({ error: { message: 'Supabase initialization failed' } }),
      signInWithPassword: () => Promise.resolve({ error: { message: 'Supabase initialization failed' } }),
      signInWithOAuth: () => Promise.resolve({ error: { message: 'Supabase initialization failed' } }),
      signUp: () => Promise.resolve({ error: { message: 'Supabase initialization failed' } }),
      signOut: () => Promise.resolve({ error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      refreshSession: () => Promise.resolve({ data: { session: null }, error: null }),
      resetPasswordForEmail: () => Promise.resolve({ error: { message: 'Supabase initialization failed' } }),
      updateUser: () => Promise.resolve({ error: { message: 'Supabase initialization failed' } }),
      resend: () => Promise.resolve({ error: { message: 'Supabase initialization failed' } }),
      onAuthStateChange: () => ({ 
        data: { 
          subscription: { 
            unsubscribe: () => {} 
          } 
        } 
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: { message: 'Supabase initialization failed' } }),
          maybeSingle: () => Promise.resolve({ data: null, error: { message: 'Supabase initialization failed' } })
        }),
        then: () => Promise.resolve({ data: [], error: { message: 'Supabase initialization failed' } })
      }),
      insert: () => ({
        select: () => Promise.resolve({ data: null, error: { message: 'Supabase initialization failed' } })
      }),
      upsert: () => ({
        select: () => Promise.resolve({ data: null, error: { message: 'Supabase initialization failed' } })
      }),
      update: () => ({
        eq: () => Promise.resolve({ data: null, error: { message: 'Supabase initialization failed' } })
      }),
      delete: () => ({
        eq: () => Promise.resolve({ data: null, error: { message: 'Supabase initialization failed' } })
      })
    }),
    channel: () => ({
      on: () => ({
        subscribe: () => ({ unsubscribe: () => {} })
      })
    })
  };
  
  if (!__DEV__) {
    // In production, we still want to show a user-friendly error
    console.error('Production Supabase initialization failed. Check environment variables.');
  }
}

// Clear authentication session
export const clearAuthSession = async () => {
  try {
    await checkNetworkStatus();
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.warn('Sign out error, clearing local storage:', signOutError.message);
    }
    await customStorage.removeItem(SUPABASE_STORAGE_KEY);
    return { error: null };
  } catch (error) {
    console.error('Failed to clear auth session:', error);
    return { error };
  }
};

// Get current session with retry logic
export const getSession = async (retryCount = 0) => {
  try {
    await checkNetworkStatus();
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      if (retryCount < 2) {
        console.log(`Retrying session fetch (${retryCount + 1}/2)...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return getSession(retryCount + 1);
      }
      console.warn('Session fetch failed after retries:', error.message);
      return { session: null, error };
    }
    
    return { session, error: null };
  } catch (error) {
    console.warn('Session fetch error:', error.message);
    return { session: null, error };
  }
};

// Initialize and validate session
export const initializeSession = async () => {
  try {
    const { session, error } = await getSession();
    
    if (error) {
      console.warn('Session initialization error, clearing auth:', error.message);
      await clearAuthSession();
      return null;
    }

    if (session) {
      if (__DEV__) {
        console.log('Active session for:', session.user?.email);
      }
      
      // Check if session needs refresh
      const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
      const now = Date.now();
      
      if (expiresAt && expiresAt - now < 5 * 60 * 1000) { // Less than 5 minutes remaining
        console.log('Session nearing expiry, refreshing...');
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.warn('Session refresh failed:', refreshError.message);
          await clearAuthSession();
          return null;
        }
        
        return refreshedSession;
      }
      
      return session;
    }
    
    return null;
  } catch (error) {
    console.error('Session initialization failed:', error);
    await clearAuthSession();
    return null;
  }
};

// Initialize on import
let initializationPromise = null;

export const ensureInitialized = async () => {
  if (!initializationPromise) {
    initializationPromise = initializeSession().catch(error => {
      console.error('Initialization failed:', error);
      return null;
    });
  }
  return initializationPromise;
};

// Run initial checks
if (supabase) {
  ensureInitialized().catch(error => {
    console.error('Initialization check failed:', error);
  });
}

// Example of handling auth errors
export const handleAuthError = async (error) => {
  console.error('Authentication error:', error);
  
  if (error.message.includes('Invalid login credentials')) {
    // Show user-friendly error
    return { userError: 'Invalid email or password. Please try again.' };
  } else if (error.message.includes('Network error')) {
    // Handle network issues
    return { userError: 'Network error. Please check your connection.' };
  } else if (error.message.includes('auth session missing')) {
    await clearAuthSession();
    return { userError: 'Session expired. Please log in again.' };
  }
  
  // Clear session for other auth errors
  await clearAuthSession();
  return { userError: 'Authentication failed. Please try again.' };
};

// Export a method to get the client with initialization check
export const getSupabaseClient = () => {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  return supabase;
};

// Validate client is working
export const validateSupabaseClient = () => {
  try {
    if (!supabase || !supabase.auth) {
      console.error('Supabase client or auth not available');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Supabase client validation failed:', error);
    return false;
  }
};

// Initialize validation on web
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  // Run validation after a short delay to ensure everything is loaded
  setTimeout(() => {
    if (!validateSupabaseClient()) {
      console.error('Supabase client validation failed on web platform');
    }
  }, 100);
}

// Ensure we always export a valid client
if (!supabase) {
  console.error('No Supabase client available for export');
}

export default supabase;
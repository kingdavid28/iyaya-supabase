import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import * as Network from 'expo-network';

// Environment variables with fallbacks
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

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

// Custom storage with error handling
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

// Network status check
const checkNetworkStatus = async () => {
  try {
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
      detectSessionInUrl: false,
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
  // Fallback for development
  if (__DEV__) {
    console.warn('⚠️ Creating mock Supabase client for development');
    supabase = {
      auth: {
        signIn: () => Promise.resolve({ error: { message: 'Mock client - development mode' } }),
        signOut: () => Promise.resolve({ error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        refreshSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ 
          data: { 
            subscription: { 
              unsubscribe: () => {} 
            } 
          } 
        }),
      },
      // Add other necessary Supabase methods if used
      from: () => ({
        select: () => ({
          then: () => Promise.resolve({ data: [], error: null })
        })
      }),
    };
  } else {
    throw error;
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

export default supabase;
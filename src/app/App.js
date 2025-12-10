import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { Buffer } from 'buffer';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Platform, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Vercel Analytics - only for web
let Analytics = null;
if (Platform.OS === 'web') {
  try {
    const { Analytics: VercelAnalytics } = require('@vercel/analytics/react');
    Analytics = VercelAnalytics;
  } catch (error) {
    console.warn('Vercel Analytics not available:', error.message);
  }
}

if (!global.Buffer) {
  global.Buffer = Buffer;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60 * 1000,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
  },
});

// Core imports
import PrivacyProvider from '../components/features/privacy/PrivacyManager';
import ProfileDataProvider from '../components/features/privacy/ProfileDataManager';
import AppProvider from '../providers/AppProvider';
import { ErrorBoundary } from '../shared/ui';
import AppIntegration from './AppIntegration';

// Auth Context
import { AuthProvider } from '../contexts/AuthContext';

// Supabase - Direct import for initialization
import { supabase } from '../config/supabase';

// Log filter
import '../utils/logFilter';
// import { enableAllLogs } from '../utils/logFilter';

// Analytics test (development only)
if (Platform.OS === 'web' && process.env.NODE_ENV === 'development') {
  import('../utils/analyticsTest');
}

// // // Temporarily re-enable verbose logging for debugging startup on iOS
// // if (typeof enableAllLogs === 'function') {
// //   enableAllLogs();
// // }

// Navigation
import AppNavigator from './navigation/AppNavigator';

SplashScreen.preventAutoHideAsync();

// Enhanced Supabase Provider that ensures Auth is ready
const SupabaseAuthProvider = ({ children }) => {
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const initSupabase = async () => {
      console.log('🔥 Initializing Supabase with Auth...', { platform: Platform.OS });

      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase initialization timeout')), 10000)
        );

        const authPromise = supabase.auth.getSession().then((result) => {
          console.log('📡 Supabase auth.getSession resolved', {
            platform: Platform.OS,
            hasSession: !!result?.data?.session,
            error: result?.error?.message || null,
          });
          return result;
        });

        const { data, error } = await Promise.race([authPromise, timeoutPromise]);

        if (error) {
          console.error('❌ Supabase auth.getSession returned error', { platform: Platform.OS, message: error.message });
          throw error;
        }

        console.log('✅ Supabase Auth is ready', { platform: Platform.OS, hasSession: !!data?.session });
        if (isMounted) {
          setSupabaseReady(true);
        }
      } catch (err) {
        console.error('❌ Supabase Auth initialization failed', { platform: Platform.OS, message: err?.message });
        if (isMounted) {
          setError(err);
          setSupabaseReady(true); // Continue anyway to avoid blocking the app
        }
      }
    };

    initSupabase();

    return () => {
      isMounted = false;
    };
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <Text style={{ color: 'red', fontSize: 16, textAlign: 'center', padding: 20 }}>
          Connection Issue
        </Text>
        <Text style={{ color: '#666', fontSize: 14, textAlign: 'center', padding: 20 }}>
          {error.message}
        </Text>
      </View>
    );
  }

  if (!supabaseReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10, color: '#666' }}>Initializing Supabase Auth...</Text>
      </View>
    );
  }

  return <AuthProvider>{children}</AuthProvider>;
};

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('🚀 Initializing Iyaya app...');

        // Pre-initialize Supabase to ensure it's ready
        await supabase.auth.getSession().catch(error => {
          console.warn('⚠️ Supabase init warning (continuing):', error.message);
        });

        // Simulate other app initialization tasks
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (e) {
        console.error('❌ Error during app initialization:', e);
        setInitError(e);
      } finally {
        setAppReady(true);
        // Note: SplashScreen.hideAsync() is now handled by NavigationContainer's onReady
        focusManager.setEventListener((handleFocus) => {
          const subscription = AppState.addEventListener('change', (status) => {
            handleFocus(status === 'active');
          });

          return () => subscription.remove();
        });
        console.log('✅ App initialization complete');
      }
    }

    prepare();
  }, []);

  if (!appReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10, color: '#666' }}>Starting Iyaya...</Text>
      </View>
    );
  }

  if (initError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <Text style={{ color: 'red', fontSize: 16, textAlign: 'center', padding: 20 }}>
          App Initialization Failed
        </Text>
        <Text style={{ color: '#666', fontSize: 14, textAlign: 'center', padding: 20 }}>
          {initError.message}
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <AppProvider>
              <ProfileDataProvider>
                <PrivacyProvider>
                  <SupabaseAuthProvider>
                    <AppIntegration>
                      <AppNavigator />
                      <StatusBar style="auto" />
                      {Analytics && <Analytics />}
                    </AppIntegration>
                  </SupabaseAuthProvider>
                </PrivacyProvider>
              </ProfileDataProvider>
            </AppProvider>
          </SafeAreaProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
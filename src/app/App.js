import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { Buffer } from 'buffer';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, AppState, Platform, Text, View, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'AsyncStorage has been extracted from react-native core'
]);

// Vercel Analytics - Only load in production
const Analytics = React.memo(() => {
  if (Platform.OS !== 'web' || process.env.NODE_ENV !== 'production') {
    return null;
  }
  
  try {
    const { Analytics: VercelAnalytics } = require('@vercel/analytics/react');
    return <VercelAnalytics />;
  } catch (error) {
    console.warn('Vercel Analytics not available:', error.message);
    return null;
  }
});

// Initialize Buffer polyfill
if (!global.Buffer) {
  global.Buffer = Buffer;
}

// Configure query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60 * 1000,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  },
});

// Lazy load components
const LazyAppNavigator = React.lazy(() => import('./navigation/AppNavigator'));
const LazyAppIntegration = React.lazy(() => import('./AppIntegration'));

// Core providers
import PrivacyProvider from '../components/features/privacy/PrivacyManager';
import ProfileDataProvider from '../components/features/privacy/ProfileDataManager';
import AppProvider from '../providers/AppProvider';
import { ErrorBoundary } from '../shared/ui';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';

// Initialize splash screen
SplashScreen.preventAutoHideAsync().catch(() => {
  // Handle error if needed
});

// Supabase Auth Provider
const SupabaseAuthProvider = ({ children }) => {
  const [state, setState] = useState({ ready: false, error: null });

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const initSupabase = async () => {
      try {
        const [sessionResult] = await Promise.allSettled([
          supabase.auth.getSession(),
          new Promise(resolve => setTimeout(resolve, 1000)) // Minimum show time
        ]);

        if (controller.signal.aborted) return;

        if (sessionResult.status === 'rejected') {
          throw sessionResult.reason;
        }

        const { data, error } = sessionResult.value;
        
        if (error) throw error;

        if (isMounted) {
          setState({ ready: true, error: null });
        }
      } catch (error) {
        console.error('Supabase init error:', error);
        if (isMounted) {
          setState({ ready: true, error });
        }
      }
    };

    initSupabase();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  if (!state.ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (state.error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', marginBottom: 10 }}>Connection Error</Text>
        <Text style={{ textAlign: 'center' }}>{state.error.message}</Text>
      </View>
    );
  }

  return <AuthProvider>{children}</AuthProvider>;
};

const AppContent = () => {
  const { session } = useAuth();
  const [appReady, setAppReady] = useState(false);

  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync().catch(console.warn);
    }
  }, [appReady]);

  useEffect(() => {
    const initApp = async () => {
      try {
        // Add any additional app initialization here
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        setAppReady(true);
      }
    };

    initApp();
  }, []);

  if (!appReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <React.Suspense
      fallback={
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      }
    >
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <LazyAppIntegration>
          <LazyAppNavigator />
          <StatusBar style="auto" />
          <Analytics />
        </LazyAppIntegration>
      </View>
    </React.Suspense>
  );
};

export default function App() {
  const handleAppStateChange = useCallback((nextAppState) => {
    focusManager.setFocused(nextAppState === 'active');
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [handleAppStateChange]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <AppProvider>
              <ProfileDataProvider>
                <PrivacyProvider>
                  <SupabaseAuthProvider>
                    <AppContent />
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
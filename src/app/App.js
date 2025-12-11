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
import { AuthProvider } from '../contexts/AuthContext';
import { ensureInitialized, getSession } from '../config/supabase';

// Initialize splash screen
SplashScreen.preventAutoHideAsync().catch(() => {
  // Handle error if needed
});

// App Initialization Component
const AppInitializer = ({ children, onInitialized }) => {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      try {
        // Initialize Supabase and get session
        const session = await ensureInitialized();
        
        if (isMounted) {
          setInitialized(true);
          setError(null);
          if (onInitialized) {
            onInitialized(session);
          }
        }
      } catch (error) {
        console.error('App initialization failed:', error);
        if (isMounted) {
          setInitialized(true);
          setError(error);
          if (onInitialized) {
            onInitialized(null, error);
          }
        }
      }
    };

    initializeApp();

    return () => {
      isMounted = false;
    };
  }, [onInitialized]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', marginBottom: 10, fontSize: 16, fontWeight: 'bold' }}>
          Initialization Error
        </Text>
        <Text style={{ textAlign: 'center', color: '#666', marginBottom: 20 }}>
          {error.message || 'Unable to initialize app'}
        </Text>
        <Text style={{ textAlign: 'center', color: '#999', fontSize: 12 }}>
          Please restart the app or check your connection
        </Text>
      </View>
    );
  }

  return children;
};

// App Content Component
const AppContent = () => {
  const [appReady, setAppReady] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);

  const handleInitialized = useCallback((session, error) => {
    if (error) {
      console.log('App initialized with error:', error.message);
    } else if (session) {
      console.log('App initialized with session for:', session.user?.email);
    } else {
      console.log('App initialized without session');
    }
    setSessionInfo({ session, error });
  }, []);

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
        <LazyAppIntegration sessionInfo={sessionInfo}>
          <LazyAppNavigator />
          <StatusBar style="auto" />
          <Analytics />
        </LazyAppIntegration>
      </View>
    </React.Suspense>
  );
};

// Main App Component
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
                  <AppInitializer>
                    <AuthProvider>
                      <AppContent />
                    </AuthProvider>
                  </AppInitializer>
                </PrivacyProvider>
              </ProfileDataProvider>
            </AppProvider>
          </SafeAreaProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

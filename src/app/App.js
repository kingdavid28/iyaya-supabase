import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

// Core imports
import AppProvider from '../core/providers/AppProvider';
import AppIntegration from './AppIntegration';
import PrivacyProvider from '../components/features/privacy/PrivacyManager';
import ProfileDataProvider from '../components/features/privacy/ProfileDataManager';
import { ErrorBoundary, LoadingSpinner } from '../shared/ui';

// Auth Context
import { AuthProvider } from '../contexts/AuthContext';

// Supabase - Direct import for initialization
import { supabase } from '../config/supabase';

// Log filter
import '../utils/logFilter';

// Navigation
import AppNavigator from './navigation/AppNavigator';

LogBox.ignoreLogs([
  "AsyncStorage has been extracted",
  "Setting a timer",
  "Non-serializable values",
]);

SplashScreen.preventAutoHideAsync();

// Enhanced Supabase Provider that ensures Auth is ready
const SupabaseAuthProvider = ({ children }) => {
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initSupabase = async () => {
      try {
        console.log('🔥 Initializing Supabase with Auth...');
        
        // Test Supabase connection
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        console.log('✅ Supabase Auth is ready');
        setSupabaseReady(true);
      } catch (err) {
        console.error('❌ Supabase Auth initialization failed:', err);
        setError(err);
        setSupabaseReady(true); // Continue anyway
      }
    };

    initSupabase();
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
        <Text style={{ color: 'red', fontSize: 16, textAlign: 'center', padding: 20 }}>
          Supabase Error
        </Text>
        <Text style={{ color: '#666', fontSize: 14, textAlign: 'center', padding: 20 }}>
          {error.message}
        </Text>
      </View>
    );
  }

  if (!supabaseReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <LoadingSpinner text="Initializing Supabase Auth..." />
      </View>
    );
  }

  // Only render AuthProvider when Supabase is definitely ready
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
};

export default function App() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('🚀 Initializing Iyaya app...');

        // Pre-initialize Supabase to ensure it's ready
        await supabase.auth.getSession().catch(error => {
          console.warn('⚠️ Supabase init warning (continuing):', error.message);
        });

        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (e) {
        console.error('❌ Error during app initialization:', e);
      } finally {
        setAppReady(true);
        await SplashScreen.hideAsync();
        console.log('✅ App initialization complete');
      }
    }

    prepare();
  }, []);

  if (!appReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <LoadingSpinner text="Starting Iyaya..." />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppProvider>
          <ProfileDataProvider>
            <PrivacyProvider>
              {/* Wrap with SupabaseAuthProvider to ensure proper initialization order */}
              <SupabaseAuthProvider>
                <AppIntegration>
                  <AppNavigator />
                  <StatusBar style="auto" />
                </AppIntegration>
              </SupabaseAuthProvider>
            </PrivacyProvider>
          </ProfileDataProvider>
        </AppProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
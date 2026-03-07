import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { CommonActions } from '@react-navigation/native';

console.log('🚨 AuthCallbackScreen file loaded!');

const AuthCallbackScreen = ({ navigation }) => {
  const { user, handleOAuthCallback } = useAuth();

  console.log('🎯 AuthCallbackScreen mounted!');
  console.log('🎯 Current user state:', user);
  console.log('🎯 Navigation prop:', !!navigation);

  // Log URL details
  if (typeof window !== 'undefined') {
    console.log('🎯 Current URL path:', window.location.pathname);
    console.log('🎯 Current URL search:', window.location.search);
    console.log('🎯 Current URL hash:', window.location.hash);
    console.log('🎯 Current URL full:', window.location.href);
  }

  // Check if we're on the correct callback URL
  if (!window.location.pathname.includes('/auth/callback') && !window.location.search.includes('code=')) {
    console.log('❌ Wrong URL for OAuth callback, redirecting to welcome');
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      })
    );
    return;
  }

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔄 Processing OAuth callback...');
        console.log('📍 Current URL:', window.location.href);

        // Fix malformed URL with double question marks (??code=)
        if (window.location.search.includes('??code=')) {
          console.log('🔧 Fixing malformed URL with double question marks');
          const fixedUrl = window.location.href.replace('??code=', '?code=');
          console.log('🔧 Fixed URL:', fixedUrl);
          window.history.replaceState({}, '', fixedUrl);
          console.log('✅ URL normalized, reloading to process OAuth');
          window.location.reload();
          return;
        }

        // Check if we have OAuth tokens in the URL (hash or query params)
        const hasOAuthTokens = window.location.hash.includes('access_token') ||
          window.location.search.includes('code=');

        console.log('🔍 Has OAuth tokens in URL:', hasOAuthTokens);
        console.log('🔍 URL search params:', window.location.search);
        console.log('🔍 URL hash:', window.location.hash);

        if (!hasOAuthTokens) {
          console.warn('⚠️ No OAuth tokens found in URL, might be an error');
        }

        // Extract role hint from sessionStorage (stored before redirect)
        let roleHint = null;
        if (typeof window !== 'undefined') {
          try {
            roleHint = sessionStorage.getItem('pendingRole');
            console.log('🔍 Role hint from sessionStorage:', roleHint);

            // Clean up after reading
            if (roleHint) {
              sessionStorage.removeItem('pendingRole');
            }
          } catch (storageError) {
            console.warn('⚠️ Could not read role hint from sessionStorage:', storageError);
          }
        }

        // Handle OAuth callback with role hint and get the result
        console.log('🔄 Calling handleOAuthCallback with roleHint:', roleHint);
        const authResult = await handleOAuthCallback(roleHint);
        console.log('🎯 OAuth callback result:', authResult);

        // Wait a moment for auth state to update
        setTimeout(() => {
          if (authResult && authResult.success && authResult.user) {
            console.log('✅ User authenticated with role:', authResult.user?.role);
            const userRole = authResult.user?.role?.toLowerCase()?.trim();
            const dashboardRoute = userRole === 'caregiver' ? 'CaregiverDashboard' : 'ParentDashboard';
            console.log('🧭 Navigating to:', dashboardRoute);
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: dashboardRoute }],
              })
            );
          } else {
            console.log('❌ No user found or auth failed, returning to welcome');
            console.log('Auth result details:', JSON.stringify(authResult, null, 2));
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              })
            );
          }
        }, 1000); // Increased timeout to allow profile creation
      } catch (error) {
        console.error('❌ Auth callback error:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          type: error.type
        });

        // Show error to user
        alert(`Authentication failed: ${error.message || 'Unknown error'}. Please try again.`);

        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Welcome' }],
          })
        );
      }
    };

    handleCallback();
  }, [navigation, handleOAuthCallback]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
      <ActivityIndicator size="large" color="#6366f1" />
      <Text style={{ marginTop: 16, fontSize: 16, color: '#6b7280' }}>
        Completing sign in...
      </Text>
    </View>
  );
};

export default AuthCallbackScreen;
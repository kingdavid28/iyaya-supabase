import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { CommonActions } from '@react-navigation/native';

const AuthCallbackScreen = ({ navigation }) => {
  const { user, handleOAuthCallback } = useAuth();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔄 Processing OAuth callback...');
        
        // Handle OAuth callback with default parent role
        await handleOAuthCallback('parent');
        
        // Wait a moment for auth state to update
        setTimeout(() => {
          if (user) {
            console.log('✅ User authenticated, navigating to dashboard');
            const dashboardRoute = user.role === 'caregiver' ? 'CaregiverDashboard' : 'ParentDashboard';
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: dashboardRoute }],
              })
            );
          } else {
            console.log('❌ No user found, returning to welcome');
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              })
            );
          }
          setProcessing(false);
        }, 1500);
      } catch (error) {
        console.error('❌ Auth callback error:', error);
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Welcome' }],
          })
        );
        setProcessing(false);
      }
    };

    handleCallback();
  }, [user, navigation, handleOAuthCallback]);

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
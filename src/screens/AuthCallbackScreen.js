import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const AuthCallbackScreen = ({ navigation }) => {
  const { user } = useAuth();

  useEffect(() => {
    // Handle OAuth callback
    const handleCallback = async () => {
      try {
        // Wait for auth state to update
        setTimeout(() => {
          if (user) {
            // Navigate to appropriate dashboard based on user role
            const dashboardRoute = user.role === 'caregiver' ? 'CaregiverDashboard' : 'ParentDashboard';
            navigation.replace(dashboardRoute);
          } else {
            // If no user, go back to welcome
            navigation.replace('Welcome');
          }
        }, 2000);
      } catch (error) {
        console.error('Auth callback error:', error);
        navigation.replace('Welcome');
      }
    };

    handleCallback();
  }, [user, navigation]);

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
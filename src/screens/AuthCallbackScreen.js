import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';

const AuthCallbackScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Fetch user profile to get role
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          const role = profile?.role || user?.role;
          const dashboardRoute = role === 'caregiver' ? 'CaregiverDashboard' : 'ParentDashboard';
          navigation.replace(dashboardRoute);
        } else {
          navigation.replace('Welcome');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigation.replace('Welcome');
      } finally {
        setChecking(false);
      }
    };

    handleCallback();
  }, [navigation]);

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
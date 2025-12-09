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
        // Wait a bit for auth state to settle
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('🔍 Auth callback - checking user profile...');
          
          // Check if profile exists
          let { data: profile, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();
          
          // If no profile, create one with default role
          if (!profile && !error) {
            console.log('📝 Creating user profile...');
            const { createClient } = await import('@supabase/supabase-js');
            const serviceClient = createClient(
              process.env.EXPO_PUBLIC_SUPABASE_URL,
              process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
            );
            
            const { data: newProfile } = await serviceClient
              .from('users')
              .insert([{
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
                role: 'parent', // Default role
                auth_provider: 'google',
                status: 'active',
                email_verified: true,
                profile_image: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture
              }])
              .select()
              .single();
            
            profile = newProfile;
          }
          
          const role = profile?.role || 'parent';
          console.log('✅ Navigating to dashboard:', role);
          const dashboardRoute = role === 'caregiver' ? 'CaregiverDashboard' : 'ParentDashboard';
          navigation.replace(dashboardRoute);
        } else {
          navigation.replace('Welcome');
        }
      } catch (error) {
        console.error('❌ Auth callback error:', error);
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
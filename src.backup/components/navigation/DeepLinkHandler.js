import React, { useEffect } from 'react';
import { Linking } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { navigateToUserDashboard } from '../../utils/navigationUtils';

const DeepLinkHandler = ({ navigation }) => {
  const { verifyEmailToken } = useAuth();

  useEffect(() => {
    const handleDeepLink = async (event) => {
      const url = event?.url || event;
      console.log('🔗 Deep link received:', url);
      
      // Handle email verification links
      if (url && url.includes('verify-email')) {
        console.log('📧 Processing verification URL:', url);
        
        // Extract token from query parameter
        const tokenMatch = url.match(/[?&]token=([^&]+)/);
        const token = tokenMatch ? tokenMatch[1] : null;
        
        console.log('🔑 Extracted token:', token);
        
        if (token) {
          navigation.navigate('EmailVerification', { token });
        } else {
          console.error('❌ No token found in verification URL');
        }
      }
      
      // Handle Firebase verification success
      if (url && url.includes('verify-success')) {
        console.log('✅ Firebase verification success:', url);
        
        const roleMatch = url.match(/[?&]role=([^&]+)/);
        const role = roleMatch ? roleMatch[1] : 'parent';
        
        navigation.navigate('VerificationSuccess', { userRole: role });
      }
    };

    // Handle initial URL when app is opened from link
    Linking.getInitialURL().then(handleDeepLink);

    // Handle URL when app is already running
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => subscription?.remove();
  }, [navigation, verifyEmailToken]);

  return null;
};

export default DeepLinkHandler;
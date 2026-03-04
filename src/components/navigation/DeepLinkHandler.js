import React, { useEffect } from 'react';
import { Linking } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { navigationService } from '../../navigation/navigationService';

const DeepLinkHandler = () => {
  const { verifyEmailToken } = useAuth();

  useEffect(() => {
    const handleDeepLink = async (event) => {
      const url = event?.url || event;
      console.log('🔗 Deep link received:', url);
      
      // Wait for navigation to be ready
      if (!navigationService.isReady()) {
        console.log('⏳ Navigation not ready, waiting...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Handle email verification links
      if (url && url.includes('verify-email')) {
        console.log('📧 Processing verification URL:', url);
        
        const tokenMatch = url.match(/[?&]token=([^&]+)/);
        const token = tokenMatch ? tokenMatch[1] : null;
        
        if (token) {
          navigationService.navigate('EmailVerification', { token });
        } else {
          console.error('❌ No token found in verification URL');
        }
      }
      
      // Handle Firebase verification success
      if (url && url.includes('verify-success')) {
        console.log('✅ Firebase verification success:', url);
        
        const roleMatch = url.match(/[?&]role=([^&]+)/);
        const role = roleMatch ? roleMatch[1] : 'parent';
        
        navigationService.navigate('VerificationSuccess', { userRole: role });
      }
    };

    Linking.getInitialURL().then(handleDeepLink);
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => subscription?.remove();
  }, [verifyEmailToken]);

  return null;
};

export default DeepLinkHandler;
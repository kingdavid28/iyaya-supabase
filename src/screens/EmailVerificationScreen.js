import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../config/api';
import { CommonActions } from '@react-navigation/native';

const EmailVerificationScreen = ({ route, navigation }) => {
  const { token } = route.params;
  const { checkAuthStatus } = useAuth();
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const response = await authAPI.verifyEmail(token);
        
        if (response.success) {
          // Store the token from verification response
          if (response.token) {
            await AsyncStorage.setItem('authToken', response.token);
          }
          
          // Refresh auth status to get updated user
          await checkAuthStatus();
          
          // Navigate to appropriate dashboard based on role
          const dashboardName = response.user?.role === 'parent' ? 'ParentDashboard' : 'CaregiverDashboard';
          
          Alert.alert(
            'Email Verified!',
            'Your account has been verified successfully. Welcome to iYaya!',
            [
              {
                text: 'Continue',
                onPress: () => {
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [{ name: dashboardName }],
                    })
                  );
                }
              }
            ]
          );
        }
      } catch (error) {
        Alert.alert(
          'Verification Failed',
          error.message || 'Invalid or expired verification link.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Welcome')
            }
          ]
        );
      } finally {
        setVerifying(false);
      }
    };

    if (token) {
      verifyEmail();
    }
  }, [token]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      {verifying ? (
        <>
          <ActivityIndicator size="large" color="#db2777" />
          <Text style={{ marginTop: 20, textAlign: 'center' }}>
            Verifying your email...
          </Text>
        </>
      ) : (
        <Text style={{ textAlign: 'center' }}>
          Verification complete
        </Text>
      )}
    </View>
  );
};

export default EmailVerificationScreen;
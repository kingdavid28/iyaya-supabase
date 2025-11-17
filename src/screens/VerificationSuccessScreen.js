import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { CommonActions } from '@react-navigation/native';

const VerificationSuccessScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const { userRole } = route.params || {};

  useEffect(() => {
    // Auto-navigate after 2 seconds
    const timer = setTimeout(() => {
      navigateToDashboard();
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, userRole]);

  const navigateToDashboard = () => {
    const role = userRole || user?.role || 'parent';
    const dashboardName = role === 'caregiver' ? 'CaregiverDashboard' : 'ParentDashboard';
    
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: dashboardName }],
      })
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>✅ Email Verified!</Text>
        <Text style={styles.message}>
          Your account has been verified successfully. Welcome to iYaya!
        </Text>
        <Text style={styles.subMessage}>
          Redirecting to your dashboard...
        </Text>
        
        <Button 
          mode="contained" 
          onPress={navigateToDashboard}
          style={styles.button}
        >
          Continue to Dashboard
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#16a34a',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  subMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#db2777',
    paddingHorizontal: 24,
  },
});

export default VerificationSuccessScreen;
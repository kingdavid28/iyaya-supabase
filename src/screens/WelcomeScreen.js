import { CommonActions, useNavigation } from "@react-navigation/native";
import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useAuth } from "../contexts/AuthContext";

export default function WelcomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const role = user?.role;
  const hasNavigated = React.useRef(false);

  // If logged in, redirect to dashboard
  React.useEffect(() => {
    if (!isLoggedIn || !role || hasNavigated.current) return;
    const target = role === 'caregiver' ? 'CaregiverDashboard' : 'ParentDashboard';
    hasNavigated.current = true;
    
    setTimeout(() => {
      navigation.dispatch(CommonActions.reset({
        index: 0,
        routes: [{ name: target }],
      }));
    }, 100);
  }, [isLoggedIn, role, navigation]);

  const handleParentPress = () => {
    navigation.navigate(isLoggedIn ? 'ParentDashboard' : 'ParentAuth');
  };

  const handleCaregiverPress = () => {
    navigation.navigate(isLoggedIn ? 'CaregiverDashboard' : 'CaregiverAuth');
  };

  if (isLoggedIn && role) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Redirecting...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👶 Iyaya</Text>
      <Text style={styles.tagline}>Connecting families with trusted caregivers</Text>
      
      <Pressable style={styles.parentButton} onPress={handleParentPress}>
        <Text style={styles.buttonText}>I'm a Parent</Text>
      </Pressable>
      
      <Pressable style={styles.caregiverButton} onPress={handleCaregiverPress}>
        <Text style={styles.buttonText}>I'm a Caregiver</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 18,
    color: '#4b5563',
    marginBottom: 40,
    textAlign: 'center',
  },
  parentButton: {
    backgroundColor: '#db2777',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    minWidth: 250,
  },
  caregiverButton: {
    backgroundColor: '#2563eb',
    padding: 20,
    borderRadius: 12,
    minWidth: 250,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});

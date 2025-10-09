// ParentMessaging.jsx - Parent-specific messaging interface wrapper
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import MessagingInterface from '../../components/messaging/MessagingInterface';

const ParentMessaging = () => {
  const { user, loading } = useAuth();

  // Show loading while authentication is being checked
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading messaging...
        </Text>
      </View>
    );
  }

  // Ensure user is authenticated and is a parent
  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="bodyLarge" style={styles.errorText}>
          Please log in to access messaging
        </Text>
      </View>
    );
  }

  if (user.role !== 'parent') {
    return (
      <View style={styles.errorContainer}>
        <Text variant="bodyLarge" style={styles.errorText}>
          This messaging interface is for parents only
        </Text>
      </View>
    );
  }

  return (
    <MessagingInterface userType="parent" />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default ParentMessaging;

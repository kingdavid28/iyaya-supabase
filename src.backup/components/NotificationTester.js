import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { testNotificationSystem, clearTestNotifications } from '../utils/testNotifications';
import { useNotificationCounts } from '../hooks/useNotificationCounts';

const NotificationTester = () => {
  const { user } = useAuth();
  const { counts, fetchNotificationCounts } = useNotificationCounts();
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please log in first');
      return;
    }

    setTesting(true);
    try {
      const result = await testNotificationSystem(user.id, user.role);
      
      if (result.success) {
        Alert.alert(
          'Test Complete',
          `Created ${result.created} notifications\nCounts: ${JSON.stringify(result.counts, null, 2)}`
        );
        await fetchNotificationCounts();
      } else {
        Alert.alert('Test Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setTesting(false);
    }
  };

  const handleClear = async () => {
    if (!user?.id) return;

    try {
      await clearTestNotifications(user.id);
      Alert.alert('Success', 'All notifications marked as read');
      await fetchNotificationCounts();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notification Tester</Text>
      
      <View style={styles.countsContainer}>
        <Text style={styles.countsTitle}>Current Counts:</Text>
        <Text>Messages: {counts.messages}</Text>
        <Text>Bookings: {counts.bookings}</Text>
        <Text>Jobs: {counts.jobs}</Text>
        <Text>Reviews: {counts.reviews}</Text>
        <Text>Other: {counts.notifications}</Text>
        <Text>Total: {counts.total}</Text>
      </View>

      <TouchableOpacity 
        style={[styles.button, styles.testButton]} 
        onPress={handleTest}
        disabled={testing}
      >
        <Text style={styles.buttonText}>
          {testing ? 'Testing...' : 'Create Test Notifications'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.clearButton]} 
        onPress={handleClear}
      >
        <Text style={styles.buttonText}>Clear All Badges</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    margin: 10,
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  countsContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  countsTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 5,
  },
  testButton: {
    backgroundColor: '#007AFF',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default NotificationTester;
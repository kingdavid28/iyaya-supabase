import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const DebugAuthCallback = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Debug AuthCallbackScreen</Text>
      <Text style={styles.subtitle}>Test navigation to AuthCallbackScreen</Text>
      
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('AuthCallback')}
      >
        <Text style={styles.buttonText}>Navigate to AuthCallback</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          console.log('🔍 Current URL:', window.location.href);
          console.log('🔍 Current URL path:', window.location.pathname);
        }}
      >
        <Text style={styles.buttonText}>Log Current URL</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DebugAuthCallback;

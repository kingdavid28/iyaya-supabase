import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

/**
 * Reusable loading spinner component
 */
export const LoadingSpinner = ({ 
  size = 'large', 
  color = '#007bff', 
  message = 'Loading...', 
  overlay = false 
}) => {
  const containerStyle = overlay ? [styles.container, styles.overlay] : styles.container;

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1000,
  },
  message: {
    marginTop: 10,
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
});

import React from 'react';
import { View, StyleSheet } from 'react-native';

const Card = ({ children, variant = 'default', style }) => (
  <View style={[styles.card, styles[variant], style]}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  default: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
});

export default Card;
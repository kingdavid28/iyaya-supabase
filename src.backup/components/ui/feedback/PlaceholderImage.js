import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

const PlaceholderImage = ({ width = 100, height = 100, text = '', style }) => {
  return (
    <View 
      style={[
        styles.container, 
        { width, height },
        style
      ]}
    >
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e1e4e8',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    overflow: 'hidden',
  },
  text: {
    color: '#6a737d',
    fontSize: 12,
  },
});

export default PlaceholderImage;

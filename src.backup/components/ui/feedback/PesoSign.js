import React from 'react';
import { Text } from 'react-native';

const PesoSign = ({ size = 16, color = '#000' }) => (
  <Text style={{ 
    fontSize: size, 
    color, 
    fontWeight: 'bold',
    marginRight: 4 
  }}>
    ₱
  </Text>
);

export default PesoSign;

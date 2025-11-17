import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';

export default function EmptyState({ 
  icon, 
  title, 
  subtitle, 
  action, 
  onActionPress,
  style 
}) {
  return (
    <View style={[{
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    }, style]}>
      <Ionicons name={icon} size={48} color="#9CA3AF" />
      <Text style={{
        marginTop: 12,
        fontSize: 16,
        fontWeight: '600',
        color: '#6b7280',
        textAlign: 'center'
      }}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{
          marginTop: 4,
          fontSize: 14,
          color: '#9ca3af',
          textAlign: 'center'
        }}>
          {subtitle}
        </Text>
      )}
      {action && onActionPress && (
        <Button
          mode="contained"
          onPress={onActionPress}
          style={{ marginTop: 16 }}
        >
          {action}
        </Button>
      )}
    </View>
  );
}
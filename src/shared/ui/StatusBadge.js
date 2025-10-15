import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const STATUS_CONFIG = {
  pending: { bg: '#fff3cd', text: '#856404', icon: 'time' },
  accepted: { bg: '#d1edff', text: '#0c5aa6', icon: 'checkmark-circle' },
  rejected: { bg: '#f8d7da', text: '#721c24', icon: 'close-circle' },
  confirmed: { bg: '#d1f2eb', text: '#0c5aa6', icon: 'checkmark-circle' },
  cancelled: { bg: '#f8d7da', text: '#721c24', icon: 'close-circle' }
};

export default function StatusBadge({ status, showIcon = true, style }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  
  return (
    <View style={[{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: config.bg
    }, style]}>
      {showIcon && (
        <Ionicons name={config.icon} size={14} color={config.text} style={{ marginRight: 4 }} />
      )}
      <Text style={{ color: config.text, fontSize: 12, fontWeight: '500' }}>
        {String(status).charAt(0).toUpperCase() + String(status).slice(1)}
      </Text>
    </View>
  );
}

export const getStatusColor = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.pending;
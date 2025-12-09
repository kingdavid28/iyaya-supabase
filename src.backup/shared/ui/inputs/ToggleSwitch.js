import React from 'react';
import { Switch } from 'react-native';

export function ToggleSwitch({ checked, onChange, disabled = false }) {
  return (
    <Switch
      value={checked}
      onValueChange={onChange}
      disabled={disabled}
      trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
      thumbColor={checked ? '#FFFFFF' : '#9CA3AF'}
      ios_backgroundColor="#E5E7EB"
    />
  );
}
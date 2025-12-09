import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';

export function ProfileSettings({ user, userType, data, onSave, isLoading, isSaving, colors }) {
  const [localData, setLocalData] = useState({
    name: '',
    email: '',
    phone: '',
    profileVisibility: 'public',
  });

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      setLocalData({
        name: data.name || user?.name || '',
        email: data.email || user?.email || '',
        phone: data.phone || user?.phone || '',
        profileVisibility: data.profileVisibility || 'public',
      });
    }
  }, [data, user]);

  const handleSettingChange = (field, value) => {
    setLocalData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    onSave(localData);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Profile Settings</Text>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile Settings</Text>
      
      <View style={styles.grid}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={[styles.input, isSaving && styles.inputDisabled]}
            value={localData.name || ''}
            onChangeText={(value) => handleSettingChange('name', value)}
            editable={!isSaving}
            placeholder="Enter your full name"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, isSaving && styles.inputDisabled]}
            value={localData.email || ''}
            onChangeText={(value) => handleSettingChange('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isSaving}
            placeholder="Enter your email"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={[styles.input, isSaving && styles.inputDisabled]}
            value={localData.phone || ''}
            onChangeText={(value) => handleSettingChange('phone', value)}
            keyboardType="phone-pad"
            placeholder="(555) 123-4567"
            editable={!isSaving}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Profile Visibility</Text>
          <View style={styles.visibilityOptions}>
            {['public', 'private', 'friends'].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.visibilityOption,
                  localData.profileVisibility === option && styles.visibilityOptionActive
                ]}
                onPress={() => handleSettingChange('profileVisibility', option)}
                disabled={isSaving}
              >
                <Text style={[
                  styles.visibilityOptionText,
                  localData.profileVisibility === option && styles.visibilityOptionTextActive
                ]}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <Button
        mode="contained"
        onPress={handleSave}
        disabled={isSaving}
        style={[styles.saveButton, { backgroundColor: colors.primary }]}
        labelStyle={styles.saveButtonText}
      >
        {isSaving ? 'Saving...' : 'Save Changes'}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },
  grid: {
    // gap property not supported in React Native
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  inputDisabled: {
    backgroundColor: '#F9FAFB',
    opacity: 0.6,
  },
  saveButton: {
    marginTop: 24,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 32,
  },
  visibilityOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  visibilityOption: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  visibilityOptionActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#EBF4FF',
  },
  visibilityOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  visibilityOptionTextActive: {
    color: '#3B82F6',
  },
});

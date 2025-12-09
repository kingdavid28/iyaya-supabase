import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { ToggleSwitch } from '../../ui/inputs/ToggleSwitch';

export function PaymentSettings({ user, userType, data, onSave, isLoading, isSaving, colors }) {
  const [localData, setLocalData] = useState({
    defaultPaymentMethod: '',
    autoPayments: false,
    savePaymentInfo: true,
    receiveReceipts: true,
  });

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      setLocalData({
        defaultPaymentMethod: data.defaultPaymentMethod || '',
        autoPayments: data.autoPayments ?? false,
        savePaymentInfo: data.savePaymentInfo ?? true,
        receiveReceipts: data.receiveReceipts ?? true,
      });
    }
  }, [data]);

  const handleSettingChange = (field, value) => {
    setLocalData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    onSave(localData);
  };

  const PAYMENT_SETTINGS = [
    { key: 'autoPayments', label: 'Auto Payments', desc: 'Automatically process recurring payments' },
    { key: 'savePaymentInfo', label: 'Save Payment Info', desc: 'Securely store payment methods for faster checkout' },
    { key: 'receiveReceipts', label: 'Email Receipts', desc: 'Receive payment confirmations via email' }
  ];

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Payment Settings</Text>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Settings</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Default Payment Method</Text>
        <TextInput
          style={[styles.input, isSaving && styles.inputDisabled]}
          value={localData.defaultPaymentMethod || ''}
          onChangeText={(value) => handleSettingChange('defaultPaymentMethod', value)}
          editable={!isSaving}
          placeholder="Select payment method"
        />
      </View>
      
      {PAYMENT_SETTINGS.map(({ key, label, desc }) => (
        <View key={key} style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>{label}</Text>
            <Text style={styles.settingDesc}>{desc}</Text>
          </View>
          <ToggleSwitch
            checked={localData[key] || false}
            onChange={(checked) => handleSettingChange(key, checked)}
            disabled={isSaving}
          />
        </View>
      ))}
      
      <Button
        mode="contained"
        onPress={handleSave}
        disabled={isSaving}
        style={[styles.saveButton, { backgroundColor: colors?.primary || '#2563EB' }]}
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
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
});

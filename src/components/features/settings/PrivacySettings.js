import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ToggleSwitch } from '../../ui/inputs/ToggleSwitch';

export function PrivacySettings({ user, userType, data, onSave, isLoading, isSaving, colors }) {
  const [localData, setLocalData] = useState({
    profileVisibility: true,
    showOnlineStatus: true,
    allowDirectMessages: true,
    showRatings: true,
    dataSharing: false,
  });

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      setLocalData({
        profileVisibility: data.profileVisibility ?? true,
        showOnlineStatus: data.showOnlineStatus ?? true,
        allowDirectMessages: data.allowDirectMessages ?? true,
        showRatings: data.showRatings ?? true,
        dataSharing: data.dataSharing ?? false,
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

  const PRIVACY_SETTINGS = [
    { key: 'profileVisibility', label: 'Public Profile', desc: 'Make your profile visible to others' },
    { key: 'showOnlineStatus', label: 'Show Online Status', desc: 'Let others know when you are online' },
    { key: 'allowDirectMessages', label: 'Direct Messages', desc: 'Allow others to message you directly' },
    { key: 'showRatings', label: 'Show Ratings', desc: 'Display your ratings and reviews publicly' },
    { key: 'dataSharing', label: 'Data Sharing', desc: 'Share anonymized data to improve service' }
  ];

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Privacy & Security</Text>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Privacy & Security</Text>
      
      <View style={styles.settingsList}>
        {PRIVACY_SETTINGS.map(({ key, label, desc }) => (
          <View key={key} style={styles.settingItem}>
            <View style={styles.settingContent}>
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
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={[
            styles.saveButton,
            { backgroundColor: colors.primary },
            isSaving && styles.saveButtonDisabled
          ]}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>
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
  settingsList: {
    gap: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingContent: {
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
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end',
    marginTop: 24,
  },
  saveButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
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

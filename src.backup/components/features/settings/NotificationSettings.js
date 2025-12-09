import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Button, Card } from 'react-native-paper';
import { ToggleSwitch } from '../../ui/inputs/ToggleSwitch';

export function NotificationSettings({ user, userType, data, onSave, isLoading, isSaving, colors }) {
  const [localData, setLocalData] = useState({
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    bookingReminders: true,
    messageNotifications: true,
    marketingEmails: false,
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00'
    },
  });

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      setLocalData({
        pushNotifications: data.pushNotifications ?? true,
        emailNotifications: data.emailNotifications ?? true,
        smsNotifications: data.smsNotifications ?? false,
        bookingReminders: data.bookingReminders ?? true,
        messageNotifications: data.messageNotifications ?? true,
        marketingEmails: data.marketingEmails ?? false,
        quietHours: data.quietHours || {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00'
        },
      });
    }
  }, [data]);

  const handleSettingChange = (field, value) => {
    setLocalData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedSettingChange = (parent, field, value) => {
    setLocalData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    onSave(localData);
  };

  const NOTIFICATION_TYPES = [
    { key: 'bookingReminders', label: 'Booking Reminders', desc: 'Get reminded about upcoming bookings' },
    { key: 'messageNotifications', label: 'New Messages', desc: 'Notifications for new messages' },
    { key: 'marketingEmails', label: 'Marketing Updates', desc: 'Promotional emails and updates' }
  ];

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Notification Settings</Text>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Text style={styles.title}>Notification Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDesc}>Receive push notifications on your device</Text>
            </View>
            <ToggleSwitch
              checked={localData.pushNotifications || false}
              onChange={(checked) => handleSettingChange('pushNotifications', checked)}
              disabled={isSaving}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Email Notifications</Text>
              <Text style={styles.settingDesc}>Receive notifications via email</Text>
            </View>
            <ToggleSwitch
              checked={localData.emailNotifications || false}
              onChange={(checked) => handleSettingChange('emailNotifications', checked)}
              disabled={isSaving}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>SMS Notifications</Text>
              <Text style={styles.settingDesc}>Receive notifications via text message</Text>
            </View>
            <ToggleSwitch
              checked={localData.smsNotifications || false}
              onChange={(checked) => handleSettingChange('smsNotifications', checked)}
              disabled={isSaving}
            />
          </View>
          
          <Text style={styles.sectionTitle}>Notification Types</Text>
          
          {NOTIFICATION_TYPES.map(({ key, label, desc }) => (
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
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Quiet Hours</Text>
              <Text style={styles.settingDesc}>Disable notifications during specified hours</Text>
            </View>
            <ToggleSwitch
              checked={localData.quietHours?.enabled || false}
              onChange={(checked) => handleNestedSettingChange('quietHours', 'enabled', checked)}
              disabled={isSaving}
            />
          </View>
          
          <Button
            mode="contained"
            onPress={handleSave}
            disabled={isSaving}
            style={[styles.saveButton, { backgroundColor: colors?.primary || '#2563EB' }]}
            labelStyle={styles.saveButtonText}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  card: {
    margin: 16,
    borderRadius: 16,
  },
  cardContent: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },
  saveButton: {
    marginTop: 20,
    borderRadius: 12,
  },
  saveButtonText: {
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

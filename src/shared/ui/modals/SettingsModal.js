import React, { useState, useEffect } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileSettings } from '../../../components/features/profile/ProfileSettings';
import { PrivacySettings } from '../../../components/features/settings/PrivacySettings';
import { InformationRequests } from '../../../components/business/InformationRequests';
import { NotificationSettings } from '../../../components/features/settings/NotificationSettings';
import { PaymentSettings } from '../../../components/features/settings/PaymentSettings';
import { DataManagement } from '../../../components/business/DataManagement';
import { settingsService } from '../../../services';

export function SettingsModal({ visible, onClose, user, userType, colors }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({});
  const [privacyData, setPrivacyData] = useState({});
  const [notificationData, setNotificationData] = useState({});
  const [paymentData, setPaymentData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: 'person-outline' },
    { id: 'privacy', label: 'Privacy', icon: 'shield-outline' },
    { id: 'requests', label: 'Requests', icon: 'mail-outline' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications-outline' },
    { id: 'payment', label: 'Payment', icon: 'card-outline' },
    { id: 'data', label: 'Data', icon: 'server-outline' },
  ];

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible, activeTab]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      switch (activeTab) {
        case 'profile':
          if (!profileData.name) {
            const profile = await settingsService.getProfile();
            setProfileData(profile?.data || profile || {});
          }
          break;
        case 'privacy':
          if (!privacyData.profileVisibility) {
            const privacy = await settingsService.getPrivacySettings();
            setPrivacyData(privacy?.data || privacy || {});
          }
          break;
        case 'notifications':
          if (!notificationData.pushEnabled) {
            const notifications = await settingsService.getNotificationSettings();
            setNotificationData(notifications?.data || notifications || {});
          }
          break;
        case 'payment':
          if (!paymentData.paymentMethod) {
            const payment = await settingsService.getPaymentSettings();
            setPaymentData(payment?.data || payment || {});
          }
          break;
      }
    } catch (error) {
      console.error('Settings load error:', error);
      // Use mock data on error
      setMockData();
    } finally {
      setIsLoading(false);
    }
  };

  const setMockData = () => {
    switch (activeTab) {
      case 'profile':
        setProfileData({ name: user?.name || '', email: user?.email || '', phone: '' });
        break;
      case 'privacy':
        setPrivacyData({ profileVisibility: true, showOnlineStatus: true });
        break;
      case 'notifications':
        setNotificationData({ pushEnabled: true, emailEnabled: true });
        break;
      case 'payment':
        setPaymentData({ paymentMethod: 'card', autoPayment: false });
        break;
    }
  };

  const handleSave = async (data) => {
    setIsSaving(true);
    try {
      let result;
      switch (activeTab) {
        case 'profile':
          result = await settingsService.updateProfile(data);
          setProfileData(data);
          break;
        case 'privacy':
          result = await settingsService.updatePrivacySettings(data);
          setPrivacyData(data);
          break;
        case 'notifications':
          result = await settingsService.updateNotificationSettings(data);
          setNotificationData(data);
          break;
        case 'payment':
          result = await settingsService.updatePaymentSettings(data);
          setPaymentData(data);
          break;
      }
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Settings save error:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderTabContent = () => {
    const commonProps = {
      user,
      userType,
      onSave: handleSave,
      isLoading,
      isSaving,
      colors,
    };

    switch (activeTab) {
      case 'profile':
        return <ProfileSettings {...commonProps} data={profileData} />;
      case 'privacy':
        return <PrivacySettings {...commonProps} data={privacyData} />;
      case 'requests':
        return <InformationRequests {...commonProps} />;
      case 'notifications':
        return <NotificationSettings {...commonProps} data={notificationData} />;
      case 'payment':
        return <PaymentSettings {...commonProps} data={paymentData} />;
      case 'data':
        return <DataManagement {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  activeTab === tab.id && [styles.activeTab, { borderBottomColor: colors.primary }]
                ]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Ionicons
                  name={tab.icon}
                  size={20}
                  color={activeTab === tab.id ? colors.primary : '#6B7280'}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab.id && { color: colors.primary }
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView style={styles.content}>
          {renderTabContent()}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  tabContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginRight: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
});
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { settingsService } from '../../../services';
import { DataManagement } from '../../business/DataManagement';
import { PrivacySettings } from '../../features/settings/PrivacySettings';

export function SettingsModal({ visible, onClose, user, userType, colors }) {
  const [activeTab, setActiveTab] = useState('privacy');
  const [privacyData, setPrivacyData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const tabs = [
    { id: 'privacy', label: 'Privacy', icon: 'shield-outline' },
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
      if (activeTab === 'privacy') {
        if (!privacyData.profileVisibility) {
          const privacy = await settingsService.getPrivacySettings();
          setPrivacyData(privacy?.data || privacy || {});
        }
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
    if (activeTab === 'privacy') {
      setPrivacyData({ profileVisibility: true, showOnlineStatus: true });
    }
  };

  const handleSave = async (data) => {
    if (activeTab !== 'privacy') {
      Alert.alert('Not Available', 'There are no editable settings on this tab.');
      return;
    }

    setIsSaving(true);
    try {
      await settingsService.updatePrivacySettings(data);
      setPrivacyData(data);
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
      case 'privacy':
        return <PrivacySettings {...commonProps} data={privacyData} />;
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

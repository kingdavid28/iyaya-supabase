import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { X, Shield, Eye, Lock, Info } from 'lucide-react-native';
import { usePrivacy } from './PrivacyManager';
import { useAuth } from '../../../contexts/AuthContext';

const PrivacySettingsModal = ({ visible, onClose }) => {
  const { privacySettings, updatePrivacySetting, DATA_LEVELS } = usePrivacy();
  const { user } = useAuth();
  const [loading, setLoading] = useState({});
  
  const isCaregiver = user?.role === 'caregiver';

  // Parent privacy options
  const parentPrivacyOptions = [
    {
      key: 'sharePhone',
      title: 'Phone Number',
      description: 'Allow caregivers to see your phone number',
      level: DATA_LEVELS.PRIVATE,
      icon: '📞',
    },
    {
      key: 'shareAddress',
      title: 'Full Address',
      description: 'Share your complete address (city/area is always visible)',
      level: DATA_LEVELS.PRIVATE,
      icon: '🏠',
    },
    {
      key: 'shareEmergencyContact',
      title: 'Emergency Contact',
      description: 'Share emergency contact information',
      level: DATA_LEVELS.SENSITIVE,
      icon: '🚨',
    },
    {
      key: 'shareChildMedicalInfo',
      title: 'Child Medical Information',
      description: 'Share medical conditions and requirements',
      level: DATA_LEVELS.SENSITIVE,
      icon: '🏥',
    },
    {
      key: 'shareChildAllergies',
      title: 'Child Allergies',
      description: 'Share allergy information and restrictions',
      level: DATA_LEVELS.SENSITIVE,
      icon: '⚠️',
    },
    {
      key: 'shareChildBehaviorNotes',
      title: 'Child Behavior Notes',
      description: 'Share behavioral patterns and preferences',
      level: DATA_LEVELS.SENSITIVE,
      icon: '📝',
    },
    {
      key: 'autoApproveBasicInfo',
      title: 'Auto-approve Basic Requests',
      description: 'Automatically approve requests for non-sensitive information',
      level: DATA_LEVELS.PRIVATE,
      icon: '⚡',
    },
  ];

  // Caregiver privacy options
  const caregiverPrivacyOptions = [
    {
      key: 'sharePhone',
      title: 'Phone Number',
      description: 'Allow families to see your phone number',
      level: DATA_LEVELS.PRIVATE,
      icon: '📞',
    },
    {
      key: 'shareAddress',
      title: 'Home Address',
      description: 'Share your home address with families (city/area is always visible)',
      level: DATA_LEVELS.PRIVATE,
      icon: '🏠',
    },
    {
      key: 'shareEmergencyContact',
      title: 'Emergency Contact',
      description: 'Share your emergency contact information',
      level: DATA_LEVELS.SENSITIVE,
      icon: '🚨',
    },
    {
      key: 'shareBackgroundCheck',
      title: 'Background Check Details',
      description: 'Share detailed background check information',
      level: DATA_LEVELS.SENSITIVE,
      icon: '🛡️',
    },
    {
      key: 'shareCertifications',
      title: 'Certifications & Documents',
      description: 'Share certification documents and training records',
      level: DATA_LEVELS.PRIVATE,
      icon: '📜',
    },
    {
      key: 'shareReferences',
      title: 'References',
      description: 'Share contact information of your references',
      level: DATA_LEVELS.SENSITIVE,
      icon: '👥',
    },
    {
      key: 'shareAvailability',
      title: 'Detailed Availability',
      description: 'Share your complete schedule and availability patterns',
      level: DATA_LEVELS.PRIVATE,
      icon: '📅',
    },
    {
      key: 'shareRateHistory',
      title: 'Rate History',
      description: 'Allow families to see your rate history and negotiations',
      level: DATA_LEVELS.PRIVATE,
      icon: '💰',
    },
    {
      key: 'shareWorkHistory',
      title: 'Work History Details',
      description: 'Share detailed work history and previous family information',
      level: DATA_LEVELS.SENSITIVE,
      icon: '📋',
    },
    {
      key: 'autoApproveBasicInfo',
      title: 'Auto-approve Basic Requests',
      description: 'Automatically approve requests for non-sensitive information',
      level: DATA_LEVELS.PRIVATE,
      icon: '⚡',
    },
  ];

  const privacyOptions = isCaregiver ? caregiverPrivacyOptions : parentPrivacyOptions;

  const handleToggle = async (key, value) => {
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      await updatePrivacySetting(key, value);
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case DATA_LEVELS.PRIVATE: return '#f59e0b';
      case DATA_LEVELS.SENSITIVE: return '#ef4444';
      default: return '#10b981';
    }
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case DATA_LEVELS.PRIVATE: return <Eye size={16} color="#f59e0b" />;
      case DATA_LEVELS.SENSITIVE: return <Shield size={16} color="#ef4444" />;
      default: return <Lock size={16} color="#10b981" />;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Privacy Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Info size={20} color="#3b82f6" />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Your Privacy Matters</Text>
            <Text style={styles.infoDescription}>
              {isCaregiver 
                ? 'Control what professional information you share with families. Basic info (name, email, general location) is always visible for safety and trust.'
                : 'Control what information you share. Basic info (name, email, general location) is always visible for safety.'
              }
            </Text>
          </View>
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.sectionTitle}>Information Sharing</Text>
          
          {privacyOptions.map((option) => (
            <View key={option.key} style={styles.optionCard}>
              <View style={styles.optionHeader}>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionIcon}>{option.icon}</Text>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>
                </View>
                <View style={styles.optionControls}>
                  <View style={styles.levelBadge}>
                    {getLevelIcon(option.level)}
                    <Text style={[styles.levelText, { color: getLevelColor(option.level) }]}>
                      {option.level.toUpperCase()}
                    </Text>
                  </View>
                  <Switch
                    value={privacySettings[option.key] || false}
                    onValueChange={(value) => handleToggle(option.key, value)}
                    disabled={loading[option.key]}
                    trackColor={{ false: '#e5e7eb', true: '#db277780' }}
                    thumbColor={privacySettings[option.key] ? '#db2777' : '#9ca3af'}
                  />
                </View>
              </View>
            </View>
          ))}

          <View style={styles.privacyLevels}>
            <Text style={styles.sectionTitle}>Privacy Levels</Text>
            
            <View style={styles.levelExplanation}>
              <View style={styles.levelItem}>
                <Lock size={16} color="#10b981" />
                <View style={styles.levelInfo}>
                  <Text style={styles.levelName}>PUBLIC</Text>
                  <Text style={styles.levelDesc}>Always visible (name, email, city)</Text>
                </View>
              </View>
              
              <View style={styles.levelItem}>
                <Eye size={16} color="#f59e0b" />
                <View style={styles.levelInfo}>
                  <Text style={styles.levelName}>PRIVATE</Text>
                  <Text style={styles.levelDesc}>Controlled by your settings</Text>
                </View>
              </View>
              
              <View style={styles.levelItem}>
                <Shield size={16} color="#ef4444" />
                <View style={styles.levelInfo}>
                  <Text style={styles.levelName}>SENSITIVE</Text>
                  <Text style={styles.levelDesc}>Requires explicit approval</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  infoSection: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#eff6ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: '#3730a3',
    lineHeight: 20,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  optionCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 16,
  },
  optionIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  optionControls: {
    alignItems: 'flex-end',
    gap: 8,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '600',
  },
  privacyLevels: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  levelExplanation: {
    gap: 16,
  },
  levelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelInfo: {
    flex: 1,
  },
  levelName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  levelDesc: {
    fontSize: 12,
    color: '#6b7280',
  },
};

export default PrivacySettingsModal;

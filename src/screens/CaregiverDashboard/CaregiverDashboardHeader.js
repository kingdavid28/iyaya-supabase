import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useMemo } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';

import { styles } from '../styles/CaregiverDashboard.styles';

const CaregiverDashboardHeader = ({
  notificationCounts,
  pendingRequests,
  onNavigateMessages,
  onOpenPrivacyRequests,
  onNavigateNotifications,
  onOpenRequestModal,
  requestInfoDisabled = false,
  onOpenSettings,
  onNavigateProfile,
  onLogout,
}) => {
  const totalUnread = useMemo(() => {
    const pendingRequestsCount = pendingRequests?.length || 0;
    const baseNotifications = notificationCounts?.notifications || 0;
    return baseNotifications + pendingRequestsCount;
  }, [notificationCounts?.notifications, pendingRequests]);

  return (
    <View style={styles.parentLikeHeaderContainer}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.parentLikeHeaderGradient}
      >
        <View style={styles.headerTop}>
          <View style={[styles.logoContainer, { flexDirection: 'column', alignItems: 'center' }]}>
            <Image source={require('../../../assets/icon.png')} style={[styles.logoImage, { marginBottom: 6 }]} />
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>I am a Caregiver</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <Pressable style={styles.headerButton} onPress={onNavigateMessages}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={[styles.headerButton, { position: 'relative' }]}
              onPress={onOpenPrivacyRequests}
            >
              <Ionicons name="shield-outline" size={22} color="#FFFFFF" />
              {totalUnread > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {totalUnread > 9 ? '9+' : totalUnread}
                  </Text>
                </View>
              )}
            </Pressable>

            <Pressable
              style={[styles.headerButton, { position: 'relative' }]}
              onPress={onNavigateNotifications}
            >
              <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
              {notificationCounts?.notifications > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {notificationCounts.notifications > 9 ? '9+' : notificationCounts.notifications}
                  </Text>
                </View>
              )}
            </Pressable>

            <Pressable
              style={[styles.headerButton, requestInfoDisabled && { opacity: 0.5 }]}
              onPress={() => {
                if (!requestInfoDisabled) {
                  onOpenRequestModal?.();
                }
              }}
              disabled={requestInfoDisabled}
            >
              <Ionicons name="mail-outline" size={22} color="#FFFFFF" />
            </Pressable>

            <Pressable style={styles.headerButton} onPress={onOpenSettings}>
              <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={styles.headerButton}
              onPress={onNavigateProfile}
            >
              <Ionicons name="person-outline" size={22} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={styles.headerButton}
              onPress={async () => {
                try {
                  await onLogout?.();
                } catch (error) {
                  console.error('❌ Logout error:', error);
                  Alert.alert('Logout Error', 'Failed to logout. Please try again.');
                }
              }}
            >
              <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

export default memo(CaregiverDashboardHeader);
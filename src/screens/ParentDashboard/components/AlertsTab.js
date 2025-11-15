import { LinearGradient } from 'expo-linear-gradient';
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  DollarSign,
  MessageCircle,
  Shield
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useAuth } from '../../../contexts/AuthContext';
import { notificationService } from '../../../services/supabase';

// Utility functions
const normalizeType = (value) => (typeof value === 'string' ? value.toLowerCase() : '');
const enhanceAlert = (alert = {}) => ({
  ...alert,
  type: normalizeType(alert?.type)
});
const hasAlertContent = (alert = {}) => {
  const title = typeof alert?.title === 'string' ? alert.title.trim() : '';
  const message = typeof alert?.message === 'string' ? alert.message.trim() : '';
  return Boolean(title || message);
};

const parseAlertData = (data) => {
  if (!data) return {};
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (error) {
      console.warn('⚠️ Failed to parse alert data:', error);
      return {};
    }
  }
  return data;
};

// Constants
const CONTRACT_NOTIFICATION_TYPES = new Set([
  'contract_created',
  'contract_status',
  'contract_signed',
  'contract_active',
  'contract_resent'
]);

const AlertsTab = ({ navigation, onNavigateTab }) => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Load alerts function
  const loadAlerts = useCallback(async () => {
    if (!user?.id) {
      console.log('❌ AlertsTab - No user ID');
      setLoading(false);
      setError('No user found');
      return;
    }

    try {
      setError(null);
      console.log('🚨 Loading alerts for user:', user.id);
      const notifications = await notificationService.getNotifications(user.id, { limit: 25 });
      console.log('🚨 Received notifications:', notifications);

      const normalizedAlerts = (notifications || []).map(enhanceAlert);
      const parentAlerts = normalizedAlerts.filter(hasAlertContent);
      console.log('🚨 Normalized alerts:', parentAlerts);

      setAlerts(parentAlerts);
    } catch (error) {
      console.error('❌ Error loading alerts:', error);
      setError('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load alerts on mount
  useEffect(() => {
    console.log('🚨 AlertsTab useEffect - user:', user?.id);
    loadAlerts();
  }, [loadAlerts]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  }, [loadAlerts]);

  // Mark as read function
  const markAsRead = useCallback(async (alertId) => {
    try {
      await notificationService.markNotificationAsRead(alertId);
      setAlerts(prev => prev.map(alert =>
        alert.id === alertId ? { ...alert, read: true } : alert
      ));
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  }, []);

  const handleDeleteAlert = useCallback(async (alertId) => {
    try {
      await notificationService.deleteNotification(alertId);
      setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
    } catch (error) {
      console.error('Error deleting alert:', error);
      Alert.alert('Error', 'Failed to delete alert. Please try again.');
    }
  }, []);

  const confirmDeleteAlert = useCallback((alert) => {
    Alert.alert(
      'Delete alert',
      'This will remove this alert from your inbox. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteAlert(alert.id)
        }
      ]
    );
  }, [handleDeleteAlert]);

  // Alert press handler
  const handleAlertPress = useCallback(async (alert) => {
    if (!alert.read) {
      await markAsRead(alert.id);
    }

    const alertData = parseAlertData(alert.data);
    const contractId = alertData?.contractId || alertData?.contract_id;
    const bookingId = alertData?.bookingId || alertData?.booking_id;
    const jobId = alertData?.jobId || alertData?.job_id;
    const applicationId = alertData?.applicationId || alertData?.application_id;

    // Detect information request alerts (privacy-related)
    const isInformationRequest =
      alert.type === 'information_request' ||
      alertData?.notificationType === 'information_request' ||
      alertData?.type === 'information_request' ||
      alertData?.category === 'information_request';

    if (isInformationRequest) {
      console.log('🛡️ Parent information request alert tapped - opening privacy requests');
      onNavigateTab?.('alerts', { ...alert, data: alertData, openPrivacyRequests: true });
      return;
    }

    const isContractNotification = contractId && (
      CONTRACT_NOTIFICATION_TYPES.has(alertData?.notificationType) || alert.type === 'system'
    );

    if (isContractNotification) {
      const hasBooking = Boolean(bookingId);
      const hasApplicationContext = Boolean(applicationId || jobId);
      const notificationType = alertData?.notificationType;

      let targetTab = 'applications';
      if (hasBooking && ['contract_signed', 'contract_active'].includes(notificationType)) {
        targetTab = 'bookings';
      } else if (hasBooking && !hasApplicationContext) {
        targetTab = 'bookings';
      }

      onNavigateTab?.(targetTab, {
        contractId,
        bookingId,
        jobId,
        applicationId,
        notificationType,
        rawAlert: alert
      });
      return;
    }

    // Navigate based on alert type
    switch (alert.type) {
      case 'job_application':
        onNavigateTab?.('jobs');
        break;
      case 'booking_confirmed':
      case 'booking_cancelled':
        onNavigateTab?.('bookings');
        break;
      case 'message':
        onNavigateTab?.('messages');
        break;
      default:
        console.log('Unhandled alert type:', alert.type);
        break;
    }
  }, [markAsRead, onNavigateTab]);

  // Icon and color helpers
  const getAlertIcon = useCallback((type) => {
    const normalizedType = normalizeType(type);

    const iconConfig = {
      'job_application': { icon: Briefcase, color: "#3b82f6" },
      'application': { icon: Briefcase, color: "#3b82f6" },
      'booking_confirmed': { icon: Calendar, color: "#10b981" },
      'booking_cancelled': { icon: Calendar, color: "#10b981" },
      'booking_request': { icon: Calendar, color: "#10b981" },
      'message': { icon: MessageCircle, color: "#8b5cf6" },
      'messages': { icon: MessageCircle, color: "#8b5cf6" },
      'system': { icon: Shield, color: "#f59e0b" },
      'contract_created': { icon: Shield, color: "#f59e0b" },
      'contract_status': { icon: Shield, color: "#f59e0b" },
      'contract_signed': { icon: Shield, color: "#f59e0b" },
      'contract_active': { icon: Shield, color: "#f59e0b" },
      'contract_updated': { icon: Shield, color: "#f59e0b" },
      'contract_resent': { icon: Shield, color: "#f59e0b" },
      'contract_activated': { icon: Shield, color: "#f59e0b" },
      'payment': { icon: DollarSign, color: "#ef4444" },
      'safety': { icon: AlertTriangle, color: "#dc2626" },
      'safety_alert': { icon: AlertTriangle, color: "#dc2626" }
    };

    const config = iconConfig[normalizedType] || { icon: AlertTriangle, color: "#6b7280" };
    const IconComponent = config.icon;
    return <IconComponent size={20} color={config.color} />;
  }, []);

  const getAlertColor = useCallback((type) => {
    const normalizedType = normalizeType(type);

    const colorConfig = {
      'job_application': '#dbeafe',
      'application': '#dbeafe',
      'booking_confirmed': '#d1fae5',
      'booking_cancelled': '#d1fae5',
      'booking_request': '#d1fae5',
      'message': '#ede9fe',
      'messages': '#ede9fe',
      'system': '#fef3c7',
      'contract_created': '#fef3c7',
      'contract_status': '#fef3c7',
      'contract_signed': '#fef3c7',
      'contract_active': '#fef3c7',
      'contract_updated': '#fef3c7',
      'contract_resent': '#fef3c7',
      'contract_activated': '#fef3c7',
      'payment': '#fee2e2',
      'safety': '#fecaca',
      'safety_alert': '#fecaca'
    };

    return colorConfig[normalizedType] || '#f3f4f6';
  }, []);

  const formatTime = useCallback((timestamp) => {
    if (!timestamp) return 'Unknown time';

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid date';

    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }, []);

  // Alert renderer
  const renderAlert = useCallback((alert) => {
    const renderRightActions = () => (
      <View style={styles.swipeActionsContainer}>
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={() => confirmDeleteAlert(alert)}
        >
          <Text style={styles.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );

    return (
      <Swipeable
        key={alert.id}
        renderRightActions={renderRightActions}
        overshootRight={false}
      >
        <TouchableOpacity
          style={[
            styles.alertCard,
            { backgroundColor: getAlertColor(alert.type) },
            !alert.read && styles.unreadAlert
          ]}
          onPress={() => handleAlertPress(alert)}
        >
          <View style={styles.alertHeader}>
            <View style={styles.alertIcon}>
              {getAlertIcon(alert.type)}
            </View>
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, !alert.read && styles.unreadText]}>
                {alert.title || 'Notification'}
              </Text>
              {alert.message ? (
                <Text style={styles.alertMessage}>
                  {alert.message}
                </Text>
              ) : null}
              <Text style={styles.alertTime}>
                {formatTime(alert.created_at)}
              </Text>
            </View>
            {!alert.read && <View style={styles.unreadDot} />}
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  }, [getAlertColor, getAlertIcon, handleAlertPress, formatTime, confirmDeleteAlert]);

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading alerts...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <AlertTriangle size={64} color="#ef4444" />
        <Text style={styles.errorTitle}>Unable to load alerts</Text>
        <Text style={styles.errorSubtitle}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadAlerts}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state
  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <AlertTriangle size={64} color="#9ca3af" />
      <Text style={styles.emptyTitle}>No alerts</Text>
      <Text style={styles.emptySubtitle}>
        You'll see important notifications and alerts here
      </Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#3b82f6']}
          tintColor="#3b82f6"
        />
      }
    >
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={['#ca85b1ff', '#a094f2ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Alerts</Text>
            <Text style={styles.headerSubtitle}>
              Important notifications and updates
            </Text>
          </View>
        </LinearGradient>
      </View>

      {alerts.length === 0 ? (
        <EmptyState />
      ) : (
        <View style={styles.alertsList}>
          {alerts.map(renderAlert)}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  headerContainer: {
    backgroundColor: 'transparent',
  },
  headerGradient: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  header: {
    padding: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  alertsList: {
    padding: 16,
    gap: 12,
  },
  alertCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  swipeActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  deleteAction: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  deleteActionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  unreadAlert: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: '700',
  },
  alertMessage: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  alertTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default AlertsTab;
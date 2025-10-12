import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  StyleSheet 
} from 'react-native';
import { 
  Briefcase, 
  Calendar, 
  MessageCircle, 
  AlertTriangle, 
  Shield, 
  DollarSign,
  User,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { notificationService } from '../../../services/supabase';
import { useAuth } from '../../../contexts/AuthContext';

const AlertsTab = ({ navigation, onNavigateTab }) => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const notifications = await notificationService.getNotifications(user.id);
      
      // Filter and categorize alerts for parents
      const parentAlerts = notifications.filter(notif => 
        ['job_application', 'booking_confirmed', 'booking_cancelled', 'message', 'system', 'payment', 'safety'].includes(notif.type)
      );
      
      setAlerts(parentAlerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  };

  const markAsRead = async (alertId) => {
    try {
      await notificationService.markNotificationAsRead(alertId);
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, read: true } : alert
      ));
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const handleAlertPress = async (alert) => {
    if (!alert.read) {
      await markAsRead(alert.id);
    }

    // Navigate based on alert type - use existing navigation structure
    switch (alert.type) {
      case 'job_application':
        // Navigate back to parent dashboard jobs tab
        if (navigation?.canGoBack?.()) {
          navigation.goBack();
        } else {
          onNavigateTab?.('jobs');
        }
        break;
      case 'booking_confirmed':
      case 'booking_cancelled':
        // Navigate back to parent dashboard bookings tab
        if (navigation?.canGoBack?.()) {
          navigation.goBack();
        } else {
          onNavigateTab?.('bookings');
        }
        break;
      case 'message':
        // Navigate back to parent dashboard messages tab
        if (navigation?.canGoBack?.()) {
          navigation.goBack();
        } else {
          onNavigateTab?.('messages');
        }
        break;
      default:
        break;
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'job_application':
        return <Briefcase size={20} color="#3b82f6" />;
      case 'booking_confirmed':
      case 'booking_cancelled':
        return <Calendar size={20} color="#10b981" />;
      case 'message':
        return <MessageCircle size={20} color="#8b5cf6" />;
      case 'system':
        return <AlertTriangle size={20} color="#f59e0b" />;
      case 'payment':
        return <DollarSign size={20} color="#ef4444" />;
      case 'safety':
        return <Shield size={20} color="#dc2626" />;
      default:
        return <AlertTriangle size={20} color="#6b7280" />;
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'job_application':
        return '#dbeafe';
      case 'booking_confirmed':
      case 'booking_cancelled':
        return '#d1fae5';
      case 'message':
        return '#ede9fe';
      case 'system':
        return '#fef3c7';
      case 'payment':
        return '#fee2e2';
      case 'safety':
        return '#fecaca';
      default:
        return '#f3f4f6';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderAlert = (alert) => (
    <TouchableOpacity
      key={alert.id}
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
            {alert.title}
          </Text>
          <Text style={styles.alertMessage}>
            {alert.message}
          </Text>
          <Text style={styles.alertTime}>
            {formatTime(alert.created_at)}
          </Text>
        </View>
        {!alert.read && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <AlertTriangle size={64} color="#9ca3af" />
      <Text style={styles.emptyTitle}>No alerts</Text>
      <Text style={styles.emptySubtitle}>
        You'll see important notifications and alerts here
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading alerts...</Text>
      </View>
    );
  }

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
          colors={["#ebc5dd", "#ccc8e8"]}
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
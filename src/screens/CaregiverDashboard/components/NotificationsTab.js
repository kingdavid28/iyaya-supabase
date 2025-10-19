import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  StyleSheet 
} from 'react-native';
import { 
  Briefcase, 
  Calendar, 
  MessageCircle, 
  Star, 
  DollarSign,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react-native';
import { notificationService } from '../../../services/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import {
  SkeletonCard,
  SkeletonBlock,
  SkeletonCircle,
  SkeletonPill
} from '../../../components/common/SkeletonPlaceholder';

const NotificationsTab = ({ navigation, onNavigateTab }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    console.log('🔔 NotificationsTab useEffect - user:', user?.id);
    if (!user?.id) {
      console.log('❌ NotificationsTab - No user ID');
      setLoading(false);
      return;
    }

    loadNotifications();
  }, [user?.id]);

  const loadNotifications = async () => {
    if (!user?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔔 Loading notifications for user:', user.id);
      const notificationsData = await notificationService.getNotifications(user.id);
      console.log('🔔 Received notifications:', notificationsData);
      
      setNotifications(Array.isArray(notificationsData) ? notificationsData : []);
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markNotificationAsRead(notificationId);
      setNotifications(prev => prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const resolveTargetTab = (type) => {
    switch (type) {
      case 'job_opportunity':
        return 'jobs';
      case 'application_update':
        return 'applications';
      case 'booking_request':
      case 'booking_confirmed':
      case 'booking_cancelled':
      case 'booking_update':
      case 'payment':
        return 'bookings';
      case 'message':
        return 'messages';
      case 'review':
        return 'reviews';
      default:
        return null;
    }
  };

  const handleNotificationPress = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    const targetTab = resolveTargetTab(notification.type);
    if (targetTab && onNavigateTab) {
      onNavigateTab(targetTab, notification);
      return;
    }

    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'job_opportunity':
        return <Briefcase size={20} color="#3b82f6" />;
      case 'booking_request':
        return <Calendar size={20} color="#10b981" />;
      case 'application_update':
        return <CheckCircle size={20} color="#f59e0b" />;
      case 'message':
        return <MessageCircle size={20} color="#8b5cf6" />;
      case 'review':
        return <Star size={20} color="#fcd34d" />;
      case 'payment':
        return <DollarSign size={20} color="#ef4444" />;
      default:
        return <Clock size={20} color="#6b7280" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'job_opportunity':
        return '#dbeafe';
      case 'booking_request':
        return '#d1fae5';
      case 'application_update':
        return '#fef3c7';
      case 'message':
        return '#ede9fe';
      case 'review':
        return '#fef3c7';
      case 'payment':
        return '#fee2e2';
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

  const renderNotification = (notification) => (
    <TouchableOpacity
      key={notification.id}
      style={[
        styles.notificationCard,
        { backgroundColor: getNotificationColor(notification.type) },
        !notification.read && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(notification)}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.notificationIcon}>
          {getNotificationIcon(notification.type)}
        </View>
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, !notification.read && styles.unreadText]}>
            {notification.title}
          </Text>
          <Text style={styles.notificationMessage}>
            {notification.message}
          </Text>
          <Text style={styles.notificationTime}>
            {formatTime(notification.created_at)}
          </Text>
        </View>
        {!notification.read && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <MessageCircle size={64} color="#9ca3af" />
      <Text style={styles.emptyTitle}>No notifications</Text>
      <Text style={styles.emptySubtitle}>
        You'll see job opportunities, booking requests, and updates here
      </Text>
    </View>
  );

  if (loading) {
    return (
      <ScrollView contentContainerStyle={styles.skeletonContainer}>
        <SkeletonCard style={styles.headerSkeleton}>
          <View style={styles.headerSkeletonContent}>
            <SkeletonBlock width="45%" height={24} />
            <SkeletonBlock width="70%" height={16} />
          </View>
        </SkeletonCard>

        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonCard key={`notification-skeleton-${index}`} style={styles.notificationSkeletonCard}>
            <View style={styles.notificationSkeletonRow}>
              <SkeletonCircle size={40} style={styles.notificationSkeletonIcon} />
              <View style={styles.notificationSkeletonBody}>
                <SkeletonBlock width="65%" height={16} />
                <SkeletonBlock width="90%" height={14} style={styles.notificationSkeletonLine} />
                <SkeletonPill width="35%" height={12} />
              </View>
            </View>
          </SkeletonCard>
        ))}
      </ScrollView>
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSubtitle}>
          Job opportunities and updates
        </Text>
      </View>

      {notifications.length === 0 ? (
        <EmptyState />
      ) : (
        <View style={styles.notificationsList}>
          {notifications.map(renderNotification)}
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
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  skeletonContainer: {
    padding: 16,
    gap: 16,
  },
  headerSkeleton: {
    padding: 16,
  },
  headerSkeletonContent: {
    gap: 12,
  },
  notificationSkeletonCard: {
    padding: 16,
  },
  notificationSkeletonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notificationSkeletonIcon: {
    marginTop: 4,
  },
  notificationSkeletonBody: {
    flex: 1,
    gap: 8,
  },
  notificationSkeletonLine: {
    marginTop: 4,
  },
  notificationsList: {
    padding: 16,
    gap: 12,
  },
  notificationCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: '700',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
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

export default NotificationsTab;
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

// Lazy load supabaseService to avoid import-time issues
let supabaseService = null;

const NotificationsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [serviceLoaded, setServiceLoaded] = useState(false);
  const [paymentProofModalVisible, setPaymentProofModalVisible] = useState(false);
  const [selectedPaymentProof, setSelectedPaymentProof] = useState(null);

  // Load supabaseService on component mount
  useEffect(() => {
    const loadService = async () => {
      try {
        if (!supabaseService) {
          const module = await import('../services/supabase');
          supabaseService = module.supabaseService || module.default;
        }
        setServiceLoaded(true);
      } catch (error) {
        console.warn('Failed to load supabaseService:', error);
        setServiceLoaded(false);
      }
    };

    loadService();
  }, []);

  useEffect(() => {
    if (serviceLoaded && supabaseService && user?.id) {
      loadNotifications();

      // Setup real-time subscription
      const subscription = supabaseService.notifications.subscribeToNotifications(user.id, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newNotification = payload.new;
          setNotifications(prev => [newNotification, ...prev]);
        }
      });

      return () => {
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    }
  }, [serviceLoaded, user?.id]);

  const loadNotifications = async () => {
    if (!supabaseService || !user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const notificationsData = await supabaseService.notifications.getNotifications(user.id);
      const filteredNotifications = Array.isArray(notificationsData)
        ? notificationsData.filter(notification => notification?.user_id === user.id)
        : [];

      setNotifications(filteredNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
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
    if (!supabaseService) {
      console.warn('supabaseService not available for markAsRead');
      return;
    }

    try {
      await supabaseService.notifications.markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!supabaseService || !user?.id) {
      console.warn('supabaseService or user not available for markAllAsRead');
      return;
    }

    try {
      await supabaseService.notifications.markAllNotificationsAsRead(user.id);
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const removeNotification = async (notificationId) => {
    if (!supabaseService) {
      console.warn('supabaseService not available for removeNotification');
      return;
    }

    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabaseService.notifications.deleteNotification(notificationId);
              setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
            } catch (error) {
              console.error('Error deleting notification:', error);
              Alert.alert('Error', 'Failed to delete notification');
            }
          }
        }
      ]
    );
  };

  const handleNotificationPress = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    let { type, data } = notification;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (error) {
        data = {};
      }
    }

    if (type === 'payment_proof') {
      setSelectedPaymentProof({ ...notification, data });
      setPaymentProofModalVisible(true);
      return;
    }

    switch (type) {
      case 'message':
        if (data?.conversationId) {
          navigation.navigate('Chat', {
            userId: user?.id,
            userType: user?.role,
            targetUserId: data.senderId,
            conversationId: data.conversationId
          });
        }
        break;
      case 'job_application':
        if (data?.jobId) {
          navigation.navigate('JobDetails', { jobId: data.jobId });
        }
        break;
      case 'booking_request':
      case 'booking_confirmed':
        if (data?.bookingId) {
          navigation.navigate('BookingDetails', { bookingId: data.bookingId });
        }
        break;
      default:
        // Just mark as read for other types
        break;
    }
  };

  const handleLongPress = (notification) => {
    Alert.alert(
      'Notification Options',
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeNotification(notification.id)
        }
      ]
    );
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return 'chatbubble';
      case 'job_application':
        return 'briefcase';
      case 'booking_request':
      case 'booking_confirmed':
        return 'calendar';
      case 'review':
        return 'star';
      case 'payment':
        return 'card';
      case 'payment_proof':
        return 'document-text';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'message':
        return '#3B82F6';
      case 'job_application':
        return '#10B981';
      case 'booking_request':
      case 'booking_confirmed':
        return '#F59E0B';
      case 'review':
        return '#FCD34D';
      case 'payment':
        return '#8B5CF6';
      case 'payment_proof':
        return '#0EA5E9';
      default:
        return '#6B7280';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
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

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.read && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
      onLongPress={() => handleLongPress(item)}
      delayLongPress={500}
    >
      <View style={[
        styles.iconContainer,
        { backgroundColor: getNotificationColor(item.type) + '20' }
      ]}>
        <Ionicons
          name={getNotificationIcon(item.type)}
          size={20}
          color={getNotificationColor(item.type)}
        />
      </View>

      <View style={styles.notificationContent}>
        <Text style={[
          styles.notificationTitle,
          !item.read && styles.unreadText
        ]}>
          {item.title || 'Notification'}
        </Text>
        <Text style={styles.notificationMessage}>
          {item.message || 'You have a new notification'}
        </Text>
        {item.type === 'payment_proof' && item?.data && (
          <View style={styles.paymentProofMeta}>
            {item.data?.paymentType && (
              <Text style={styles.paymentProofMetaText}>
                Type: {item.data.paymentType === 'final_payment' ? 'Final payment' : 'Deposit payment'}
              </Text>
            )}
            {typeof item.data?.totalAmount === 'number' && (
              <Text style={styles.paymentProofMetaText}>
                Amount: ₱{Number(item.data.totalAmount).toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Text>
            )}
            {item.data?.parentName && (
              <Text style={styles.paymentProofMetaText}>
                Parent: {item.data.parentName}
              </Text>
            )}
          </View>
        )}
        <Text style={styles.notificationTime}>
          {formatTime(item.created_at)}
        </Text>
      </View>

      <View style={styles.actionsContainer}>
        {!item.read && <View style={styles.unreadDot} />}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={(e) => {
            e.stopPropagation();
            removeNotification(item.id);
          }}
        >
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-outline" size={64} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No notifications</Text>
      <Text style={styles.emptySubtitle}>
        You'll see notifications about messages, bookings, and more here
      </Text>
    </View>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          }}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllRead}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id || Math.random().toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        ListEmptyComponent={EmptyState}
        contentContainerStyle={notifications.length === 0 ? styles.emptyList : undefined}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={paymentProofModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentProofModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Proof</Text>
              <TouchableOpacity
                onPress={() => setPaymentProofModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            {selectedPaymentProof?.data?.parentName && (
              <Text style={styles.modalSubtitle}>
                Parent: {selectedPaymentProof.data.parentName}
              </Text>
            )}
            {typeof selectedPaymentProof?.data?.totalAmount === 'number' && (
              <Text style={styles.modalSubtitle}>
                Amount: ₱{Number(selectedPaymentProof.data.totalAmount).toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </Text>
            )}
            {selectedPaymentProof?.data?.paymentType && (
              <Text style={styles.modalSubtitle}>
                Type: {selectedPaymentProof.data.paymentType === 'final_payment' ? 'Final payment' : 'Deposit payment'}
              </Text>
            )}
            <View style={styles.modalImageWrapper}>
              {selectedPaymentProof?.data?.paymentProofUrl ? (
                <Image
                  source={{ uri: selectedPaymentProof.data.paymentProofUrl }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.modalImageFallback}>
                  <Text style={styles.modalSubtitle}>No payment proof image available.</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  markAllRead: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadNotification: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: '600',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 4,
  },
  paymentProofMeta: {
    marginTop: 6,
    gap: 4,
  },
  paymentProofMetaText: {
    fontSize: 13,
    color: '#1F2937',
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  deleteButton: {
    marginLeft: 12,
    padding: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyList: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
});

export default NotificationsScreen;
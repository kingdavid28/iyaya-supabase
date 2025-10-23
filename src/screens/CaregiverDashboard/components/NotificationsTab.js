import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  StyleSheet,
  Modal,
  Image,
  Linking,
  Alert
} from 'react-native';
import { 
  Briefcase, 
  Calendar, 
  MessageCircle, 
  Star, 
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  FileCheck2
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
  const [selectedPaymentProof, setSelectedPaymentProof] = useState(null);
  const [paymentProofModalVisible, setPaymentProofModalVisible] = useState(false);
  const paymentProofData = selectedPaymentProof?.data ?? {};

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

      const filteredNotifications = Array.isArray(notificationsData)
        ? notificationsData.filter(notification => notification?.user_id === user.id)
        : [];

      setNotifications(filteredNotifications);
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
      case 'payment_proof':
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

    let notificationData = notification.data || {};
    if (typeof notificationData === 'string') {
      try {
        notificationData = JSON.parse(notificationData);
      } catch (parseError) {
        notificationData = {};
      }
    }

    const deepLink = notificationData?.bookingDeepLink;

    if (notification.type === 'payment_proof') {
      setSelectedPaymentProof({ ...notification, data: notificationData });
      setPaymentProofModalVisible(true);
      return;
    }

    const targetTab = deepLink?.tab || resolveTargetTab(notification.type);

    if (targetTab && onNavigateTab) {
      onNavigateTab(targetTab, { ...notification, data: notificationData, deepLink });
      return;
    }

    if (deepLink?.screen && navigation?.navigate) {
      navigation.navigate(deepLink.screen, deepLink.params || {});
      return;
    }

    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    }
  };

  const handleOpenPaymentProof = async () => {
    const proofUrl = typeof paymentProofData?.paymentProofUrl === 'string'
      ? paymentProofData.paymentProofUrl.trim()
      : '';

    if (!proofUrl || proofUrl.startsWith('<') || proofUrl.includes(' ')) {
      Alert.alert(
        'Payment proof unavailable',
        'This payment proof does not include a valid link yet. Please ask the parent to re-upload the receipt.'
      );
      return;
    }

    const normalizedUrl = /^https?:\/\//i.test(proofUrl) ? proofUrl : `https://${proofUrl}`;

    try {
      const canOpen = await Linking.canOpenURL(normalizedUrl);

      if (!canOpen) {
        Alert.alert(
          'Cannot open payment proof',
          'We could not access the payment proof link. Try downloading it from the bookings tab instead.'
        );
        return;
      }

      await Linking.openURL(normalizedUrl);
    } catch (error) {
      console.error('Error opening payment proof URL:', error);
      Alert.alert(
        'Error opening payment proof',
        'Something went wrong while opening the receipt. Please try again later.'
      );
    }
  };

  const handleViewBookingDetails = () => {
    const deepLink = paymentProofData?.bookingDeepLink;

    if (!deepLink) {
      return;
    }

    setPaymentProofModalVisible(false);

    if (deepLink.tab && onNavigateTab) {
      onNavigateTab(deepLink.tab, { ...selectedPaymentProof, data: paymentProofData, deepLink });
      return;
    }

    if (deepLink.screen && navigation?.navigate) {
      navigation.navigate(deepLink.screen, deepLink.params || {});
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
      case 'payment_proof':
        return <FileCheck2 size={20} color="#0ea5e9" />;
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
      case 'payment_proof':
        return '#cffafe';
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

  const renderNotification = (notification) => {
    let notificationData = notification.data || {};
    if (typeof notificationData === 'string') {
      try {
        notificationData = JSON.parse(notificationData);
      } catch (parseError) {
        notificationData = {};
      }
    }

    const isPaymentProof = notification.type === 'payment_proof';
    const paymentMetaLines = [];

    if (isPaymentProof) {
      if (notificationData.paymentType) {
        const paymentLabel = notificationData.paymentType === 'final_payment' ? 'Final payment' : 'Deposit payment';
        paymentMetaLines.push(`${paymentLabel}`);
      }
      if (typeof notificationData.totalAmount === 'number') {
        paymentMetaLines.push(`Amount: ₱${Number(notificationData.totalAmount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      }
      if (notificationData.parentName) {
        paymentMetaLines.push(`Parent: ${notificationData.parentName}`);
      }
    }

    return (
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
            {isPaymentProof && paymentMetaLines.length > 0 && (
              <View style={styles.paymentMetaContainer}>
                {paymentMetaLines.map((line, index) => (
                  <Text key={`${notification.id}-meta-${index}`} style={styles.paymentMetaText}>
                    {line}
                  </Text>
                ))}
              </View>
            )}
            <Text style={styles.notificationTime}>
              {formatTime(notification.created_at)}
            </Text>
          </View>
          {!notification.read && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <MessageCircle size={64} color="#9ca3af" />
      <Text style={styles.emptyTitle}>No notifications</Text>
      <Text style={styles.emptySubtitle}>
        You'll see job opportunities, booking requests, and updates here
      </Text>
      <View style={styles.emptyHintContainer}>
        <Text style={styles.emptyHintTitle}>Pro tip</Text>
        <Text style={styles.emptyHintText}>
          Uploading a booking payment proof sends a confirmation notification with the receipt details.
        </Text>
      </View>
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

      <Modal
        visible={paymentProofModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPaymentProofModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalHeaderIcon}>
                  <FileCheck2 size={28} color="#0ea5e9" />
                </View>
                <View style={styles.modalHeaderText}>
                  <Text style={styles.modalTitle}>Payment Proof</Text>
                  {selectedPaymentProof?.created_at && (
                    <Text style={styles.modalTimestamp}>Submitted {formatTime(selectedPaymentProof.created_at)}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity onPress={() => setPaymentProofModalVisible(false)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalMetaGrid}>
              {paymentProofData?.paymentType && (
                <View style={styles.modalMetaCard}>
                  <Text style={styles.modalMetaLabel}>Payment Type</Text>
                  <Text style={styles.modalMetaValue}>
                    {paymentProofData.paymentType === 'final_payment' ? 'Final payment' : 'Deposit payment'}
                  </Text>
                </View>
              )}

              {typeof paymentProofData?.totalAmount === 'number' && (
                <View style={styles.modalMetaCard}>
                  <Text style={styles.modalMetaLabel}>Amount</Text>
                  <Text style={styles.modalMetaValue}>
                    ₱{Number(paymentProofData.totalAmount).toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </Text>
                </View>
              )}

              {paymentProofData?.parentName && (
                <View style={styles.modalMetaCard}>
                  <Text style={styles.modalMetaLabel}>Parent</Text>
                  <Text style={styles.modalMetaValue}>{paymentProofData.parentName}</Text>
                </View>
              )}

              {paymentProofData?.bookingId && (
                <View style={styles.modalMetaCard}>
                  <Text style={styles.modalMetaLabel}>Booking ID</Text>
                  <Text style={styles.modalMetaValue}>{paymentProofData.bookingId}</Text>
                </View>
              )}

              {paymentProofData?.paymentProofId && (
                <View style={styles.modalMetaCard}>
                  <Text style={styles.modalMetaLabel}>Proof ID</Text>
                  <Text style={styles.modalMetaValue}>{paymentProofData.paymentProofId}</Text>
                </View>
              )}
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Receipt preview</Text>
              <View style={styles.modalImageWrapper}>
                {paymentProofData?.paymentProofUrl ? (
                  <Image
                    source={{ uri: paymentProofData.paymentProofUrl }}
                    style={styles.modalImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.modalImageFallback}>
                    <FileCheck2 size={32} color="#9ca3af" />
                    <Text style={styles.modalImageFallbackText}>No payment proof image available.</Text>
                  </View>
                )}
              </View>
            </View>

            {(paymentProofData?.paymentProofUrl || paymentProofData?.bookingDeepLink) && (
              <View style={styles.modalActions}>
                {paymentProofData?.paymentProofUrl && (
                  <TouchableOpacity style={styles.modalSecondaryButton} onPress={handleOpenPaymentProof}>
                    <Text style={styles.modalSecondaryButtonText}>Open proof</Text>
                  </TouchableOpacity>
                )}

                {paymentProofData?.bookingDeepLink && (
                  <TouchableOpacity style={styles.modalPrimaryButton} onPress={handleViewBookingDetails}>
                    <Text style={styles.modalPrimaryButtonText}>View booking details</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    gap: 20,
    shadowColor: '#0f172a',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderText: {
    gap: 4,
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
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalTimestamp: {
    fontSize: 12,
    color: '#6b7280',
  },
  modalCloseButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
  },
  modalCloseText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  unreadText: {
    fontWeight: '700',
  },
  modalMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modalMetaCard: {
    flexGrow: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  modalMetaLabel: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '600',
  },
  modalMetaValue: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '600',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 4,
  },
  modalSection: {
    gap: 12,
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalImageWrapper: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
    minHeight: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: 300,
  },
  modalImageFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 24,
  },
  modalImageFallbackText: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  modalSecondaryButton: {
    flexGrow: 1,
    minWidth: 150,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0ea5e9',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0ea5e9',
  },
  modalPrimaryButton: {
    flexGrow: 1,
    minWidth: 170,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  modalPrimaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  paymentMetaContainer: {
    marginTop: 4,
    marginBottom: 8,
    gap: 2,
  },
  paymentMetaText: {
    fontSize: 13,
    color: '#1f2937',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    marginLeft: 8,
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
    marginBottom: 16,
  },
  emptyHintContainer: {
    marginTop: 8,
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    gap: 4,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  emptyHintTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4338ca',
  },
  emptyHintText: {
    fontSize: 14,
    color: '#4338ca',
  },
});

export default NotificationsTab;
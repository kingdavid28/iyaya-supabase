import {
    Briefcase,
    Calendar,
    CheckCircle,
    Clock,
    DollarSign,
    FileCheck2,
    MessageCircle,
    Star
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import {
    SkeletonBlock,
    SkeletonCard,
    SkeletonCircle,
    SkeletonPill
} from '../../../components/common/SkeletonPlaceholder';
import { useAuth } from '../../../contexts/AuthContext';
import { notificationService } from '../../../services/supabase';

const NOTIFICATIONS_PAGE_SIZE = 25;
const PAYMENT_PROOF_URL_FIELDS = [
  'paymentProofUrl',
  'payment_proof_url',
  'receiptUrl',
  'receipt_url',
  'proofUrl',
  'proof_url',
  'imageUrl',
  'image_url',
  'public_url',
  'url',
  'image'
];
const PAYMENT_PROOF_STORAGE_FIELDS = ['paymentProofStoragePath', 'storage_path', 'path'];
const BASE64_IMAGE_REGEX = /^[A-Za-z0-9+/=\r\n]+$/;

const NotificationsTab = ({ navigation, onNavigateTab }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPaymentProof, setSelectedPaymentProof] = useState(null);
  const [paymentProofModalVisible, setPaymentProofModalVisible] = useState(false);
  const [resolvedProofUrl, setResolvedProofUrl] = useState(null);
  const [resolvingProofUrl, setResolvingProofUrl] = useState(false);

  const cachedNotificationsRef = useRef({ userId: null, data: [] });
  const paymentProofData = selectedPaymentProof?.data ?? {};
  const lastInvalidProofWarningRef = useRef(null);
  const resolvingProofRef = useRef({ key: null, url: null });

  // Memoized function to resolve target tab
  const resolveTargetTab = useCallback((type) => {
    const tabMap = {
      'job_opportunity': 'jobs',
      'application_update': 'applications',
      'booking_request': 'bookings',
      'booking_confirmed': 'bookings',
      'booking_cancelled': 'bookings',
      'booking_update': 'bookings',
      'payment_proof': 'bookings',
      'payment': 'bookings',
      'message': 'messages',
      'review': 'reviews'
    };
    
    return tabMap[type] || null;
  }, []);

  // Memoized function to load notifications
  const loadNotifications = useCallback(async () => {
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
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load notifications on mount
  useEffect(() => {
    console.log('🔔 NotificationsTab useEffect - user:', user?.id);
    loadNotifications();
  }, [loadNotifications, user?.id]);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await notificationService.markNotificationAsRead(notificationId);
      setNotifications(prev => prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Parse notification data safely
  const parseNotificationData = useCallback((data) => {
    if (!data) return {};
    
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (parseError) {
        console.warn('🔔 Failed to parse notification data:', parseError);
        return {};
      }
    }
    
    return data;
  }, []);

  // Handle notification press
  const handleNotificationPress = useCallback(async (notification) => {
    console.log('\n\n===== NOTIFICATION CLICKED =====');
    console.log('🔍 Full notification object:', JSON.stringify(notification, null, 2));
    console.log('🔍 Notification.type:', notification.type);

    if (!notification.read) {
      await markAsRead(notification.id);
    }

    const notificationData = parseNotificationData(notification.data);
    
    console.log('🔍 Parsed notification data:', JSON.stringify(notificationData, null, 2));
    console.log('🔍 notificationData.notificationType:', notificationData?.notificationType);
    console.log('🔍 Available data keys:', Object.keys(notificationData || {}));

    // Close payment proof modal if it's open
    if (paymentProofModalVisible) {
      setPaymentProofModalVisible(false);
    }

    // Handle contract notification
    const isContractNotification =
      notificationData?.contractId &&
      ['contract_created', 'contract_status', 'contract_signed', 'contract_active', 'contract_resent'].includes(
        notificationData?.notificationType
      );

    if (isContractNotification && onNavigateTab) {
      const bookingId = notificationData.bookingId;
      const hasApplicationContext = Boolean(
        notificationData.applicationId ||
        notificationData.application_id ||
        notificationData.jobId ||
        notificationData.job_id
      );
      const notificationType = notificationData.notificationType;
      let targetTab = 'applications';

      if (bookingId && ['contract_signed', 'contract_active'].includes(notificationType)) {
        targetTab = 'bookings';
      } else if (bookingId && !hasApplicationContext) {
        targetTab = 'bookings';
      }

      console.log('📄 Contract notification detected; routing to', targetTab);
      onNavigateTab(targetTab, {
        ...notification,
        data: notificationData,
        contractId: notificationData.contractId,
        bookingId,
        jobId: notificationData.jobId || notificationData.job_id,
        applicationId: notificationData.applicationId || notificationData.application_id
      });
      return;
    }

    // ROBUST Payment proof detection - handle BOTH formats:
    // 1. Old format: type = 'payment_proof' directly
    // 2. New format: type = 'payment' with data.notificationType = 'payment_proof'
    const isOldFormat = notification.type === 'payment_proof';
    const isNewFormat = notification.type === 'payment' && notificationData?.notificationType === 'payment_proof';
    const hasProofUrl = !!(notificationData?.paymentProofUrl || 
                            notificationData?.payment_proof_url || 
                            notificationData?.receiptUrl ||
                            notificationData?.proofUrl ||
                            notificationData?.url);
    
    const isPaymentProof = isOldFormat || isNewFormat;
    
    console.log('🤔 Payment proof detection breakdown:');
    console.log('   - Old format (type=payment_proof)?', isOldFormat);
    console.log('   - New format (type=payment + notificationType)?', isNewFormat);
    console.log('   - Has proof URL?', hasProofUrl);
    console.log('   - Final result (isPaymentProof)?', isPaymentProof);
    
    if (isPaymentProof) {
      console.log('✅ OPENING PAYMENT PROOF MODAL');
      console.log('   - Payment Type:', notificationData.paymentType);
      console.log('   - Amount:', notificationData.totalAmount);
      console.log('   - Proof URL:', notificationData.paymentProofUrl);
      
      setSelectedPaymentProof({ ...notification, data: notificationData });
      setPaymentProofModalVisible(true);
      setResolvedProofUrl(null);
      setResolvingProofUrl(true);

      resolvePaymentProofUrl(notificationData)
        .then((url) => setResolvedProofUrl(url))
        .finally(() => setResolvingProofUrl(false));
      
      console.log('🛑 Stopping further navigation for payment proof');
      return;
    }

    console.log('➡️ Continuing with normal navigation flow...');

    const deepLink = notificationData?.bookingDeepLink;

    const targetTab = deepLink?.tab || resolveTargetTab(notification.type);

    if (targetTab && onNavigateTab) {
      console.log('📍 Navigating to tab:', targetTab);
      onNavigateTab(targetTab, { ...notification, data: notificationData, deepLink });
      return;
    }

    if (deepLink?.screen && navigation?.navigate) {
      console.log('📍 Navigating to screen:', deepLink.screen);
      navigation.navigate(deepLink.screen, deepLink.params || {});
      return;
    }

    console.log('❌ No navigation targets found');
  }, [markAsRead, parseNotificationData, resolveTargetTab, onNavigateTab, navigation, paymentProofModalVisible]);

  // Payment Proof Image Component
  const PaymentProofImage = ({ proofUrl, style }) => {
    const [imageLoading, setImageLoading] = useState(false);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
      if (proofUrl) {
        setImageLoading(true);
        setImageError(false);
      } else {
        setImageLoading(false);
        setImageError(false);
      }
    }, [proofUrl]);

    const renderFallback = (message) => (
      <View style={styles.modalImageFallback}>
        <FileCheck2 size={32} color="#9ca3af" />
        <Text style={styles.modalImageFallbackText}>{message}</Text>
      </View>
    );

    if (!proofUrl) {
      return renderFallback('No payment proof image available.');
    }

    return (
      <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
        {imageLoading && !imageError && (
          <View style={styles.modalImageLoading}>
            <ActivityIndicator size="large" color="#0ea5e9" />
            <Text style={styles.modalImageLoadingText}>Loading payment proof...</Text>
          </View>
        )}

        {imageError
          ? renderFallback('Failed to load payment proof image.')
          : (
            <Image
              source={{ uri: proofUrl }}
              style={style || styles.modalImage}
              resizeMode="contain"
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
              onLoadStart={() => {
                setImageLoading(true);
                setImageError(false);
              }}
              onLoad={() => setImageLoading(false)}
            />
          )}
      </View>
    );
  };

  // Handle viewing booking details
  const handleViewBookingDetails = useCallback(() => {
    const deepLink = paymentProofData?.bookingDeepLink;

    if (!deepLink) {
      Alert.alert('Error', 'No booking details available');
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
  }, [paymentProofData, selectedPaymentProof, onNavigateTab, navigation]);

  const normalizeProofValue = useCallback((value) => {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    if (trimmed.startsWith('data:image/')) {
      return trimmed;
    }

    if (BASE64_IMAGE_REGEX.test(trimmed.replace(/\s+/g, ''))) {
      return `data:image/jpeg;base64,${trimmed.replace(/\s+/g, '')}`;
    }

    return trimmed;
  }, []);

  const resolveStoragePathToUrl = useCallback(async (path) => {
    if (!path || typeof path !== 'string') return null;

    const normalizedPath = path.replace(/^\/+/, '');
    try {
      const { storageService } = await import('../../../services/supabase/storageService');
      const signedUrl = await storageService.getPaymentProofUrl(normalizedPath);
      if (signedUrl) return signedUrl;
    } catch (error) {
      console.error('❌ Failed to resolve storage path for proof:', error);
    }
    return null;
  }, []);

  const buildResolveKey = (data) => {
    if (!data) return 'no-data';
    const id = data.id || data.paymentProofId || 'no-id';
    const path = data.paymentProofStoragePath || data.storage_path || data.path || 'no-path';
    const urlKeys = PAYMENT_PROOF_URL_FIELDS.map((field) => data?.[field] || '').join('|');
    return `${id}:${path}:${urlKeys}`;
  };

  const resolvePaymentProofUrl = useCallback(async (data) => {
    if (!data) return null;

    const cachedKey = buildResolveKey(data);
    if (resolvingProofRef.current.key === cachedKey && resolvingProofRef.current.url) {
      return resolvingProofRef.current.url;
    }

    const normalizeValue = (value) => normalizeProofValue(value);

    for (const field of PAYMENT_PROOF_URL_FIELDS) {
      const normalized = normalizeValue(data?.[field]);
      if (normalized) {
        resolvingProofRef.current = { key: cachedKey, url: normalized };
        return normalized;
      }
    }

    for (const field of PAYMENT_PROOF_URL_FIELDS) {
      const raw = data?.[field];
      if (typeof raw === 'string' && raw.trim()) {
        const normalized = normalizeValue(raw.trim());
        if (normalized) {
          resolvingProofRef.current = { key: cachedKey, url: normalized };
          return normalized;
        }
      }
    }

    for (const field of PAYMENT_PROOF_STORAGE_FIELDS) {
      const storagePath = data?.[field];
      if (storagePath) {
        const fromStorage = await resolveStoragePathToUrl(storagePath);
        if (fromStorage) {
          resolvingProofRef.current = { key: cachedKey, url: fromStorage };
          return fromStorage;
        }
      }
    }

    const warningSignature = JSON.stringify({
      id: data?.id ?? selectedPaymentProof?.id ?? null,
      bookingId: data?.bookingId ?? null,
      keys: data ? Object.keys(data).sort() : [],
    });

    if (lastInvalidProofWarningRef.current !== warningSignature) {
      console.warn('❌ No payment proof URL found in any field', {
        keys: data ? Object.keys(data) : [],
        dataPreview: data,
      });
      lastInvalidProofWarningRef.current = warningSignature;
    }

    resolvingProofRef.current = { key: cachedKey, url: null };
    return null;
  }, [normalizeProofValue, resolveStoragePathToUrl, selectedPaymentProof]);

  // Handle opening payment proof image
  const handleOpenPaymentProof = useCallback(async () => {
    const proofUrl = await resolvePaymentProofUrl(paymentProofData);

    if (!proofUrl) {
      Alert.alert('Error', 'No payment proof image available to open.');
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(proofUrl);
      if (canOpen) {
        await Linking.openURL(proofUrl);
      } else {
        Alert.alert('Cannot Open Image', 'Unable to open the payment proof image. The link may be invalid.');
      }
    } catch (error) {
      console.error('Error opening payment proof:', error);
      Alert.alert('Error', 'Failed to open payment proof image. Please try again.');
    }
  }, [paymentProofData, resolvePaymentProofUrl]);

  const isValidUrl = useCallback((url) => {
    const normalized = typeof url === 'string' ? url.trim() : '';
    const isValid = normalized.length > 0 && !normalized.startsWith('<') && !normalized.includes(' ');

    console.log('🔍 isValidUrl check:', {
      url: normalized,
      isValid,
      isHttpUrl: normalized.startsWith('http'),
      mightBeStoragePath: isValid && !normalized.startsWith('http')
    });

    return isValid;
  }, []);

  // Get notification icon
  const getNotificationIcon = useCallback((type) => {
    const iconMap = {
      'job_opportunity': <Briefcase size={20} color="#3b82f6" />,
      'booking_request': <Calendar size={20} color="#10b981" />,
      'application_update': <CheckCircle size={20} color="#f59e0b" />,
      'message': <MessageCircle size={20} color="#8b5cf6" />,
      'review': <Star size={20} color="#fcd34d" />,
      'payment_proof': <FileCheck2 size={20} color="#0ea5e9" />,
      'payment': <DollarSign size={20} color="#ef4444" />
    };
    
    return iconMap[type] || <Clock size={20} color="#6b7280" />;
  }, []);

  // Get notification background color
  const getNotificationColor = useCallback((type) => {
    const colorMap = {
      'job_opportunity': '#dbeafe',
      'booking_request': '#d1fae5',
      'application_update': '#fef3c7',
      'message': '#ede9fe',
      'review': '#fef3c7',
      'payment_proof': '#cffafe',
      'payment': '#fee2e2'
    };
    
    return colorMap[type] || '#f3f4f6';
  }, []);

  // Format timestamp
  const formatTime = useCallback((timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }, []);

  // Render individual notification
  const renderNotification = useCallback((notification) => {
    const notificationData = parseNotificationData(notification.data);
    const isPaymentProof = notification.type === 'payment' && notificationData?.notificationType === 'payment_proof';
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
  }, [parseNotificationData, getNotificationColor, getNotificationIcon, handleNotificationPress, formatTime]);

  // Empty state component
  const EmptyState = () => {
    return (
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
  };

  // Loading skeleton
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
    <>
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

      {/* Payment Proof Modal */}
      <Modal
        visible={paymentProofModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setPaymentProofModalVisible(false);
          setResolvedProofUrl(null);
        }}
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
              <TouchableOpacity 
                onPress={() => setPaymentProofModalVisible(false)} 
                style={styles.modalCloseButton}
              >
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
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Receipt preview</Text>
              <View style={styles.modalImageWrapper}>
                {resolvingProofUrl ? (
                  <View style={styles.modalImageLoading}>
                    <ActivityIndicator size="large" color="#0ea5e9" />
                    <Text style={styles.modalImageLoadingText}>
                      Resolving payment proof...
                    </Text>
                  </View>
                ) : (
                  <PaymentProofImage
                    proofUrl={resolvedProofUrl}
                    style={styles.modalImage}
                  />
                )}
              </View>
            </View>

            <View style={styles.modalActions}>
              {resolvedProofUrl && !resolvingProofUrl && (
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
          </View>
        </View>
      </Modal>
    </>
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
  modalImageLoading: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 32,
  },
  modalImageLoadingText: {
    fontSize: 14,
    color: '#0ea5e9',
    fontWeight: '500',
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
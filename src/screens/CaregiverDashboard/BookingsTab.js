import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import {
  SkeletonBlock,
  SkeletonCard,
  SkeletonPill
} from '../../components/common/SkeletonPlaceholder';
import { contractService } from '../../services/supabase/contractService';
import { EmptyState } from '../../shared/ui';
import { styles } from '../styles/CaregiverDashboard.styles';

const BookingCard = React.memo(({ booking, onMessageFamily, onConfirmBooking, onViewDetails, onOpenContract, contract }) => {
  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      return timeString;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#F59E0B';
      case 'confirmed': return '#10B981';
      case 'completed': return '#3B82F6';
      case 'cancelled': return '#EF4444';
      default: return '#9CA3AF';
    }
  };

  const startTime = formatTime(booking?.start_time || booking?.startTime);
  const endTime = formatTime(booking?.end_time || booking?.endTime);
  const timeDisplay = booking?.time || (startTime && endTime ? `${startTime} - ${endTime}` : 'Time TBD');
  const childrenCount = Array.isArray(booking?.childrenDetails)
    ? booking.childrenDetails.length
    : Array.isArray(booking?.selectedChildren)
      ? booking.selectedChildren.length
      : Array.isArray(booking?.selected_children)
        ? booking.selected_children.length
        : booking?.numberOfChildren || booking?.children || 1;

  const location = booking?.address || booking?.location;

  const specialInstructions = booking?.specialInstructions || booking?.special_instructions || booking?.notes;

  const totalAmount = booking?.totalAmount ?? booking?.total_amount ?? 0;
  const hourlyRate = booking?.hourlyRate ?? booking?.hourly_rate ?? 0;

  const contactPhone = booking?.contactPhone || booking?.contact_phone;
  const contactEmail = booking?.contactEmail || booking?.contact_email;

  const detailChips = [
    {
      key: 'date',
      icon: 'calendar-outline',
      text: booking?.date || 'Date TBD'
    },
    {
      key: 'time',
      icon: 'time-outline',
      text: timeDisplay
    },
    {
      key: 'children',
      icon: 'people-outline',
      text: `${childrenCount} ${childrenCount === 1 ? 'child' : 'children'}`
    }
  ];

  if (location) {
    detailChips.push({
      key: 'location',
      icon: 'location-outline',
      text: location
    });
  }

  const contactChips = [];
  if (contactPhone) {
    contactChips.push({
      key: 'phone',
      icon: 'call-outline',
      text: contactPhone
    });
  }
  if (contactEmail) {
    contactChips.push({
      key: 'email',
      icon: 'mail-outline',
      text: contactEmail
    });
  }

  const getContractStatus = (contract) => {
    if (!contract) return { status: 'none', label: 'No contract yet', action: 'Create contract', variant: 'neutral' };

    switch (contract.status) {
      case 'draft':
        return { status: 'draft', label: 'Draft contract ready', action: 'Review contract', variant: 'neutral' };
      case 'sent':
        return { status: 'sent', label: 'Awaiting signatures', action: 'Review contract', variant: 'neutral' };
      case 'signed_parent':
        return { status: 'signed_parent', label: 'Parent signed', action: 'Sign contract', variant: 'primary' };
      case 'signed_caregiver':
        return { status: 'signed_caregiver', label: 'Signed by you', action: 'Await parent', variant: 'primary' };
      case 'active':
        return { status: 'active', label: 'Contract active', action: 'View contract', variant: 'success' };
      case 'completed':
        return { status: 'completed', label: 'Contract completed', action: 'View contract', variant: 'success' };
      default:
        return { status: 'unknown', label: 'Contract status unknown', action: 'View contract', variant: 'neutral' };
    }
  };

  const contractInfo = getContractStatus(contract);
  const supersededBy = contract?.metadata?.supersededBy || contract?.metadata?.superseded_by;
  const isSuperseded = Boolean(supersededBy);
  const isActiveContract = String(contract?.status || '').toLowerCase() === 'active';

  const handleContractPress = () => {
    if (!onOpenContract) return;
    onOpenContract(booking, contract);
  };

  return (
    <View style={bookingCardStyles.card}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={bookingCardStyles.headerGradient}
      >
        <View style={bookingCardStyles.headerContent}>
          <Text style={bookingCardStyles.familyName}>{String(booking?.family ?? 'Family')}</Text>
          <View style={bookingCardStyles.statusBadge}>
            <Text style={bookingCardStyles.statusText}>{String(booking?.status ?? 'Unknown')}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={bookingCardStyles.body}>
        <View style={bookingCardStyles.details}>
          {detailChips.map(({ key, icon, text }) => {
            const displayText = text != null ? String(text) : '';
            return (
              <View key={key} style={bookingCardStyles.detailChip}>
                <Ionicons name={icon} size={14} color="#2563EB" />
                <Text style={bookingCardStyles.detailChipText} numberOfLines={1}>
                  {displayText}
                </Text>
              </View>
            );
          })}
        </View>

        {specialInstructions && (
          <View style={bookingCardStyles.instructionsContainer}>
            <Text style={bookingCardStyles.sectionLabel}>Special Instructions</Text>
            <Text style={bookingCardStyles.instructionsText} numberOfLines={3}>
              {String(specialInstructions)}
            </Text>
          </View>
        )}

        {contactChips.length > 0 && (
          <View style={bookingCardStyles.contactContainer}>
            <Text style={bookingCardStyles.sectionLabel}>Contact</Text>
            <View style={bookingCardStyles.contactChips}>
              {contactChips.map(({ key, icon, text }) => (
                <View key={key} style={bookingCardStyles.contactChip}>
                  <Ionicons name={icon} size={14} color="#10B981" />
                  <Text style={bookingCardStyles.contactChipText} numberOfLines={1}>{String(text ?? '')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Contract Row */}
        <TouchableOpacity
          style={[
            bookingCardStyles.contractRow,
            contractInfo.variant === 'primary' && bookingCardStyles.contractRow_primary,
            contractInfo.variant === 'success' && bookingCardStyles.contractRow_success,
            contractInfo.variant === 'neutral' && bookingCardStyles.contractRow_neutral,
          ]}
          onPress={handleContractPress}
          activeOpacity={0.7}
        >
          <View style={bookingCardStyles.contractRowLeft}>
            <View style={bookingCardStyles.contractIconWrapper}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color={contractInfo.variant === 'success' ? '#10B981' : contractInfo.variant === 'primary' ? '#3B82F6' : '#6B7280'}
              />
            </View>
            <View style={bookingCardStyles.contractInfo}>
              {contract && (isActiveContract || isSuperseded) && (
                <View
                  style={[
                    bookingCardStyles.contractStatusBadge,
                    isActiveContract && bookingCardStyles.contractStatusBadge_active,
                    isSuperseded && bookingCardStyles.contractStatusBadge_replaced
                  ]}
                >
                  <Text style={bookingCardStyles.contractStatusBadgeText}>
                    {isSuperseded ? 'Replaced contract' : 'Active contract'}
                  </Text>
                </View>
              )}
              <Text style={bookingCardStyles.contractTitle}>
                {String(contractInfo.label || 'No contract')}
              </Text>
              <Text style={bookingCardStyles.contractSubtitle}>
                {String(contractInfo.action || '')}
              </Text>
            </View>
          </View>
          <View style={bookingCardStyles.contractAction}>
            <Text
              style={[
                bookingCardStyles.contractActionText,
                contractInfo.variant === 'success' && bookingCardStyles.contractActionTextDisabled
              ]}
            >
              {String(contractInfo.action === 'Create contract' ? 'Create' : 'View')}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={contractInfo.variant === 'success' ? '#9CA3AF' : '#3B82F6'}
            />
          </View>
        </TouchableOpacity>

        <View style={bookingCardStyles.footer}>
          <View style={bookingCardStyles.amountContainer}>
            <Text style={bookingCardStyles.amount}>
              {`₱${totalAmount?.toLocaleString() || '0'}`}
            </Text>
            <Text style={bookingCardStyles.hourlyRate}>
              {`₱${hourlyRate || 300}/hr`}
            </Text>
          </View>

          <View style={bookingCardStyles.actionButtons}>
            <View style={bookingCardStyles.actionRow}>
              {booking.status === 'pending' && (
                <TouchableOpacity
                  style={bookingCardStyles.confirmButton}
                  onPress={() => onConfirmBooking && onConfirmBooking(booking)}
                >
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  <Text style={bookingCardStyles.buttonText}>Confirm</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={bookingCardStyles.detailsButton}
                onPress={() => onViewDetails && onViewDetails(booking)}
              >
                <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
                <Text style={bookingCardStyles.buttonText}>Details</Text>
              </TouchableOpacity>
            </View>

            <View style={bookingCardStyles.actionRow}>
              <TouchableOpacity
                style={bookingCardStyles.messageButton}
                onPress={() => onMessageFamily && onMessageFamily(booking)}
              >
                <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" />
                <Text style={bookingCardStyles.buttonText}>Message</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});

const bookingCardStyles = {
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  headerGradient: {
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  body: {
    padding: 16,
  },
  familyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  details: {
    marginBottom: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: '100%',
    gap: 6,
  },
  detailChipText: {
    fontSize: 13,
    color: '#1f2937',
    flexShrink: 1,
  },
  instructionsContainer: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f2937',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  instructionsText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  contactContainer: {
    marginBottom: 16,
  },
  contactChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
  },
  contactChipText: {
    fontSize: 13,
    color: '#047857',
    flexShrink: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountContainer: {
    flex: 1,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  hourlyRate: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  detailsButton: {
    backgroundColor: '#6B7280',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#6B7280',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  messageButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  contractRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contractRow_primary: {
    backgroundColor: '#F0F9FF',
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.1,
  },
  contractRow_neutral: {
    backgroundColor: '#F8FAFC',
    borderColor: '#6B7280',
  },
  contractRow_success: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.1,
  },
  contractRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contractIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contractInfo: {
    flex: 1,
  },
  contractStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 4,
  },
  contractStatusBadge_active: {
    backgroundColor: '#DCFCE7',
  },
  contractStatusBadge_replaced: {
    backgroundColor: '#FEF3C7',
  },
  contractStatusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
  },
  contractTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  contractSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 16,
  },
  contractAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contractActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3B82F6',
  },
  contractActionTextDisabled: {
    color: '#9CA3AF',
  },
};

const normalizeStatus = (status) => String(status || '').toLowerCase();

const isUpcomingBooking = (booking) => {
  if (!booking?.date) return false;
  const bookingDate = new Date(booking.date);
  if (Number.isNaN(bookingDate.getTime())) return false;
  const today = new Date();
  bookingDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return bookingDate >= today;
};

const computeFilterCounts = (bookings) => {
  const counts = {
    all: Array.isArray(bookings) ? bookings.length : 0,
    pending: 0,
    confirmed: 0,
    completed: 0
  };

  if (!Array.isArray(bookings)) return counts;

  bookings.forEach((booking) => {
    const status = normalizeStatus(booking?.status);
    if (status === 'pending') counts.pending += 1;
    if (status === 'confirmed' || status === 'in-progress' || status === 'in_progress') counts.confirmed += 1;
    if (status === 'completed' || status === 'done' || status === 'paid') counts.completed += 1;
  });

  return counts;
};

const getFilteredBookings = (bookings, activeFilter) => {
  if (!Array.isArray(bookings)) return [];

  return bookings.filter((booking) => {
    const status = normalizeStatus(booking?.status);

    switch (activeFilter) {
      case 'pending':
        return status === 'pending';
      case 'confirmed':
        return status === 'confirmed' || status === 'in-progress' || status === 'in_progress';
      case 'completed':
        return status === 'completed' || status === 'done' || status === 'paid';
      default:
        return true;
    }
  });
};

const buildFilterOptions = (metrics) => ([
  { key: 'all', label: 'All', count: metrics.all },
  { key: 'pending', label: 'Pending', count: metrics.pending },
  { key: 'confirmed', label: 'Active', count: metrics.confirmed },
  { key: 'completed', label: 'Done', count: metrics.completed }
]);

const BookingsTab = ({
  bookings,
  onMessageFamily,
  onConfirmBooking,
  onViewDetails,
  onOpenContract,
  refreshing = false,
  onRefresh,
  loading = false
}) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [contracts, setContracts] = useState({});
  const [contractsLoading, setContractsLoading] = useState(false);
  const contractsFetchKeyRef = useRef(null);

  const fetchContractsForBookings = useCallback(async (bookingList) => {
    if (!bookingList || bookingList.length === 0) return;

    try {
      setContractsLoading(true);
      const contractPromises = bookingList.map(async (booking) => {
        const bookingId = booking?.id || booking?._id;
        if (!bookingId) return null;

        try {
          const bookingContracts = await contractService.getContractsByBooking(bookingId);
          return { bookingId, contracts: bookingContracts };
        } catch (error) {
          console.warn(`Failed to fetch contracts for booking ${bookingId}:`, error);
          return { bookingId, contracts: [] };
        }
      });

      const contractResults = await Promise.all(contractPromises);
      const contractsMap = {};

      contractResults.forEach(result => {
        if (result && result.contracts && result.contracts.length > 0) {
          // Get the latest contract (most recent first)
          contractsMap[result.bookingId] = result.contracts[0];
        }
      });

      setContracts(contractsMap);
    } catch (error) {
      console.error('Error fetching contracts for bookings:', error);
    } finally {
      setContractsLoading(false);
    }
  }, []);

  const handleOpenContract = useCallback((booking, contract) => {
    if (!onOpenContract) return;
    if (!contract) {
      onOpenContract(booking, null, { intent: 'create' });
      return;
    }
    onOpenContract(booking, contract, { intent: 'view' });
  }, [onOpenContract]);

  const filterMetrics = useMemo(() => computeFilterCounts(bookings), [bookings]);
  const visibleBookings = useMemo(() => getFilteredBookings(bookings, activeFilter), [bookings, activeFilter]);
  const options = useMemo(() => buildFilterOptions(filterMetrics), [filterMetrics]);

  const skeletonItems = useMemo(() => (
    loading ? Array.from({ length: 4 }).map((_, index) => `booking-skeleton-${index}`) : []
  ), [loading]);

  const renderBookingItem = ({ item, index }) => {
    if (loading) {
      return (
        <SkeletonCard key={`booking-skeleton-${index}`} style={styles.bookingsSkeletonCard}>
          <View style={styles.bookingsSkeletonHeader}>
            <SkeletonBlock width="55%" height={18} />
            <SkeletonPill width="28%" height={18} />
          </View>

          <View style={styles.bookingsSkeletonChipRow}>
            <SkeletonPill width="32%" height={14} />
            <SkeletonPill width="28%" height={14} />
            <SkeletonPill width="26%" height={14} />
          </View>

          <View style={styles.bookingsSkeletonBody}>
            <SkeletonBlock width="90%" height={14} />
            <SkeletonBlock width="85%" height={14} />
            <SkeletonBlock width="70%" height={14} />
          </View>

          <View style={styles.bookingsSkeletonFooter}>
            <SkeletonBlock width="35%" height={18} />
            <SkeletonPill width="28%" height={14} />
          </View>
        </SkeletonCard>
      );
    }

    const bookingId = item?.id || item?._id;
    const bookingContract = bookingId ? contracts[bookingId] : null;

    return (
      <BookingCard
        booking={item}
        onMessageFamily={onMessageFamily}
        onConfirmBooking={onConfirmBooking}
        onViewDetails={onViewDetails}
        onOpenContract={handleOpenContract}
        contract={bookingContract}
      />
    );
  };

  const listData = loading ? skeletonItems : visibleBookings;

  useEffect(() => {
    if (refreshing) {
      contractsFetchKeyRef.current = null;
    }
  }, [refreshing]);

  // Fetch contracts when bookings change
  useEffect(() => {
    if (!visibleBookings.length) {
      contractsFetchKeyRef.current = null;
      return;
    }

    const bookingsKey = visibleBookings
      .map((booking) => {
        const id = booking?.id || booking?._id || '';
        const updated = booking?.updated_at || booking?.updatedAt || booking?.modified_at || '';
        return `${id}:${updated}`;
      })
      .join('|');

    if (contractsFetchKeyRef.current === bookingsKey) {
      return;
    }

    let cancelled = false;
    contractsFetchKeyRef.current = bookingsKey;

    const loadContracts = async () => {
      try {
        await fetchContractsForBookings(visibleBookings);
      } catch (error) {
        if (!cancelled) {
          contractsFetchKeyRef.current = null;
        }
      }
    };

    loadContracts();

    return () => {
      cancelled = true;
    };
  }, [visibleBookings, fetchContractsForBookings, refreshing]);

  return (
    <FlatList
      data={listData}
      keyExtractor={(item, index) => (loading ? `booking-skeleton-${index}` : String(item?.id || item?._id || index))}
      renderItem={renderBookingItem}
      style={styles.content}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshing={refreshing}
      onRefresh={onRefresh}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={(
        <View style={styles.section}>
          <View style={styles.bookingFilterTabsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bookingFilterTabs}
            >
              {options.map((option) => {
                const isActive = activeFilter === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.bookingFilterTab, isActive && styles.activeBookingFilterTab]}
                    onPress={() => setActiveFilter(option.key)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.bookingFilterTabText, isActive && styles.activeBookingFilterTabText]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {option.label}
                      {typeof option.count === 'number' && option.count > 0 && (
                        <Text style={styles.bookingFilterTabCount}>{` (${option.count})`}</Text>
                      )}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}
      ListEmptyComponent={!loading ? (
        <View style={styles.section}>
          <EmptyState
            icon="calendar"
            title="No bookings found"
            subtitle={
              activeFilter === 'all'
                ? 'Your bookings will appear here once available'
                : 'Try another tab to see more bookings'
            }
          />
        </View>
      ) : null}
      ListFooterComponent={!loading && visibleBookings.length > 0 ? <View style={{ height: 8 }} /> : null}
    />
  );
};

// ContractModal integration - wrap the component with modal functionality
const CaregiverBookingsTabWithModal = ({ pendingContract, onPendingContractHandled, currentUserId, ...props }) => {
  const [ContractModal, setContractModal] = useState(null);
  const [contractModalVisible, setContractModalVisible] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [selectedBookingForContract, setSelectedBookingForContract] = useState(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [sendingForSignature, setSendingForSignature] = useState(false);

  useEffect(() => {
    let isMounted = true;

    try {
      const module = require('../../components/modals/ContractModal');
      const resolved = module?.default || module?.ContractModal || module;
      if (isMounted && resolved) {
        setContractModal(() => resolved);
      }
    } catch (error) {
      console.warn('Failed to load ContractModal via require:', error);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!pendingContract) return;

    const { contract, booking } = pendingContract;
    if (!contract) return;

    setSelectedContract(contract);
    setSelectedBookingForContract(booking || null);
    setContractModalVisible(true);
    onPendingContractHandled?.();
  }, [pendingContract, onPendingContractHandled]);

  const handleOpenContract = useCallback((booking, contract) => {
    if (!contract) {
      console.warn('Attempted to open contract modal without contract data');
      return;
    }

    console.log('🔍 CaregiverDashboard - Opening contract:', { booking, contract });
    setSelectedBookingForContract(booking || null);
    setSelectedContract(contract);
    setContractModalVisible(true);
  }, []);

  const handleContractSign = useCallback(async ({ signature, acknowledged }) => {
    if (!selectedContract || !selectedBookingForContract) return;

    try {
      let existing;
      try {
        existing = await contractService.getContractById(selectedContract.id);
      } catch (error) {
        console.warn('Error fetching contract before signing:', error);
      }

      if (!existing) {
        Alert.alert('Contract unavailable', 'This contract could not be found. Please refresh and try again.');
        setContractModalVisible(false);
        setSelectedContract(null);
        setSelectedBookingForContract(null);
        return;
      }

      let result;
      try {
        result = await contractService.signContract(existing.id, 'caregiver', {
          signature,
          signatureHash: btoa(signature),
          ipAddress: null,
          acknowledged
        });
      } catch (error) {
        if (error?.code === 'CONTRACT_NOT_FOUND') {
          Alert.alert('Contract unavailable', 'This contract could not be found. Please refresh and try again.');
          setContractModalVisible(false);
          setSelectedContract(null);
          setSelectedBookingForContract(null);
          return;
        }

        if (error?.code === 'CONTRACT_ACTIVE_CONFLICT') {
          Alert.alert(
            'Contract already active',
            'There is already an active contract for this booking. Please view or sign that contract instead.'
          );
          setContractModalVisible(false);
          setSelectedContract(null);
          setSelectedBookingForContract(null);
          return;
        }

        throw error;
      }

      if (result) {
        Alert.alert('Success', 'Contract signed successfully!');
        setContractModalVisible(false);
        setSelectedContract(null);
        setSelectedBookingForContract(null);
      }
    } catch (error) {
      console.error('Error signing contract:', error);
      Alert.alert('Error', 'Failed to sign contract. Please try again.');
    }
  }, [selectedContract, selectedBookingForContract]);

  const handleSaveDraft = useCallback(async ({ contract, terms }) => {
    if (!contract?.id) return;
    setSavingDraft(true);
    try {
      const saved = await contractService.saveDraft(contract.id, terms, {
        actorId: currentUserId || null,
        actorRole: 'caregiver'
      });
      setSelectedContract(saved);
      props.onRefresh?.();
      Alert.alert('Draft saved', 'Your changes were saved successfully.');
    } catch (error) {
      console.error('Failed to save draft:', error);
      Alert.alert('Save failed', error?.message || 'Unable to save draft. Please try again.');
    } finally {
      setSavingDraft(false);
    }
  }, [currentUserId, props]);

  const handleSendForSignature = useCallback(async ({ contract, terms }) => {
    if (!contract?.id) return;
    setSendingForSignature(true);
    try {
      const sent = await contractService.sendDraftForSignature(contract.id, {
        terms,
        actorId: currentUserId || null,
        actorRole: 'caregiver'
      });
      setSelectedContract(sent);
      Alert.alert('Sent!', 'Contract sent to the parent for review.');
      props.onRefresh?.();
      setContractModalVisible(false);
      setSelectedContract(null);
      setSelectedBookingForContract(null);
    } catch (error) {
      console.error('Failed to send for signature:', error);
      Alert.alert('Send failed', error?.message || 'Unable to send contract. Please try again.');
    } finally {
      setSendingForSignature(false);
    }
  }, [currentUserId, props]);

  const handleContractResend = useCallback(async (contract) => {
    if (!contract) return;

    try {
      await contractService.resendContract(contract.id, 'caregiver-id-placeholder');
      Alert.alert('Success', 'Contract reminder sent!');
    } catch (error) {
      console.error('Error resending contract:', error);
      Alert.alert('Error', 'Failed to send reminder. Please try again.');
    }
  }, []);

  const handleDownloadPdf = useCallback(async (contract) => {
    if (!contract) return;

    try {
      const result = await contractService.generateContractPdf(contract.id, { autoDownload: true });

      if (!result?.uri && !result?.url) {
        throw new Error('Download did not return a file location.');
      }

      const fileUri = result.uri || result.url;
      const isLocalFile = typeof fileUri === 'string' && fileUri.startsWith('file://');

      let handled = false;

      if (isLocalFile) {
        try {
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf' });
            handled = true;
          }
        } catch (shareError) {
          console.warn('Share unavailable for contract PDF:', shareError);
        }
      }

      if (!handled) {
        if (isLocalFile) {
          if (Platform.OS === 'android') {
            Alert.alert('Downloaded', `PDF saved at:\n${fileUri}`);
            handled = true;
          } else if (Platform.OS === 'ios') {
            Alert.alert('Downloaded', 'PDF saved. Open it through the Files app.');
            handled = true;
          }
        } else {
          try {
            if (WebBrowser?.openBrowserAsync && Platform.OS !== 'web') {
              await WebBrowser.openBrowserAsync(fileUri, { presentationStyle: 'automatic' });
              handled = true;
            }
          } catch (browserError) {
            console.warn('Failed to open contract PDF in in-app browser:', browserError);
          }

          if (!handled) {
            try {
              await Linking.openURL(fileUri);
              handled = true;
            } catch (linkError) {
              console.warn('Failed to open contract PDF URL:', linkError);
            }
          }
        }
      }

      if (!handled) {
        Alert.alert('Download complete', `PDF available at:\n${fileUri}`);
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Alert.alert('Download failed', error instanceof Error ? error.message : String(error));
    }
  }, []);

  return (
    <>
      <BookingsTab {...props} onOpenContract={handleOpenContract} />

      {/* Contract Modal */}
      {ContractModal && contractModalVisible && selectedBookingForContract && (
        <ContractModal
          visible={contractModalVisible}
          onClose={() => {
            setContractModalVisible(false);
            setSelectedContract(null);
            setSelectedBookingForContract(null);
            setSavingDraft(false);
            setSendingForSignature(false);
          }}
          contract={selectedContract}
          booking={selectedBookingForContract}
          viewerRole="caregiver"
          onSign={handleContractSign}
          onResend={handleContractResend}
          onDownloadPdf={handleDownloadPdf}
          onSaveDraft={handleSaveDraft}
          onSendForSignature={handleSendForSignature}
          savingDraft={savingDraft}
          sendingForSignature={sendingForSignature}
        />
      )}
    </>
  );
};

export default CaregiverBookingsTabWithModal;
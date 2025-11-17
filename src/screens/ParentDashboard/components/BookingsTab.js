import { Calendar, Plus } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, FlatList, Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ContractModal from '../../../components/modals/ContractModal';
import ContractTypeSelector from '../../../components/modals/ContractTypeSelector';
import { BOOKING_STATUSES } from '../../../constants/bookingStatuses';
import { supabase } from '../../../services/supabase/base';
import { contractService } from '../../../services/supabase/contractService';
import { colors, styles } from '../../styles/ParentDashboard.styles';
import BookingItem from './BookingItem';

const BOOKING_ITEM_HEIGHT = 320;
const SKELETON_ITEMS = 5;

const skeletonStyles = StyleSheet.create({
  listContent: {
    paddingVertical: 8
  },
  card: {
    height: BOOKING_ITEM_HEIGHT,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F4F4F8',
    overflow: 'hidden'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#EBECF5'
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D7D9E6',
    marginRight: 12
  },
  headerText: {
    flex: 1,
    gap: 8
  },
  lineLong: {
    width: '70%',
    height: 12,
    borderRadius: 8,
    backgroundColor: '#D7D9E6'
  },
  lineShort: {
    width: '40%',
    height: 10,
    borderRadius: 8,
    backgroundColor: '#D7D9E6'
  },
  badge: {
    width: 60,
    height: 20,
    borderRadius: 12,
    backgroundColor: '#D7D9E6'
  },
  body: {
    flex: 1,
    padding: 16,
    gap: 12
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  pill: {
    height: 18,
    borderRadius: 10,
    backgroundColor: '#E4E6F1'
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16
  },
  button: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E4E6F1',
    marginHorizontal: 6
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    opacity: 0.6
  }
});

const MemoizedBookingItem = React.memo(BookingItem);

const SkeletonBookingItem = React.memo(() => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true
        })
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 150]
  });

  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.header}>
        <View style={skeletonStyles.avatar} />
        <View style={skeletonStyles.headerText}>
          <View style={skeletonStyles.lineLong} />
          <View style={skeletonStyles.lineShort} />
        </View>
        <View style={skeletonStyles.badge} />
      </View>
      <View style={skeletonStyles.body}>
        <View style={skeletonStyles.row}>
          <View style={[skeletonStyles.pill, { width: '55%' }]} />
          <View style={[skeletonStyles.pill, { width: '35%' }]} />
        </View>
        <View style={[skeletonStyles.pill, { width: '80%' }]} />
        <View style={[skeletonStyles.pill, { width: '60%' }]} />
        <View style={skeletonStyles.buttonRow}>
          <View style={skeletonStyles.button} />
          <View style={skeletonStyles.button} />
          <View style={skeletonStyles.button} />
        </View>
      </View>
      <Animated.View
        pointerEvents="none"
        style={[skeletonStyles.shimmer, { transform: [{ translateX }] }]}
      />
    </View>
  );
});

const BookingsTab = ({
  bookings,
  bookingsFilter,
  setBookingsFilter,
  refreshing,
  onRefresh,
  onCancelBooking,
  onUploadPayment,
  onViewBookingDetails,
  onWriteReview,
  onCreateBooking,
  onMessageCaregiver,
  onOpenContract,
  navigation,
  loading,
  refreshBookings
}) => {
  const [contracts, setContracts] = React.useState({});
  const [contractsLoading, setContractsLoading] = React.useState(false);
  const [contractModalVisible, setContractModalVisible] = React.useState(false);
  const [selectedContract, setSelectedContract] = React.useState(null);
  const [selectedBookingForContract, setSelectedBookingForContract] = React.useState(null);
  const [selectedContractType, setSelectedContractType] = React.useState(null);
  const [contractTypeSelectorVisible, setContractTypeSelectorVisible] = React.useState(false);
  const [savingDraft, setSavingDraft] = React.useState(false);
  const [sendingForSignature, setSendingForSignature] = React.useState(false);

  const filteredBookings = useMemo(() => {
    if (!bookings || !Array.isArray(bookings)) return [];

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

    switch (bookingsFilter) {
      case 'upcoming':
        return bookings.filter((b) => {
          if (!b.date) return false;
          const bookingDate = new Date(b.date);
          bookingDate.setHours(0, 0, 0, 0);
          return bookingDate >= now;
        });

      case 'past':
        return bookings.filter((b) => {
          if (!b.date) return false;
          const bookingDate = new Date(b.date);
          bookingDate.setHours(0, 0, 0, 0);
          return bookingDate < now;
        });

      case 'pending':
        return bookings.filter(b => b.status === BOOKING_STATUSES.PENDING);

      case 'confirmed':
        return bookings.filter(b =>
          b.status === BOOKING_STATUSES.CONFIRMED ||
          b.status === BOOKING_STATUSES.IN_PROGRESS
        );

      case 'completed':
        return bookings.filter(b =>
          b.status === BOOKING_STATUSES.COMPLETED ||
          b.status === BOOKING_STATUSES.PAID
        );

      default:
        return bookings;
    }
  }, [bookings, bookingsFilter]);

  // Calculate booking statistics
  const bookingStats = useMemo(() => {
    if (!bookings || !Array.isArray(bookings)) {
      return { total: 0, pending: 0, confirmed: 0, completed: 0 };
    }

    return bookings.reduce((stats, booking) => {
      stats.total += 1;

      switch (booking.status) {
        case BOOKING_STATUSES.PENDING:
          stats.pending += 1;
          break;
        case BOOKING_STATUSES.CONFIRMED:
        case BOOKING_STATUSES.IN_PROGRESS:
          stats.confirmed += 1;
          break;
        case BOOKING_STATUSES.COMPLETED:
        case BOOKING_STATUSES.PAID:
          stats.completed += 1;
          break;
      }

      return stats;
    }, { total: 0, pending: 0, confirmed: 0, completed: 0 });
  }, [bookings]);

  const handleMessageCaregiver = async (caregiver) => {
    try {
      console.log('🔍 BookingsTab - Caregiver data for messaging:', caregiver);

      if (!caregiver) {
        Alert.alert('Error', 'Caregiver information not available');
        return;
      }

      const caregiverId = caregiver._id || caregiver.id;
      const caregiverName = caregiver.name || caregiver.firstName || 'Caregiver';

      console.log('🔍 BookingsTab - Extracted caregiver info:', { caregiverId, caregiverName });

      if (onMessageCaregiver) {
        await onMessageCaregiver({
          _id: caregiverId,
          name: caregiverName,
          avatar: caregiver.avatar || caregiver.profileImage
        });
      } else {
        console.log('Starting conversation with caregiver:', {
          recipientId: caregiverId,
          recipientName: caregiverName,
          recipientAvatar: caregiver.avatar || caregiver.profileImage
        });
      }
    } catch (error) {
      console.error('Error messaging caregiver:', error);
      Alert.alert('Error', 'Failed to open messaging. Please try again.');
    }
  };

  // Contract management functions
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

  const handleContractTypeSelect = useCallback(async (contractType) => {
    if (!selectedBookingForContract || !contractType) return;

    try {
      setContractTypeSelectorVisible(false);
      console.log('🔍 BookingsTab - Creating contract with type:', contractType);

      // Generate contract terms based on selected type
      const contractTerms = {
        contractType: contractType.id,
        contractTitle: contractType.title,
        ...contractType.terms,
        createdAt: new Date().toISOString(),
        version: 1
      };

      // Get current user for parent ID
      const currentUser = await supabase.auth.getUser();
      if (!currentUser?.data?.user?.id) {
        Alert.alert('Error', 'You must be logged in to create contracts');
        return;
      }

      // Debug: Inspect the booking object for caregiverId
      console.log('🔍 selectedBookingForContract:', JSON.stringify(selectedBookingForContract, null, 2));
      console.log('🔍 caregiver_id field:', selectedBookingForContract.caregiver_id);
      console.log('🔍 caregiverId field:', selectedBookingForContract.caregiverId);

      // Extract caregiverId from various possible locations
      const caregiverData = selectedBookingForContract.caregiverId ||
        selectedBookingForContract.caregiver ||
        selectedBookingForContract.caregiverProfile ||
        selectedBookingForContract.assignedCaregiver;

      // If caregiverData is an object, extract the ID; otherwise use it directly
      const extractedCaregiverId = typeof caregiverData === 'object' && caregiverData !== null
        ? (caregiverData.id || caregiverData._id || caregiverData.user_id)
        : (selectedBookingForContract.caregiver_id || caregiverData);

      console.log('🔍 Extracted caregiverId:', extractedCaregiverId);

      if (!extractedCaregiverId) {
        Alert.alert('Error', 'Caregiver information is missing from this booking. Please contact support.');
        setSelectedContractType(null);
        setSelectedBookingForContract(null);
        return;
      }

      // Create the contract
      const contractData = {
        bookingId: selectedBookingForContract.id || selectedBookingForContract._id,
        parentId: currentUser.data.user.id,
        caregiverId: extractedCaregiverId,
        terms: contractTerms,
        status: 'draft',
        version: 1,
        effectiveDate: new Date().toISOString(),
        metadata: {
          contractType: contractType.id,
          createdVia: 'contract-selector'
        }
      };

      const result = await contractService.createContract(contractData);

      if (result) {
        // Update the contract in state
        setContracts(prev => ({
          ...prev,
          [selectedBookingForContract.id || selectedBookingForContract._id]: result
        }));

        // Open the contract modal for review
        setSelectedContract(result);
        setContractModalVisible(true);

        Alert.alert('Success', `${contractType.title} contract created successfully!`);
      }
    } catch (error) {
      console.error('Error creating contract:', error);
      Alert.alert('Error', 'Failed to create contract. Please try again.');
    } finally {
      setSelectedContractType(null);
      setSelectedBookingForContract(null);
    }
  }, [selectedBookingForContract]);

  const handleCreateContract = useCallback((booking) => {
    console.log('🔍 BookingsTab - Creating contract for booking:', booking);
    setSelectedBookingForContract(booking);
    setContractTypeSelectorVisible(true);
  }, []);

  const handleContractSign = useCallback(async ({ signature, acknowledged }) => {
    if (!selectedContract || !selectedBookingForContract) return;

    try {
      let existing;
      try {
        existing = await contractService.getContractById(selectedContract.id);
      } catch (error) {
        if (error?.code === 'PGRST116' || error?.message?.includes('0 rows')) {
          Alert.alert('Contract unavailable', 'This contract could not be found. Please refresh and try again.');
          setContractModalVisible(false);
          setSelectedContract(null);
          setSelectedBookingForContract(null);
          return;
        }
        throw error;
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
        result = await contractService.signContract(existing.id, 'parent', {
          signature,
          signatureHash: btoa(signature), // Simple hash for demo
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

          if (typeof refreshBookings === 'function') {
            await refreshBookings();
          }

          await fetchContractsForBookings(bookings || []);
          return;
        }

        throw error;
      }

      if (result) {
        setContracts(prev => ({
          ...prev,
          [selectedBookingForContract.id || selectedBookingForContract._id]: result
        }));

        Alert.alert('Success', 'Contract signed successfully!');

        if (typeof refreshBookings === 'function') {
          await refreshBookings();
        }

        await fetchContractsForBookings(bookings || []);

        setContractModalVisible(false);
        setSelectedContract(null);
        setSelectedBookingForContract(null);
      }
    } catch (error) {
      console.error('Error signing contract:', error);
      Alert.alert('Error', 'Failed to sign contract. Please try again.');
    }
  }, [selectedContract, selectedBookingForContract, refreshBookings, fetchContractsForBookings, bookings]);

  const handleDownloadPdf = useCallback(async (contract) => {
    if (!contract) {
      Alert.alert('Error', 'Contract information not available');
      return;
    }

    try {
      console.log('🔍 BookingsTab - Downloading PDF for contract:', contract);
      await contractService.generateContractPdf(contract.id, { autoDownload: true });
    } catch (error) {
      console.error('Error downloading contract PDF:', error);
      Alert.alert('Download Error', 'Failed to download the contract PDF. Please try again later.');
    }
  }, []);

  const handleContractResend = useCallback(async (contract) => {
    if (!contract) {
      Alert.alert('Error', 'Contract information not available');
      return;
    }

    try {
      console.log('🔄 BookingsTab - Resending contract:', contract);

      // Get current user for actor ID (parent resending)
      const currentUser = await supabase.auth.getUser();
      if (!currentUser?.data?.user?.id) {
        Alert.alert('Error', 'You must be logged in to resend contracts');
        return;
      }

      // Use contractService to resend the contract
      const result = await contractService.resendContract(contract.id, currentUser.data.user.id);

      if (result) {
        Alert.alert('Success', 'Contract resent successfully! The caregiver will receive a new email notification.');
      } else {
        Alert.alert('Warning', 'Contract resent but no confirmation received. Please check with the caregiver.');
      }
    } catch (error) {
      console.error('Error resending contract:', error);
      Alert.alert('Resend Error', 'Failed to resend contract. Please try again later.');
    }
  }, []);

  const handleCallCaregiver = useCallback(async (caregiver) => {
    try {
      if (!caregiver || !caregiver.phone) {
        Alert.alert('No Phone Number', 'Caregiver phone number is not available');
        return;
      }

      const phoneNumber = caregiver.phone.replace(/[^0-9+]/g, '');

      Alert.alert(
        'Call Caregiver',
        `Call ${caregiver.name || 'caregiver'} at ${caregiver.phone}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Call',
            onPress: () => {
              Linking.openURL(`tel:${phoneNumber}`);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error calling caregiver:', error);
      Alert.alert('Error', 'Failed to make call. Please try again.');
    }
  }, []);

  const renderFilterTabs = useCallback(() => {
    const filterOptions = [
      { key: 'all', label: 'All', count: bookingStats.total },
      { key: 'upcoming', label: 'Upcoming', count: null },
      { key: 'pending', label: 'Pending', count: bookingStats.pending },
      { key: 'confirmed', label: 'Active', count: bookingStats.confirmed },
      { key: 'completed', label: 'Done', count: bookingStats.completed }
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bookingsFilterTabs}
        contentContainerStyle={styles.bookingsFilterTabsContent}
      >
        {filterOptions.map((option) => {
          const isActive = bookingsFilter === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.filterTab, isActive && styles.activeFilterTab]}
              onPress={() => setBookingsFilter(option.key)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${option.label} bookings`}
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[styles.filterTabText, isActive && styles.activeFilterTabText]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {option.label}
                {option.count !== null && option.count > 0 && (
                  <Text
                    style={[styles.filterTabCount, isActive && { color: colors.textInverse }]}
                  >
                    {` (${option.count})`}
                  </Text>
                )}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  }, [bookingStats.completed, bookingStats.confirmed, bookingStats.pending, bookingStats.total, bookingsFilter, setBookingsFilter]);

  const renderEmptyState = useCallback(() => {
    const getEmptyMessage = () => {
      switch (bookingsFilter) {
        case 'upcoming':
          return 'No upcoming bookings';
        case 'past':
          return 'No past bookings';
        case 'pending':
          return 'No pending bookings';
        case 'confirmed':
          return 'No active bookings';
        case 'completed':
          return 'No completed bookings';
        default:
          return 'No bookings found';
      }
    };

    return (
      <View style={styles.emptySection}>
        <Calendar size={48} color={colors.textSecondary} style={styles.emptyIcon} />
        <Text style={styles.emptySectionTitle}>{getEmptyMessage()}</Text>
        <Text style={styles.emptySectionText}>
          {bookingsFilter === 'all'
            ? 'Start by booking a caregiver for your children'
            : 'Check other tabs or create a new booking'}
        </Text>
        {onCreateBooking && (
          <TouchableOpacity
            style={styles.emptyActionButton}
            onPress={onCreateBooking}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.emptyActionButtonText}>Book a Caregiver</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [bookingsFilter, onCreateBooking]);

  // Fetch contracts when bookings change
  useEffect(() => {
    if (filteredBookings.length > 0 && !contractsLoading) {
      fetchContractsForBookings(filteredBookings);
    }
  }, [filteredBookings, fetchContractsForBookings, contractsLoading]);


  const keyExtractor = useCallback((item, index) => item?._id || item?.id || `booking-${index}`, []);

  const getItemLayout = useCallback((_, index) => ({
    length: BOOKING_ITEM_HEIGHT,
    offset: BOOKING_ITEM_HEIGHT * index,
    index
  }), []);

  const renderBookingItem = useCallback(({ item }) => {
    const caregiverData = item?.caregiverId || item?.caregiver || item?.caregiverProfile || item?.assignedCaregiver;
    const bookingId = item?.id || item?._id;
    const bookingContract = bookingId ? contracts[bookingId] : null;

    return (
      <MemoizedBookingItem
        booking={item}
        user={caregiverData}
        onCancelBooking={onCancelBooking}
        onUploadPayment={onUploadPayment}
        onViewBookingDetails={onViewBookingDetails}
        onWriteReview={onWriteReview}
        onMessageCaregiver={handleMessageCaregiver}
        onCallCaregiver={handleCallCaregiver}
        onOpenContract={onOpenContract}
        onCreateContract={handleCreateContract}
        contract={bookingContract}
      />
    );
  }, [contracts, handleCallCaregiver, handleContractResend, handleCreateContract, handleMessageCaregiver, onCancelBooking, onOpenContract, onUploadPayment, onViewBookingDetails, onWriteReview]);

  const skeletonData = useMemo(
    () => Array.from({ length: SKELETON_ITEMS }, (_, index) => `skeleton-${index}`),
    []
  );

  if (loading) {
    return (
      <View style={[styles.bookingsContent, { flex: 1 }]}>
        <View style={styles.bookingsHeader}>
          <View style={styles.bookingsHeaderTop}>
            <Text style={styles.bookingsTitle}>My Bookings</Text>
          </View>
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 12 }} />
        </View>

        <FlatList
          data={skeletonData}
          keyExtractor={(item) => item}
          renderItem={() => <SkeletonBookingItem />}
          contentContainerStyle={skeletonStyles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        />
      </View>
    );
  }

  return (
    <View style={[styles.bookingsContent, { flex: 1 }]}>
      <View style={styles.bookingsHeader}>
        <View style={styles.bookingsHeaderTop}>
          <Text style={styles.bookingsTitle}>My Bookings</Text>
          {onCreateBooking && (
            <TouchableOpacity
              style={styles.createBookingButton}
              onPress={onCreateBooking}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.createBookingButtonText}>Book</Text>
            </TouchableOpacity>
          )}
        </View>

        {renderFilterTabs()}
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={filteredBookings}
        keyExtractor={keyExtractor}
        renderItem={renderBookingItem}
        contentContainerStyle={[
          styles.bookingsList,
          filteredBookings.length === 0 && { flex: 1 }
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        getItemLayout={getItemLayout}
        initialNumToRender={6}
        windowSize={10}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={120}
        removeClippedSubviews
      />

      {/* Contract Modal */}
      {contractModalVisible && selectedBookingForContract && (
        <ContractModal
          visible={contractModalVisible}
          onClose={() => {
            setContractModalVisible(false);
            setSelectedContract(null);
            setSelectedBookingForContract(null);
          }}
          contract={selectedContract}
          booking={selectedBookingForContract}
          viewerRole="parent"
          onSign={handleContractSign}
          onResend={handleContractResend}
          onDownloadPdf={handleDownloadPdf}
          onSaveDraft={async ({ contract: currentContract, terms }) => {
            if (!currentContract?.id) return;
            setSavingDraft(true);
            try {
              const saved = await contractService.saveDraft(currentContract.id, terms, {
                actorRole: 'parent'
              });
              setContracts(prev => ({
                ...prev,
                [saved.bookingId]: saved
              }));
              setSelectedContract(saved);
              Alert.alert('Draft saved', 'Your changes were saved.');
            } catch (error) {
              console.error('Failed to save draft:', error);
              Alert.alert('Save failed', error?.message || 'Unable to save draft.');
            } finally {
              setSavingDraft(false);
            }
          }}
          onSendForSignature={async ({ contract: currentContract, terms }) => {
            if (!currentContract?.id) return;
            setSendingForSignature(true);
            try {
              const sent = await contractService.sendDraftForSignature(currentContract.id, {
                terms,
                actorRole: 'parent'
              });
              setContracts(prev => ({
                ...prev,
                [sent.bookingId]: sent
              }));
              setSelectedContract(sent);
              Alert.alert('Sent!', 'Contract sent to caregiver for signature.');
              if (typeof refreshBookings === 'function') {
                await refreshBookings();
              }
            } catch (error) {
              console.error('Failed to send for signature:', error);
              const message = error?.message || 'Unable to send for signature.';
              Alert.alert('Send failed', message);
            } finally {
              setSendingForSignature(false);
              setContractModalVisible(false);
            }
          }}
          savingDraft={savingDraft}
          sendingForSignature={sendingForSignature}
        />
      )}

      {/* Contract Type Selector Modal */}
      <ContractTypeSelector
        visible={contractTypeSelectorVisible}
        onClose={() => {
          setContractTypeSelectorVisible(false);
          setSelectedContractType(null);
          setSelectedBookingForContract(null);
        }}
        onSelectContractType={handleContractTypeSelect}
        selectedType={selectedContractType}
      />
    </View>
  );
};

export default BookingsTab;

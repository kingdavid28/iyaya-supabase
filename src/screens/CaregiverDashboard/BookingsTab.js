import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Platform, Text, TouchableOpacity, View } from 'react-native';

import ContractModal from '../../components/modals/ContractModal';
import { contractService } from '../../services/supabase/contractService';
import { styles } from '../styles/CaregiverDashboard.styles';

const BookingCard = React.memo(({ booking, onMessageFamily, onConfirmBooking, onViewDetails, onOpenContract, contract }) => {
  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      return timeString;
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

  const detailChips = [
    { key: 'date', icon: 'calendar-outline', text: booking?.date || 'Date TBD' },
    { key: 'time', icon: 'time-outline', text: timeDisplay },
    { key: 'children', icon: 'people-outline', text: `${childrenCount} ${childrenCount === 1 ? 'child' : 'children'}` }
  ];

  if (location) {
    detailChips.push({ key: 'location', icon: 'location-outline', text: location });
  }

  const contactChips = [];
  if (booking?.contactPhone || booking?.contact_phone) {
    contactChips.push({ key: 'phone', icon: 'call-outline', text: booking.contactPhone || booking.contact_phone });
  }
  if (booking?.contactEmail || booking?.contact_email) {
    contactChips.push({ key: 'email', icon: 'mail-outline', text: booking.contactEmail || booking.contact_email });
  }

  const contractInfo = (() => {
    if (!contract) {
      return { status: 'none', label: 'No contract yet', action: 'Create contract', variant: 'neutral' };
    }

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
  })();

  const handleContractPress = () => {
    if (!onOpenContract) return;
    onOpenContract(booking, contract);
  };

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <Text style={styles.familyName}>{String(booking?.family ?? 'Family')}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{String(booking?.status ?? 'Unknown')}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.details}>
          {detailChips.map(({ key, icon, text }) => (
            <View key={key} style={styles.detailChip}>
              <Ionicons name={icon} size={14} color="#2563EB" />
              <Text style={styles.detailChipText} numberOfLines={1}>{String(text)}</Text>
            </View>
          ))}
        </View>

        {specialInstructions ? (
          <View style={styles.instructionsContainer}>
            <Text style={styles.sectionLabel}>Special Instructions</Text>
            <Text style={styles.instructionsText} numberOfLines={3}>
              {String(specialInstructions)}
            </Text>
          </View>
        ) : null}

        {contactChips.length > 0 ? (
          <View style={styles.contactContainer}>
            <Text style={styles.sectionLabel}>Contact</Text>
            <View style={styles.contactChips}>
              {contactChips.map(({ key, icon, text }) => (
                <View key={key} style={styles.contactChip}>
                  <Ionicons name={icon} size={14} color="#10B981" />
                  <Text style={styles.contactChipText} numberOfLines={1}>{String(text ?? '')}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.contractRow,
            contractInfo.variant === 'primary' && styles.contractRow_primary,
            contractInfo.variant === 'success' && styles.contractRow_success,
            contractInfo.variant === 'neutral' && styles.contractRow_neutral,
          ]}
          onPress={handleContractPress}
          activeOpacity={0.7}
        >
          <View style={styles.contractRowLeft}>
            <View style={styles.contractIconWrapper}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color={contractInfo.variant === 'success' ? '#10B981' : contractInfo.variant === 'primary' ? '#3B82F6' : '#6B7280'}
              />
            </View>
            <View style={styles.contractInfo}>
              <Text style={styles.contractTitle}>{String(contractInfo.label || 'No contract')}</Text>
              <Text style={styles.contractSubtitle}>{String(contractInfo.action || '')}</Text>
            </View>
          </View>
          <View style={styles.contractAction}>
            <Text
              style={[
                styles.contractActionText,
                contractInfo.variant === 'success' && styles.contractActionTextDisabled,
              ]}
            >
              {contractInfo.action === 'Create contract' ? 'Create' : 'View'}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={contractInfo.variant === 'success' ? '#9CA3AF' : '#3B82F6'}
            />
          </View>
        </TouchableOpacity>

        <View style={styles.footer}>
          <View style={styles.amountContainer}>
            <Text style={styles.amount}>{`₱${totalAmount?.toLocaleString() || '0'}`}</Text>
            <Text style={styles.hourlyRate}>{`₱${hourlyRate || 300}/hr`}</Text>
          </View>

          <View style={styles.actionButtons}>
            <View style={styles.actionRow}>
              {booking.status === 'pending' ? (
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => onConfirmBooking?.(booking)}
                >
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Confirm</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.messageButton}
                onPress={() => onMessageFamily?.(booking)}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFFFFF" />
                <Text style={styles.buttonText}>Message</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={() => onViewDetails?.(booking)}
              >
                <Ionicons name="information-circle-outline" size={16} color="#FFFFFF" />
                <Text style={styles.buttonText}>View Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});

const BookingsTab = ({ bookings, onMessageFamily, onConfirmBooking, onViewDetails, onOpenContract }) => {
  const handleOpenContract = useCallback((booking, contract) => {
    onOpenContract?.(booking, contract);
  }, [onOpenContract]);

  const handleConfirmBooking = useCallback((booking) => {
    onConfirmBooking?.(booking);
  }, [onConfirmBooking]);

  const handleMessageFamily = useCallback((booking) => {
    onMessageFamily?.(booking);
  }, [onMessageFamily]);

  const handleViewDetails = useCallback((booking) => {
    onViewDetails?.(booking);
  }, [onViewDetails]);

  const renderBooking = useCallback(({ item }) => (
    <BookingCard
      booking={item}
      onMessageFamily={handleMessageFamily}
      onConfirmBooking={handleConfirmBooking}
      onViewDetails={handleViewDetails}
      onOpenContract={handleOpenContract}
    />
  ), [handleMessageFamily, handleConfirmBooking, handleViewDetails, handleOpenContract]);

  const keyExtractor = useCallback((item) => String(item.id), []);

  return (
    <FlatList
      data={bookings}
      renderItem={renderBooking}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.bookingsList}
    />
  );
};

const CaregiverBookingsTabWithModal = ({ bookings, onMessageFamily, onConfirmBooking, onViewDetails, onOpenContract, pendingContract, onPendingContractHandled }) => {
  const [selectedContract, setSelectedContract] = useState(null);
  const [selectedBookingForContract, setSelectedBookingForContract] = useState(null);
  const [contractModalVisible, setContractModalVisible] = useState(false);

  const handleContractSigned = useCallback(async ({ signature, acknowledged }) => {
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
        result = await contractService.signContract(existing.id, 'caregiver', {
          signature,
          signatureHash: btoa(signature),
          ipAddress: null
        });
      } catch (error) {
        if (error?.code === 'CONTRACT_NOT_FOUND') {
          Alert.alert('Contract unavailable', 'This contract could not be found. Please refresh and try again.');
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

  const handleContractDownload = useCallback(async (contract) => {
    if (!contract) return;

    try {
      const result = await contractService.generateContractPdf(contract.id, { autoDownload: true });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf' });
      } else if (Platform.OS === 'android') {
        Alert.alert('Downloaded', `PDF saved at:\n${fileUri}`);
      } else {
        Alert.alert('Downloaded', 'PDF saved. Open it with a PDF viewer or Files app.');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Alert.alert('Download failed', error instanceof Error ? error.message : String(error));
    }
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

  const handleCloseContractModal = useCallback(() => {
    setContractModalVisible(false);
    setSelectedContract(null);
    setSelectedBookingForContract(null);
  }, []);

  return (
    <>
      <BookingsTab
        bookings={bookings}
        onMessageFamily={onMessageFamily}
        onConfirmBooking={onConfirmBooking}
        onViewDetails={onViewDetails}
        onOpenContract={onOpenContract}
      />
      <ContractModal
        visible={contractModalVisible}
        onClose={handleCloseContractModal}
        contract={selectedContract}
        booking={selectedBookingForContract}
        viewerRole="caregiver"
        onSign={handleContractSigned}
        onResend={handleContractResend}
        onDownloadPdf={handleContractDownload}
      />
    </>
  );
};

export default CaregiverBookingsTabWithModal;
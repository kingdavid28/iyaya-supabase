import { formatDistanceToNow } from 'date-fns';
import { Briefcase, CheckCircle, Clock, FileText, MapPin, MessageCircle, User, XCircle } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Image, Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
    SkeletonBlock,
    SkeletonCard,
    SkeletonCircle,
    SkeletonPill
} from '../../../components/common/SkeletonPlaceholder';
import { getProfileImageUrl } from '../../../utils/imageUtils';
import { colors, styles as sharedStyles } from '../../styles/ParentDashboard.styles';

const statusMeta = {
  pending: { label: 'Pending', color: colors.info, background: '#EEF2FF' },
  shortlisted: { label: 'Shortlisted', color: colors.accent, background: '#FFFBEB' },
  accepted: { label: 'Accepted', color: colors.success, background: '#ECFDF5' },
  rejected: { label: 'Rejected', color: colors.error, background: '#FEF2F2' }
};

const JobApplicationsTab = ({
  applications = [],
  loading = false,
  mutatingApplicationId = null,
  refreshing = false,
  onRefresh,
  onViewCaregiver,
  onMessageCaregiver,
  onUpdateStatus,
  onOpenContract
}) => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const listRef = useRef(null);
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const sortedApplications = useMemo(() => {
    return [...applications].sort((a, b) => {
      const left = a.appliedAt || a.createdAt || a.updatedAt;
      const right = b.appliedAt || b.createdAt || b.updatedAt;
      return new Date(right || 0).getTime() - new Date(left || 0).getTime();
    });
  }, [applications]);

  const normalizeStatus = (status) => (status || '').toString().trim().toLowerCase();

  const filteredApplications = useMemo(() => {
    if (selectedFilter === 'new') {
      return sortedApplications.filter((app) => normalizeStatus(app.status) === 'pending');
    }
    if (selectedFilter === 'reviewed') {
      return sortedApplications.filter((app) => ['accepted', 'rejected', 'shortlisted'].includes(normalizeStatus(app.status)));
    }
    return sortedApplications;
  }, [normalizeStatus, sortedApplications, selectedFilter]);

  const pendingCount = useMemo(
    () => applications.filter((app) => normalizeStatus(app.status) === 'pending').length,
    [applications, normalizeStatus]
  );

  const renderStatusBadge = (status) => {
    const key = typeof status === 'string' ? status.toLowerCase() : 'pending';
    const meta = statusMeta[key] || statusMeta.pending;
    return (
      <View style={[styles.statusBadge, { backgroundColor: meta.background }]}> 
        <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
      </View>
    );
  };

  const handleRefresh = useCallback(async () => {
    if (pullRefreshing) return;
    setPullRefreshing(true);
    try {
      await onRefresh?.();
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      });
    } catch (error) {
      console.warn('⚠️ JobApplicationsTab refresh failed:', error);
    } finally {
      setPullRefreshing(false);
    }
  }, [onRefresh, pullRefreshing]);

  const renderApplication = ({ item }) => {
    const caregiverImage = getProfileImageUrl({ profileImage: item.caregiverProfileImage, name: item.caregiverName });
    const status = (item.status || '').toLowerCase();
    const applicationId = item.id || item._id;
    const jobId = item.jobId || item.job?.id || item.job_id;
    const contractId = item.contractId || item.contract_id || item.contract?.id;
    const bookingId = item.bookingId || item.booking_id || item.booking?.id;
    const contractStatus = item.contractStatus || item.contract?.status || (contractId ? 'draft' : null);
    let appliedAgo = 'Recently';
    if (item.appliedAt || item.createdAt || item.updatedAt) {
      const rawDate = item.appliedAt || item.createdAt || item.updatedAt;
      const parsedDate = rawDate instanceof Date ? rawDate : new Date(rawDate);
      if (!Number.isNaN(parsedDate?.getTime())) {
        appliedAgo = formatDistanceToNow(parsedDate, { addSuffix: true });
      }
    }

    const caregiverPhone = item.caregiverPhone || item.caregiver?.phone;
    const hasCaregiverPhone = Boolean(caregiverPhone);
    const isMutating = mutatingApplicationId && String(mutatingApplicationId) === String(applicationId);

    const handleCallCaregiver = () => {
      if (!caregiverPhone) {
        Alert.alert('No phone number', 'This caregiver has not provided a phone number.');
        return;
      }
      Linking.openURL(`tel:${caregiverPhone}`).catch(() => {
        Alert.alert('Unable to place call', 'Please try again later.');
      });
    };

    const safeUpdateStatus = (nextStatus) => {
      if (!applicationId) {
        Alert.alert('Error', 'Missing application identifier. Please refresh and try again.');
        return;
      }
      onUpdateStatus?.(applicationId, nextStatus, jobId);
    };

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.jobInfo}>
            <View style={styles.iconCircle}>
              <Briefcase size={16} color={colors.surface} />
            </View>
            <View style={styles.jobTextContainer}>
              <Text style={styles.jobTitle}>{item.jobTitle || 'Job Posting'}</Text>
              <View style={styles.jobMeta}>
                <MapPin size={12} color={colors.textTertiary} />
                <Text style={styles.jobMetaText}>{item.jobLocation || 'Location to be confirmed'}</Text>
              </View>
            </View>
          </View>
          {renderStatusBadge(item.status)}
        </View>

        <View style={styles.caregiverRow}>
          <View style={styles.avatarContainer}>
            {caregiverImage ? (
              <Image source={{ uri: caregiverImage }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <User size={18} color={colors.textInverse} />
              </View>
            )}
          </View>
          <View style={styles.caregiverDetails}>
            {Number.isFinite(Number(item.proposedRate)) && Number(item.proposedRate) > 0 ? (
              <View style={styles.proposedRatePill}>
                <Text style={styles.proposedRateLabel}>Proposed rate</Text>
                <Text style={styles.proposedRateValue}>
                  ₱{Number(item.proposedRate).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                  <Text style={styles.proposedRateUnit}> / hr</Text>
                </Text>
              </View>
            ) : null}
            <Text
              style={styles.caregiverName}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.caregiverName || 'Caregiver'}
            </Text>
            <View style={styles.appliedTime}>
              <Clock size={12} color={colors.textTertiary} />
              <Text
                style={styles.appliedTimeText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Applied {appliedAgo}
              </Text>
            </View>
          </View>
        </View>

        {item.message ? (
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>{item.message}</Text>
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() => onViewCaregiver?.({ _id: item.caregiverId, id: item.caregiverId, name: item.caregiverName })}
          >
            <Text style={styles.primaryActionText}>View Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => onMessageCaregiver?.({ id: item.caregiverId, _id: item.caregiverId, name: item.caregiverName })}
          >
            <MessageCircle size={16} color={colors.info} />
            <Text style={styles.secondaryActionText}>Message</Text>
          </TouchableOpacity>
        </View>

        {(status === 'pending' || status === 'shortlisted') && (
          <View style={styles.decisionRow}>
            <TouchableOpacity
              style={[styles.decisionButton, styles.acceptButton, isMutating && styles.decisionButtonDisabled]}
              onPress={() => safeUpdateStatus('accepted')}
              disabled={isMutating}
            >
              {isMutating ? (
                <Clock size={16} color={colors.surface} />
              ) : (
                <CheckCircle size={16} color={colors.surface} />
              )}
              <Text style={styles.decisionText}>{isMutating ? 'Updating…' : 'Accept'}</Text>
            </TouchableOpacity>
            {status === 'pending' && (
              <TouchableOpacity
                style={[styles.decisionButton, styles.shortlistButton, isMutating && styles.decisionButtonDisabled]}
                onPress={() => safeUpdateStatus('shortlisted')}
                disabled={isMutating}
              >
                <Clock size={16} color={colors.info} style={styles.decisionIcon} />
                <Text style={styles.decisionShortlistText}>Short list</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.decisionButton, styles.rejectButton, isMutating && styles.decisionButtonDisabled]}
              onPress={() => safeUpdateStatus('rejected')}
              disabled={isMutating}
            >
              <XCircle size={16} color={colors.error} />
              <Text style={styles.decisionRejectText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'accepted' && (
          <View style={styles.contractSection}>
            <View style={styles.contractStatusRow}>
              <FileText size={16} color={colors.info} />
              <View style={styles.contractStatusTextGroup}>
                <Text style={styles.contractStatusLabel}>Contract</Text>
                <Text style={styles.contractStatusValue}>
                  {contractId ? `Status: ${String(contractStatus || 'draft').replace(/_/g, ' ')}` : 'Not created yet'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.reviewContractButton, !contractId && styles.reviewContractButtonDisabled]}
              disabled={!contractId || isMutating}
              onPress={() => {
                if (!contractId) {
                  Alert.alert('Contract unavailable', 'We could not locate a contract for this application yet. Please wait a moment or try refreshing.');
                  return;
                }
                onOpenContract?.({
                  contractId,
                  bookingId,
                  application: item
                });
              }}
            >
              <Text style={[styles.reviewContractButtonText, !contractId && styles.reviewContractButtonTextDisabled]}>
                Review & Sign
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {['accepted', 'rejected'].includes(status) && hasCaregiverPhone && (
          <View style={styles.followUpActions}>
            <TouchableOpacity
              style={[styles.contactBtn, styles.callContactBtn]}
              onPress={handleCallCaregiver}
            >
              <Text style={styles.contactBtnText}>Call</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading && sortedApplications.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.skeletonContainer}>
        <SkeletonCard style={styles.skeletonHeader}>
          <View style={styles.skeletonHeaderContent}>
            <SkeletonBlock width="45%" height={20} />
            <View style={styles.skeletonBadgeRow}>
              <SkeletonPill width="28%" height={32} />
              <SkeletonPill width="28%" height={32} />
              <SkeletonPill width="28%" height={32} />
            </View>
          </View>
        </SkeletonCard>

        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={`application-skeleton-${index}`} style={styles.skeletonCard}>
            <View style={styles.skeletonJobRow}>
              <SkeletonCircle size={40} />
              <View style={styles.skeletonJobInfo}>
                <SkeletonBlock width="65%" height={18} />
                <SkeletonBlock width="45%" height={14} />
              </View>
              <SkeletonPill width="22%" height={18} />
            </View>

            <View style={styles.skeletonCaregiverRow}>
              <SkeletonCircle size={36} />
              <View style={styles.skeletonCaregiverInfo}>
                <SkeletonBlock width="55%" height={16} />
                <SkeletonPill width="40%" height={12} />
              </View>
            </View>

            <SkeletonBlock width="90%" height={14} style={styles.skeletonMessageLine} />
            <SkeletonBlock width="80%" height={14} />

            <View style={styles.skeletonActionsRow}>
              <SkeletonPill width="40%" height={32} />
              <SkeletonPill width="36%" height={32} />
            </View>
          </SkeletonCard>
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={sharedStyles.tabContent}>
      {/* Filter Tabs */}
      <View style={sharedStyles.filterTabs}>
        {['all', 'new', 'reviewed'].map((filterKey) => (
          <TouchableOpacity
            key={filterKey}
            style={[
              sharedStyles.filterTab,
              selectedFilter === filterKey && sharedStyles.activeFilterTab
            ]}
            onPress={() => setSelectedFilter(filterKey)}
          >
            <Text style={[
              sharedStyles.filterTabText,
              selectedFilter === filterKey && sharedStyles.activeFilterTabText
            ]}>
              {filterKey.charAt(0).toUpperCase() + filterKey.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        ref={listRef}
        style={styles.list}
        data={filteredApplications}
        keyExtractor={(item, index) => String(item.id || `${item.jobId || 'job'}-${item.caregiverId || index}`)}
        renderItem={renderApplication}
        contentContainerStyle={filteredApplications.length === 0 ? styles.emptyContent : styles.listContent}
        refreshControl={onRefresh ? (
          <RefreshControl
            refreshing={Boolean(refreshing) || pullRefreshing}
            onRefresh={handleRefresh}
          />
        ) : undefined}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <User size={40} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>
              {selectedFilter === 'new'
                ? 'No new applications'
                : selectedFilter === 'reviewed'
                ? 'No reviewed applications'
                : 'No job applications yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {selectedFilter === 'new'
                ? 'Check back later for new caregiver applications.'
                : selectedFilter === 'reviewed'
                ? 'Applications you have reviewed will appear here.'
                : 'Caregiver applications will appear here once they apply to your jobs.'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  skeletonContainer: {
    padding: 20,
    gap: 16
  },
  skeletonHeader: {
    padding: 16
  },
  skeletonHeaderContent: {
    gap: 16
  },
  skeletonBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  skeletonCard: {
    padding: 20
  },
  skeletonJobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  skeletonJobInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 8
  },
  skeletonCaregiverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16
  },
  skeletonCaregiverInfo: {
    flex: 1,
    gap: 6
  },
  skeletonMessageLine: {
    marginBottom: 8
  },
  skeletonActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16
  },
  emptyContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text
  },
  emptySubtitle: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  jobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary
  },
  jobTextContainer: {
    flex: 1
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text
  },
  jobMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4
  },
  jobMetaText: {
    marginLeft: 4,
    color: colors.textSecondary,
    fontSize: 13
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  },
  caregiverRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginTop: 20
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 14,
    borderWidth: 1,
    borderColor: colors.border
  },
  avatarImage: {
    width: '100%',
    height: '100%'
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary
  },
  caregiverDetails: {
    flex: 1
  },
  proposedRatePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: colors.info,
    marginBottom: 8,
    maxWidth: '100%'
  },
  proposedRateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.info,
    marginBottom: 2,
  },
  proposedRateValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  proposedRateUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  caregiverName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    maxWidth: '100%'
  },
  appliedTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
    maxWidth: '100%'
  },
  appliedTimeText: {
    fontSize: 12,
    color: colors.textSecondary
  },
  messageContainer: {
    marginTop: 16,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 12
  },
  messageText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16
  },
  primaryAction: {
    flex: 1,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    alignItems: 'center'
  },
  primaryActionText: {
    color: colors.surface,
    fontWeight: '600'
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.info,
    backgroundColor: '#EFF6FF'
  },
  secondaryActionText: {
    color: colors.info,
    fontWeight: '600'
  },
  decisionRow: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'space-between'
  },
  decisionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1
  },
  decisionButtonDisabled: {
    opacity: 0.6
  },
  acceptButton: {
    marginRight: 8,
    backgroundColor: colors.success,
    borderColor: colors.success
  },
  decisionText: {
    color: colors.surface,
    fontWeight: '700'
  },
  shortlistButton: {
    marginRight: 8,
    borderColor: colors.info,
    backgroundColor: '#EEF4FF',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2
  },
  decisionIcon: {
    marginVertical: -1
  },
  decisionShortlistText: {
    color: colors.info,
    fontWeight: '700',
    letterSpacing: 0.2
  },
  rejectButton: {
    borderColor: colors.error,
    backgroundColor: '#FEE2E2'
  },
  decisionRejectText: {
    color: colors.error,
    fontWeight: '600'
  },
  contractSection: {
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    gap: 12,
  },
  contractStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contractStatusTextGroup: {
    flex: 1,
  },
  contractStatusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.info,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contractStatusValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  reviewContractButton: {
    backgroundColor: colors.info,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  reviewContractButtonDisabled: {
    backgroundColor: '#CBD5F5',
  },
  reviewContractButtonText: {
    color: colors.surface,
    fontWeight: '600',
  },
  reviewContractButtonTextDisabled: {
    color: '#E0E7FF',
  },
  followUpActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1
  },
  messageContactBtn: {
    borderColor: colors.info,
    backgroundColor: '#EFF6FF'
  },
  callContactBtn: {
    borderColor: colors.success,
    backgroundColor: '#ECFDF5'
  },
  contactBtnText: {
    marginLeft: 6,
    fontWeight: '600',
    color: colors.textSecondary
  }
});

export default JobApplicationsTab;

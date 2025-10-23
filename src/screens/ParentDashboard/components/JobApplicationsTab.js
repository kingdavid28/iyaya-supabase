import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Image, Alert, Linking, ScrollView } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { User, Briefcase, MapPin, Clock, MessageCircle, CheckCircle, XCircle } from 'lucide-react-native';
import { colors } from '../../styles/ParentDashboard.styles';
import { getProfileImageUrl } from '../../../utils/imageUtils';
import {
  SkeletonCard,
  SkeletonBlock,
  SkeletonCircle,
  SkeletonPill
} from '../../../components/common/SkeletonPlaceholder';

const statusMeta = {
  pending: { label: 'Pending', color: colors.info, background: '#EEF2FF' },
  shortlisted: { label: 'Shortlisted', color: colors.accent, background: '#FFFBEB' },
  accepted: { label: 'Accepted', color: colors.success, background: '#ECFDF5' },
  rejected: { label: 'Rejected', color: colors.error, background: '#FEF2F2' }
};

const JobApplicationsTab = ({
  applications = [],
  loading = false,
  refreshing = false,
  onRefresh,
  onViewCaregiver,
  onMessageCaregiver,
  onUpdateStatus
}) => {
  const [selectedFilter, setSelectedFilter] = useState('all');

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

  const renderApplication = ({ item }) => {
    const caregiverImage = getProfileImageUrl({ profileImage: item.caregiverProfileImage, name: item.caregiverName });
    const status = (item.status || '').toLowerCase();
    const applicationId = item.id || item._id;
    const jobId = item.jobId || item.job?.id || item.job_id;
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
            <Text style={styles.caregiverName}>{item.caregiverName || 'Caregiver'}</Text>
            <View style={styles.appliedTime}>
              <Clock size={12} color={colors.textTertiary} />
              <Text style={styles.appliedTimeText}>Applied {appliedAgo}</Text>
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
              style={[styles.decisionButton, styles.acceptButton]}
              onPress={() => safeUpdateStatus('accepted')}
            >
              <CheckCircle size={16} color={colors.surface} />
              <Text style={styles.decisionText}>Accept</Text>
            </TouchableOpacity>
            {status === 'pending' && (
              <TouchableOpacity
                style={[styles.decisionButton, styles.shortlistButton]}
                onPress={() => safeUpdateStatus('shortlisted')}
              >
                <Clock size={16} color={colors.secondary} />
                <Text style={styles.decisionShortlistText}>Shortlist</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.decisionButton, styles.rejectButton]}
              onPress={() => safeUpdateStatus('rejected')}
            >
              <XCircle size={16} color={colors.error} />
              <Text style={styles.decisionRejectText}>Reject</Text>
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
    <View style={styles.wrapper}>
      <View style={styles.tabsContainer}>
        {['all', 'new', 'reviewed'].map((filterKey) => {
          const isActive = selectedFilter === filterKey;
          const label = filterKey === 'all' ? 'All' : filterKey === 'new' ? 'New' : 'Reviewed';
          return (
            <TouchableOpacity
              key={filterKey}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setSelectedFilter(filterKey)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
              {filterKey === 'new' && !isActive && pendingCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingCount}</Text>
                </View>
              )}
              {isActive && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredApplications}
        keyExtractor={(item, index) => String(item.id || `${item.jobId || 'job'}-${item.caregiverId || index}`)}
        renderItem={renderApplication}
        contentContainerStyle={filteredApplications.length === 0 ? styles.emptyContent : styles.listContent}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
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
  wrapper: {
    flex: 1
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
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    position: 'relative'
  },
  tabActive: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: colors.info
  },
  tabText: {
    fontWeight: '600',
    color: colors.textSecondary
  },
  tabTextActive: {
    color: colors.info
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -6,
    height: 4,
    width: '30%',
    borderRadius: 2,
    backgroundColor: colors.info
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: colors.secondary
  },
  badgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center'
  },
  emptyContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
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
    alignItems: 'center',
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
  caregiverName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text
  },
  appliedTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  appliedTimeText: {
    marginLeft: 6,
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
    borderRadius: 12,
    borderWidth: 1
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
    borderColor: colors.secondary,
    backgroundColor: colors.primaryLight
  },
  decisionShortlistText: {
    color: colors.secondary,
    fontWeight: '600'
  },
  rejectButton: {
    borderColor: colors.error,
    backgroundColor: '#FEE2E2'
  },
  decisionRejectText: {
    color: colors.error,
    fontWeight: '600'
  },
  followUpActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12
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

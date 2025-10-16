import React, { useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { User, Briefcase, MapPin, Clock, MessageCircle, CheckCircle, XCircle } from 'lucide-react-native';
import { colors } from '../../styles/ParentDashboard.styles';
import { getProfileImageUrl } from '../../../utils/imageUtils';

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
  const sortedApplications = useMemo(() => {
    return [...applications].sort((a, b) => {
      const left = a.appliedAt || a.createdAt || a.updatedAt;
      const right = b.appliedAt || b.createdAt || b.updatedAt;
      return new Date(right || 0).getTime() - new Date(left || 0).getTime();
    });
  }, [applications]);

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
    let appliedAgo = 'Recently';
    if (item.appliedAt || item.createdAt || item.updatedAt) {
      const rawDate = item.appliedAt || item.createdAt || item.updatedAt;
      const parsedDate = rawDate instanceof Date ? rawDate : new Date(rawDate);
      if (!Number.isNaN(parsedDate?.getTime())) {
        appliedAgo = formatDistanceToNow(parsedDate, { addSuffix: true });
      }
    }

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

        {(item.status === 'pending' || item.status === 'shortlisted') && (
          <View style={styles.decisionRow}>
            <TouchableOpacity
              style={[styles.decisionButton, styles.acceptButton]}
              onPress={() => onUpdateStatus?.(item.id, 'accepted')}
            >
              <CheckCircle size={16} color={colors.surface} />
              <Text style={styles.decisionText}>Accept</Text>
            </TouchableOpacity>
            {item.status === 'pending' && (
              <TouchableOpacity
                style={[styles.decisionButton, styles.shortlistButton]}
                onPress={() => onUpdateStatus?.(item.id, 'shortlisted')}
              >
                <Clock size={16} color={colors.secondary} />
                <Text style={styles.decisionShortlistText}>Shortlist</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.decisionButton, styles.rejectButton]}
              onPress={() => onUpdateStatus?.(item.id, 'rejected')}
            >
              <XCircle size={16} color={colors.error} />
              <Text style={styles.decisionRejectText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading && sortedApplications.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading applications...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={sortedApplications}
      keyExtractor={(item, index) => String(item.id || `${item.jobId || 'job'}-${item.caregiverId || index}`)}
      renderItem={renderApplication}
      contentContainerStyle={sortedApplications.length === 0 ? styles.emptyContent : styles.listContent}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <User size={40} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No job applications yet</Text>
          <Text style={styles.emptySubtitle}>Caregiver applications will appear here once they apply to your jobs.</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 14
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 16
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
  }
});

export default JobApplicationsTab;

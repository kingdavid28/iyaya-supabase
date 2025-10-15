import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../shared/ui';
import { styles } from '../styles/CaregiverDashboard.styles';

const ApplicationCard = React.memo(({ application, onViewJob, onWithdraw }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#F59E0B';
      case 'accepted': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'shortlisted': return '#3B82F6';
      default: return '#9CA3AF';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'time-outline';
      case 'accepted': return 'checkmark-circle-outline';
      case 'rejected': return 'close-circle-outline';
      case 'shortlisted': return 'star-outline';
      default: return 'help-circle-outline';
    }
  };

  const job = application?.job || {};
  const appliedDate = application?.applied_at || application?.appliedAt || application?.created_at;

  return (
    <View style={applicationCardStyles.card}>
      <View style={applicationCardStyles.header}>
        <View style={applicationCardStyles.jobInfo}>
          <Text style={applicationCardStyles.jobTitle} numberOfLines={2}>
            {job?.title || application?.jobTitle || application?.job_title || 'Job Position'}
          </Text>
          <Text style={applicationCardStyles.familyName}>
            {job?.family || job?.familyName || application?.family || 'Family'} • {job?.location || application?.location || 'Location'}
          </Text>
        </View>
        <View style={[applicationCardStyles.statusBadge, { backgroundColor: getStatusColor(application.status) }]}>
          <Ionicons name={getStatusIcon(application.status)} size={14} color="#fff" />
          <Text style={applicationCardStyles.statusText}>{application.status || 'Unknown'}</Text>
        </View>
      </View>
      
      <View style={applicationCardStyles.details}>
        <View style={applicationCardStyles.detailRow}>
          <Ionicons name="cash-outline" size={16} color="#6b7280" />
          <Text style={applicationCardStyles.detailText}>₱{application?.proposedRate || job?.hourly_rate || job?.hourlyRate || job?.rate || 0}/hr</Text>
        </View>
        
        <View style={applicationCardStyles.detailRow}>
          <Ionicons name="people-outline" size={16} color="#6b7280" />
          <Text style={applicationCardStyles.detailText}>
            {job?.children?.length ? `${job.children.length} child${job.children.length > 1 ? 'ren' : ''}` : 
             job?.childrenCount ? `${job.childrenCount} child${job.childrenCount > 1 ? 'ren' : ''}` : 
             'Children info available'}
          </Text>
        </View>
        
        <View style={applicationCardStyles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#6b7280" />
          <Text style={applicationCardStyles.detailText}>
            Applied {appliedDate ? new Date(appliedDate).toLocaleDateString() : 'recently'}
          </Text>
        </View>
        
        {job?.schedule && (
          <View style={applicationCardStyles.detailRow}>
            <Ionicons name="time-outline" size={16} color="#6b7280" />
            <Text style={applicationCardStyles.detailText}>{job.schedule}</Text>
          </View>
        )}
      </View>
      
      {application?.message && (
        <View style={applicationCardStyles.messageContainer}>
          <Text style={applicationCardStyles.messageLabel}>Your message:</Text>
          <Text style={applicationCardStyles.messageText} numberOfLines={2}>
            "{application.message}"
          </Text>
        </View>
      )}
      
      <View style={applicationCardStyles.footer}>
        <TouchableOpacity 
          style={applicationCardStyles.viewButton}
          onPress={() => {
            console.log('🔍 View Job clicked:', { job, application });
            onViewJob && onViewJob(job, application);
          }}
        >
          <Ionicons name="eye-outline" size={16} color="#3B82F6" />
          <Text style={applicationCardStyles.viewButtonText}>View Job</Text>
        </TouchableOpacity>
        
        {application.status === 'pending' && (
          <TouchableOpacity 
            style={applicationCardStyles.withdrawButton}
            onPress={() => onWithdraw && onWithdraw(application.id || application._id)}
          >
            <Ionicons name="close-outline" size={16} color="#EF4444" />
            <Text style={applicationCardStyles.withdrawButtonText}>Withdraw</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const applicationCardStyles = {
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  familyName: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  details: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  messageContainer: {
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 13,
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
    backgroundColor: '#F0F9FF',
    gap: 4,
  },
  viewButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
    gap: 4,
  },
  withdrawButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
};

const normalizeStatus = (status) => String(status || '').toLowerCase();

const computeFilterCounts = (applications) => {
  const counts = {
    all: Array.isArray(applications) ? applications.length : 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    shortlisted: 0
  };

  if (!Array.isArray(applications)) return counts;

  applications.forEach((app) => {
    const status = normalizeStatus(app?.status);
    if (status === 'pending') counts.pending += 1;
    if (status === 'accepted') counts.accepted += 1;
    if (status === 'rejected') counts.rejected += 1;
    if (status === 'shortlisted') counts.shortlisted += 1;
  });

  return counts;
};

const getFilteredApplications = (applications, activeFilter) => {
  if (!Array.isArray(applications)) return [];

  return applications.filter((app) => {
    const status = normalizeStatus(app?.status);
    
    switch (activeFilter) {
      case 'pending':
        return status === 'pending';
      case 'accepted':
        return status === 'accepted';
      case 'rejected':
        return status === 'rejected';
      case 'shortlisted':
        return status === 'shortlisted';
      default:
        return true;
    }
  });
};

const buildFilterOptions = (metrics) => ([
  { key: 'all', label: 'All', count: metrics.all },
  { key: 'pending', label: 'Pending', count: metrics.pending },
  { key: 'shortlisted', label: 'Shortlisted', count: metrics.shortlisted },
  { key: 'accepted', label: 'Accepted', count: metrics.accepted },
  { key: 'rejected', label: 'Rejected', count: metrics.rejected }
]);

export default function ApplicationsTab({
  applications,
  onViewJob,
  onWithdrawApplication,
  refreshing = false,
  onRefresh,
  loading = false
}) {
  console.log('🔍 ApplicationsTab received onViewJob:', typeof onViewJob);
  const [activeFilter, setActiveFilter] = useState('all');

  const filterMetrics = useMemo(() => computeFilterCounts(applications), [applications]);
  const visibleApplications = useMemo(() => getFilteredApplications(applications, activeFilter), [applications, activeFilter]);
  const options = useMemo(() => buildFilterOptions(filterMetrics), [filterMetrics]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading applications...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#3B82F6']}
          tintColor="#3B82F6"
        />
      }
    >
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
                  style={[
                    styles.bookingFilterTab,
                    isActive && styles.activeBookingFilterTab
                  ]}
                  onPress={() => setActiveFilter(option.key)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.bookingFilterTabText,
                      isActive && styles.activeBookingFilterTabText
                    ]}
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

        {visibleApplications.length > 0 ? (
          visibleApplications.map((application) => (
            <ApplicationCard
              key={application.id || application._id}
              application={application}
              onViewJob={onViewJob}
              onWithdraw={onWithdrawApplication}
            />
          ))
        ) : (
          <EmptyState
            icon="document-text"
            title="No applications found"
            subtitle={
              activeFilter === 'all'
                ? 'Your job applications will appear here'
                : 'Try another tab to see more applications'
            }
          />
        )}
      </View>
    </ScrollView>
  );
}
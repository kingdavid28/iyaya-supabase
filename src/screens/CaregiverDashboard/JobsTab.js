import { LinearGradient } from 'expo-linear-gradient';
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  Clock,
  Compass,
  DollarSign,
  Filter,
  Target,
  TrendingUp,
  Users
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Chip } from 'react-native-paper';
import {
  SkeletonBlock,
  SkeletonCard,
  SkeletonCircle,
  SkeletonPill
} from '../../components/common/SkeletonPlaceholder';
import { styles as dashboardStyles } from '../styles/CaregiverDashboard.styles';

const localStyles = StyleSheet.create({
  screenContainer: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 12 },
  summaryCard: {
    flexGrow: 1,
    minWidth: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryCardTablet: {
    minWidth: '30%',
    flexBasis: '30%',
  },
  summaryCardDesktop: {
    minWidth: '22%',
    flexBasis: '22%',
  },
  summaryTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  summaryIconContainer: { marginBottom: 8 },
  summaryValue: { fontSize: 22, fontWeight: '700', color: '#111827' },
  summaryLabel: { fontSize: 13, color: '#6B7280' },
  filterSection: { marginBottom: 20 },
  filterHeader: { flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 },
  filterHeaderWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  filterHeaderTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  filterAction: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 6, gap: 6 },
  filterActionText: { color: '#2563EB', fontSize: 14, fontWeight: '500' },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    width: '100%',
    overflow: 'hidden',
  },
  jobCardFullWidth: {
    width: '100%',
    alignSelf: 'stretch',
  },
  jobCardGrid: {
    flex: 1,
    maxWidth: '100%',
    alignSelf: 'stretch',
    marginHorizontal: 8,
  },
  jobHeaderGradient: {
    padding: 16,
  },
  jobHeaderGradientContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  jobCardBody: {
    padding: 16,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  jobTitleWrapper: { flex: 1, minWidth: 0 },
  jobTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 22,
    flexShrink: 1,
  },
  jobMetaText: {
    marginTop: 4,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    flexShrink: 1,
    lineHeight: 18,
    flexBasis: '100%',
  },
  jobHeaderRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    gap: 6,
    minWidth: 80,
    justifyContent: 'center',
  },
  jobRateText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  urgentBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  urgentText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  jobDetails: { marginBottom: 16, gap: 8 },
  jobDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  jobDetailText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    flexWrap: 'wrap',
  },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  listHeaderContainer: { width: '100%' },
  listHeaderWide: { alignItems: 'stretch' },
  listHeaderComponent: { paddingBottom: 16 },
  listContentTablet: { paddingHorizontal: 24 },
  listContentDesktop: { paddingHorizontal: 40 },
  gridColumnWrapper: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 8 },
  tagPill: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    maxWidth: '100%',
  },
  tagText: { color: '#0369A1', fontSize: 11, fontWeight: '500', textAlign: 'center' },
  jobDescription: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 14,
  },
  jobActions: { flexDirection: 'row', gap: 12 },
  viewButton: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5F5', alignItems: 'center', backgroundColor: '#F8FAFC' },
  viewButtonText: { color: '#1D4ED8', fontSize: 14, fontWeight: '600' },
  applyButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#2563EB', alignItems: 'center' },
  applyButtonDisabled: { backgroundColor: '#CBD5F5' },
  applyButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  listEmptyContainer: { alignItems: 'center', paddingVertical: 64, gap: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 },
  appliedBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  appliedBadgeText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },
  metaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  postedText: { fontSize: 12, color: '#9CA3AF' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skeletonCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: '#E5E7EB', marginBottom: 12 },
  skeletonLineShort: { width: '60%' },
  skeletonLineMedium: { width: '80%' },
  skeletonLineLong: { width: '95%' },
});

const styles = { ...dashboardStyles, ...localStyles };

const FILTER_OPTIONS = [
  { key: 'all', label: 'All Jobs', icon: Briefcase },
  { key: 'nearby', label: 'Nearby', icon: Compass },
  { key: 'high-pay', label: 'High Pay', icon: TrendingUp },
  { key: 'urgent', label: 'Urgent', icon: AlertTriangle },
];

const SORT_OPTIONS = [
  { key: 'recent', label: 'Most Recent' },
  { key: 'highest-pay', label: 'Highest Pay' },
  { key: 'alphabetical', label: 'A-Z' },
];

const JOB_SKELETON_COUNT = 6;

const formatCurrency = (value) => {
  if (!value && value !== 0) return '₱0/hr';
  return `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 0 })}/hr`;
};

const formatDateDisplay = (value) => {
  if (!value) return 'Date not specified';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString();
};

const getRelativeTime = (value) => {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) return 'Posted recently';
  const diffMinutes = Math.floor((Date.now() - parsed.getTime()) / (1000 * 60));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return parsed.toLocaleDateString();
};

const resolveJobTags = (job) => {
  const tags = [];
  if (Array.isArray(job?.requirements)) tags.push(...job.requirements);
  if (Array.isArray(job?.skills)) tags.push(...job.skills);
  if (job?.careType) tags.push(job.careType);
  if (job?.childrenCount) tags.push(`${job.childrenCount} children`);
  if (job?.schedule) tags.push(job.schedule);
  if (job?.specialRequirements) tags.push(...job.specialRequirements);
  if (job?.experience) tags.push(job.experience);
  return tags.filter(Boolean).slice(0, 8); // Increased limit for more tags
};

export const CaregiverJobCard = ({ job, onApply, onView, hasApplied, style }) => {
  const [applying, setApplying] = useState(false);

  const handleApply = useCallback(async () => {
    if (applying || hasApplied) return;
    setApplying(true);
    try {
      await onApply?.(job);
    } catch (error) {
      console.error('Error applying to job:', error);
      Alert.alert('Error', 'Failed to apply to job. Please try again.');
    } finally {
      setApplying(false);
    }
  }, [applying, hasApplied, job, onApply]);

  const allTags = useMemo(() => {
    const tags = [];
    if (job?.careType) tags.push(String(job.careType));
    if (Array.isArray(job?.requirements)) {
      tags.push(...job.requirements.filter(Boolean).map(String).slice(0, 4));
    }
    return [...new Set(tags)].filter(Boolean).slice(0, 5);
  }, [job]);

  const childrenSummary = useMemo(() => {
    if (job?.childrenSummary) return String(job.childrenSummary);
    if (Array.isArray(job?.children) && job.children.length) {
      const count = job.children.length;
      const ages = job?.childrenAges ? ` (${String(job.childrenAges)})` : '';
      return `${count} child${count > 1 ? 'ren' : ''}${ages}`;
    }
    if (job?.childrenCount) {
      const ages = job?.childrenAges ? ` (${String(job.childrenAges)})` : '';
      return `${job.childrenCount} child${job.childrenCount > 1 ? 'ren' : ''}${ages}`;
    }
    return 'Child details available';
  }, [job]);

  return (
    <View
      style={[
        styles.jobCard,
        styles.jobCardFullWidth,
        style,
      ]}
    >
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.jobHeaderGradient}
      >
        <View style={styles.jobHeader}>
          <View style={styles.jobTitleWrapper}>
            <Text style={styles.jobTitle} numberOfLines={2}>{String(job?.title || 'Childcare Position')}</Text>
            <Text style={styles.jobMetaText} numberOfLines={1}>
              {String(job?.family || job?.familyName || 'Family')} · {String(job?.location || 'Location not specified')}
            </Text>
            {hasApplied && (
              <View style={styles.appliedBadge}>
                <Text style={styles.appliedBadgeText}>Applied</Text>
              </View>
            )}
          </View>

          <View style={styles.jobHeaderRight}>
            <View style={styles.statusPill}>
              <DollarSign size={16} color="#FFFFFF" />
              <Text style={styles.jobRateText}>{formatCurrency(job?.hourlyRate || job?.rate)}</Text>
            </View>

            {job?.urgent && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentText}>URGENT</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      <View style={styles.jobCardBody}>
        <View style={styles.jobDetails}>
          <View style={styles.jobDetailRow}>
            <Users size={16} color="#6B7280" />
            <Text style={styles.jobDetailText}>{String(childrenSummary)}</Text>
          </View>
          <View style={styles.jobDetailRow}>
            <Clock size={16} color="#6B7280" />
            <Text style={styles.jobDetailText}>
              {String(job?.schedule || job?.time || job?.workingHours || 'Flexible schedule')}
              {job?.startTime && job?.endTime ? ` (${String(job.startTime)} - ${String(job.endTime)})` : ''}
            </Text>
          </View>
          {job?.date && (
            <View style={styles.jobDetailRow}>
              <Calendar size={16} color="#6B7280" />
              <Text style={styles.jobDetailText}>{formatDateDisplay(job?.date)}</Text>
            </View>
          )}
        </View>

        {job?.description && (
          <View>
            <Text style={styles.jobDescription} numberOfLines={2}>
              {String(job.description)}
            </Text>
          </View>
        )}

        {allTags.length > 0 && (
          <View style={styles.tagContainer}>
            {allTags.map((tag, index) => (
              <View key={`${job?.id || job?._id}-${tag}-${index}`} style={styles.tagPill}>
                <Text style={styles.tagText}>{String(tag)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.jobActions}>
          <TouchableOpacity style={styles.viewButton} onPress={() => onView?.(job)}>
            <Text style={styles.viewButtonText}>View Details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.applyButton, (applying || hasApplied) && styles.applyButtonDisabled]}
            onPress={handleApply}
            disabled={applying || hasApplied}
          >
            <Text style={styles.applyButtonText}>
              {applying ? 'Applying…' : hasApplied ? 'Applied' : 'Apply Now'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metaFooter}>
          <Text style={styles.postedText}>Posted {getRelativeTime(job?.created_at || job?.createdAt || Date.now())}</Text>
        </View>
      </View>
    </View>
  );
};

const EmptyState = ({ title, subtitle }) => (
  <View style={styles.listEmptyContainer}>
    <Briefcase size={56} color="#E5E7EB" />
    <Text style={styles.emptyTitle}>{String(title || '')}</Text>
    <Text style={styles.emptySubtitle}>{String(subtitle || '')}</Text>
  </View>
);

export default function JobsTab({
  jobs = [],
  jobsLoading,
  applications = [],
  onRefresh,
  onJobApply,
  onJobView,
  refreshing = false,
  loading = false,
  searchQuery = '',
}) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeSort, setActiveSort] = useState('recent');

  const applicationJobIds = useMemo(() => {
    if (!Array.isArray(applications)) return new Set();
    return new Set(
      applications
        .map((app) => app?.job_id || app?.jobId || app?.job?.id || app?.job?._id)
        .filter(Boolean),
    );
  }, [applications]);

  const summaryMetrics = useMemo(() => {
    const totalJobs = jobs.length;
    const urgentJobs = jobs.filter((job) => job?.urgent).length;
    const highPayJobs = jobs.filter((job) => Number(job?.hourlyRate || 0) >= 400).length;
    const appliedJobs = jobs.filter((job) => applicationJobIds.has(job?.id || job?._id)).length;

    return [
      { key: 'total', label: 'Total Jobs', value: totalJobs, icon: Briefcase, accent: '#2563EB' },
      { key: 'highPay', label: 'High Pay', value: highPayJobs, icon: TrendingUp, accent: '#047857' },
      { key: 'urgent', label: 'Urgent Roles', value: urgentJobs, icon: AlertTriangle, accent: '#DC2626' },
      { key: 'applied', label: 'Applied', value: appliedJobs, icon: Target, accent: '#7C3AED' },
    ];
  }, [applicationJobIds, jobs]);

  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isLargeScreen = width >= 1024;
  const numColumns = isLargeScreen ? 3 : isTablet ? 2 : 1;

  const filteredAndSortedJobs = useMemo(() => {
    const filtered = jobs.filter((job) => {
      if (activeFilter === 'nearby') {
        return Boolean(job?.isNearby || (typeof job?.distance === 'number' && job.distance <= 10));
      }
      if (activeFilter === 'high-pay') return Number(job?.hourlyRate || 0) >= 400;
      if (activeFilter === 'urgent') return Boolean(job?.urgent);
      return true;
    });
    const searchLower = searchQuery.trim().toLowerCase();
    const searched = searchLower
      ? filtered.filter((job) => {
          const title = String(job?.title || '').toLowerCase();
          const family = String(job?.family || job?.familyName || '').toLowerCase();
          const location = String(job?.location || job?.address || '').toLowerCase();
          const tags = resolveJobTags(job).map((tag) => tag.toLowerCase());
          return (
            title.includes(searchLower) ||
            family.includes(searchLower) ||
            location.includes(searchLower) ||
            tags.some((tag) => tag.includes(searchLower))
          );
        })
      : filtered;

    return [...searched].sort((a, b) => {
      if (activeSort === 'highest-pay') {
        return Number(b?.hourlyRate || 0) - Number(a?.hourlyRate || 0);
      }
      if (activeSort === 'alphabetical') {
        return String(a?.title || '').localeCompare(String(b?.title || ''));
      }
      const dateA = new Date(a?.created_at || a?.createdAt || a?.postedAt || a?.date || 0).getTime();
      const dateB = new Date(b?.created_at || b?.createdAt || b?.postedAt || b?.date || 0).getTime();
      return dateB - dateA;
    });
  }, [activeFilter, activeSort, jobs]);

  const handleFilterChange = useCallback((nextFilter) => {
    setActiveFilter(nextFilter);
  }, []);

  const handleSortChange = useCallback(() => {
    setActiveSort((prev) => {
      const currentIndex = SORT_OPTIONS.findIndex((option) => option.key === prev);
      return SORT_OPTIONS[(currentIndex + 1) % SORT_OPTIONS.length].key;
    });
  }, []);

  const renderJobItem = useCallback(({ item }) => (
    <CaregiverJobCard
      job={item}
      onApply={() => onJobApply?.(item)}
      onView={() => onJobView?.(item)}
      hasApplied={applicationJobIds.has(item?.id || item?._id)}
    />
  ), [applicationJobIds, onJobApply, onJobView]);

  const listHeader = useMemo(() => (
    <View>
      <View style={styles.summaryGrid}>
        {summaryMetrics.map(({ key, label, value, icon: Icon, accent }) => (
          <View
            key={key}
            style={[
              styles.summaryCard,
              isLargeScreen && styles.summaryCardDesktop,
              isTablet && !isLargeScreen && styles.summaryCardTablet,
            ]}
          >
            <View style={styles.summaryIconContainer}>
              <Icon size={20} color={accent} />
            </View>
            <Text style={styles.summaryValue}>{value}</Text>
            <Text style={styles.summaryLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.filterSection}>
        <View style={[styles.filterHeader, (isTablet || isLargeScreen) && styles.filterHeaderWide]}>
          <Text style={styles.filterHeaderTitle}>Find the right job for you</Text>
          <TouchableOpacity style={styles.filterAction} onPress={handleSortChange}>
            <Filter size={16} color="#2563EB" />
            <Text style={styles.filterActionText}>
              {`Sort: ${SORT_OPTIONS.find((option) => option.key === activeSort)?.label}`}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chipRow}>
          {FILTER_OPTIONS.map(({ key, label, icon: Icon }) => (
            <Chip
              key={key}
              mode={activeFilter === key ? 'contained' : 'outlined'}
              selected={activeFilter === key}
              onPress={() => handleFilterChange(key)}
              style={{
                borderRadius: 999,
                backgroundColor: activeFilter === key ? '#2563EB' : '#FFFFFF',
                borderColor: '#CBD5F5',
              }}
              textStyle={{
                color: activeFilter === key ? '#FFFFFF' : '#1E3A8A',
                fontWeight: '600',
              }}
              icon={({ size }) => <Icon size={size} color={activeFilter === key ? '#FFFFFF' : '#1E40AF'} />}
            >
              {label}
            </Chip>
          ))}
        </View>
      </View>
    </View>
  ), [activeFilter, activeSort, handleFilterChange, handleSortChange, summaryMetrics]);


  const hasJobs = Array.isArray(jobs) && jobs.length > 0;
  const isLoading = loading && !hasJobs;

  const contentStyle = [
    styles.listContent,
    isTablet && styles.listContentTablet,
    isLargeScreen && styles.listContentDesktop,
  ];

  const listKey = useMemo(() => 'caregiver-jobs-list', []);

  if (isLoading) {
    return (
      <ScrollView contentContainerStyle={styles.jobsSkeletonContainer}>
        <View style={styles.jobsSkeletonSummaryRow}>
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonCard key={`summary-skeleton-${index}`} style={styles.jobsSkeletonSummaryCard}>
              <SkeletonCircle size={36} />
              <SkeletonBlock width="60%" height={16} />
              <SkeletonBlock width="40%" height={12} />
            </SkeletonCard>
          ))}
        </View>

        {Array.from({ length: JOB_SKELETON_COUNT }).map((_, index) => (
          <SkeletonCard key={`job-skeleton-${index}`} style={styles.jobsSkeletonCard}>
            <View style={styles.jobsSkeletonRow}>
              <SkeletonCircle size={42} />
              <View style={styles.jobsSkeletonInfo}>
                <SkeletonBlock width="70%" height={16} />
                <SkeletonBlock width="55%" height={14} />
              </View>
              <SkeletonPill width="26%" height={18} />
            </View>
            <SkeletonBlock width="92%" height={14} />
            <SkeletonBlock width="85%" height={14} />
            <View style={styles.jobsSkeletonFooter}>
              <SkeletonPill width="38%" height={14} />
              <SkeletonPill width="32%" height={14} />
            </View>
          </SkeletonCard>
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <FlatList
        data={filteredAndSortedJobs}
        key={listKey}
        keyExtractor={(item, index) => String(item?.id || item?._id || index)}
        renderItem={renderJobItem}
        ListHeaderComponent={listHeader}
        ListHeaderComponentStyle={styles.listHeaderComponent}
        ListEmptyComponent={
          !isLoading
            ? () => (
                <EmptyState
                  title={activeFilter === 'all' ? 'No jobs available' : 'No jobs match your filters'}
                  subtitle={
                    activeFilter === 'all'
                      ? 'Please check back later for new job postings.'
                      : 'Try adjusting your filters to discover more opportunities.'
                  }
                />
              )
            : undefined
        }
        contentContainerStyle={contentStyle}
        refreshing={refreshing || isLoading}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
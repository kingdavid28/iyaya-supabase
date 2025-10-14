import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ScrollView, RefreshControl, Image, ActivityIndicator } from 'react-native';
import { Calendar, Users, Eye, CheckCircle, XCircle, Plus, MapPin, Clock, Briefcase } from 'lucide-react-native';
import { styles, colors } from '../../styles/ParentDashboard.styles';
import { applicationsAPI } from '../../../services';
import PesoSign from '../../../components/ui/feedback/PesoSign';
import JobPostingModal from '../modals/JobPostingModal';
import { getProfileImageUrl } from '../../../utils/imageUtils';
import JobCard from './JobCard';

const JobsTab = ({
  jobs = [],
  refreshing,
  onRefresh,
  onCreateJob,
  onEditJob,
  onDeleteJob,
  onCompleteJob,
  onJobPosted,
  loading = false
}) => {
  const [filter, setFilter] = useState('all');
  const [selectedJob, setSelectedJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);

  const filteredJobs = jobs.filter(job => {
    if (filter === 'active') return job.status === 'active' || job.status === 'pending';
    if (filter === 'completed') return job.status === 'completed' || job.status === 'cancelled';
    return true;
  });

  const fetchJobApplications = useCallback(async (jobId) => {
    if (!jobId) {
      Alert.alert('Error', 'Invalid job ID.');
      return;
    }

    setApplicationsLoading(true);
    try {
      const response = await applicationsAPI.getForJob(jobId);
      const rawApplications = Array.isArray(response?.data)
        ? response.data
        : (Array.isArray(response) ? response : []);

      const normalizedApplications = rawApplications.map((app) => {
        const caregiverProfile = app.caregiverProfile || app.caregiver || app.caregiverId || {};
        const jobInfo = app.job || app.jobs || {};
        const parentInfo = jobInfo?.parent || null;

        return {
          id: app.id || app._id,
          _id: app.id || app._id,
          status: app.status || 'pending',
          message: app.message || '',
          appliedAt: app.applied_at || app.appliedAt || app.created_at || app.createdAt || null,
          createdAt: app.created_at || app.createdAt || null,
          caregiverProfile,
          caregiverId: caregiverProfile?.id || app.caregiver_id,
          job: jobInfo,
          jobParent: parentInfo,
        };
      });

      setApplications(normalizedApplications);
      setSelectedJob(jobId);
    } catch (error) {
      console.error('Error fetching applications:', error);
      Alert.alert('Error', 'Failed to load applications.');
    } finally {
      setApplicationsLoading(false);
    }
  }, []);

  const handleApplicationAction = async (applicationId, action) => {
    if (!applicationId || !action) {
      Alert.alert('Error', 'Invalid application data.');
      return;
    }

    try {
      await applicationsAPI.updateStatus(applicationId, action);
      Alert.alert(
        'Success',
        `Application ${action} successfully`,
        [{ text: 'OK', onPress: () => {
          if (selectedJob) {
            fetchJobApplications(selectedJob);
          }
        }}]
      );
    } catch (error) {
      console.error('Error updating application:', error);
      Alert.alert('Error', 'Failed to update application.');
    }
  };

  const handleJobPosted = (jobData) => {
    if (onJobPosted) {
      onJobPosted(jobData);
    }
    setShowJobModal(false);
  };

  const getJobStatusColor = useCallback((status) => {
    return {
      active: '#10B981', // Green for active
      pending: '#F59E0B', // Amber for pending
      completed: '#3B82F6', // Blue for completed
      cancelled: '#EF4444', // Red for cancelled
      filled: '#8B5CF6', // Purple for filled
    }[status] || '#6B7280'; // Default gray
  }, []);

  const getApplicationStatusColor = useCallback((status) => {
    return {
      pending: colors.warning,
      accepted: colors.success,
      rejected: colors.error,
    }[status] || colors.textSecondary;
  }, []);

  // Use dedicated JobCard component with proper handlers
  const handleJobPress = (job) => {
    // Handle job details view
    console.log('View job details:', job.id);
  };

  const handleJobUpdate = () => {
    // Refresh jobs after update
    if (onRefresh) onRefresh();
  };

  const renderApplicationItem = ({ item }) => {
    // Debug logging to see actual data structure
    const caregiver = item.caregiverProfile || {};
    const caregiverImageUrl = getProfileImageUrl(caregiver);

    const getStatusInfo = (status) => {
      switch (status?.toLowerCase()) {
        case 'accepted':
          return { color: '#10B981', bgColor: '#ECFDF5', label: 'Accepted' };
        case 'rejected':
          return { color: '#EF4444', bgColor: '#FEF2F2', label: 'Rejected' };
        default:
          return { color: '#3B82F6', bgColor: '#EEF2FF', label: 'New' };
      }
    };

    const statusInfo = getStatusInfo(item.status);

    return (
      <View style={styles.modernApplicationCard}>
        <View style={styles.applicationHeader}>
          <View style={styles.caregiverInfo}>
            <View style={styles.caregiverAvatar}>
              {caregiverImageUrl ? (
                <Image
                  source={{ uri: caregiverImageUrl }}
                  style={styles.caregiverAvatarImage}
                  onError={(error) => console.log('🚨 Image load error:', error.nativeEvent.error)}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>
                    {caregiver?.name ? caregiver.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'CG'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.caregiverDetails}>
              <Text style={styles.modernCaregiverName}>
                {caregiver?.name || caregiver?.displayName || 'Caregiver'}
              </Text>
              <Text style={styles.applicationDate}>
                Applied recently
              </Text>
            </View>
          </View>
          <View style={[styles.modernStatusBadge, { backgroundColor: statusInfo.bgColor }]}>
            <Text style={[styles.modernStatusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {item.message && (
          <View style={styles.messageContainer}>
            <Text style={styles.modernApplicationMessage} numberOfLines={3}>
              "{item.message}"
            </Text>
          </View>
        )}

        {(item.status === 'pending' || item.status === 'shortlisted') && (
          <View style={styles.modernApplicationActions}>
            <TouchableOpacity
              style={styles.modernAcceptButton}
              onPress={() => handleApplicationAction(item._id || item.id, 'accepted')}
              activeOpacity={0.8}
              disabled={item.status === 'shortlisted' && item.caregiverProfile?.isVerified !== true}
            >
              <CheckCircle size={16} color="#FFFFFF" />
              <Text style={styles.modernAcceptButtonText}>Accept</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modernRejectButton}
              onPress={() => handleApplicationAction(item._id || item.id, 'rejected')}
              activeOpacity={0.8}
            >
              <XCircle size={16} color="#EF4444" />
              <Text style={styles.modernRejectButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.viewProfileButton}
          onPress={() => onViewApplicant(item.caregiverId)}
          activeOpacity={0.7}
        >
          <Text style={styles.viewProfileButtonText}>View Profile</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#db2777" />
        <Text style={styles.loadingText}>Loading jobs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {selectedJob ? (
        <>
          <View style={styles.applicationsHeader}>
            <TouchableOpacity
              style={styles.backButtonContainer}
              onPress={() => setSelectedJob(null)}
            >
              <Text style={styles.backButton}>← Back to Jobs</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Applications</Text>
          </View>

          <FlatList
            data={applications}
            renderItem={renderApplicationItem}
            keyExtractor={(item) => item.id || item._id}
            contentContainerStyle={styles.applicationsList}
            refreshing={applicationsLoading}
            onRefresh={() => selectedJob && fetchJobApplications(selectedJob)}
            ListEmptyComponent={
              <View style={styles.emptyApplicationsContainer}>
                <Users size={48} color={colors.textTertiary} />
                <Text style={styles.emptyApplicationsTitle}>No Applications Yet</Text>
                <Text style={styles.emptyApplicationsText}>
                  Applications will appear here when caregivers apply to your job
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <>
          {/* Header with Create Job Button */}
          <View style={styles.jobsHeader}>
            <Text style={styles.sectionTitle}>My Jobs</Text>
            <TouchableOpacity
              style={styles.createJobButton}
              onPress={() => setShowJobModal(true)}
            >
              <Plus size={20} color={colors.white} />
              <Text style={styles.createJobText}>Post Job</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterTabs}>
            {['all', 'active', 'completed'].map((filterType) => (
              <TouchableOpacity
                key={filterType}
                style={[
                  styles.filterTab,
                  filter === filterType && styles.activeFilterTab
                ]}
                onPress={() => setFilter(filterType)}
              >
                <Text style={[
                  styles.filterTabText,
                  filter === filterType && styles.activeFilterTabText
                ]}>
                  {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Jobs List */}
          <ScrollView
            style={styles.jobsList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          >
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job, index) => (
                <JobCard 
                  key={job._id || job.id || `job-${index}`} 
                  job={job} 
                  onPress={() => handleJobPress(job)}
                  onUpdate={handleJobUpdate}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Briefcase size={48} color={colors.textTertiary} />
                <Text style={styles.emptyStateTitle}>No jobs posted yet</Text>
                <Text style={styles.emptyStateText}>
                  Create your first job posting to find the perfect caregiver
                </Text>
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={() => setShowJobModal(true)}
                >
                  <Text style={styles.emptyStateButtonText}>Post Your First Job</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </>
      )}

      {/* Job Posting Modal */}
      <JobPostingModal
        visible={showJobModal}
        onClose={() => setShowJobModal(false)}
        onJobPosted={handleJobPosted}
      />
    </View>
  );
};

export default JobsTab;

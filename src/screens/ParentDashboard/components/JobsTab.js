import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Plus, Briefcase } from 'lucide-react-native';
import { styles, colors } from '../../styles/ParentDashboard.styles';
import JobPostingModal from '../modals/JobPostingModal';
import JobCard from './JobCard';

const JobsTab = ({
  jobs = [],
  refreshing,
  onRefresh,
  onEditJob,
  onJobPosted,
  loading = false,
  setActiveTab
}) => {
  const [filter, setFilter] = useState('all');
  const [showJobModal, setShowJobModal] = useState(false);

  const filteredJobs = useMemo(() => jobs.filter(job => {
    if (filter === 'active') return job.status === 'active' || job.status === 'pending';
    if (filter === 'completed') return job.status === 'completed' || job.status === 'cancelled';
    return true;
  }), [jobs, filter]);

  const handleJobPosted = (jobData) => {
    if (onJobPosted) {
      onJobPosted(jobData);
    }
    setShowJobModal(false);
  };

  // Use dedicated JobCard component with proper handlers
  const handleJobPress = (job) => {
    Alert.alert(
      job.title || 'Job Details',
      `Location: ${job.location || 'Not specified'}\n` +
      `Rate: ₱${job.hourlyRate || job.rate || 'Negotiable'}/hr\n` +
      `Schedule: ${job.workingHours || job.schedule || 'Flexible'}\n` +
      `Children: ${job.childrenAges || 'Details available'}\n` +
      `Status: ${job.status || 'Active'}\n\n` +
      `${job.description || 'No description provided'}`,
      [
        { text: 'Close', style: 'cancel' },
        { text: 'Edit Job', onPress: () => onEditJob?.(job) },
      ]
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
              onUpdate={onRefresh}
              onEdit={onEditJob}
              setActiveTab={setActiveTab}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Briefcase size={48} color={colors.primary} />
            </View>
            <Text style={styles.emptyStateTitle}>Post a New Job</Text>
            <Text style={styles.emptyStateText}>
              Find the perfect caregiver for your family by posting a detailed job listing
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => setShowJobModal(true)}
            >
              <Plus size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.emptyStateButtonText}>Create Job Posting</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

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

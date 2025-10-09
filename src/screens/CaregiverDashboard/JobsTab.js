import React, { useState } from 'react';
import { ScrollView, View, Text, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';
import { MapPin, Clock, Users, DollarSign, Calendar, Briefcase } from 'lucide-react-native';
import { styles as dashboardStyles } from '../styles/CaregiverDashboard.styles';

// Local styles for job components
const localStyles = StyleSheet.create({
  jobCard: {
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
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  urgentBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  urgentText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  jobDetails: {
    marginBottom: 12,
  },
  jobDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  jobDetailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  jobDescription: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 12,
    lineHeight: 20,
  },
  jobActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    marginRight: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  applyButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  jobsList: {
    paddingTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

// Combine styles
const styles = { ...dashboardStyles, ...localStyles };

const JobCard = ({ job, onApply, onView }) => {
  const [applying, setApplying] = useState(false);

  const handleApply = async () => {
    if (applying) return;
    
    setApplying(true);
    try {
      if (onApply) {
        await onApply(job);
      }
    } catch (error) {
      console.error('Error applying to job:', error);
      Alert.alert('Error', 'Failed to apply to job. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <View style={localStyles.jobCard}>
      <View style={localStyles.jobHeader}>
        <Text style={localStyles.jobTitle}>{job.title || 'Childcare Position'}</Text>
        {job.urgent && (
          <View style={localStyles.urgentBadge}>
            <Text style={localStyles.urgentText}>URGENT</Text>
          </View>
        )}
      </View>
      
      <View style={localStyles.jobDetails}>
        <View style={localStyles.jobDetailRow}>
          <Users size={16} color="#666" />
          <Text style={localStyles.jobDetailText}>{job.family || 'Family'}</Text>
        </View>
        
        <View style={localStyles.jobDetailRow}>
          <MapPin size={16} color="#666" />
          <Text style={localStyles.jobDetailText}>{job.location || 'Location not specified'}</Text>
        </View>
        
        <View style={localStyles.jobDetailRow}>
          <Clock size={16} color="#666" />
          <Text style={localStyles.jobDetailText}>{job.schedule || 'Flexible hours'}</Text>
        </View>
        
        <View style={localStyles.jobDetailRow}>
          <DollarSign size={16} color="#666" />
          <Text style={localStyles.jobDetailText}>₱{job.hourlyRate || 300}/hr</Text>
        </View>
        
        {job.date && (
          <View style={localStyles.jobDetailRow}>
            <Calendar size={16} color="#666" />
            <Text style={localStyles.jobDetailText}>{new Date(job.date).toLocaleDateString()}</Text>
          </View>
        )}
      </View>
      
      {job.description && (
        <Text style={localStyles.jobDescription} numberOfLines={2}>
          {job.description}
        </Text>
      )}
      
      <View style={localStyles.jobActions}>
        <TouchableOpacity 
          style={localStyles.viewButton}
          onPress={() => onView && onView(job)}
        >
          <Text style={localStyles.viewButtonText}>View Details</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[localStyles.applyButton, applying && localStyles.applyButtonDisabled]}
          onPress={handleApply}
          disabled={applying}
        >
          {applying ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={localStyles.applyButtonText}>Apply</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const EmptyState = ({ icon, title, subtitle }) => (
  <View style={localStyles.emptyState}>
    <Briefcase size={48} color="#ccc" />
    <Text style={localStyles.emptyStateTitle}>{title}</Text>
    <Text style={localStyles.emptyStateSubtitle}>{subtitle}</Text>
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
  loading = false
}) {
  const [filter, setFilter] = useState('all');

  const filteredJobs = jobs.filter(job => {
    if (filter === 'nearby') return true; // TODO: Implement location filtering
    if (filter === 'high-pay') return job.hourlyRate >= 400;
    if (filter === 'urgent') return job.urgent;
    return true;
  });

  return (
    <ScrollView 
      style={dashboardStyles.content || { flex: 1 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing || jobsLoading}
          onRefresh={onRefresh}
          colors={['#3B82F6']}
          tintColor="#3B82F6"
        />
      }
    >
      <View style={dashboardStyles.section || { padding: 16 }}>
        <View style={dashboardStyles.filters || { flexDirection: 'row', marginBottom: 16 }}>
          <Chip 
            style={[dashboardStyles.filterChip || { marginRight: 8 }, filter === 'all' && (dashboardStyles.filterChipActive || { backgroundColor: '#3b82f6' })]} 
            textStyle={[dashboardStyles.filterChipText || { fontSize: 12 }, filter === 'all' && (dashboardStyles.filterChipTextActive || { color: '#fff' })]}
            onPress={() => setFilter('all')}
          >
            All Jobs
          </Chip>
          <Chip
            style={[dashboardStyles.filterChip || { marginRight: 8 }, filter === 'nearby' && (dashboardStyles.filterChipActive || { backgroundColor: '#3b82f6' })]}
            textStyle={[dashboardStyles.filterChipText || { fontSize: 12 }, filter === 'nearby' && (dashboardStyles.filterChipTextActive || { color: '#fff' })]}
            onPress={() => setFilter('nearby')}
          >
            Nearby
          </Chip>
          <Chip 
            style={[dashboardStyles.filterChip || { marginRight: 8 }, filter === 'high-pay' && (dashboardStyles.filterChipActive || { backgroundColor: '#3b82f6' })]} 
            textStyle={[dashboardStyles.filterChipText || { fontSize: 12 }, filter === 'high-pay' && (dashboardStyles.filterChipTextActive || { color: '#fff' })]}
            onPress={() => setFilter('high-pay')}
          >
            High Pay
          </Chip>
          <Chip 
            style={[dashboardStyles.filterChip || { marginRight: 8 }, filter === 'urgent' && (dashboardStyles.filterChipActive || { backgroundColor: '#3b82f6' })]} 
            textStyle={[dashboardStyles.filterChipText || { fontSize: 12 }, filter === 'urgent' && (dashboardStyles.filterChipTextActive || { color: '#fff' })]}
            onPress={() => setFilter('urgent')}
          >
            Urgent
          </Chip>
        </View>

        {(jobsLoading || loading) ? (
          <View style={dashboardStyles.loadingContainer || { alignItems: 'center', padding: 32 }}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={dashboardStyles.loadingText || { marginTop: 8, color: '#666' }}>Loading jobs...</Text>
          </View>
        ) : filteredJobs && filteredJobs.length > 0 ? (
          <View style={localStyles.jobsList}>
            {filteredJobs.map((job, index) => (
              <JobCard 
                key={job.id || job._id || `job-${index}`} 
                job={job}
                onApply={onJobApply}
                onView={onJobView}
              />
            ))}
          </View>
        ) : (
          <EmptyState 
            icon="briefcase" 
            title="No jobs available"
            subtitle={filter === 'all' ? "Please check back later for new job postings" : "No jobs match your current filter. Try adjusting your filters."}
          />
        )}
      </View>
    </ScrollView>
  );
}
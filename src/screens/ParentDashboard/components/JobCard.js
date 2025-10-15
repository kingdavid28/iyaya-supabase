import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Calendar, MapPin, Clock, DollarSign, Users, Edit2, Trash2, Check, Eye, MessageCircle } from 'lucide-react-native';
import { StatusBadge } from '../../../shared/ui';
import { supabaseService } from '../../../services/supabase';
import { useNavigation } from '@react-navigation/native';
import ProfileImage from '../../../components/ui/feedback/ProfileImage';

// Design tokens matching dashboard
const colors = {
  primary: '#8B5CF6',
  primaryLight: '#F5F3FF',
  secondary: '#EC4899',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  text: '#1F2937',
  textSecondary: '#4B5563',
  textTertiary: '#6B7280',
  surface: '#FFFFFF',
  background: '#F9FAFB',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
};

const JobCard = ({ job, onPress, onUpdate, onEdit }) => {
  const navigation = useNavigation();
  
  const handleEdit = () => {
    if (onEdit) {
      onEdit(job);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Job',
      'Are you sure you want to delete this job posting? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabaseService.jobs.deleteJob(job.id);
              if (onUpdate) onUpdate();
            } catch (error) {
              console.error('Error deleting job:', error);
              Alert.alert('Error', 'Failed to delete job. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await supabaseService.jobs.updateJob(job.id, { status: newStatus });
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating job status:', error);
      Alert.alert('Error', 'Failed to update job status. Please try again.');
    }
  };

  const handleViewApplicants = async () => {
    try {
      const applications = await supabaseService.applications.getForJob(job.id);
      navigation.navigate('JobApplications', { 
        jobId: job.id, 
        jobTitle: job.title,
        applications: applications || []
      });
    } catch (error) {
      console.error('Error fetching applications:', error);
      Alert.alert('Error', 'Failed to load applications. Please try again.');
    }
  };

  const handleConfirmJob = async () => {
    Alert.alert(
      'Confirm Job',
      'Mark this job as confirmed? This will notify applicants.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => handleStatusChange('confirmed')
        }
      ]
    );
  };

  const handleCancelJob = async () => {
    Alert.alert(
      'Cancel Job',
      'Are you sure you want to cancel this job? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => handleStatusChange('cancelled')
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Flexible date';
    try {
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch {
      return 'Flexible date';
    }
  };

  const formatWorkingHours = (hours) => {
    if (!hours) return 'Flexible hours';
    return hours;
  };


  const showActions = job.status === 'open' || job.status === 'pending';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.statusContainer}>
            <StatusBadge status={job.status} />
          </View>
          <View style={styles.jobInfo}>
            <Text style={styles.jobTitle} numberOfLines={2}>
              {String(job.title || 'Job Title')}
            </Text>
            <Text style={styles.postedDate}>
              {(() => {
                try {
                  const d = job.createdAt?.toDate ? job.createdAt.toDate() : (job.createdAt ? new Date(job.createdAt) : null);
                  return d ? `Posted ${d.toLocaleDateString()}` : 'Posted Recently';
                } catch {
                  return 'Posted Recently';
                }
              })()}
            </Text>
          </View>
        </View>
        
        {(job.applicants?.length > 0 || job.applications_count > 0) && (
          <TouchableOpacity 
            style={styles.applicantsBadge}
            onPress={handleViewApplicants}
          >
            <Users size={16} color={colors.info} />
            <Text style={styles.applicantsText}>
              {String(job.applicants?.length || job.applications_count || 0)}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <View style={styles.jobMeta}>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <MapPin size={16} color={colors.primary} />
              <Text style={styles.metaText} numberOfLines={1}>
                {String(job.address || job.location || 'Location not specified')}
              </Text>
            </View>
            
            <View style={styles.metaItem}>
              <DollarSign size={16} color={colors.success} />
              <Text style={styles.metaText}>₱{String(job.hourlyRate || job.rate || 'Negotiable')}/hr</Text>
            </View>
            
            <View style={styles.metaItem}>
              <Calendar size={16} color={colors.primary} />
              <Text style={styles.metaText}>
                {formatDate(job.startDate || job.date)}
                {job.endDate ? ` - ${formatDate(job.endDate)}` : ''}
              </Text>
            </View>
            
            <View style={styles.metaItem}>
              <Clock size={16} color={colors.primary} />
              <Text style={styles.metaText} numberOfLines={1}>
                {String(formatWorkingHours(job.workingHours || job.schedule || job.time))}
              </Text>
            </View>
            
            {(job.childrenCount || job.children?.length) && (
              <View style={styles.metaItem}>
                <Users size={16} color={colors.secondary} />
                <Text style={styles.metaText}>
                  {String(job.childrenCount || job.children?.length || 0)} child{(job.childrenCount || job.children?.length) > 1 ? 'ren' : ''}
                  {job.childrenAges ? ` (${String(job.childrenAges)})` : ''}
                </Text>
              </View>
            )}
            
            {job.requirements?.length > 0 && (
              <View style={styles.metaItem}>
                <Text style={styles.metaText} numberOfLines={1}>
                  {job.requirements.filter(Boolean).slice(0, 2).join(', ')}
                  {job.requirements.filter(Boolean).length > 2 ? '...' : ''}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {job.description && (
          <Text style={styles.jobDescription} numberOfLines={2}>
            {String(job.description)}
          </Text>
        )}
      </TouchableOpacity>
      
      <View style={styles.cardFooter}>
        <View style={styles.primaryActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.viewDetailsButton]}
            onPress={() => {
              const formatDate = (dateStr) => {
                if (!dateStr) return 'Not specified';
                try {
                  return new Date(dateStr).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  });
                } catch {
                  return dateStr;
                }
              };

              const formatTime = (timeStr) => {
                if (!timeStr) return '';
                try {
                  const [hours, minutes] = timeStr.split(':');
                  const hour = parseInt(hours);
                  const ampm = hour >= 12 ? 'PM' : 'AM';
                  const displayHour = hour % 12 || 12;
                  return `${displayHour}:${minutes} ${ampm}`;
                } catch {
                  return timeStr;
                }
              };

              const requirements = job.requirements?.length > 0 
                ? `\nRequirements: ${job.requirements.join(', ')}`
                : '';

              const specialInstructions = job.special_instructions 
                ? `\nSpecial Instructions: ${job.special_instructions}`
                : '';

              Alert.alert(
                job.title || 'Job Details',
                `📍 Location: ${job.location || 'Not specified'}\n` +
                `💰 Rate: ₱${job.hourly_rate || job.rate || 'Negotiable'}/hr\n` +
                `📅 Date: ${formatDate(job.date || job.startDate)}\n` +
                `⏰ Time: ${formatTime(job.start_time)} - ${formatTime(job.end_time)}\n` +
                `👶 Children: ${job.children_ages || job.childrenAges || 'Details available'}\n` +
                `📊 Status: ${job.status || 'Active'}${requirements}${specialInstructions}\n\n` +
                `📝 Description:\n${job.description || 'No description provided'}`,
                [
                  { text: 'Close', style: 'cancel' },
                  { text: 'Edit Job', onPress: () => handleEdit() },
                ]
              );
            }}
          >
            <Eye size={16} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>
              View Details
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.editButton]}
            onPress={handleEdit}
          >
            <Edit2 size={16} color={colors.info} />
            <Text style={[styles.actionButtonText, { color: colors.info }]}>
              Edit
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.viewApplicantsButton]}
            onPress={handleViewApplicants}
          >
            <Users size={16} color={colors.secondary} />
            <Text style={[styles.actionButtonText, { color: colors.secondary }]}>
              Apps ({String(job.applicants?.length || job.applications_count || 0)})
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.secondaryActions}>
          {job.status === 'open' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton, styles.cancelButtonProminent]}
              onPress={handleCancelJob}
            >
              <Text style={[styles.actionButtonText, styles.cancelButtonText]}>
                Cancel Job
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
          >
            <Trash2 size={14} color={colors.error} />
            <Text style={[styles.actionButtonText, { color: colors.error }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  statusContainer: {
    marginRight: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    lineHeight: 24,
  },
  postedDate: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  applicantsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  applicantsText: {
    color: colors.info,
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
  jobMeta: {
    marginBottom: 16,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: '45%',
    flex: 1,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
    flex: 1,
  },
  jobDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 16,
    gap: 12,
  },
  primaryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  secondaryActions: {
    gap: 12,
  },
  statusActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flex: 1,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  viewDetailsButton: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  editButton: {
    borderColor: colors.info,
    backgroundColor: colors.info + '10',
  },

  deleteButton: {
    borderColor: colors.error,
    backgroundColor: colors.error + '10',
  },
  confirmButton: {
    borderColor: colors.success,
    backgroundColor: colors.success + '10',
    flex: 1,
  },
  cancelButton: {
    borderColor: colors.warning,
    backgroundColor: colors.warning + '10',
    flex: 1,
  },
  cancelButtonProminent: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  cancelButtonText: {
    color: colors.surface,
    fontWeight: '700',
  },
  viewApplicantsButton: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondary + '10',
  },
});

export default JobCard;

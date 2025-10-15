import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { Calendar, MapPin, Clock, Users, DollarSign, Eye } from 'lucide-react-native';
import { formatDate, formatTimeRange } from '../../utils';
import StatusBadge from '../StatusBadge';
import ProfileImage from '../../../components/ui/feedback/ProfileImage';

// Design tokens matching caregiver dashboard
const colors = {
  primary: '#667eea',
  primaryLight: '#F5F3FF',
  secondary: '#764ba2',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  text: '#1F2937',
  textSecondary: '#4B5563',
  textTertiary: '#6B7280',
  surface: '#FFFFFF',
  background: '#F9FAFB',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
};

const JobCard = ({ job, onPress, onApply, showActions = true }) => {
  // Helper functions
  const formatJobDate = (dateStr) => {
    if (!dateStr) return 'Flexible';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Flexible';
    }
  };

  const getDisplayRate = () => {
    const rate = job.hourlyRate || job.rate || job.salary;
    return rate ? `₱${rate}` : 'Negotiable';
  };

  const getChildrenInfo = () => {
    if (job.childrenCount) return job.childrenCount;
    if (job.children?.length) return job.children.length;
    return 'Not specified';
  };

  const getParentName = () => job.parentName || job.client_name || 'Parent';
  const getParentPhoto = () => job.parentPhoto || job.client_photo;
  const getJobDate = () => {
    if (job.startDate) return formatJobDate(job.startDate);
    return formatDate(job.date);
  };
  const getWorkingHours = () => {
    if (job.workingHours) return job.workingHours;
    if (job.startTime && job.endTime) return formatTimeRange(job.startTime, job.endTime);
    return 'Flexible hours';
  };

  const renderParentHeader = () => (
    <View style={styles.parentHeader}>
      <View style={styles.parentInfo}>
        <ProfileImage
          imageUrl={getParentPhoto()}
          size={40}
          style={styles.parentAvatar}
          defaultIconSize={18}
        />
        <View style={styles.parentDetails}>
          <Text style={styles.parentName}>{getParentName()}</Text>
          <Text style={styles.postedTime}>
            {job.createdAt ? `Posted ${formatJobDate(job.createdAt)}` : 'Recently posted'}
          </Text>
        </View>
      </View>
      <StatusBadge status={job.status} />
    </View>
  );

  const renderJobDetails = () => (
    <View style={styles.details}>
      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <Calendar size={16} color={colors.primary} />
          <Text style={styles.detailText}>
            {getJobDate()}
            {job.endDate && ` - ${formatJobDate(job.endDate)}`}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <DollarSign size={16} color={colors.success} />
          <Text style={styles.detailText}>{getDisplayRate()}/hr</Text>
        </View>

        <View style={styles.detailItem}>
          <Clock size={16} color={colors.primary} />
          <Text style={styles.detailText}>{getWorkingHours()}</Text>
        </View>

        <View style={styles.detailItem}>
          <Users size={16} color={colors.primary} />
          <Text style={styles.detailText}>{getChildrenInfo()} children</Text>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.locationRow}
        onPress={() => {
          const location = job.location || job.address;
          if (location) {
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
            Linking.openURL(mapsUrl).catch(() => {
              Alert.alert('Error', 'Could not open maps');
            });
          }
        }}
        activeOpacity={0.7}
      >
        <MapPin size={16} color={colors.primary} />
        <Text style={styles.locationText} numberOfLines={1}>
          {job.location || job.address || 'Location not specified'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderRequirements = () => {
    if (!job.requirements?.length) return null;
    
    return (
      <View style={styles.requirementsSection}>
        <Text style={styles.requirementsTitle}>Requirements</Text>
        <View style={styles.requirementsList}>
          {job.requirements.slice(0, 3).map((req, index) => (
            <View key={index} style={styles.requirementChip}>
              <Text style={styles.requirementText}>{req}</Text>
            </View>
          ))}
          {job.requirements.length > 3 && (
            <Text style={styles.moreRequirements}>
              +{job.requirements.length - 3} more
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderFooter = () => (
    <View style={styles.footer}>
      <View style={styles.urgencySection}>
        {job.urgency && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>Urgent</Text>
          </View>
        )}
      </View>
      {showActions && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.applyButton} onPress={onApply}>
            <Text style={styles.applyText}>Apply Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.card}>
      {renderParentHeader()}
      
      <Text style={styles.title} numberOfLines={2}>
        {job.title}
      </Text>
      
      <Text style={styles.description} numberOfLines={3}>
        {job.description}
      </Text>
      
      {renderJobDetails()}
      {renderRequirements()}
      {renderFooter()}
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
  parentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  parentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  parentAvatar: {
    marginRight: 12,
  },
  parentDetails: {
    flex: 1,
  },
  parentName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  postedTime: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 28,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  details: {
    marginBottom: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: '45%',
    flex: 1,
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 8,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  locationText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 8,
    fontWeight: '600',
    flex: 1,
    textDecorationLine: 'underline',
  },
  requirementsSection: {
    marginBottom: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  requirementsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  requirementChip: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  requirementText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  moreRequirements: {
    fontSize: 12,
    color: colors.textTertiary,
    fontStyle: 'italic',
    alignSelf: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  urgencySection: {
    flex: 1,
  },
  urgentBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  urgentText: {
    fontSize: 12,
    color: colors.surface,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },

  applyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  applyText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default JobCard;
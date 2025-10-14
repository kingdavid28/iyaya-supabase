import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDate, formatTimeRange } from '../../utils';
import StatusBadge from '../StatusBadge';
import ProfileImage from '../../../components/ui/feedback/ProfileImage';

const JobCard = ({ job, onPress, onApply, showActions = true }) => {
  const {
    title,
    description,
    date,
    startDate,
    endDate,
    startTime,
    endTime,
    hourlyRate,
    rate,
    salary,
    location,
    status,
    childrenCount,
    children,
    urgency,
    parentName,
    parentPhoto,
    client_name,
    client_photo,
    workingHours,
    requirements,
    createdAt
  } = job;

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

  const getHourlyRate = () => {
    const rateValue = hourlyRate || rate || salary;
    return rateValue ? `₱${rateValue}` : 'Negotiable';
  };

  const getChildrenCount = () => {
    if (childrenCount) return childrenCount;
    if (children?.length) return children.length;
    return 'Not specified';
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* Parent Info Header */}
      <View style={styles.parentHeader}>
        <View style={styles.parentInfo}>
          <ProfileImage
            imageUrl={parentPhoto || client_photo}
            size={32}
            style={styles.parentAvatar}
            defaultIconSize={16}
          />
          <View style={styles.parentDetails}>
            <Text style={styles.parentName}>{parentName || client_name || 'Parent'}</Text>
            <Text style={styles.postedTime}>
              {createdAt ? `Posted ${formatJobDate(createdAt)}` : 'Recently posted'}
            </Text>
          </View>
        </View>
        <StatusBadge status={status} />
      </View>

      {/* Job Title */}
      <Text style={styles.title} numberOfLines={2}>{title}</Text>

      {/* Job Description */}
      <Text style={styles.description} numberOfLines={3}>
        {description}
      </Text>

      {/* Job Details */}
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color="#6b7280" />
          <Text style={styles.detailText}>
            {startDate ? formatJobDate(startDate) : formatDate(date)}
            {endDate && ` - ${formatJobDate(endDate)}`}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color="#6b7280" />
          <Text style={styles.detailText}>
            {workingHours || (startTime && endTime ? formatTimeRange(startTime, endTime) : 'Flexible hours')}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="location" size={16} color="#6b7280" />
          <Text style={styles.detailText} numberOfLines={1}>{location || 'Location not specified'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="people" size={16} color="#6b7280" />
          <Text style={styles.detailText}>{getChildrenCount()} children</Text>
        </View>
      </View>

      {/* Requirements */}
      {requirements && requirements.length > 0 && (
        <View style={styles.requirementsSection}>
          <Text style={styles.requirementsTitle}>Requirements:</Text>
          <View style={styles.requirementsList}>
            {requirements.slice(0, 3).map((req, index) => (
              <View key={index} style={styles.requirementChip}>
                <Text style={styles.requirementText}>{req}</Text>
              </View>
            ))}
            {requirements.length > 3 && (
              <Text style={styles.moreRequirements}>+{requirements.length - 3} more</Text>
            )}
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.rateSection}>
          <Text style={styles.rate}>{getHourlyRate()}/hour</Text>
          {urgency && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentText}>Urgent</Text>
            </View>
          )}
        </View>
        {showActions && (
          <TouchableOpacity style={styles.applyButton} onPress={onApply}>
            <Text style={styles.applyText}>Apply Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  parentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  parentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  parentAvatar: {
    marginRight: 8,
  },
  parentDetails: {
    flex: 1,
  },
  parentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  postedTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
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
    flex: 1,
  },
  requirementsSection: {
    marginBottom: 12,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  requirementsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  requirementChip: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  moreRequirements: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  rateSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  urgentBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  urgentText: {
    fontSize: 12,
    color: '#d97706',
    fontWeight: '500',
  },
  applyButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  applyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default JobCard;
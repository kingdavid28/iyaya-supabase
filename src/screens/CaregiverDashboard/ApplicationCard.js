import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { styles } from '../styles/CaregiverDashboard.styles';
import { resolveChildrenSummary } from './utils';

const ApplicationCard = ({ application, onViewDetails, onMessage }) => {
  const job = application?.job || {};

  const statusMeta = useMemo(() => {
    const status = String(application?.status || '').toLowerCase();

    switch (status) {
      case 'pending':
        return { color: '#F59E0B', label: 'Pending' };
      case 'accepted':
        return { color: '#10B981', label: 'Accepted' };
      case 'rejected':
        return { color: '#EF4444', label: 'Rejected' };
      case 'withdrawn':
        return { color: '#6B7280', label: 'Withdrawn' };
      default:
        return {
          color: '#9CA3AF',
          label: application?.status || 'Unknown',
        };
    }
  }, [application?.status]);

  const childrenSummary = useMemo(() => resolveChildrenSummary(job), [job]);

  const resolveSchedule = useCallback(() => {
    if (job?.schedule) return job.schedule;
    if (job?.workingHours) return job.workingHours;
    if (job?.time) return job.time;
    if (job?.startTime && job?.endTime) return `${job.startTime} - ${job.endTime}`;
    if (job?.start_time && job?.end_time) return `${job.start_time} - ${job.end_time}`;
    return 'Schedule to be discussed';
  }, [job]);

  const appliedDate = application?.appliedDate || application?.applied_at;
  const formattedAppliedDate = useMemo(
    () => (appliedDate ? new Date(appliedDate).toLocaleDateString() : null),
    [appliedDate]
  );

  const detailItems = useMemo(
    () =>
      [
        {
          icon: 'people',
          text: childrenSummary,
          backgroundColor: '#F8FAFC',
          color: '#374151',
        },
        {
          icon: 'cash',
          text: `₱${
            application?.hourlyRate ||
            job?.hourly_rate ||
            job?.hourlyRate ||
            job?.rate ||
            0
          }/hr`,
          backgroundColor: '#F0FDF4',
          color: '#047857',
        },
        job?.location || job?.address
          ? {
              icon: 'location',
              text: job.location || job.address,
              backgroundColor: '#FEF7FF',
              color: '#7C3AED',
            }
          : null,
        {
          icon: 'time',
          text: resolveSchedule(),
          backgroundColor: '#FFF7ED',
          color: '#EA580C',
        },
        formattedAppliedDate
          ? {
              icon: 'calendar',
              text: `Applied ${formattedAppliedDate}`,
              backgroundColor: '#E0F2FE',
              color: '#0EA5E9',
            }
          : null,
      ].filter(Boolean),
    [application?.hourlyRate, job, resolveSchedule, childrenSummary, formattedAppliedDate]
  );

  const handleViewDetails = useCallback(() => {
    if (!onViewDetails) return;

    const enriched = {
      ...application,
      coverLetter: application?.coverLetter || application?.message || '',
      message: application?.message || application?.coverLetter || '',
      job: {
        ...job,
        title: job?.title || application?.jobTitle || application?.job_title,
        description: job?.description || application?.job?.description,
        location: job?.location || job?.address || application?.location,
        schedule: resolveSchedule(),
        childrenSummary,
        hourlyRate:
          application?.hourlyRate ||
          job?.hourly_rate ||
          job?.hourlyRate ||
          job?.rate,
        appliedDate: formattedAppliedDate,
      },
    };

    onViewDetails(enriched);
  }, [application, childrenSummary, formattedAppliedDate, job, onViewDetails, resolveSchedule]);

  const handleMessage = useCallback(() => {
    if (application?.status !== 'accepted') return;
    onMessage?.(application);
  }, [application, onMessage]);

  return (
    <View style={styles.applicationCard}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.applicationCardHeader}
      >
        <View style={styles.applicationCardHeaderContent}>
          <View style={styles.applicationCardTitleContainer}>
            <Text style={styles.applicationCardTitle} numberOfLines={1}>
              {application?.jobTitle || job?.title || 'Job Application'}
            </Text>
            <Text style={styles.applicationCardSubtitle}>
              {application?.family || job?.family || job?.parentName || 'Family'}
            </Text>
          </View>
          <View
            style={[
              styles.applicationStatusBadge,
              { backgroundColor: statusMeta.color },
            ]}
          >
            <Text style={styles.applicationStatusText}>{statusMeta.label}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.applicationCardContent}>
        <View style={styles.applicationDetailsGrid}>
          {detailItems.map((item, index) => (
            <View
              key={`${item.icon}-${index}`}
              style={[
                styles.applicationDetailItem,
                { backgroundColor: item.backgroundColor },
              ]}
            >
              <Ionicons name={item.icon} size={16} color={item.color} />
              <Text
                style={[styles.applicationDetailText, { color: item.color }]}
                numberOfLines={2}
              >
                {item.text}
              </Text>
            </View>
          ))}
        </View>

        {job?.description ? (
          <View style={styles.jobDescriptionContainer}>
            <Text style={styles.jobDescriptionLabel}>Job Description:</Text>
            <Text style={styles.jobDescriptionText} numberOfLines={3}>
              {job.description}
            </Text>
          </View>
        ) : null}

        {(application?.coverLetter || application?.message) && (
          <View style={styles.coverLetterContainer}>
            <Text style={styles.coverLetterLabel}>Your Message:</Text>
            <Text style={styles.coverLetterText} numberOfLines={3}>
              {application?.coverLetter || application?.message || 'No message provided'}
            </Text>
          </View>
        )}

        <View style={styles.applicationActions}>
          <Pressable onPress={handleViewDetails} style={styles.detailsButton}>
            <Text style={styles.detailsButtonText}>Details</Text>
          </Pressable>

          {application?.status === 'accepted' && (
            <Pressable onPress={handleMessage} style={styles.messageButton}>
              <Text style={styles.messageButtonText}>Message</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
};

export default ApplicationCard;
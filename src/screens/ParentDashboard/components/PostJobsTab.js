import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, Briefcase } from 'lucide-react-native';
import JobPostingModal from '../modals/JobPostingModal';
import { styles, colors } from '../../styles/ParentDashboard.styles';

const PostJobsTab = ({ onJobPosted }) => {
  const [showJobModal, setShowJobModal] = useState(false);

  const handleJobPosted = (jobData) => {
    if (onJobPosted) {
      onJobPosted(jobData);
    }
    // Modal will close itself, don't close here to avoid double-close
  };

  return (
    <View style={styles.container}>
      <View style={localStyles.centerContainer}>
        <View style={localStyles.iconContainer}>
          <Briefcase size={48} color={colors.primary} />
        </View>
        
        <Text style={localStyles.title}>Post a New Job</Text>
        <Text style={localStyles.subtitle}>
          Find the perfect caregiver for your family by posting a detailed job listing
        </Text>
        
        <TouchableOpacity
          style={localStyles.postButton}
          onPress={() => setShowJobModal(true)}
        >
          <Plus size={20} color="#FFFFFF" />
          <Text style={localStyles.postButtonText}>Create Job Posting</Text>
        </TouchableOpacity>
      </View>

      <JobPostingModal
        visible={showJobModal}
        onClose={() => setShowJobModal(false)}
        onJobPosted={handleJobPosted}
      />
    </View>
  );
};

const localStyles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  postButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PostJobsTab;
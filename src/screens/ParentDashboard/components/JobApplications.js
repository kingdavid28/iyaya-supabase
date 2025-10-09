import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Linking,
} from 'react-native';
import { 
  User, 
  Clock, 
  MessageCircle, 
  Phone, 
  Mail, 
  Check, 
  X,
  Star,
  AlertCircle,
  ChevronRight
} from 'lucide-react-native';
import { jobsAPI, applicationsAPI, realtimeService } from '../../../services';
import { useAuth } from '../../../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { getProfileImageUrl } from '../../../utils/imageUtils';
import { useRealtimeApplications } from '../../../hooks/useSupabaseRealtime';

const JobApplications = ({ jobId, onViewApplicant }) => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all'); // 'all', 'new', 'reviewed'

  // Fetch job applications via REST and setup real-time
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!jobId || !user?.uid) return;
      try {
        setLoading(true);
        const res = await applicationsAPI.getForJob(jobId);
        const raw = res?.data || [];
        // Normalize shape to align with previous UI expectations
        const mapped = raw.map((a) => ({
          id: a._id || a.id,
          jobId: a.jobId?._id || a.jobId,
          caregiverId: a.caregiverId?._id || a.caregiverId,
          caregiver: a.caregiverId || a.caregiver || {},
          message: a.message,
          status: a.status,
          appliedAt: a.createdAt ? new Date(a.createdAt) : null,
          createdAt: a.createdAt,
        }));

        // Client-side filter based on selectedTab
        const filtered = mapped.filter((a) => {
          if (selectedTab === 'new') return a.status === 'pending';
          if (selectedTab === 'reviewed') return ['accepted', 'rejected', 'shortlisted'].includes(a.status);
          return true;
        });

        if (isMounted) setApplications(filtered);
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    load();
    return () => { isMounted = false; };
  }, [jobId, user?.uid, selectedTab]);

  // Real-time subscription for application updates
  useRealtimeApplications(jobId, (payload) => {
    console.log('Real-time application update:', payload);
    // Refresh applications when there are changes
    setRefreshing(true);
  });

  const handleRefresh = () => {
    setRefreshing(true);
    // The real-time listener will handle the refresh
  };

  const updateApplicationStatus = async (applicationId, status) => {
    try {
      await applicationsAPI.updateStatus(applicationId, status);
      // Refresh list after update
      setRefreshing(true);
      // Trigger effect by toggling selectedTab to same value
      // or simply refetch by setting selectedTab which is already a dep
      // We'll just call the loader indirectly via state flip
      setSelectedTab((t) => t); 
    } catch (error) {
      console.error('Error updating application status:', error);
      Alert.alert('Error', 'Failed to update application status. Please try again.');
    }
  };

  const renderApplicationItem = ({ item }) => {
    const getStatusInfo = (status) => {
      switch (status?.toLowerCase()) {
        case 'accepted':
          return { color: '#10B981', bgColor: '#ECFDF5', label: 'Accepted', icon: <Check size={14} color="#10B981" /> };
        case 'rejected':
          return { color: '#EF4444', bgColor: '#FEF2F2', label: 'Rejected', icon: <X size={14} color="#EF4444" /> };
        case 'shortlisted':
          return { color: '#F59E0B', bgColor: '#FFFBEB', label: 'Shortlisted', icon: <Star size={14} color="#F59E0B" /> };
        default:
          return { color: '#3B82F6', bgColor: '#EEF2FF', label: 'New', icon: <AlertCircle size={14} color="#3B82F6" /> };
      }
    };

    const statusInfo = getStatusInfo(item.status);
    const appliedAgo = item.appliedAt 
      ? (typeof item.appliedAt.toDate === 'function' 
          ? formatDistanceToNow(item.appliedAt.toDate(), { addSuffix: true })
          : formatDistanceToNow(new Date(item.appliedAt), { addSuffix: true }))
      : 'Recently';

    return (
      <View style={styles.applicationCard}>
        <View style={styles.applicationHeader}>
          <View style={styles.applicantInfo}>
            <View style={styles.avatar}>
              {(() => {
                const imageUrl = getProfileImageUrl(item.caregiver);
                console.log('🖼️ JobApplications Image Debug:', {
                  hasCaregiver: !!item.caregiver,
                  caregiverKeys: Object.keys(item.caregiver || {}),
                  profileImage: item.caregiver?.profileImage,
                  imageUrl,
                  hasImageUrl: !!imageUrl
                });
                
                return imageUrl ? (
                  <Image 
                    source={{ uri: imageUrl }} 
                    style={styles.avatarImage}
                    onError={(error) => {
                      console.log('🚨 JobApplications Image load error:', error.nativeEvent.error);
                      console.log('🔍 Failed URL:', imageUrl);
                    }}
                  />
                ) : (
                  <User size={20} color="#9CA3AF" />
                );
              })()}
            </View>
            <View style={styles.applicantDetails}>
              <Text style={styles.applicantName}>
                {item.caregiver?.displayName || item.caregiver?.name || 'Anonymous Caregiver'}
              </Text>
              <Text style={styles.appliedDate}>
                Applied {appliedAgo}
              </Text>
              {item.caregiver?.rating && (
                <View style={styles.ratingContainer}>
                  <Star size={12} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.ratingText}>{item.caregiver.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
            {statusInfo.icon}
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>
        
        {item.message && (
          <View style={styles.messageContainer}>
            <Text style={styles.applicationMessage} numberOfLines={3}>
              "{item.message}"
            </Text>
          </View>
        )}
        
        <View style={styles.applicationActions}>
          <TouchableOpacity 
            style={styles.viewProfileButton}
            onPress={() => onViewApplicant(item.caregiverId)}
            activeOpacity={0.7}
          >
            <Text style={styles.viewProfileText}>View Full Profile</Text>
            <ChevronRight size={16} color="#4F46E5" />
          </TouchableOpacity>
          
          {item.status === 'pending' && (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => updateApplicationStatus(item.id, 'accepted')}
                activeOpacity={0.8}
              >
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.acceptBtnText}>Accept</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionBtn, styles.shortlistBtn]}
                onPress={() => updateApplicationStatus(item.id, 'shortlisted')}
                activeOpacity={0.8}
              >
                <Star size={16} color="#F59E0B" />
                <Text style={styles.shortlistBtnText}>Shortlist</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => updateApplicationStatus(item.id, 'rejected')}
                activeOpacity={0.8}
              >
                <X size={16} color="#EF4444" />
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {item.status === 'shortlisted' && (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => updateApplicationStatus(item.id, 'accepted')}
                activeOpacity={0.8}
              >
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.acceptBtnText}>Accept</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionBtn, styles.messageBtn]}
                onPress={() => onViewApplicant(item.caregiverId, true)}
                activeOpacity={0.8}
              >
                <MessageCircle size={16} color="#3B82F6" />
                <Text style={styles.messageBtnText}>Message</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => updateApplicationStatus(item.id, 'rejected')}
                activeOpacity={0.8}
              >
                <X size={16} color="#EF4444" />
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {(item.status === 'accepted' || item.status === 'rejected') && (
            <View style={styles.contactButtonsContainer}>
              <TouchableOpacity 
                style={[styles.contactBtn, styles.messageContactBtn]}
                onPress={() => onViewApplicant(item.caregiverId, true)}
                activeOpacity={0.8}
              >
                <MessageCircle size={16} color="#3B82F6" />
                <Text style={styles.contactBtnText}>Message</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.contactBtn, styles.callContactBtn]}
                onPress={() => {
                  const phone = item.caregiver?.phoneNumber || item.caregiver?.phone;
                  if (phone) {
                    Linking.openURL(`tel:${phone}`);
                  } else {
                    Alert.alert('No Phone Number', 'This caregiver has not provided a phone number.');
                  }
                }}
                activeOpacity={0.8}
              >
                <Phone size={16} color="#10B981" />
                <Text style={styles.contactBtnText}>Call</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <User size={48} color="#E5E7EB" />
      <Text style={styles.emptyStateTitle}>
        {selectedTab === 'all' 
          ? 'No applications yet'
          : selectedTab === 'new' 
            ? 'No new applications'
            : 'No reviewed applications'}
      </Text>
      <Text style={styles.emptyStateText}>
        {selectedTab === 'all' 
          ? 'When caregivers apply to your job, their applications will appear here.'
          : selectedTab === 'new' 
            ? 'Check back later for new applications.'
            : 'Applications you\'ve reviewed will appear here.'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'all' && styles.tabActive]}
          onPress={() => setSelectedTab('all')}
        >
          <Text style={[styles.tabText, selectedTab === 'all' && styles.tabTextActive]}>
            All Applications
          </Text>
          {selectedTab === 'all' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'new' && styles.tabActive]}
          onPress={() => setSelectedTab('new')}
        >
          <Text style={[styles.tabText, selectedTab === 'new' && styles.tabTextActive]}>
            New
          </Text>
          {selectedTab === 'new' && <View style={styles.tabIndicator} />}
          
          {/* New applications badge */}
          {applications.some(app => app.status === 'pending') && selectedTab !== 'new' && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>
                {applications.filter(app => app.status === 'pending').length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'reviewed' && styles.tabActive]}
          onPress={() => setSelectedTab('reviewed')}
        >
          <Text style={[styles.tabText, selectedTab === 'reviewed' && styles.tabTextActive]}>
            Reviewed
          </Text>
          {selectedTab === 'reviewed' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>
      
      {/* Applications list */}
      {loading && applications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading applications...</Text>
        </View>
      ) : (
        <FlatList
          data={applications}
          renderItem={renderApplicationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#4F46E5']}
              tintColor="#4F46E5"
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  tabActive: {
    // Active tab styles
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: '#4F46E5',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    right: 16,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  applicationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  applicantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  applicantDetails: {
    flex: 1,
  },
  applicantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  appliedDate: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
    marginLeft: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  messageContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#E2E8F0',
  },
  applicationMessage: {
    fontSize: 14,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  applicationActions: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  viewProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
    marginRight: 6,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
    minHeight: 44,
  },
  acceptBtn: {
    backgroundColor: '#10B981',
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  shortlistBtn: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  shortlistBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 6,
  },
  rejectBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  rejectBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 6,
  },
  messageBtn: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  messageBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 6,
  },
  contactButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
    minHeight: 44,
  },
  messageContactBtn: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  callContactBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  contactBtnText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default JobApplications;

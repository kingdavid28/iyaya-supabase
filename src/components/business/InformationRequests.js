import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { settingsService } from '../../services';

export function InformationRequests({ user, userType, colors }) {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [activeTab]);

  const loadRequests = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      if (activeTab === 'pending') {
        const { success, data, message } = await settingsService.getPendingRequests();
        if (success) {
          setPendingRequests(Array.isArray(data) ? data : []);
        } else {
          Alert.alert('Error', message || 'Failed to load pending requests');
          setPendingRequests([]);
        }
      } else {
        const { success, data, message } = await settingsService.getSentRequests();
        if (success) {
          setSentRequests(Array.isArray(data) ? data : []);
        } else {
          Alert.alert('Error', message || 'Failed to load sent requests');
          setSentRequests([]);
        }
      }
    } catch (error) {
      console.error('Failed to load requests:', error);
      Alert.alert('Error', 'Failed to load requests. Please check your connection and try again.');
      setPendingRequests([]);
      setSentRequests([]);
    } finally {
      if (showLoading) setLoading(false);
      if (refreshing) setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests(false);
  };

  const handleResponse = async (requestId, approved, sharedFields = []) => {
    try {
      const { success, message } = await settingsService.respondToRequest({
        requestId,
        approved,
        sharedFields
      });

      if (success) {
        Alert.alert(
          'Success',
          approved ? 'Information shared successfully' : 'Request declined'
        );
        // Update local state to reflect the change immediately
        if (activeTab === 'pending') {
          setPendingRequests(prev =>
            prev.map(req =>
              req._id === requestId
                ? { ...req, status: approved ? 'approved' : 'denied' }
                : req
            )
          );
        }
      } else {
        throw new Error(message || 'Failed to process response');
      }
    } catch (error) {
      console.error('Error responding to request:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to respond to request. Please try again.'
      );
    }
  };

  const renderRequest = (request) => {
    const requesterName = request.requesterId?.name || 'Unknown User';
    const targetName = request.targetUserId?.name || 'Unknown User';
    const isPending = request.status === 'pending';
    const isApproved = request.status === 'approved';

    return (
      <View key={request._id} style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <Text style={styles.requesterName}>
            {activeTab === 'pending'
              ? `${requesterName} requested information`
              : `Request to ${targetName}`}
          </Text>
          <Text style={styles.requestDate}>
            {format(new Date(request.requestedAt || new Date()), 'MMM d, yyyy h:mm a')}
          </Text>
        </View>

        <Text style={styles.requestReason}>
          <Text style={{ fontWeight: '600' }}>Reason: </Text>
          {request.reason || 'No reason provided'}
        </Text>

        <View style={styles.requestedFields}>
          <Text style={styles.fieldsLabel}>Requested Information:</Text>
          {Array.isArray(request.requestedFields) && request.requestedFields.length > 0 ? (
            request.requestedFields.map((field, index) => (
              <Text key={index} style={styles.fieldItem}>
                • {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
              </Text>
            ))
          ) : (
            <Text style={styles.noFieldsText}>No specific fields requested</Text>
          )}
        </View>

        {isPending && activeTab === 'pending' && (
          <View style={styles.requestActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={() => handleResponse(request._id, false)}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => handleResponse(request._id, true, request.requestedFields || [])}
            >
              <Text style={styles.approveButtonText}>Approve</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isPending && (
          <View style={[
            styles.statusBadge,
            {
              backgroundColor: isApproved ? '#10B981' : '#EF4444',
              alignSelf: 'flex-start',
              marginTop: 12,
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 12
            }
          ]}>
            <Text style={[styles.statusText, { fontSize: 12 }]}>
              {request.status.toUpperCase()}
              {request.respondedAt && (
                <Text style={{ fontSize: 11, opacity: 0.8 }}>
                  {' • '}
                  {format(new Date(request.respondedAt), 'MMM d, yyyy')}
                </Text>
              )}
            </Text>
          </View>
        )}

        {isApproved && request.sharedFields && request.sharedFields.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.fieldsLabel, { marginBottom: 6 }]}>Shared Information:</Text>
            {request.sharedFields.map((field, index) => (
              <Text key={`shared-${index}`} style={[styles.fieldItem, { color: '#10B981' }]}>
                ✓ {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  const currentRequests = activeTab === 'pending' ? pendingRequests : sentRequests;
  const noRequestsText = activeTab === 'pending'
    ? 'No pending requests'
    : 'You have not sent any requests';

  return (
    <View style={[styles.container, { backgroundColor: '#f9fafb' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Information Requests</Text>
      </View>

      <View style={[styles.tabContainer, { backgroundColor: '#fff', elevation: 2 }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'pending' && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 2
            }
          ]}
          onPress={() => {
            if (activeTab !== 'pending') {
              setActiveTab('pending');
            }
          }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'pending'
                ? { color: colors.primary, fontWeight: '600' }
                : { color: '#6b7280' }
            ]}
          >
            Pending
            {pendingRequests.length > 0 && (
              <Text style={[styles.badge, { backgroundColor: colors.primary }]}>
                {pendingRequests.length}
              </Text>
            )}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'sent' && {
              borderBottomColor: colors.primary,
              borderBottomWidth: 2
            }
          ]}
          onPress={() => {
            if (activeTab !== 'sent') {
              setActiveTab('sent');
            }
          }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'sent'
                ? { color: colors.primary, fontWeight: '600' }
                : { color: '#6b7280' }
            ]}
          >
            Sent
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.requestsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : currentRequests.length > 0 ? (
          <View style={styles.requestsContainer}>
            {currentRequests.map(renderRequest)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="document-text-outline"
              size={48}
              color="#9ca3af"
              style={{ marginBottom: 16 }}
            />
            <Text style={styles.noRequestsText}>{noRequestsText}</Text>
            {activeTab === 'sent' && (
              <Text style={styles.emptyStateSubtext}>
                Send a request to view it here
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 16,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -20,
    backgroundColor: '#3b82f6',
    color: 'white',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 20,
    overflow: 'hidden',
  },
  requestsList: {
    flex: 1,
    padding: 16,
  },
  requestsContainer: {
    paddingBottom: 24,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  requesterName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    lineHeight: 22,
  },
  requestDate: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 12,
    marginTop: 2,
  },
  requestReason: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  requestedFields: {
    marginBottom: 4,
  },
  fieldsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldItem: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 4,
    marginBottom: 6,
    lineHeight: 20,
  },
  noFieldsText: {
    fontStyle: 'italic',
    color: '#9ca3af',
    fontSize: 13,
    marginLeft: 4,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 12,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  declineButton: {
    backgroundColor: '#f3f4f6',
  },
  declineButtonText: {
    color: '#6b7280',
    fontWeight: '600',
    fontSize: 14,
  },
  approveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noRequestsText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
  },
});

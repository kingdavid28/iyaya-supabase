import { AlertCircle, Check, Clock, Shield, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { usePrivacy } from './PrivacyManager';

const PrivacyNotificationModal = ({
  visible,
  onClose,
  requests = [],
  subtitle = 'Manage requests for your personal information',
  emptyStateTitle = 'No privacy requests',
  emptyStateMessage = "You don't have any pending information requests right now.",
}) => {
  const { respondToRequest, DATA_LEVELS } = usePrivacy();
  const [loading, setLoading] = useState({});

  const handleApprove = async (request, selectedFields = []) => {
    setLoading(prev => ({ ...prev, [request.id]: true }));

    try {
      const success = await respondToRequest(request.id, true, selectedFields);
      if (success) {
        Alert.alert('Approved', 'Information request has been approved.');
      }
    } finally {
      setLoading(prev => ({ ...prev, [request.id]: false }));
    }
  };

  const handleDeny = async (request) => {
    Alert.alert(
      'Deny Request',
      'Are you sure you want to deny this information request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: async () => {
            setLoading(prev => ({ ...prev, [request.id]: true }));
            try {
              const success = await respondToRequest(request.id, false);
              if (success) {
                Alert.alert('Denied', 'Information request has been denied.');
              }
            } finally {
              setLoading(prev => ({ ...prev, [request.id]: false }));
            }
          }
        }
      ]
    );
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const requestTime = new Date(timestamp);
    const diffInHours = Math.floor((now - requestTime) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const getLevelColor = (level) => {
    switch (level) {
      case DATA_LEVELS.PRIVATE: return '#f59e0b';
      case DATA_LEVELS.SENSITIVE: return '#ef4444';
      default: return '#10b981';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Privacy Requests</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {requests.length === 0 ? (
            <View style={styles.emptyState}>
              <Shield size={48} color="#9ca3af" />
              <Text style={styles.emptyTitle}>{emptyStateTitle}</Text>
              <Text style={styles.emptyText}>{emptyStateMessage}</Text>
            </View>
          ) : (
            requests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <Text style={styles.requestTimestamp}>
                    Requested on {new Date(request.createdAt || request.created_at || Date.now()).toLocaleString()}
                  </Text>
                  <View style={styles.requesterInfo}>
                    <Text style={styles.requesterName}>{request.requesterName}</Text>
                    <Text style={styles.requesterType}>
                      {request.requesterType === 'caregiver' ? '👩‍🍼 Caregiver' : '👨‍👩‍👧‍👦 Parent'}
                    </Text>
                  </View>
                  <View style={styles.timeInfo}>
                    <Clock size={14} color="#6b7280" />
                    <Text style={styles.timeText}>{formatTimeAgo(request.requestedAt)}</Text>
                  </View>
                </View>

                <View style={styles.reasonSection}>
                  <Text style={styles.reasonLabel}>Reason:</Text>
                  <Text style={styles.reasonText}>{request.reason}</Text>
                </View>

                <View style={styles.fieldsSection}>
                  <Text style={styles.fieldsLabel}>Requested Information:</Text>
                  {request.requestedFields.map((field, index) => (
                    <View key={index} style={styles.fieldItem}>
                      <Text style={styles.fieldName}>{field.label}</Text>
                      <View style={[styles.levelBadge, { backgroundColor: getLevelColor(field.level) + '20' }]}>
                        <Text style={[styles.levelText, { color: getLevelColor(field.level) }]}>
                          {field.level.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.actionSection}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.denyButton]}
                    onPress={() => handleDeny(request)}
                    disabled={loading[request.id]}
                  >
                    <X size={16} color="#ef4444" />
                    <Text style={styles.denyButtonText}>Deny</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleApprove(request, request.requestedFields)}
                    disabled={loading[request.id]}
                  >
                    <Check size={16} color="#fff" />
                    <Text style={styles.approveButtonText}>
                      {loading[request.id] ? 'Processing...' : 'Approve'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.privacyNote}>
                  <AlertCircle size={14} color="#6b7280" />
                  <Text style={styles.privacyNoteText}>
                    Approved information will be shared temporarily and can be revoked anytime
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  requestCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  requesterInfo: {
    flex: 1,
  },
  requesterName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  requesterType: {
    fontSize: 14,
    color: '#6b7280',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  reasonSection: {
    marginBottom: 16,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  fieldsSection: {
    marginBottom: 20,
  },
  fieldsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  fieldItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 4,
  },
  fieldName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '600',
  },
  actionSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  denyButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  denyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  approveButton: {
    backgroundColor: '#db2777',
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  privacyNoteText: {
    fontSize: 12,
    color: '#92400e',
    flex: 1,
    lineHeight: 16,
  },
};

export default PrivacyNotificationModal;

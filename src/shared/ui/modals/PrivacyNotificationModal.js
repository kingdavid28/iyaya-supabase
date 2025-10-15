import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function PrivacyNotificationModal({ visible, onClose, requests }) {
  const handleApproveRequest = (requestId) => {
    // TODO: Implement approve logic
    console.log('Approving request:', requestId);
  };

  const handleDenyRequest = (requestId) => {
    // TODO: Implement deny logic
    console.log('Denying request:', requestId);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Privacy Requests</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.subtitle}>
            Manage requests for your personal information
          </Text>

          {requests && requests.length > 0 ? (
            requests.map((request, index) => (
              <View key={request.id || index} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.requestIcon}>
                    <Ionicons name="shield" size={20} color="#3B82F6" />
                  </View>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestTitle}>
                      {request.requesterName || 'Someone'} requested access
                    </Text>
                    <Text style={styles.requestDate}>
                      {new Date(request.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.requestReason}>
                  "{request.reason || 'No reason provided'}"
                </Text>

                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.denyButton]}
                    onPress={() => handleDenyRequest(request.id)}
                  >
                    <Ionicons name="close" size={16} color="#EF4444" />
                    <Text style={styles.denyButtonText}>Deny</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleApproveRequest(request.id)}
                  >
                    <Ionicons name="checkmark" size={16} color="#10B981" />
                    <Text style={styles.approveButtonText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="shield-checkmark" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No pending requests</Text>
              <Text style={styles.emptySubtitle}>
                All caught up! No privacy requests to review.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  requestReason: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  denyButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  approveButton: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  denyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
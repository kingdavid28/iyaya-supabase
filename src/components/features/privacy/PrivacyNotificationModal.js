import { AlertCircle, Check, Clock, Download, Shield, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { usePrivacy } from './PrivacyManager';

const toSnakeCase = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .replace(/__+/g, '_')
    .toLowerCase();
};

const toLabelCase = (value) => {
  if (!value) {
    return 'Requested field';
  }

  const spaced = value
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase();

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const normalizeRequestedEntry = (entry, classification = {}, defaultLevel = 'private') => {
  if (!entry) return null;

  if (typeof entry === 'string') {
    const trimmed = entry.trim();
    if (!trimmed) return null;

    const key = toSnakeCase(trimmed) || trimmed.toLowerCase();
    const level = classification[key] || defaultLevel;

    return {
      key,
      label: toLabelCase(trimmed),
      level: typeof level === 'string' ? level.toLowerCase() : defaultLevel,
    };
  }

  if (typeof entry === 'object') {
    const rawKey = entry.key || entry.field || entry.name || entry.id || entry.label || '';
    const cleaned = String(rawKey).trim();
    const key = toSnakeCase(cleaned) || cleaned.toLowerCase();
    const levelCandidate = entry.level && typeof entry.level === 'string'
      ? entry.level.toLowerCase()
      : classification[key] || defaultLevel;

    const labelSource = entry.label || cleaned;

    return {
      key: key || toSnakeCase(labelSource) || undefined,
      label: entry.label || toLabelCase(labelSource),
      level: typeof levelCandidate === 'string' ? levelCandidate.toLowerCase() : defaultLevel,
    };
  }

  return null;
};

const extractFieldKey = (entry) => {
  if (!entry) {
    return '';
  }

  if (typeof entry === 'string') {
    return toSnakeCase(entry);
  }

  if (typeof entry === 'object') {
    const candidate =
      entry.key ||
      entry.field ||
      entry.name ||
      entry.id ||
      entry.label ||
      entry.value ||
      entry.column ||
      '';

    if (typeof candidate === 'string') {
      return toSnakeCase(candidate);
    }
  }

  return '';
};

const buildApprovalKeys = (rawFields) => {
  const seen = new Set();

  return (Array.isArray(rawFields) ? rawFields : [])
    .map(extractFieldKey)
    .filter((key) => {
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
};

const dedupeNormalizedFields = (normalizedFields = []) => {
  const seen = new Set();

  return (Array.isArray(normalizedFields) ? normalizedFields : []).reduce((acc, field) => {
    if (!field) return acc;

    const key = extractFieldKey(field);
    if (!key || seen.has(key)) {
      return acc;
    }

    seen.add(key);
    acc.push({ ...field, key });
    return acc;
  }, []);
};

const buildApprovalPayload = (normalizedFields, rawFields, sharedKeys = new Set()) => {
  const payload = [];
  const seen = new Set();

  (Array.isArray(normalizedFields) ? normalizedFields : []).forEach((field) => {
    const key = extractFieldKey(field);
    if (!key || seen.has(key) || sharedKeys.has(key)) {
      return;
    }
    seen.add(key);
    payload.push(key);
  });

  if (payload.length) {
    return payload;
  }

  (Array.isArray(rawFields) ? rawFields : []).forEach((entry) => {
    const key = extractFieldKey(entry);
    if (!key || seen.has(key) || sharedKeys.has(key)) {
      return;
    }
    seen.add(key);
    payload.push(key);
  });

  return payload;
};

const PrivacyNotificationModal = ({
  visible,
  onClose,
  requests = [],
  sentRequests = [],
  viewerType = 'caregiver',
  subtitle = 'Manage requests for your personal information',
  emptyStateTitle = 'No privacy requests',
  emptyStateMessage = "You don't have any pending information requests right now.",
  onViewSharedDocuments,
}) => {
  const { respondToRequest, DATA_LEVELS, dataClassification } = usePrivacy();
  const [loading, setLoading] = useState({});

  const normalizedRequests = useMemo(() => {
    return (Array.isArray(requests) ? requests : []).map((request) => {
      const rawFields = Array.isArray(request.requestedFields) ? request.requestedFields : [];
      const normalizedFields = dedupeNormalizedFields(
        rawFields
          .map((entry) => normalizeRequestedEntry(entry, dataClassification, DATA_LEVELS.PRIVATE))
          .filter(Boolean),
      );
      const approvalPayload = buildApprovalPayload(normalizedFields, rawFields);

      return { request, normalizedFields, approvalPayload };
    });
  }, [requests, dataClassification, DATA_LEVELS]);

  const sharedAccessRequests = useMemo(() => {
    if (viewerType !== 'parent') return [];

    return (Array.isArray(sentRequests) ? sentRequests : [])
      .filter((request) =>
        request?.status === 'approved' &&
        Array.isArray(request.sharedFields) &&
        request.sharedFields.includes('documents'),
      )
      .sort((a, b) => new Date(b.respondedAt || b.updatedAt || 0) - new Date(a.respondedAt || a.updatedAt || 0));
  }, [sentRequests, viewerType]);

  const handleApprove = async (requestId, selectedFields = []) => {
    setLoading((prev) => ({ ...prev, [requestId]: true }));

    try {
      const success = await respondToRequest(requestId, true, selectedFields);
      if (success) {
        Alert.alert('Approved', 'Information request has been approved.');
      }
    } finally {
      setLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleDeny = async (requestId) => {
    Alert.alert(
      'Deny Request',
      'Are you sure you want to deny this information request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: async () => {
            setLoading((prev) => ({ ...prev, [requestId]: true }));
            try {
              const success = await respondToRequest(requestId, false);
              if (success) {
                Alert.alert('Denied', 'Information request has been denied.');
              }
            } finally {
              setLoading((prev) => ({ ...prev, [requestId]: false }));
            }
          },
        },
      ],
    );
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Recently';

    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) return 'Recently';

    const diffHours = Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getLevelColor = (level) => {
    const normalized = typeof level === 'string' ? level.toLowerCase() : '';

    switch (normalized) {
      case DATA_LEVELS.PRIVATE:
        return '#f59e0b';
      case DATA_LEVELS.SENSITIVE:
        return '#ef4444';
      default:
        return '#10b981';
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
          <Text style={styles.subtitleText}>{subtitle}</Text>

          {normalizedRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Shield size={48} color="#9ca3af" />
              <Text style={styles.emptyTitle}>{emptyStateTitle}</Text>
              <Text style={styles.emptyText}>{emptyStateMessage}</Text>
            </View>
          ) : (
            normalizedRequests.map(({ request, normalizedFields, approvalPayload }) => {
              const requesterName =
                request.requesterName || request.requester?.name || request.requesterId?.name || 'User';
              const requesterTypeLabel =
                request.requesterType === 'caregiver' ? '👩‍🍼 Caregiver' : '👨‍👩‍👧‍👦 Parent';

              return (
                <View key={request.id} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <Text style={styles.requestTimestamp}>
                      Requested on {new Date(request.createdAt || request.created_at || Date.now()).toLocaleString()}
                    </Text>
                    <View style={styles.requesterInfo}>
                      <Text style={styles.requesterName}>{requesterName}</Text>
                      <Text style={styles.requesterType}>{requesterTypeLabel}</Text>
                    </View>
                    <View style={styles.timeInfo}>
                      <Clock size={14} color="#6b7280" />
                      <Text style={styles.timeText}>{formatTimeAgo(request.requestedAt || request.createdAt)}</Text>
                    </View>
                  </View>

                  <View style={styles.reasonSection}>
                    <Text style={styles.reasonLabel}>Reason:</Text>
                    <Text style={styles.reasonText}>{request.reason || 'No reason provided'}</Text>
                  </View>

                  <View style={styles.fieldsSection}>
                    <Text style={styles.fieldsLabel}>Requested Information:</Text>
                    {normalizedFields.length > 0 ? (
                      normalizedFields.map((field) => {
                        const levelColor = getLevelColor(field.level);
                        return (
                          <View key={field.key || field.label} style={styles.fieldItem}>
                            <Text style={styles.fieldName}>{field.label}</Text>
                            <View style={[styles.levelBadge, { backgroundColor: `${levelColor}20` }]}>
                              <Text style={[styles.levelText, { color: levelColor }]}>
                                {String(field.level || DATA_LEVELS.PRIVATE).toUpperCase()}
                              </Text>
                            </View>
                          </View>
                        );
                      })
                    ) : (
                      <Text style={styles.noFieldsText}>No fields requested</Text>
                    )}
                  </View>

                  <View style={styles.actionSection}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.denyButton]}
                      onPress={() => handleDeny(request.id)}
                      disabled={loading[request.id]}
                    >
                      <X size={16} color="#ef4444" />
                      <Text style={styles.denyButtonText}>Deny</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => handleApprove(request.id, approvalPayload)}
                      disabled={loading[request.id]}
                    >
                      <Check size={16} color="#fff" />
                      <Text style={styles.approveButtonText}>
                        {loading[request.id] ? 'Processing…' : 'Approve'}
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
              );
            })
          )}

          {viewerType === 'parent' && (
            <View style={styles.sharedSection}>
              <Text style={styles.sharedSectionTitle}>Shared caregiver documents</Text>
              {sharedAccessRequests.length === 0 ? (
                <Text style={styles.sharedEmptyText}>
                  Caregivers will appear here once they approve document access.
                </Text>
              ) : (
                sharedAccessRequests.map((request) => {
                  const caregiverName = request.target?.name || request.targetId?.name || 'Caregiver';
                  const sharedAt = request.respondedAt || request.updatedAt || request.createdAt;

                  return (
                    <View key={request.id} style={styles.sharedCard}>
                      <View style={styles.sharedCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.sharedCaregiverName}>{caregiverName}</Text>
                          <Text style={styles.sharedTimestamp}>
                            {sharedAt ? `Shared ${formatTimeAgo(sharedAt)} • ${new Date(sharedAt).toLocaleDateString()}` : 'Shared access'}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.viewDocumentsButton}
                        onPress={() => onViewSharedDocuments?.(request)}
                      >
                        <Download size={16} color="#fff" />
                        <Text style={styles.viewDocumentsButtonText}>Open Shared Documents</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
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
  subtitleText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
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
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  requesterInfo: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  noFieldsText: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    paddingVertical: 4,
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
  sharedSection: {
    marginTop: 32,
  },
  sharedSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  sharedEmptyText: {
    fontSize: 13,
    color: '#6b7280',
  },
  sharedCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 14,
  },
  sharedCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sharedCaregiverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  sharedTimestamp: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  viewDocumentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  viewDocumentsButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
};

export default PrivacyNotificationModal;
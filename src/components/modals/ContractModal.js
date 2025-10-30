import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const formatDateTime = (value) => {
  if (!value) return null;
  try {
    const date = new Date(value);
    return date.toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch (error) {
    return String(value);
  }
};

const normalizeTermValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
};

const ContractModal = ({
  visible,
  onClose,
  contract,
  booking,
  viewerRole = 'parent',
  onSign,
  signing = false,
  onResend,
  onDownloadPdf,
  error
}) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [signature, setSignature] = useState('');

  useEffect(() => {
    if (visible) {
      setAcknowledged(false);
      setSignature('');
    }
  }, [visible, contract?.id]);

  const termsEntries = useMemo(() => {
    if (!contract?.terms) return [];

    if (Array.isArray(contract.terms)) {
      return contract.terms
        .map((term) => normalizeTermValue(term))
        .filter(Boolean);
    }

    if (typeof contract.terms === 'string') {
      return [contract.terms];
    }

    if (typeof contract.terms === 'object') {
      return Object.entries(contract.terms)
        .map(([key, value]) => {
          const normalizedValue = normalizeTermValue(value);
          if (!normalizedValue) return '';
          return `${normalizeTermValue(key)}: ${normalizedValue}`;
        })
        .filter(Boolean);
    }

    return [];
  }, [contract?.terms]);

  const parentSignedAt = contract?.parentSignedAt || contract?.parent_signed_at;
  const caregiverSignedAt = contract?.caregiverSignedAt || contract?.caregiver_signed_at;

  const canSign = useMemo(() => {
    const role = (viewerRole || '').toLowerCase();
    if (role === 'parent') {
      return !parentSignedAt;
    }
    if (role === 'caregiver') {
      return !caregiverSignedAt;
    }
    return false;
  }, [viewerRole, parentSignedAt, caregiverSignedAt]);

  const readyToSign = acknowledged && signature.trim().length >= 2 && !signing;

  const handleToggleAcknowledge = () => {
    setAcknowledged((prev) => !prev);
  };

  const handleSignPress = () => {
    if (!onSign || !readyToSign) return;
    onSign({
      signature: signature.trim(),
      acknowledged
    });
  };

  const roleLabel = (viewerRole || 'parent').toLowerCase() === 'caregiver' ? 'Caregiver' : 'Parent';

  return (
    <Modal
      visible={Boolean(visible)}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="document-text-outline" size={22} color="#4F46E5" />
              <Text style={styles.headerTitle}>Contract</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Booking summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Caregiver</Text>
                <Text style={styles.summaryValue}>{booking?.caregiver_name || booking?.caregiver?.name || 'Caregiver'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Date</Text>
                <Text style={styles.summaryValue}>{booking?.date ? new Date(booking.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total amount</Text>
                <Text style={styles.summaryValue}>₱{Number(booking?.totalCost || booking?.total_amount || 0).toLocaleString('en-PH')}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contract terms</Text>
              {termsEntries.length === 0 ? (
                <Text style={styles.emptyText}>No terms provided.</Text>
              ) : (
                <View style={styles.termsList}>
                  {termsEntries.map((entry, index) => (
                    <View key={`term-${index}`} style={styles.termItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#4F46E5" style={styles.termIcon} />
                      <Text style={styles.termText}>{String(entry)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Signatures</Text>
              <View style={styles.signatureRow}>
                <View style={styles.signatureBadge(parentSignedAt)}>
                  <Ionicons name={parentSignedAt ? 'checkmark-done' : 'time-outline'} size={16} color={parentSignedAt ? '#047857' : '#F59E0B'} />
                  <Text style={styles.signatureLabel}>Parent</Text>
                </View>
                <Text style={styles.signatureValue}>{parentSignedAt ? formatDateTime(parentSignedAt) : 'Pending'}</Text>
              </View>
              <View style={styles.signatureRow}>
                <View style={styles.signatureBadge(caregiverSignedAt)}>
                  <Ionicons name={caregiverSignedAt ? 'checkmark-done' : 'time-outline'} size={16} color={caregiverSignedAt ? '#047857' : '#F59E0B'} />
                  <Text style={styles.signatureLabel}>Caregiver</Text>
                </View>
                <Text style={styles.signatureValue}>{caregiverSignedAt ? formatDateTime(caregiverSignedAt) : 'Pending'}</Text>
              </View>
            </View>

            {canSign ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Review & sign</Text>
                <TouchableOpacity style={styles.checkboxRow} onPress={handleToggleAcknowledge}>
                  <View style={[styles.checkbox, acknowledged && styles.checkboxChecked]}>
                    {acknowledged && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.checkboxLabel}>I understand and agree to the contract terms above.</Text>
                </TouchableOpacity>

                <Text style={styles.inputLabel}>Type your full name as signature</Text>
                <TextInput
                  value={signature}
                  onChangeText={setSignature}
                  placeholder={`Enter ${roleLabel} signature`}
                  style={styles.signatureInput}
                  autoCapitalize="words"
                />
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Status</Text>
                <Text style={styles.statusCopy}>All done! You can keep a copy of this contract or send a reminder if the other party still needs to sign.</Text>
              </View>
            )}

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#B91C1C" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            {onDownloadPdf ? (
              <TouchableOpacity style={[styles.footerButton, styles.secondaryButton]} onPress={() => onDownloadPdf(contract)}>
                <Ionicons name="download-outline" size={18} color="#4F46E5" />
                <Text style={styles.footerButtonTextSecondary}>Download PDF</Text>
              </TouchableOpacity>
            ) : null}

            {canSign ? (
              <TouchableOpacity
                style={[styles.footerButton, readyToSign ? styles.primaryButton : styles.primaryButtonDisabled]}
                disabled={!readyToSign}
                onPress={handleSignPress}
              >
                {signing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.footerButtonTextPrimary}>Sign contract</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.footerButton, styles.primaryButton]} onPress={onClose}>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.footerButtonTextPrimary}>Close</Text>
              </TouchableOpacity>
            )}

            {!canSign && onResend ? (
              <TouchableOpacity style={[styles.footerButton, styles.secondaryButton]} onPress={() => onResend(contract)}>
                <Ionicons name="send-outline" size={18} color="#4F46E5" />
                <Text style={styles.footerButtonTextSecondary}>Send reminder</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 6,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  termsList: {
    gap: 8,
  },
  termItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  termIcon: {
    marginTop: 2,
  },
  termText: {
    flex: 1,
    fontSize: 14,
    color: '#312E81',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  signatureBadge: (signed) => ({
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: signed ? '#DCFCE7' : '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  }),
  signatureLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  signatureValue: {
    fontSize: 13,
    color: '#4B5563',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  signatureInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
  },
  statusCopy: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#7F1D1D',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
  },
  primaryButtonDisabled: {
    backgroundColor: '#A5B4FC',
  },
  secondaryButton: {
    backgroundColor: '#EEF2FF',
  },
  footerButtonTextPrimary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footerButtonTextSecondary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4F46E5',
  }
});

export default ContractModal;

import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  error,
  onUpdate,
  updating = false,
  canEdit: canEditProp,
  onSaveDraft,
  onSendForSignature,
  savingDraft = false,
  sendingForSignature = false
}) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [signature, setSignature] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editableTerms, setEditableTerms] = useState([]);
  const [editError, setEditError] = useState(null);

  const parentSignedAt = contract?.parentSignedAt || contract?.parent_signed_at;
  const caregiverSignedAt = contract?.caregiverSignedAt || contract?.caregiver_signed_at;
  const status = (contract?.status || '').toLowerCase();
  const bothSigned = Boolean(parentSignedAt && caregiverSignedAt);
  const isFinalized = ['active', 'completed', 'cancelled'].includes(status) || bothSigned;

  const supersededBy = contract?.metadata?.supersededBy || contract?.metadata?.superseded_by;
  const supersedes = contract?.metadata?.audit?.supersedes || contract?.metadata?.supersedes;
  const isSuperseded = Boolean(supersededBy);

  const allowEditingHandlers = [onUpdate, onSaveDraft, onSendForSignature].some((handler) => typeof handler === 'function');
  const allowEditing = allowEditingHandlers && (typeof canEditProp === 'boolean' ? canEditProp : true);
  const editingAllowed = allowEditing && !isFinalized;

  const buildEditableEntries = useCallback((terms) => {
    const createEntry = (key = '', value = '', overrides = {}) => ({
      id: `${Date.now()}-${Math.random()}`,
      key,
      value,
      keyError: false,
      valueError: false,
      ...overrides
    });

    const normalizedTerms = (() => {
      if (!terms) {
        return {};
      }

      if (Array.isArray(terms)) {
        return terms.reduce((acc, value, index) => {
          const label = `Term ${index + 1}`;
          if (acc[label] === undefined) {
            acc[label] = normalizeTermValue(value);
          }
          return acc;
        }, {});
      }

      if (typeof terms === 'string') {
        return { Term: normalizeTermValue(terms) };
      }

      if (typeof terms === 'object') {
        return Object.entries(terms).reduce((acc, [key, value]) => {
          const normalizedKey = normalizeTermValue(key);
          if (!normalizedKey) {
            return acc;
          }
          if (acc[normalizedKey] === undefined) {
            acc[normalizedKey] = normalizeTermValue(value);
          }
          return acc;
        }, {});
      }

      return {};
    })();

    const entries = Object.entries(normalizedTerms).map(([key, value]) => createEntry(key, value, {
      keyError: !key,
      valueError: !value
    }));

    if (entries.length === 0) {
      return [createEntry()];
    }

    return entries;
  }, []);

  useEffect(() => {
    if (visible) {
      setAcknowledged(false);
      setSignature('');
      setIsEditing(false);
      setEditableTerms(buildEditableEntries(contract?.terms));
      setEditError(null);
    }
  }, [visible, contract?.id, buildEditableEntries]);

  useEffect(() => {
    if (!editingAllowed) {
      setIsEditing(false);
    }
  }, [editingAllowed]);

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

  const canSign = useMemo(() => {
    if (isEditing) return false;
    if (isSuperseded) return false;
    const role = (viewerRole || '').toLowerCase();
    if (role === 'parent') {
      return !parentSignedAt;
    }
    if (role === 'caregiver') {
      return !caregiverSignedAt;
    }
    return false;
  }, [viewerRole, parentSignedAt, caregiverSignedAt, isEditing, isSuperseded]);

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

  const handleStartEdit = () => {
    setEditableTerms(buildEditableEntries(contract?.terms));
    setEditError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditableTerms(buildEditableEntries(contract?.terms));
    setEditError(null);
    setIsEditing(false);
  };

  const handleTermChange = (id, field, value) => {
    setEditableTerms((prev) => prev.map((entry) => (entry.id === id ? { ...entry, [field]: value, [`${field}Error`]: false } : entry)));
  };

  const handleRemoveTerm = (id) => {
    setEditableTerms((prev) => {
      if (prev.length === 1) {
        return [{ ...prev[0], key: '', value: '', keyError: false, valueError: false }];
      }
      return prev.filter((entry) => entry.id !== id);
    });
  };

  const handleAddTerm = () => {
    setEditableTerms((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        key: '',
        value: '',
        keyError: false,
        valueError: false
      }
    ]);
  };

  const validateEditableTerms = (entries) => {
    const trimmedEntries = entries.map((entry) => ({
      ...entry,
      key: entry.key?.trim?.() || '',
      value: entry.value?.trim?.() || ''
    }));

    const keyedEntries = trimmedEntries.map((entry) => ({
      ...entry,
      keyError: !entry.key,
      valueError: !entry.value
    }));

    const seenKeys = new Set();
    const duplicates = new Set();
    keyedEntries.forEach((entry) => {
      const lowerKey = entry.key?.toLowerCase();
      if (!lowerKey) {
        return;
      }
      if (seenKeys.has(lowerKey)) {
        duplicates.add(lowerKey);
      }
      seenKeys.add(lowerKey);
    });

    const entriesWithDuplicateFlags = keyedEntries.map((entry) => {
      const lowerKey = entry.key?.toLowerCase();
      const duplicate = lowerKey && duplicates.has(lowerKey);
      return {
        ...entry,
        keyError: entry.keyError || duplicate
      };
    });

    const entriesWithRequiredFlags = entriesWithDuplicateFlags;

    const hasErrors = entriesWithRequiredFlags.some((entry) => entry.keyError || entry.valueError);

    const normalizedTerms = hasErrors
      ? null
      : entriesWithRequiredFlags.reduce((acc, entry) => {
        if (entry.key) {
          acc[entry.key] = entry.value;
        }
        return acc;
      }, {});

    let errorMessage = null;
    if (duplicates.size > 0) {
      errorMessage = 'Each term label must be unique.';
    } else if (hasErrors) {
      errorMessage = 'Please complete all required fields before saving.';
    }

    return {
      entries: entriesWithRequiredFlags,
      normalizedTerms,
      hasErrors,
      errorMessage
    };
  };

  const runTermsValidation = useCallback(() => {
    const validation = validateEditableTerms(editableTerms);
    setEditableTerms(validation.entries);

    if (validation.hasErrors || !validation.normalizedTerms) {
      setEditError(validation.errorMessage);
      return null;
    }

    setEditError(null);
    return validation.normalizedTerms;
  }, [editableTerms]);

  const handleSaveEdit = async () => {
    if (!onUpdate) {
      setIsEditing(false);
      return;
    }

    const normalizedTerms = runTermsValidation();
    if (!normalizedTerms) return;

    try {
      await onUpdate({ terms: normalizedTerms }, { mergeTerms: false });
      setIsEditing(false);
    } catch (updateError) {
      const message = updateError?.message || 'Failed to update the contract. Please try again.';
      setEditError(message);
    }
  };

  const handleSaveDraftAction = useCallback(async () => {
    if (typeof onSaveDraft !== 'function') {
      return;
    }

    const normalizedTerms = runTermsValidation();
    if (!normalizedTerms) return;

    try {
      await onSaveDraft({ contract, booking, terms: normalizedTerms });
      setIsEditing(false);
    } catch (draftError) {
      const message = draftError?.message || 'Failed to save the draft. Please try again.';
      setEditError(message);
    }
  }, [onSaveDraft, runTermsValidation, contract, booking]);

  const handleSendForSignatureAction = useCallback(async () => {
    if (typeof onSendForSignature !== 'function') {
      return;
    }

    const normalizedTerms = runTermsValidation();
    if (!normalizedTerms) return;

    try {
      await onSendForSignature({ contract, booking, terms: normalizedTerms });
      setIsEditing(false);
    } catch (sendError) {
      const message = sendError?.message || 'Failed to send for signature. Please try again.';
      setEditError(message);
    }
  }, [onSendForSignature, runTermsValidation, contract, booking]);

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
            <View style={styles.headerActions}>
              {editingAllowed && !isEditing ? (
                <TouchableOpacity style={styles.headerActionButton} onPress={handleStartEdit}>
                  <Ionicons name="create-outline" size={18} color="#2563EB" />
                  <Text style={styles.headerActionText}>Edit</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={22} color="#111827" />
              </TouchableOpacity>
            </View>
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

            {allowEditing && !editingAllowed ? (
              <View style={styles.noticeBox}>
                <Ionicons name="lock-closed-outline" size={18} color="#6B7280" />
                <Text style={styles.noticeText}>This contract has been finalized and can no longer be edited.</Text>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{isEditing ? 'Edit contract terms' : 'Contract terms'}</Text>
              {isEditing ? (
                <View style={styles.editTermsContainer}>
                  {editableTerms.map((entry, index) => (
                    <View key={entry.id} style={styles.editTermRow}>
                      <View style={styles.editTermColumn}>
                        <TextInput
                          value={entry.key}
                          onChangeText={(value) => handleTermChange(entry.id, 'key', value)}
                          placeholder={`Term label ${index + 1}`}
                          style={[styles.editTermInput, entry.keyError && styles.inputErrorBorder]}
                        />
                        {entry.keyError ? <Text style={styles.inputErrorText}>Required</Text> : null}
                      </View>
                      <View style={[styles.editTermColumn, styles.editTermValueColumn]}>
                        <TextInput
                          value={entry.value}
                          onChangeText={(value) => handleTermChange(entry.id, 'value', value)}
                          placeholder="Details"
                          style={[styles.editTermInput, styles.editTermValueInput, entry.valueError && styles.inputErrorBorder]}
                          multiline
                          textAlignVertical="top"
                        />
                        {entry.valueError ? <Text style={styles.inputErrorText}>Required</Text> : null}
                      </View>
                      {editableTerms.length > 1 ? (
                        <TouchableOpacity style={styles.removeTermButton} onPress={() => handleRemoveTerm(entry.id)}>
                          <Ionicons name="trash-outline" size={18} color="#DC2626" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addTermButton} onPress={handleAddTerm}>
                    <Ionicons name="add-circle-outline" size={18} color="#2563EB" />
                    <Text style={styles.addTermButtonText}>Add term</Text>
                  </TouchableOpacity>
                </View>
              ) : termsEntries.length === 0 ? (
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

            {isEditing ? null : canSign ? (
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
                {isSuperseded ? (
                  <Text style={styles.statusCopy}>
                    This contract has been replaced by a newer version. You can review it here, but signing is disabled. Please use the latest contract for this booking.
                  </Text>
                ) : (
                  <Text style={styles.statusCopy}>All done! You can keep a copy of this contract or send a reminder if the other party still needs to sign.</Text>
                )}
              </View>
            )}

            {editError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#B91C1C" />
                <Text style={styles.errorText}>{editError}</Text>
              </View>
            ) : null}

            {error && !editError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#B91C1C" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            {isEditing ? (
              <>
                <TouchableOpacity
                  style={[styles.footerButton, styles.secondaryButton]}
                  onPress={handleCancelEdit}
                  disabled={updating || savingDraft || sendingForSignature}
                >
                  <Ionicons name="arrow-undo" size={18} color="#4F46E5" />
                  <Text style={styles.footerButtonTextSecondary}>Cancel</Text>
                </TouchableOpacity>
                {typeof onSaveDraft === 'function' ? (
                  <TouchableOpacity
                    style={[styles.footerButton, savingDraft ? styles.primaryButtonDisabled : styles.primaryButton]}
                    onPress={handleSaveDraftAction}
                    disabled={savingDraft || sendingForSignature}
                  >
                    {savingDraft ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.footerButtonTextPrimary}>Save draft</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}
                {typeof onSendForSignature === 'function' ? (
                  <TouchableOpacity
                    style={[styles.footerButton, sendingForSignature ? styles.primaryButtonDisabled : styles.primaryButton]}
                    onPress={handleSendForSignatureAction}
                    disabled={sendingForSignature || savingDraft}
                  >
                    {sendingForSignature ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="send-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.footerButtonTextPrimary}>Send for signature</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}
                {typeof onSaveDraft !== 'function' && typeof onSendForSignature !== 'function' ? (
                  <TouchableOpacity
                    style={[styles.footerButton, updating ? styles.primaryButtonDisabled : styles.primaryButton]}
                    onPress={handleSaveEdit}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.footerButtonTextPrimary}>Save changes</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}
              </>
            ) : (
              <>
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
              </>
            )}
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

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// Shared compliance snippets reused across templates
const DISCIPLINARY_CLAUSE =
  'Employer enforces DOLE two-notice rule: (1) verbal/written warning, (2) written warning with corrective plan, (3) possible suspension/termination after investigation.';
const TERMINATION_CLAUSE =
  'Termination applies only for just/authorized causes with documentation, due process, and final pay. Caregiver may resign with notice or immediately for abuse/non-payment.';
const GOVERNMENT_BENEFITS =
  'Employer registers worker with SSS, PhilHealth, Pag-IBIG within 30 days, remits contributions monthly, and issues proof per RA 8282/RA 11223/RA 9679.';

// Contract type definitions with templates
export const CONTRACT_TYPES = {
  REGULAR: {
    id: 'regular',
    title: 'Regular Employment',
    subtitle: 'Full-time nanny contract',
    description: 'Long-term engagement with complete statutory benefits and disciplinary safeguards.',
    icon: 'document-text-outline',
    color: '#3B82F6',
    terms: {
      'Contract Title': 'Regular Employment Contract for Child Care Worker',
      'Position': 'Full-Time Nanny',
      'Start Date': '[Insert Date]',
      'Work Schedule': 'Mon–Fri, 8AM–5PM (adjust as needed)',
      'Compensation': '₱[Amount]/month + 13th month pay',
      'Benefits': 'SSS, PhilHealth, Pag-IBIG, leave, 13th month pay',
      'Duties': 'Child supervision, hygiene, feeding, educational play',
      'Disciplinary Action': DISCIPLINARY_CLAUSE,
      'Termination Clause': TERMINATION_CLAUSE,
      'Government Compliance': GOVERNMENT_BENEFITS
    }
  },
  PROBATIONARY: {
    id: 'probationary',
    title: 'Probationary Employment',
    subtitle: 'Up to 6 months trial',
    description: 'Evaluation contract that converts to regular upon satisfactory performance.',
    icon: 'time-outline',
    color: '#F59E0B',
    terms: {
      'Contract Title': 'Probationary Employment Contract for Child Care Worker',
      'Duration': '6 months from Start Date',
      'Performance Standards': '[List measurable criteria]',
      'Compensation': '₱[Amount]/month (pro-rated benefits)',
      'Benefits': 'SSS, PhilHealth, Pag-IBIG, prorated leave',
      'Conversion Clause': 'Becomes regular upon satisfactory performance',
      'Disciplinary Action': DISCIPLINARY_CLAUSE,
      'Termination Clause': 'May end for failure to meet standards plus ' + TERMINATION_CLAUSE,
      'Government Compliance': GOVERNMENT_BENEFITS
    }
  },
  FIXED_TERM: {
    id: 'fixed-term',
    title: 'Fixed-Term / Project',
    subtitle: 'Temporary assignment',
    description: 'Defines start/end dates for seasonal or project-based care.',
    icon: 'calendar-outline',
    color: '#14B8A6',
    terms: {
      'Contract Title': 'Fixed-Term Contract for Temporary Child Care',
      'Project Name': '[Holiday Babysitting / Summer Vacation]',
      'Duration': '[Start Date] to [End Date]',
      'Compensation': '₱[Amount]/day or ₱[Amount]/project',
      'No Regularization Clause': 'Engagement is project-specific and non-habitual',
      'Duties': '[List specific tasks]',
      'Disciplinary Action': DISCIPLINARY_CLAUSE,
      'Termination Clause': 'Automatically ends on project completion; ' + TERMINATION_CLAUSE,
      'Government Compliance': GOVERNMENT_BENEFITS
    }
  },
  CASUAL: {
    id: 'casual',
    title: 'Casual Employment',
    subtitle: 'Irregular / one-off care',
    description: 'For occasional babysitting or duties not integral to the business.',
    icon: 'flash-outline',
    color: '#EF4444',
    terms: {
      'Contract Title': 'Casual Employment Agreement for Child Care Services',
      'Nature': 'One-time or irregular engagement',
      'Date of Service': '[Insert Date]',
      'Compensation': '₱[Amount]/hour or ₱[Amount]/day',
      'Relationship Clause': 'Work not necessary nor desirable to employer’s usual business',
      'Duties': '[e.g., emergency babysitting]',
      'Disciplinary Action': DISCIPLINARY_CLAUSE,
      'Termination Clause': 'Ends after service date; ' + TERMINATION_CLAUSE,
      'Government Compliance': 'Benefits required if engagement exceeds 1 month; otherwise clarify voluntary contributions.'
    }
  },
  PART_TIME: {
    id: 'part-time',
    title: 'Part-Time Employment',
    subtitle: '<8 hours/day or <6 days/week',
    description: 'Flexible schedule with pro-rated statutory benefits.',
    icon: 'hourglass-outline',
    color: '#8B5CF6',
    terms: {
      'Contract Title': 'Part-Time Employment Contract for Child Care Worker',
      'Schedule': 'e.g., Saturdays & Sundays, 9AM–3PM',
      'Compensation': '₱[Amount]/hour with rest breaks',
      'Benefits': 'Pro-rated SSS, PhilHealth, Pag-IBIG',
      'Duties': '[Weekend supervision, playtime]',
      'Disciplinary Action': DISCIPLINARY_CLAUSE,
      'Termination Clause': '15-day mutual notice plus ' + TERMINATION_CLAUSE,
      'Government Compliance': GOVERNMENT_BENEFITS
    }
  },
  SEASONAL: {
    id: 'seasonal',
    title: 'Seasonal Employment',
    subtitle: 'Recurring period contract',
    description: 'For recurring seasons (summer camp, school breaks).',
    icon: 'sunny-outline',
    color: '#F97316',
    terms: {
      'Contract Title': 'Seasonal Employment Contract for Child Care Worker',
      'Season': '[e.g., Summer 2026]',
      'Duration': '[Start Date] to [End Date]',
      'Compensation': '₱[Amount]/month or per season',
      'Rehire Clause': 'No guarantee of future employment beyond this season',
      'Duties': '[Summer camp caregiving, etc.]',
      'Disciplinary Action': DISCIPLINARY_CLAUSE,
      'Termination Clause': 'Ends when the season concludes; ' + TERMINATION_CLAUSE,
      'Government Compliance': GOVERNMENT_BENEFITS
    }
  },
  INDEPENDENT_CONTRACTOR: {
    id: 'independent',
    title: 'Independent Contractor',
    subtitle: 'Service-based engagement',
    description: 'For self-employed caregivers handling their own contributions.',
    icon: 'briefcase-outline',
    color: '#0EA5E9',
    terms: {
      'Contract Title': 'Independent Contractor Agreement for Child Care Services',
      'Parties': 'Client and Contractor',
      'Scope of Work': '[Freelance nanny services]',
      'Duration': '[Start Date] to [End Date] or ongoing',
      'Compensation': '₱[Amount]/hour or per engagement',
      'Relationship Clause': 'No employer-employee relationship; contractor is self-employed',
      'Tax Responsibility': 'Contractor handles taxes and voluntary SSS/PhilHealth/Pag-IBIG contributions',
      'Termination Clause': '7-day notice by either party; no separation pay',
      'Disciplinary Action': 'Breach of service standards allows immediate termination of engagement',
      'Government Compliance': 'Contractor may self-remit government benefits'
    }
  }
};

const ContractTypeSelector = ({
  visible,
  onClose,
  onSelectContractType,
  selectedType = null
}) => {
  const [pendingSelection, setPendingSelection] = React.useState(selectedType);

  React.useEffect(() => {
    if (visible) {
      setPendingSelection(selectedType);
    }
  }, [visible, selectedType]);

  const handleSelectType = (contractType) => {
    setPendingSelection(contractType);
  };

  const handleConfirmSelection = () => {
    if (!pendingSelection) {
      Alert.alert(
        'Select a contract type',
        'Please choose a contract type before continuing.'
      );
      return;
    }

    onSelectContractType?.(pendingSelection);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="document-text-outline" size={22} color="#4F46E5" />
              <Text style={styles.headerTitle}>Choose Contract Type</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>
              Select the type of employment contract that best fits your needs. Each option offers different terms and benefits.
            </Text>

            {Object.values(CONTRACT_TYPES).map((contractType) => {
              const isSelected = pendingSelection?.id === contractType.id;

              return (
                <TouchableOpacity
                  key={contractType.id}
                  style={[
                    styles.contractOption,
                    isSelected && styles.contractOptionSelected
                  ]}
                  onPress={() => handleSelectType(contractType)}
                  activeOpacity={0.7}
                >
                  <View style={styles.contractOptionHeader}>
                    <View style={styles.contractOptionIcon}>
                      <Ionicons
                        name={contractType.icon}
                        size={24}
                        color={contractType.color}
                      />
                    </View>
                    <View style={styles.contractOptionInfo}>
                      <Text style={styles.contractOptionTitle}>{contractType.title}</Text>
                      <Text style={styles.contractOptionSubtitle}>{contractType.subtitle}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color={contractType.color} />
                    )}
                  </View>
                  <Text style={styles.contractOptionDescription}>
                    {contractType.description}
                  </Text>
                  <View style={styles.termsPreview}>
                    <Text style={styles.termsPreviewTitle}>Key Terms:</Text>
                    {Object.entries(contractType.terms).slice(0, 3).map(([key, value]) => (
                      <Text key={key} style={styles.termsPreviewItem}>
                        • {key}: {value}
                      </Text>
                    ))}
                    {Object.keys(contractType.terms).length > 3 && (
                      <Text style={styles.termsPreviewMore}>
                        +{Object.keys(contractType.terms).length - 3} more terms
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.footerButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.continueButton,
                  !pendingSelection && styles.continueButtonDisabled
                ]}
                onPress={handleConfirmSelection}
                disabled={!pendingSelection}
              >
                <Text
                  style={[
                    styles.continueButtonText,
                    !pendingSelection && styles.continueButtonTextDisabled
                  ]}
                >
                  Continue
                </Text>
              </TouchableOpacity>
            </View>
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
    maxHeight: '85%',
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
    paddingVertical: 16,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  contractOption: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  contractOptionSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  contractOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contractOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contractOptionInfo: {
    flex: 1,
  },
  contractOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  contractOptionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  contractOptionDescription: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 12,
  },
  termsPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  termsPreviewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  termsPreviewItem: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 2,
  },
  termsPreviewMore: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#C7D2FE',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  continueButtonTextDisabled: {
    color: '#E0E7FF',
  },
});

export const generateContractDocument = (contractType, parentInfo, caregiverInfo, customTerms = {}) => {
  return {
    header: `Childcare Services Agreement`,
    parties: {
      employer: parentInfo,
      employee: caregiverInfo
    },
    effectiveDate: new Date().toISOString().split('T')[0],
    contractType: contractType.title,
    terms: { ...contractType.terms, ...customTerms },
    signatures: {
      employer: { signed: false, date: null },
      employee: { signed: false, date: null }
    }
  };
};

export default ContractTypeSelector;

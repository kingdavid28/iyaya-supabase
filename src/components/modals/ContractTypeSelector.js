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

// Contract type definitions with templates
export const CONTRACT_TYPES = {
  STANDARD: {
    id: 'standard',
    title: 'Standard Employment',
    subtitle: 'Basic employment agreement',
    description: 'Standard terms and conditions for childcare services with basic protections and requirements.',
    icon: 'document-text-outline',
    color: '#3B82F6',
    terms: {
      'Employment Type': 'Independent Contractor',
      'Work Schedule': 'As agreed per booking',
      'Payment Terms': 'Payment upon completion of services',
      'Cancellation Policy': '24 hours notice required',
      'Background Check': 'Required before first assignment',
      'Confidentiality': 'Client information must be kept confidential',
      'Professional Conduct': 'Maintain professional standards at all times',
      'Emergency Procedures': 'Follow established emergency protocols',
      'Communication': 'Maintain regular communication with parents',
      'Child Safety': 'Prioritize child safety and well-being above all else'
    }
  },
  TRIAL: {
    id: 'trial',
    title: 'Trial Period',
    subtitle: '30-day probationary period',
    description: 'Initial trial period with evaluation terms and performance expectations.',
    icon: 'time-outline',
    color: '#F59E0B',
    terms: {
      'Trial Period': '30 days from first assignment',
      'Performance Review': 'Weekly check-ins during trial period',
      'Training Support': 'Additional training provided as needed',
      'Early Termination': 'Either party may terminate with 48 hours notice',
      'Evaluation Criteria': 'Reliability, communication, child care quality',
      'Feedback Sessions': 'Regular feedback and improvement discussions',
      'Work Schedule': 'As agreed per booking',
      'Payment Terms': 'Payment upon completion of services',
      'Professional Development': 'Access to training resources',
      'Support System': 'Dedicated support during trial period'
    }
  },
  COMPREHENSIVE: {
    id: 'comprehensive',
    title: 'Comprehensive Agreement',
    subtitle: 'Full employment with benefits',
    description: 'Detailed employment agreement with comprehensive terms, benefits, and long-term commitment.',
    icon: 'shield-checkmark-outline',
    color: '#10B981',
    terms: {
      'Employment Type': 'Preferred Caregiver Status',
      'Contract Duration': '12 months with automatic renewal',
      'Work Schedule': 'Priority booking access',
      'Payment Terms': 'Competitive rates with performance bonuses',
      'Health Benefits': 'Health insurance contribution available',
      'Paid Time Off': '10 days paid vacation per year',
      'Professional Development': 'Continued education and training support',
      'Performance Bonuses': 'Based on parent satisfaction and reliability',
      'Equipment Allowance': 'Annual allowance for child care supplies',
      'Retirement Contribution': 'Matching retirement savings plan',
      'Emergency Procedures': 'Comprehensive emergency response training',
      'Background Check': 'Annual verification required',
      'Confidentiality': 'Enhanced confidentiality requirements',
      'Non-Compete': '6-month non-compete clause',
      'Termination Notice': '30 days written notice required'
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

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  content: {
    flex: 1,
  },
  
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 20,
    marginBottom: 10,
  },
  
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  stepCircleActive: {
    backgroundColor: '#3b83f5',
  },
  
  stepCircleCompleted: {
    backgroundColor: '#4CAF50',
  },
  
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  
  stepNumberActive: {
    color: '#fff',
  },
  
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 10,
  },
  
  stepLineCompleted: {
    backgroundColor: '#4CAF50',
  },
  
  stepContent: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 12,
    padding: 20,
  },
  
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  
  inputGroup: {
    marginBottom: 20,
  },
  
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
  },
  
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  halfWidth: {
    width: '48%',
  },
  
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  
  timeSlot: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9f9f9',
    marginBottom: 8,
  },
  
  timeSlotActive: {
    backgroundColor: '#3b83f5',
    borderColor: '#3b83f5',
  },
  
  timeSlotText: {
    fontSize: 14,
    color: '#666',
  },
  
  timeSlotTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
  },
  
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  
  summaryCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
    marginTop: 10,
  },
  
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3b83f5',
  },
  
  conflictsCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  
  conflictsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 10,
  },
  
  conflictText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 5,
  },
  
  confirmationCard: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  
  confirmationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  
  confirmationText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  
  finalSummary: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    width: '100%',
  },
  
  finalSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  
  finalSummaryText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  
  backButton: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  
  backButtonText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  
  disabledText: {
    color: '#ccc',
  },
  
  nextButton: {
    backgroundColor: '#3b83f5',
  },
  
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
});

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  
  labelError: {
    color: '#ff4444',
  },
  
  timeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    minHeight: 48,
  },
  
  timeButtonError: {
    borderColor: '#ff4444',
    backgroundColor: '#fff5f5',
  },
  
  timeButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#d1d5db',
  },
  
  timeButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  
  placeholderText: {
    color: '#9ca3af',
  },
  
  disabledText: {
    color: '#9ca3af',
  },
  
  errorText: {
    fontSize: 14,
    color: '#ff4444',
    marginTop: 5,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: '70%',
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  
  modalCancelText: {
    fontSize: 16,
    color: '#666',
  },
  
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b83f5',
  },
  
  pickerContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  
  pickerColumn: {
    flex: 1,
    marginHorizontal: 5,
  },
  
  pickerColumnTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  
  pickerScroll: {
    maxHeight: 200,
  },
  
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginVertical: 2,
    alignItems: 'center',
  },
  
  pickerItemSelected: {
    backgroundColor: '#3b83f5',
  },
  
  pickerItemText: {
    fontSize: 16,
    color: '#333',
  },
  
  pickerItemTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
});

import { StyleSheet, Platform } from 'react-native';

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
  
  dateButton: {
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
  
  dateButtonError: {
    borderColor: '#ff4444',
    backgroundColor: '#fff5f5',
  },
  
  dateButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#d1d5db',
  },
  
  dateButtonText: {
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
  
  // iOS Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area padding for iOS
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
  
  picker: {
    backgroundColor: '#fff',
  },
  
  // Web-specific styles
  webDateInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' && {
      border: 'none',
      outline: 'none',
      fontFamily: 'inherit',
    }),
    paddingRight: 10,
  },
  
  webDateIcon: {
    pointerEvents: 'none',
    marginLeft: 8,
  },
});

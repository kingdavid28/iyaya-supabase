import { StyleSheet } from 'react-native';
import { baseStyles, colors, dimensions } from '../../utils/commonStyles';

export const styles = StyleSheet.create({
  container: baseStyles.container,
  
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 25,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 5,
  },
  
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  
  form: {
    padding: 20,
  },
  
  inputGroup: {
    marginBottom: 20,
  },
  
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  
  textArea: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  
  inputError: {
    borderColor: '#ff4444',
  },
  
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 5,
  },
  
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  halfWidth: {
    width: '48%',
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
  },
  
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  
  picker: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  
  switchInfo: {
    flex: 1,
  },
  
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  
  switchDescription: {
    fontSize: 14,
    color: '#666',
  },
  
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  
  dayButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  
  dayButtonActive: {
    backgroundColor: '#3b83f5',
    borderColor: '#3b83f5',
  },
  
  dayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  
  dayButtonTextActive: {
    color: '#fff',
  },
  
  submitButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3b83f5',
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

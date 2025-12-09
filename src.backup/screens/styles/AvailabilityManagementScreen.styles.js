import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  quickActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButtonText: {
    color: '#fff',
  },
  dayContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dayInfo: {
    flex: 1,
  },
  dayLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  dayStatus: {
    fontSize: 14,
    color: '#666',
  },
  timeSlotsContainer: {
    gap: 8,
  },
  timeSlot: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
  },
  timeSlotActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  timeSlotText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  timeSlotTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 20,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

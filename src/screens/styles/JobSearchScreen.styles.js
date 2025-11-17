import { StyleSheet } from 'react-native';
import { baseStyles, colors, dimensions } from '../../utils/commonStyles';

export const styles = StyleSheet.create({
  container: baseStyles.container,
  
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
  },
  
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#333',
  },
  
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  
  filterButtonActive: {
    backgroundColor: '#e3f2fd',
  },
  
  filtersContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  
  filterRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  
  filterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  
  halfWidth: {
    flex: 0.48,
    marginRight: 10,
  },
  
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  
  clearFiltersButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  
  clearFiltersText: {
    fontSize: 14,
    color: '#666',
  },
  
  applyFiltersButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#3b83f5',
  },
  
  applyFiltersText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  
  list: {
    paddingVertical: 10,
  },
  
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  jobCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  
  urgentJobCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff4444',
  },
  
  urgentBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  urgentBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingRight: 60, // Space for urgent badge
  },
  
  jobTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
  },
  
  jobRate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3b83f5',
  },
  
  jobInfo: {
    marginBottom: 10,
  },
  
  jobInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  
  jobInfoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  
  jobDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  jobMeta: {
    flex: 1,
  },
  
  postedTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  
  applicationCount: {
    fontSize: 12,
    color: '#666',
  },
  
  applyButton: {
    backgroundColor: '#3b83f5',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});

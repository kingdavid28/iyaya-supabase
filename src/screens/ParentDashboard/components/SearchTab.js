import React from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SlidersHorizontal, Search, MapPin, Star, Clock, Award } from 'lucide-react-native';
import { styles, colors } from '../../styles/ParentDashboard.styles';
import CaregiverCard from './CaregiverCard';
import { caregiversAPI } from '../../../services';


const SearchTab = ({
  searchQuery,
  filteredCaregivers,
  caregivers,
  searchLoading,
  refreshing,
  activeFilters,
  onRefresh,
  onBookCaregiver,
  onMessageCaregiver,
  onViewCaregiver,
  onSearch,
  onOpenFilter,
  onQuickFilter,
  quickFilters = {},
  loading = false
}) => {
  const displayData = searchQuery ? filteredCaregivers : caregivers;
  const showSearchResults = searchQuery && displayData.length > 0;
  const showAllCaregivers = !searchQuery && displayData.length > 0;
  const showEmptyState = displayData.length === 0;

  const quickFilterOptions = [
    { key: 'availableNow', label: 'Available Now', icon: Clock, color: '#10B981' },
    { key: 'nearMe', label: 'Near Me', icon: MapPin, color: '#3B82F6' },
    { key: 'topRated', label: 'Top Rated', icon: Star, color: '#F59E0B' },
    { key: 'certified', label: 'Certified', icon: Award, color: '#8B5CF6' },
  ];

  return (
    <View style={[styles.caregiversContent, { flex: 1 }]}>
      {/* Header and Filter Button */}
      <View style={searchTabStyles.headerContainer}>
        <Text style={searchTabStyles.headerTitle}>Find iYaya</Text>
        <TouchableOpacity 
          style={[searchTabStyles.filterButton, activeFilters > 0 && searchTabStyles.filterButtonActive]}
          onPress={onOpenFilter}
        >
          <SlidersHorizontal 
            size={16} 
            color="#db2777" 
            style={searchTabStyles.filterIcon}
          />
          <Text style={searchTabStyles.filterText}>Filters</Text>
          {activeFilters > 0 && (
            <View style={searchTabStyles.filterBadge}>
              <Text style={searchTabStyles.filterBadgeText}>{activeFilters}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={searchTabStyles.searchContainer}>
        <Search 
          size={20} 
          color="#9CA3AF" 
          style={searchTabStyles.searchIcon}
        />
        <TextInput
          style={searchTabStyles.searchInput}
          placeholder="Search by location, name, or specialty..."
          value={searchQuery}
          onChangeText={onSearch}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Quick Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={searchTabStyles.quickFiltersContainer}
        contentContainerStyle={searchTabStyles.quickFiltersContent}
      >
        {quickFilterOptions.map((filter) => {
          const IconComponent = filter.icon;
          const isActive = quickFilters[filter.key];
          
          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                searchTabStyles.quickFilterButton,
                isActive && { 
                  backgroundColor: filter.color + '15',
                  borderColor: filter.color 
                }
              ]}
              onPress={() => onQuickFilter && onQuickFilter(filter.key)}
            >
              <IconComponent 
                size={16} 
                color={isActive ? filter.color : '#6B7280'} 
              />
              <Text style={[
                searchTabStyles.quickFilterText,
                isActive && { color: filter.color, fontWeight: '600' }
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Active Filters Summary */}
      {(activeFilters > 0 || Object.values(quickFilters).some(Boolean)) && (
        <View style={searchTabStyles.activeFiltersContainer}>
          <Text style={searchTabStyles.activeFiltersText}>
            {activeFilters + Object.values(quickFilters).filter(Boolean).length} filters active
          </Text>
          <TouchableOpacity 
            style={searchTabStyles.clearFiltersButton}
            onPress={() => {
              // Clear all filters - this would need to be passed as a prop
              onQuickFilter && onQuickFilter('clear');
            }}
          >
            <Text style={searchTabStyles.clearFiltersText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {(searchLoading || loading) ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Searching caregivers...</Text>
        </View>
      ) : showEmptyState ? (
        <View style={styles.emptySection}>
          <Text style={styles.emptySectionText}>
            {searchQuery 
              ? `No caregivers found matching "${searchQuery}"`
              : 'No caregivers available at the moment'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayData}
          keyExtractor={(item) => String(item.id || item._id)}
          renderItem={({ item }) => (
            <CaregiverCard
              caregiver={item}
              onPress={() => onBookCaregiver(item)}
              onMessagePress={() => onMessageCaregiver(item)}
            />
          )}
          contentContainerStyle={styles.caregiversList}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={searchTabStyles.resultsHeader}>
              <Text style={styles.sectionTitle}>
                {showSearchResults 
                  ? `${displayData.length} results found` 
                  : `${displayData.length} caregivers available`}
              </Text>
              {displayData.length > 0 && (
                <TouchableOpacity style={searchTabStyles.sortButton}>
                  <Text style={searchTabStyles.sortText}>Sort by Rating</Text>
                </TouchableOpacity>
              )}
            </View>
          }

          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
};

const searchTabStyles = {
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#db2777',
    borderRadius: 25,
    position: 'relative',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterButtonActive: {
    backgroundColor: '#fdf2f8',
    borderColor: '#be185d',
  },
  filterIcon: {
    marginRight: 6,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#db2777',
  },
  filterBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    position: 'relative',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    top: 14,
    zIndex: 1,
  },
  searchInput: {
    width: '100%',
    paddingLeft: 48,
    paddingRight: 16,
    paddingVertical: 14,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    fontSize: 16,
    color: '#1f2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  quickFiltersContainer: {
    marginBottom: 12,
  },
  quickFiltersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickFilterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 6,
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  activeFiltersText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#EF4444',
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  sortText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
};

export default SearchTab;

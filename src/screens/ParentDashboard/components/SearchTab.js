import React from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, TextInput, TouchableOpacity } from 'react-native';
import { SlidersHorizontal, Search } from 'lucide-react-native';
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
  loading = false
}) => {
  const displayData = searchQuery ? filteredCaregivers : caregivers;
  const showSearchResults = searchQuery && displayData.length > 0;
  const showAllCaregivers = !searchQuery && displayData.length > 0;
  const showEmptyState = displayData.length === 0;

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
            <Text style={styles.sectionTitle}>
              {showSearchResults 
                ? `${displayData.length} results found` 
                : `${displayData.length} caregivers available`}
            </Text>
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#db2777',
    borderRadius: 20,
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: '#fdf2f8',
  },
  filterIcon: {
    marginRight: 4,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#db2777',
  },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    position: 'relative',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 12,
    zIndex: 1,
  },
  searchInput: {
    width: '100%',
    paddingLeft: 44,
    paddingRight: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    fontSize: 16,
    color: '#1f2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
};

export default SearchTab;

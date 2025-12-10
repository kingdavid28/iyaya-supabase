import { Search, SlidersHorizontal } from 'lucide-react-native';
import React, { memo, useCallback, useMemo } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, styles } from '../../styles/ParentDashboard.styles';
import CaregiverCard from './CaregiverCard';
import { trackSearchPerformed, trackEvent } from '../../../utils/analytics';

const PARENT_HEADER_GRADIENT = ['#f4a9daff', '#dcd8f0ff'];


const SearchTabComponent = ({
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
  onViewReviews,
  onSearch,
  onOpenFilter,
  onQuickFilter,
  quickFilters = {},
  loading = false,
  onRequestInfo,
}) => {
  const displayData = useMemo(
    () => (searchQuery ? filteredCaregivers : caregivers),
    [searchQuery, filteredCaregivers, caregivers]
  );
  const showSearchResults = searchQuery && displayData.length > 0;
  const showEmptyState = displayData.length === 0;

  const keyExtractor = useCallback(
    (item, index) => String(item?.id || item?._id || index),
    []
  );

  const renderCaregiver = useCallback(
    ({ item }) => (
      <CaregiverCard
        caregiver={item}
        onPress={() => {
          // Track caregiver card click
          trackEvent('caregiver_card_clicked', {
            caregiver_id: item?.id || item?._id,
            caregiver_name: item?.name,
            hourly_rate: item?.hourlyRate || item?.hourly_rate,
            rating: item?.rating,
            experience_years: item?.experienceYears || item?.experience_years
          });
          onBookCaregiver(item);
        }}
        onMessagePress={() => {
          trackEvent('caregiver_message_clicked', {
            caregiver_id: item?.id || item?._id
          });
          onMessageCaregiver(item);
        }}
        onViewReviews={onViewReviews ? () => {
          trackEvent('caregiver_reviews_viewed', {
            caregiver_id: item?.id || item?._id,
            reviews_count: item?.reviewsCount || 0
          });
          onViewReviews(item);
        } : undefined}
        onRequestInfo={onRequestInfo ? () => {
          trackEvent('caregiver_info_requested', {
            caregiver_id: item?.id || item?._id
          });
          onRequestInfo(item);
        } : undefined}
      />
    ),
    [onBookCaregiver, onMessageCaregiver, onViewReviews, onRequestInfo]
  );

  return (
    <View style={[styles.caregiversContent, { flex: 1 }]}>
      {/* Header and Filter Button */}
      <View style={[searchTabStyles.headerGradient, { backgroundColor: '#fff' }]}>
        <View style={searchTabStyles.headerContainer}>
          <Text style={searchTabStyles.headerTitle}>Find iYaya</Text>
          <TouchableOpacity
            style={[searchTabStyles.filterButton, activeFilters > 0 && searchTabStyles.filterButtonActive]}
            onPress={onOpenFilter}
          >
            <SlidersHorizontal
              size={16}
              color="rgba(255,255,255,0.92)"
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
          onChangeText={(text) => {
            onSearch(text);
            // Track search with real data
            if (text.length > 2) {
              trackSearchPerformed('caregivers', {
                query_length: text.length,
                results_count: filteredCaregivers?.length || 0,
                active_filters: activeFilters || 0
              });
            }
          }}
          placeholderTextColor="#9CA3AF"
        />
      </View>



      {/* Active Filters Summary */}
      {activeFilters > 0 && (
        <View style={searchTabStyles.activeFiltersContainer}>
          <Text style={searchTabStyles.activeFiltersText}>
            {activeFilters} filters active
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
          keyExtractor={keyExtractor}
          renderItem={renderCaregiver}
          contentContainerStyle={styles.caregiversList}
          showsVerticalScrollIndicator={false}
          windowSize={7}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          removeClippedSubviews
          ListHeaderComponent={
            <View style={searchTabStyles.resultsHeader}>
              <Text style={styles.sectionTitle}>
                {showSearchResults
                  ? `${displayData.length} results found`
                  : `${displayData.length} caregivers available`}
              </Text>
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

const SearchTab = memo(SearchTabComponent);
SearchTab.displayName = 'SearchTab';

const searchTabStyles = {
  headerGradient: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8d66b2ff',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(96, 49, 49, 0.45)',
    borderRadius: 25,
    position: 'relative',
    backgroundColor: '#cf7de8ff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(116, 44, 44, 0.28)',
    borderColor: 'rgba(123, 47, 47, 0.65)',
  },
  filterIcon: {
    marginRight: 6,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
    color: '#FFFFFF',
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
    paddingVertical: 10,
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

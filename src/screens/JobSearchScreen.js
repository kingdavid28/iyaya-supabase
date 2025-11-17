import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import jobService from '../services/jobService';
import { useApi } from '../hooks/useApi';
import { formatDistanceToNow } from 'date-fns';
import { styles } from './styles/JobSearchScreen.styles';

const JobSearchScreen = () => {
  const navigation = useNavigation();
  const [jobs, setJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    location: '',
    minRate: '',
    maxRate: '',
    isUrgent: false,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const {
    data: jobsData,
    loading,
    error,
    execute: loadJobs,
  } = useApi();

  // Load jobs when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchJobs(true);
    }, [searchQuery, filters])
  );

  const fetchJobs = async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page;
      const searchFilters = {
        ...filters,
        search: searchQuery,
        page: currentPage,
        limit: 10,
      };

      const result = await loadJobs(() => jobService.getAllJobs(searchFilters));

      if (result) {
        const { jobs: newJobs, pagination } = result;
        
        if (reset) {
          setJobs(newJobs);
          setPage(1);
        } else {
          setJobs(prev => [...prev, ...newJobs]);
        }
        
        setHasMore(pagination.page < pagination.pages);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load jobs');
    }
  };

  const handleSearch = () => {
    fetchJobs(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchJobs(true);
    setRefreshing(false);
  };

  const loadMoreJobs = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
      fetchJobs(false);
    }
  };

  const handleJobPress = (job) => {
    navigation.navigate('JobDetailsScreen', { jobId: job._id });
  };

  const handleApplyPress = (job) => {
    navigation.navigate('JobApplicationScreen', { jobId: job._id });
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      location: '',
      minRate: '',
      maxRate: '',
      isUrgent: false,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    setSearchQuery('');
  };

  const renderJob = ({ item: job }) => {
    const isUrgent = job.isUrgent;
    const postedTime = formatDistanceToNow(new Date(job.createdAt), { addSuffix: true });

    return (
      <TouchableOpacity
        style={[styles.jobCard, isUrgent && styles.urgentJobCard]}
        onPress={() => handleJobPress(job)}
      >
        {isUrgent && (
          <View style={styles.urgentBadge}>
            <Ionicons name="flash" size={12} color="#fff" />
            <Text style={styles.urgentBadgeText}>URGENT</Text>
          </View>
        )}

        <View style={styles.jobHeader}>
          <Text style={styles.jobTitle} numberOfLines={2}>
            {job.title}
          </Text>
          <Text style={styles.jobRate}>
            ₱{job.hourlyRate}/hr
          </Text>
        </View>

        <View style={styles.jobInfo}>
          <View style={styles.jobInfoRow}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={styles.jobInfoText}>{job.location}</Text>
          </View>
          
          <View style={styles.jobInfoRow}>
            <Ionicons name="people-outline" size={16} color="#666" />
            <Text style={styles.jobInfoText}>{job.childrenAges}</Text>
          </View>
          
          <View style={styles.jobInfoRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.jobInfoText}>
              {new Date(job.startDate).toLocaleDateString()} - {new Date(job.endDate).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <Text style={styles.jobDescription} numberOfLines={2}>
          {job.description}
        </Text>

        <View style={styles.jobFooter}>
          <View style={styles.jobMeta}>
            <Text style={styles.postedTime}>{postedTime}</Text>
            <Text style={styles.applicationCount}>
              {job.applicationCount || 0} applications
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => handleApplyPress(job)}
          >
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <TextInput
            style={styles.filterInput}
            value={filters.location}
            onChangeText={(value) => updateFilter('location', value)}
            placeholder="Location"
          />
        </View>

        <View style={styles.filterRow}>
          <TextInput
            style={[styles.filterInput, styles.halfWidth]}
            value={filters.minRate}
            onChangeText={(value) => updateFilter('minRate', value)}
            placeholder="Min Rate"
            keyboardType="decimal-pad"
          />
          <TextInput
            style={[styles.filterInput, styles.halfWidth]}
            value={filters.maxRate}
            onChangeText={(value) => updateFilter('maxRate', value)}
            placeholder="Max Rate"
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.filterActions}>
          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
            <Text style={styles.clearFiltersText}>Clear All</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.applyFiltersButton} onPress={handleSearch}>
            <Text style={styles.applyFiltersText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="briefcase-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No jobs found</Text>
      <Text style={styles.emptySubtitle}>
        Try adjusting your search criteria or check back later for new opportunities
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loading || jobs.length === 0) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#3b83f5" />
        <Text style={styles.loadingText}>Loading more jobs...</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search jobs..."
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity
          style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="options" size={20} color={showFilters ? '#3b83f5' : '#666'} />
        </TouchableOpacity>
      </View>

      {renderFilters()}

      {/* Jobs List */}
      {loading && jobs.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b83f5" />
          <Text style={styles.loadingText}>Loading jobs...</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item._id}
          renderItem={renderJob}
          contentContainerStyle={jobs.length === 0 ? styles.emptyList : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#3b83f5']}
              tintColor="#3b83f5"
            />
          }
          onEndReached={loadMoreJobs}
          onEndReachedThreshold={0.1}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

export default JobSearchScreen;

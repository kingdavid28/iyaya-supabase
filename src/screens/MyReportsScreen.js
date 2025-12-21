import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../contexts/AuthContext'
import { reportService } from '../services/supabase/reportService'

const MyReportsScreen = ({ navigation }) => {
  const { user } = useAuth()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState('all')

  const loadReports = async () => {
    if (!user?.id) {
      setLoading(false)
      setRefreshing(false)
      return
    }
    
    try {
      const data = await reportService.getMyReports(user.id)
      setReports(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading reports:', error)
      setReports([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (user?.id) {
      loadReports()
    }
  }, [user?.id])

  const onRefresh = () => {
    setRefreshing(true)
    loadReports()
  }

  const getStatusConfig = (status) => {
    switch (status) {
      case 'pending':
        return { color: '#F59E0B', bg: '#FEF3C7', icon: 'time-outline', label: 'Pending Review' }
      case 'under_review':
        return { color: '#3B82F6', bg: '#DBEAFE', icon: 'eye-outline', label: 'Under Review' }
      case 'resolved':
        return { color: '#10B981', bg: '#D1FAE5', icon: 'checkmark-circle-outline', label: 'Resolved' }
      case 'dismissed':
        return { color: '#6B7280', bg: '#F3F4F6', icon: 'close-circle-outline', label: 'Dismissed' }
      default:
        return { color: '#6B7280', bg: '#F3F4F6', icon: 'help-circle-outline', label: status }
    }
  }

  const getSeverityConfig = (severity) => {
    switch (severity) {
      case 'low':
        return { color: '#10B981', bg: '#D1FAE5', icon: 'information-circle-outline' }
      case 'medium':
        return { color: '#F59E0B', bg: '#FEF3C7', icon: 'alert-circle-outline' }
      case 'high':
        return { color: '#EF4444', bg: '#FEE2E2', icon: 'warning-outline' }
      case 'critical':
        return { color: '#DC2626', bg: '#FEE2E2', icon: 'alert-outline' }
      default:
        return { color: '#6B7280', bg: '#F3F4F6', icon: 'help-circle-outline' }
    }
  }

  const getReportTypeLabel = (type) => {
    const types = {
      'caregiver_misconduct': 'Caregiver Misconduct',
      'parent_maltreatment': 'Parent Maltreatment',
      'inappropriate_behavior': 'Inappropriate Behavior',
      'safety_concern': 'Safety Concern',
      'payment_dispute': 'Payment Dispute',
      'other': 'Other'
    }
    return types[type] || type
  }

  const filteredReports = reports.filter(report => {
    if (filter === 'all') return true
    return report.status === filter
  })

  const getFilterCounts = () => {
    return {
      all: reports.length,
      pending: reports.filter(r => r.status === 'pending').length,
      under_review: reports.filter(r => r.status === 'under_review').length,
      resolved: reports.filter(r => r.status === 'resolved').length,
      dismissed: reports.filter(r => r.status === 'dismissed').length
    }
  }

  const filterCounts = getFilterCounts()

  const renderFilterTabs = () => {
    const filters = [
      { key: 'all', label: 'All', count: filterCounts.all },
      { key: 'pending', label: 'Pending', count: filterCounts.pending },
      { key: 'under_review', label: 'Review', count: filterCounts.under_review },
      { key: 'resolved', label: 'Resolved', count: filterCounts.resolved }
    ]

    return (
      <View style={styles.filterContainer}>
        {filters.map(filterItem => (
          <TouchableOpacity
            key={filterItem.key}
            style={[
              styles.filterTab,
              filter === filterItem.key && styles.activeFilterTab
            ]}
            onPress={() => setFilter(filterItem.key)}
          >
            <Text style={[
              styles.filterTabText,
              filter === filterItem.key && styles.activeFilterTabText
            ]}>
              {filterItem.label}
            </Text>
            {filterItem.count > 0 && (
              <View style={[
                styles.filterBadge,
                filter === filterItem.key && styles.activeFilterBadge
              ]}>
                <Text style={[
                  styles.filterBadgeText,
                  filter === filterItem.key && styles.activeFilterBadgeText
                ]}>
                  {filterItem.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    )
  }

  const renderReport = ({ item }) => {
    const statusConfig = getStatusConfig(item.status)
    const severityConfig = getSeverityConfig(item.severity)
    const isReporter = item.reporter_id === user.id

    return (
      <TouchableOpacity style={styles.reportCard}>
        <View style={styles.reportHeader}>
          <View style={styles.reportTitleContainer}>
            <Text style={styles.reportTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.reportType}>
              {getReportTypeLabel(item.report_type)}
            </Text>
          </View>
          <View style={styles.badgeContainer}>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
              <Text style={[styles.badgeText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.reportDescription} numberOfLines={3}>
          {item.description}
        </Text>

        <View style={styles.reportFooter}>
          <View style={styles.reportMeta}>
            <View style={[styles.severityBadge, { backgroundColor: severityConfig.bg }]}>
              <Ionicons name={severityConfig.icon} size={14} color={severityConfig.color} />
              <Text style={[styles.severityText, { color: severityConfig.color }]}>
                {item.severity.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.reportDate}>
              {new Date(item.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>
          </View>
          <View style={styles.roleContainer}>
            <Ionicons 
              name={isReporter ? "flag-outline" : "person-outline"} 
              size={14} 
              color="#6B7280" 
            />
            <Text style={styles.roleText}>
              {isReporter ? 'You reported' : 'About you'}
            </Text>
          </View>
        </View>

        {item.admin_notes && (
          <View style={styles.adminNotesContainer}>
            <Ionicons name="chatbubble-outline" size={14} color="#6B7280" />
            <Text style={styles.adminNotesText} numberOfLines={2}>
              Admin: {item.admin_notes}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    )
  }

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
      </View>
      <Text style={styles.emptyTitle}>No Reports Found</Text>
      <Text style={styles.emptyDescription}>
        {filter === 'all' 
          ? "You haven't submitted any reports yet."
          : `No ${filter.replace('_', ' ')} reports found.`
        }
      </Text>
      {filter !== 'all' && (
        <TouchableOpacity 
          style={styles.clearFilterButton}
          onPress={() => setFilter('all')}
        >
          <Text style={styles.clearFilterText}>View All Reports</Text>
        </TouchableOpacity>
      )}
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Reports</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Reports</Text>
          <Text style={styles.headerSubtitle}>
            {reports.length} {reports.length === 1 ? 'report' : 'reports'}
          </Text>
        </View>
      </View>

      {renderFilterTabs()}

      <FlatList
        data={filteredReports}
        renderItem={renderReport}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContainer,
          filteredReports.length === 0 && styles.emptyListContainer
        ]}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  backButton: {
    padding: 8,
    marginRight: 8
  },
  headerContent: {
    flex: 1
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    gap: 6
  },
  activeFilterTab: {
    backgroundColor: '#3B82F6'
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280'
  },
  activeFilterTabText: {
    color: '#FFFFFF'
  },
  filterBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center'
  },
  activeFilterBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)'
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280'
  },
  activeFilterBadgeText: {
    color: '#FFFFFF'
  },
  listContainer: {
    padding: 16
  },
  emptyListContainer: {
    flex: 1
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6'
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  reportTitleContainer: {
    flex: 1,
    marginRight: 12
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 22
  },
  reportType: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  badgeContainer: {
    alignItems: 'flex-end'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600'
  },
  reportDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 16
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  reportMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  reportDate: {
    fontSize: 12,
    color: '#9CA3AF'
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  roleText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic'
  },
  adminNotesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8
  },
  adminNotesText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    lineHeight: 18
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32
  },
  emptyIconContainer: {
    marginBottom: 24
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24
  },
  clearFilterButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  clearFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF'
  }
})

export default MyReportsScreen
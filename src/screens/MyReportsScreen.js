import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl
} from 'react-native'
import { Chip } from 'react-native-paper'
import { useAuth } from '../contexts/AuthContext'
import { reportService } from '../services/supabase/reportService'

const MyReportsScreen = ({ navigation }) => {
  const { user } = useAuth()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadReports = async () => {
    try {
      const data = await reportService.getMyReports(user.id)
      setReports(data)
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    loadReports()
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ff9800'
      case 'under_review': return '#2196f3'
      case 'resolved': return '#4caf50'
      case 'dismissed': return '#f44336'
      default: return '#757575'
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'low': return '#4caf50'
      case 'medium': return '#ff9800'
      case 'high': return '#ff5722'
      case 'critical': return '#f44336'
      default: return '#757575'
    }
  }

  const renderReport = ({ item }) => (
    <TouchableOpacity
      style={styles.reportCard}
      onPress={() => navigation.navigate('ReportDetail', { reportId: item.id })}
    >
      <View style={styles.reportHeader}>
        <Text style={styles.reportTitle}>{item.title}</Text>
        <View style={styles.chips}>
          <Chip 
            style={[styles.chip, { backgroundColor: getStatusColor(item.status) }]}
            textStyle={styles.chipText}
          >
            {item.status.replace('_', ' ')}
          </Chip>
          <Chip 
            style={[styles.chip, { backgroundColor: getSeverityColor(item.severity) }]}
            textStyle={styles.chipText}
          >
            {item.severity}
          </Chip>
        </View>
      </View>
      
      <Text style={styles.reportType}>
        {item.report_type.replace('_', ' ').toUpperCase()}
      </Text>
      
      <Text style={styles.reportDescription} numberOfLines={2}>
        {item.description}
      </Text>
      
      <View style={styles.reportFooter}>
        <Text style={styles.reportDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        {item.reporter_id === user.id ? (
          <Text style={styles.roleText}>You reported</Text>
        ) : (
          <Text style={styles.roleText}>Reported about you</Text>
        )}
      </View>
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading reports...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reports}
        renderItem={renderReport}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No reports found</Text>
          </View>
        }
        contentContainerStyle={reports.length === 0 ? styles.emptyContainer : null}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyContainer: {
    flex: 1
  },
  emptyText: {
    fontSize: 16,
    color: '#666'
  },
  reportCard: {
    backgroundColor: 'white',
    margin: 8,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8
  },
  chips: {
    flexDirection: 'row',
    gap: 4
  },
  chip: {
    height: 24
  },
  chipText: {
    fontSize: 10,
    color: 'white'
  },
  reportType: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginBottom: 4
  },
  reportDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  reportDate: {
    fontSize: 12,
    color: '#666'
  },
  roleText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic'
  }
})

export default MyReportsScreen
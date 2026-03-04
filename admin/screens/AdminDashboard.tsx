import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { TransactionMonitorScreen } from './TransactionMonitorScreen';
import { PointsManagementScreen } from './PointsManagementScreen';
import { supabase } from '../../lib/supabase';

interface AdminStats {
  totalTransactions: number;
  pendingTransactions: number;
  totalCaregivers: number;
  averageRating: number;
}

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'transactions' | 'points'>('transactions');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [selectedCaregiver, setSelectedCaregiver] = useState<string | null>(null);

  const loadStats = async () => {
    const [txResult, cgResult] = await Promise.all([
      supabase.from('transaction_ledger').select('status'),
      supabase.from('caregiver_points_summary').select('rolling_avg_rating')
    ]);

    const transactions = txResult.data || [];
    const caregivers = cgResult.data || [];

    setStats({
      totalTransactions: transactions.length,
      pendingTransactions: transactions.filter(tx => tx.status === 'pending').length,
      totalCaregivers: caregivers.length,
      averageRating: caregivers.reduce((sum, cg) => sum + (cg.rolling_avg_rating || 0), 0) / caregivers.length || 0
    });
  };

  useEffect(() => {
    loadStats();
  }, []);

  const StatCard = ({ title, value, color = '#007AFF' }: { title: string; value: string | number; color?: string }) => (
    <View style={styles.statCard}>
      <Text style={styles.statValue} color={color}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Stats Overview */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
        <StatCard title="Total Transactions" value={stats?.totalTransactions || 0} />
        <StatCard title="Pending" value={stats?.pendingTransactions || 0} color="#FF9800" />
        <StatCard title="Caregivers" value={stats?.totalCaregivers || 0} color="#4CAF50" />
        <StatCard title="Avg Rating" value={stats?.averageRating.toFixed(1) || '0.0'} color="#9C27B0" />
      </ScrollView>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
          onPress={() => setActiveTab('transactions')}
        >
          <Text style={[styles.tabText, activeTab === 'transactions' && styles.activeTabText]}>
            Transactions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'points' && styles.activeTab]}
          onPress={() => setActiveTab('points')}
        >
          <Text style={[styles.tabText, activeTab === 'points' && styles.activeTabText]}>
            Points
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'transactions' ? (
          <TransactionMonitorScreen />
        ) : (
          <PointsManagementScreen 
            caregiverId={selectedCaregiver || ''} 
            onUpdate={loadStats}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  statsContainer: { 
    flexDirection: 'row', 
    padding: 16,
    maxHeight: 100,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginRight: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: 'bold' },
  statTitle: { fontSize: 12, color: '#666', marginTop: 4 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: { backgroundColor: '#007AFF' },
  tabText: { fontSize: 16, color: '#666' },
  activeTabText: { color: '#fff', fontWeight: 'bold' },
  content: { flex: 1, marginTop: 16 },
});
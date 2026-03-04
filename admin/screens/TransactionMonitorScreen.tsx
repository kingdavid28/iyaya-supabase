import React, { useState, useEffect } from 'react';
import { FlatList, RefreshControl, View, Text, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';

interface Transaction {
  id: string;
  signature: string;
  token: 'SOL' | 'USDC';
  amount_lamports?: number;
  amount_spl?: number;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
  caregiver_address: string;
}

export function TransactionMonitorScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadTransactions = async () => {
    setRefreshing(true);
    const { data } = await supabase
      .from('transaction_ledger')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setTransactions(data || []);
    setRefreshing(false);
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <Text style={styles.signature}>{item.signature.slice(0, 8)}...</Text>
      <Text style={styles.token}>{item.token}</Text>
      <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
        {item.status.toUpperCase()}
      </Text>
      <Text style={styles.amount}>
        {item.token === 'SOL' 
          ? `${(item.amount_lamports || 0) / 1e9} SOL`
          : `${(item.amount_spl || 0) / 1e6} USDC`
        }
      </Text>
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#4CAF50';
      case 'failed': return '#F44336';
      default: return '#FF9800';
    }
  };

  return (
    <FlatList
      data={transactions}
      renderItem={renderTransaction}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadTransactions} />
      }
      style={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  transactionCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  signature: { fontSize: 12, fontFamily: 'monospace' },
  token: { fontWeight: 'bold' },
  status: { fontSize: 12, fontWeight: 'bold' },
  amount: { fontSize: 14 },
});
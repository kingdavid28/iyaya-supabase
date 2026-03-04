import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

interface PointsData {
  totalPoints: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  recent: Array<{
    metric: string;
    delta: number;
    reason: string;
    created_at: string;
  }>;
}

interface PointsDashboardProps {
  caregiverId: string;
}

export function PointsDashboard({ caregiverId }: PointsDashboardProps) {
  const [points, setPoints] = useState<PointsData | null>(null);

  useEffect(() => {
    fetchPoints();
  }, [caregiverId]);

  const fetchPoints = async () => {
    try {
      const response = await fetch(`/api/caregivers/${caregiverId}/points`);
      const data = await response.json();
      setPoints(data);
    } catch (error) {
      console.error('Failed to fetch points:', error);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Platinum': return '#E5E4E2';
      case 'Gold': return '#FFD700';
      case 'Silver': return '#C0C0C0';
      default: return '#CD7F32';
    }
  };

  if (!points) return <Text>Loading...</Text>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.points}>{points.totalPoints} Points</Text>
        <View style={[styles.tier, { backgroundColor: getTierColor(points.tier) }]}>
          <Text style={styles.tierText}>{points.tier}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Activity</Text>
      <FlatList
        data={points.recent}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.activityItem}>
            <Text style={styles.reason}>{item.reason}</Text>
            <Text style={[styles.delta, { color: item.delta > 0 ? 'green' : 'red' }]}>
              {item.delta > 0 ? '+' : ''}{item.delta}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  points: { fontSize: 24, fontWeight: 'bold' },
  tier: { padding: 8, borderRadius: 16 },
  tierText: { fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  activityItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  reason: { flex: 1 },
  delta: { fontWeight: 'bold' }
});
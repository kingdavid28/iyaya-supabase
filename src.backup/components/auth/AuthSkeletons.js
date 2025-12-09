import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  SkeletonCard,
  SkeletonBlock,
  SkeletonCircle,
  SkeletonButton
} from '../common/SkeletonPlaceholder';

export const AuthStatusSkeleton = () => (
  <SkeletonCard style={styles.statusCard} shimmerWidth="55%">
    <View style={styles.statusRow}>
      <SkeletonCircle size={52} />
      <View style={styles.statusText}>
        <SkeletonBlock width="75%" height={18} />
        <SkeletonBlock width="60%" height={14} style={styles.statusSubline} />
        <SkeletonBlock width="50%" height={14} />
      </View>
    </View>
  </SkeletonCard>
);

export const AuthActionSkeleton = () => (
  <SkeletonCard style={styles.actionCard} shimmerWidth="65%">
    <SkeletonBlock width="70%" height={18} style={styles.actionTitle} />
    <SkeletonButton style={styles.actionButton} />
    <SkeletonButton style={styles.actionButton} />
  </SkeletonCard>
);

const styles = StyleSheet.create({
  statusCard: {
    width: '100%',
    padding: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusText: {
    flex: 1,
    gap: 10,
  },
  statusSubline: {
    marginTop: 4,
  },
  actionCard: {
    width: '100%',
    padding: 20,
    gap: 16,
  },
  actionTitle: {
    alignSelf: 'flex-start',
  },
  actionButton: {
    height: 44,
    borderRadius: 12,
  },
});

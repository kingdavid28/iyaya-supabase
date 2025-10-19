import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonCard, SkeletonBlock, SkeletonCircle, SkeletonPill } from '../common/SkeletonPlaceholder';

export const ProfileHeaderSkeleton = () => (
  <SkeletonCard style={styles.headerCard} shimmerWidth="35%">
    <View style={styles.headerContent}>
      <SkeletonCircle size={72} />
      <View style={styles.headerText}>
        <SkeletonBlock width="60%" height={18} />
        <SkeletonBlock width="40%" height={14} style={styles.headerSubline} />
        <SkeletonPill width="50%" height={20} />
      </View>
    </View>
  </SkeletonCard>
);

export const ProfileCardSkeleton = ({ lines = 3 }) => (
  <SkeletonCard style={styles.sectionCard}>
    <SkeletonBlock width="45%" height={16} style={styles.sectionTitle} />
    <View style={styles.sectionContent}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBlock
          key={`profile-skeleton-${index}`}
          width={index % 2 === 0 ? '85%' : '60%'}
          height={14}
          style={styles.sectionLine}
        />
      ))}
    </View>
  </SkeletonCard>
);

const styles = StyleSheet.create({
  headerCard: {
    marginBottom: 16,
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerText: {
    flex: 1,
    gap: 8,
  },
  headerSubline: {
    marginTop: 4,
  },
  sectionCard: {
    marginBottom: 16,
    padding: 20,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  sectionContent: {
    gap: 12,
  },
  sectionLine: {
    borderRadius: 8,
  },
});

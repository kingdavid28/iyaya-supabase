import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AuthActionSkeleton, AuthStatusSkeleton } from '../auth/AuthSkeletons';
import {
    SkeletonBlock,
    SkeletonButton,
    SkeletonCard,
    SkeletonCircle,
    SkeletonPill,
} from '../common/SkeletonPlaceholder';
import {
    ConversationListSkeleton,
    MessageThreadSkeleton,
} from '../messaging/MessagingSkeletons';
import {
    ProfileCardSkeleton,
    ProfileHeaderSkeleton,
} from '../profile/ProfileSkeletons';

export const ParentDashboardSkeleton = () => (
  <ScrollView contentContainerStyle={styles.screenContainer}>
    <SkeletonCard style={styles.primaryCard} shimmerWidth="60%">
      <View style={styles.primaryRow}>
        <SkeletonCircle size={68} />
        <View style={styles.primaryText}>
          <SkeletonBlock width="55%" height={20} />
          <SkeletonBlock width="40%" height={16} style={styles.primarySubline} />
          <SkeletonPill width="50%" height={18} />
        </View>
      </View>
    </SkeletonCard>

    <SkeletonCard style={styles.inlineCard} shimmerWidth="50%">
      <SkeletonBlock width="40%" height={18} style={styles.sectionTitle} />
      <View style={styles.inlineRow}>
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={`parent-quick-${index}`} style={styles.inlineItem}>
            <SkeletonCircle size={44} />
            <SkeletonBlock width="70%" height={12} style={styles.inlineLabel} />
          </View>
        ))}
      </View>
    </SkeletonCard>

    <SkeletonCard style={styles.sectionCard} shimmerWidth="45%">
      <SkeletonBlock width="50%" height={18} style={styles.sectionTitle} />
      <View style={styles.listColumn}>
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={`child-card-${index}`} style={styles.listItem}>
            <SkeletonCircle size={42} />
            <View style={styles.listItemText}>
              <SkeletonBlock width="60%" height={16} />
              <SkeletonBlock width="40%" height={14} />
              <SkeletonPill width="35%" height={12} />
            </View>
            <SkeletonButton style={styles.actionButton} />
          </View>
        ))}
      </View>
    </SkeletonCard>
  </ScrollView>
);

export const CaregiverDashboardSkeleton = () => (
  <ScrollView contentContainerStyle={styles.screenContainer}>
    <SkeletonCard style={styles.primaryCard} shimmerWidth="55%">
      <View style={styles.primaryRow}>
        <SkeletonCircle size={72} />
        <View style={styles.primaryText}>
          <SkeletonBlock width="50%" height={20} />
          <SkeletonBlock width="45%" height={16} style={styles.primarySubline} />
          <SkeletonPill width="40%" height={18} />
        </View>
      </View>
    </SkeletonCard>

    <SkeletonCard style={styles.sectionCard} shimmerWidth="50%">
      <SkeletonBlock width="45%" height={18} style={styles.sectionTitle} />
      <View style={styles.listColumn}>
        {Array.from({ length: 2 }).map((_, index) => (
          <View key={`caregiver-card-${index}`} style={styles.listItemTall}>
            <SkeletonBlock width="70%" height={16} />
            <SkeletonBlock width="45%" height={14} style={styles.primarySubline} />
            <SkeletonPill width="60%" height={14} />
            <SkeletonButton style={styles.fullButton} />
          </View>
        ))}
      </View>
    </SkeletonCard>
  </ScrollView>
);

export const MessagingScreenSkeleton = () => (
  <ScrollView contentContainerStyle={styles.screenContainer}>
    <ConversationListSkeleton rows={4} />
    <SkeletonCard style={styles.sectionCard} shimmerWidth="40%">
      <SkeletonBlock width="60%" height={18} style={styles.sectionTitle} />
      <MessageThreadSkeleton bubbles={6} />
    </SkeletonCard>
  </ScrollView>
);

export const ProfileScreenSkeleton = () => (
  <ScrollView contentContainerStyle={styles.screenContainer}>
    <ProfileHeaderSkeleton />
    <ProfileCardSkeleton lines={4} />
    <ProfileCardSkeleton lines={3} />
  </ScrollView>
);

export const AuthFlowSkeleton = () => (
  <ScrollView contentContainerStyle={styles.screenContainer}>
    <AuthStatusSkeleton />
    <AuthActionSkeleton />
  </ScrollView>
);

export const ManagementScreenSkeleton = ({ rows = 4 }) => (
  <ScrollView contentContainerStyle={styles.screenContainer}>
    <SkeletonCard style={styles.primaryCard} shimmerWidth="45%">
      <SkeletonBlock width="60%" height={20} />
      <SkeletonBlock width="35%" height={14} style={styles.primarySubline} />
    </SkeletonCard>

    {Array.from({ length: rows }).map((_, index) => (
      <SkeletonCard key={`management-row-${index}`} style={styles.managementCard} shimmerWidth="35%">
        <View style={styles.managementHeader}>
          <SkeletonCircle size={40} />
          <View style={styles.managementHeaderText}>
            <SkeletonBlock width="55%" height={16} />
            <SkeletonBlock width="35%" height={12} />
          </View>
          <SkeletonPill width="25%" height={14} />
        </View>
        <SkeletonBlock width="90%" height={12} style={styles.managementLine} />
        <SkeletonBlock width="70%" height={12} />
      </SkeletonCard>
    ))}
  </ScrollView>
);

export const WizardScreenSkeleton = ({ steps = 4 }) => (
  <ScrollView contentContainerStyle={styles.screenContainer}>
    <SkeletonCard style={styles.wizardHero} shimmerWidth="40%">
      <SkeletonBlock width="65%" height={22} />
      <SkeletonBlock width="45%" height={14} style={styles.primarySubline} />
    </SkeletonCard>

    <SkeletonCard style={styles.wizardSteps}>
      {Array.from({ length: steps }).map((_, index) => (
        <View key={`wizard-step-${index}`} style={styles.wizardStep}>
          <SkeletonCircle size={36} />
          <View style={styles.wizardStepText}>
            <SkeletonBlock width="55%" height={16} />
            <SkeletonBlock width="40%" height={12} />
          </View>
          <SkeletonPill width="28%" height={14} />
        </View>
      ))}
    </SkeletonCard>
  </ScrollView>
);

const styles = StyleSheet.create({
  screenContainer: {
    padding: 20,
    gap: 16,
  },
  primaryCard: {
    padding: 20,
  },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  primaryText: {
    flex: 1,
    gap: 8,
  },
  primarySubline: {
    marginTop: 6,
  },
  inlineCard: {
    padding: 18,
  },
  inlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  inlineItem: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  inlineLabel: {
    alignSelf: 'stretch',
  },
  sectionCard: {
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  listColumn: {
    gap: 14,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  listItemTall: {
    gap: 12,
  },
  listItemText: {
    flex: 1,
    gap: 8,
  },
  actionButton: {
    width: 64,
    height: 32,
    borderRadius: 16,
  },
  fullButton: {
    height: 38,
    borderRadius: 18,
  },
});
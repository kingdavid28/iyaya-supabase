import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  SkeletonCard,
  SkeletonBlock,
  SkeletonCircle,
  SkeletonPill
} from '../common/SkeletonPlaceholder';

export const ConversationRowSkeleton = () => (
  <SkeletonCard style={styles.conversationRow} shimmerWidth="40%">
    <View style={styles.conversationContent}>
      <SkeletonCircle size={48} />
      <View style={styles.conversationText}>
        <View style={styles.conversationHeader}>
          <SkeletonBlock width="55%" height={16} />
          <SkeletonBlock width={60} height={12} />
        </View>
        <SkeletonBlock width="85%" height={12} />
      </View>
    </View>
  </SkeletonCard>
);

export const ConversationListSkeleton = ({ rows = 6 }) => (
  <View style={styles.listContainer}>
    <SkeletonBlock width="35%" height={18} style={styles.sectionTitle} />
    {Array.from({ length: rows }).map((_, index) => (
      <ConversationRowSkeleton key={`conversation-skeleton-${index}`} />
    ))}
  </View>
);

export const MessageBubbleSkeleton = ({ alignment = 'left' }) => (
  <View
    style={[styles.bubbleRow, alignment === 'right' ? styles.bubbleRowRight : styles.bubbleRowLeft]}
  >
    {alignment === 'left' && <SkeletonCircle size={32} />}
    <View
      style={[
        styles.bubbleCard,
        alignment === 'right' ? styles.bubbleCardRight : styles.bubbleCardLeft,
      ]}
    >
      <SkeletonBlock width="65%" height={14} />
      <SkeletonBlock width="45%" height={12} style={styles.bubbleMeta} />
    </View>
    {alignment === 'right' && <SkeletonCircle size={32} />}
  </View>
);

export const MessageThreadSkeleton = ({ bubbles = 8 }) => (
  <View style={styles.threadContainer}>
    {Array.from({ length: bubbles }).map((_, index) => (
      <MessageBubbleSkeleton
        key={`message-bubble-${index}`}
        alignment={index % 2 === 0 ? 'left' : 'right'}
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  conversationRow: {
    padding: 16,
    marginBottom: 12,
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  conversationText: {
    flex: 1,
    gap: 8,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 20,
  },
  bubbleRowLeft: {
    justifyContent: 'flex-start',
  },
  bubbleRowRight: {
    justifyContent: 'flex-end',
  },
  bubbleCard: {
    flexBasis: '70%',
    gap: 8,
    padding: 16,
    borderRadius: 20,
  },
  bubbleCardLeft: {
    alignItems: 'flex-start',
  },
  bubbleCardRight: {
    alignItems: 'flex-end',
  },
  bubbleMeta: {
    alignSelf: 'flex-start',
  },
  threadContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});

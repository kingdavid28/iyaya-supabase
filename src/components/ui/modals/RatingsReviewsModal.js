import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ModalWrapper from '../../../shared/ui/ModalWrapper';
import ReviewList from '../../features/profile/ReviewList';
import { reviewService } from '../../../services';
import { normalizeCaregiverReviewsForList } from '../../../utils/reviews';

const ensureRatingValue = (value) => {
  if (typeof value !== 'number') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed > 5 ? parsed / 10 : parsed;
    }
    return 0;
  }
  return value > 5 ? value / 10 : value;
};

const RatingsReviewsModal = ({
  visible,
  onClose,
  caregiverId,
  caregiverName,
  onPreload,
  currentUserId,
  limit = 30
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rawReviews, setRawReviews] = useState([]);

  const loadReviews = useCallback(async () => {
    if (!visible || !caregiverId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await Promise.resolve(onPreload?.(caregiverId));
      const data = await reviewService.getReviews(caregiverId, limit, 0);
      setRawReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Unable to load reviews right now.');
      setRawReviews([]);
    } finally {
      setLoading(false);
    }
  }, [caregiverId, limit, onPreload, visible]);

  useEffect(() => {
    if (!visible || !caregiverId) {
      return;
    }
    let isActive = true;
    const run = async () => {
      if (!isActive) {
        return;
      }
      await loadReviews();
    };
    run();
    return () => {
      isActive = false;
    };
  }, [visible, caregiverId, loadReviews]);

  const reviews = useMemo(() => {
    return normalizeCaregiverReviewsForList(rawReviews).map((review) => ({
      ...review,
      rating: ensureRatingValue(review.rating)
    }));
  }, [rawReviews]);

  const summary = useMemo(() => {
    if (!reviews.length) {
      return {
        average: 0,
        total: 0,
        distribution: [5, 4, 3, 2, 1].map((score) => ({ score, count: 0 }))
      };
    }
    const total = reviews.length;
    const sum = reviews.reduce((acc, item) => acc + ensureRatingValue(item.rating), 0);
    const buckets = [5, 4, 3, 2, 1].map((score) => ({ score, count: 0 }));
    reviews.forEach((item) => {
      const rounded = Math.round(ensureRatingValue(item.rating));
      const bucket = buckets.find((entry) => entry.score === rounded);
      if (bucket) {
        bucket.count += 1;
      }
    });
    return {
      average: sum / total,
      total,
      distribution: buckets
    };
  }, [reviews]);

  return (
    <ModalWrapper visible={visible} onClose={onClose} style={styles.modalContent}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.title}>Ratings & Reviews</Text>
            {caregiverName ? (
              <Text style={styles.subtitle}>{caregiverName}</Text>
            ) : null}
          </View>
          <View style={styles.headerActions}>
            <View style={styles.summaryBadge}>
              <Ionicons name="star" size={18} color="#FACC15" />
              <Text style={styles.summaryBadgeValue}>{summary.average.toFixed(1)}</Text>
              <Text style={styles.summaryBadgeLabel}>({summary.total})</Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close ratings and reviews"
              style={styles.closeButton}
            >
              <Ionicons name="close" size={18} color="#4B5563" />
            </Pressable>
          </View>
        </View>

        <View style={styles.metricsRow}>
          {summary.distribution.map((bucket) => {
            const width = summary.total ? Math.max(6, Math.round((bucket.count / summary.total) * 100)) : 0;
            return (
              <View key={bucket.score} style={styles.metricItem}>
                <Text style={styles.metricLabel}>{bucket.score}★</Text>
                <View style={styles.metricBar}>
                  <View style={[styles.metricFill, { width: `${width}%` }]} />
                </View>
                <Text style={styles.metricValue}>{bucket.count}</Text>
              </View>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.stateText}>Loading feedback…</Text>
          </View>
        ) : error ? (
          <View style={styles.stateContainer}>
            <Ionicons name="alert-circle" size={24} color="#F87171" />
            <Text style={styles.stateText}>{error}</Text>
          </View>
        ) : (
          <ReviewList
            reviews={reviews}
            currentUserId={currentUserId}
            useVirtualizedList={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.stateContainer}>
                <Ionicons name="chatbubble-ellipses" size={20} color="#9CA3AF" />
                <Text style={styles.stateText}>No reviews yet</Text>
              </View>
            }
          />
        )}
      </View>
    </ModalWrapper>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    padding: 0,
    width: '92%',
    maxWidth: 500,
    borderRadius: 24,
    overflow: 'hidden'
  },
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    maxHeight: 620
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  headerTextGroup: {
    flex: 1
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827'
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280'
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6
  },
  summaryBadgeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937'
  },
  summaryBadgeLabel: {
    fontSize: 12,
    color: '#6B7280'
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6'
  },
  metricsRow: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  metricLabel: {
    width: 36,
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563'
  },
  metricBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
    overflow: 'hidden'
  },
  metricFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#2563EB'
  },
  metricValue: {
    width: 32,
    textAlign: 'right',
    fontSize: 13,
    color: '#4B5563'
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8
  },
  stateText: {
    fontSize: 14,
    color: '#4B5563'
  },
  listContent: {
    paddingBottom: 16
  }
});

export default RatingsReviewsModal;

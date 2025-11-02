import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import ReviewList from '../../components/features/profile/ReviewList';
import { styles } from '../styles/CaregiverDashboard.styles';

const REVIEW_FILTERS = [
  { id: 'all', label: 'All highlights' },
  { id: 'recent', label: 'Latest' },
  { id: 'positive', label: '4★ & up' },
  { id: 'with-notes', label: 'With stories' },
  { id: 'needs-attention', label: 'Needs follow-up' }
];

const CaregiverReviewsTab = ({
  reviews = [],
  loading = false,
  refreshing = false,
  currentUserId,
  onRefresh,
  onEditReview,
  onOpenRatings,
  onRequestHighlight,
  highlightRequestSending = false
}) => {
  const [activeFilter, setActiveFilter] = useState('all');

  const sortedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => {
      const dateA = new Date(a?.createdAt || a?.created_at || a?.created_at?.seconds * 1000 || 0);
      const dateB = new Date(b?.createdAt || b?.created_at || b?.created_at?.seconds * 1000 || 0);
      return dateB - dateA;
    });
  }, [reviews]);

  const totalReviews = sortedReviews.length;

  const averageRating = useMemo(() => {
    if (!totalReviews) return '—';
    const total = sortedReviews.reduce((sum, review) => sum + (review?.rating || 0), 0);
    return (total / totalReviews).toFixed(1);
  }, [sortedReviews, totalReviews]);

  const ratingDistribution = useMemo(() => {
    const buckets = [5, 4, 3, 2, 1].map((rating) => ({ rating, count: 0 }));
    const bucketMap = buckets.reduce((acc, item) => {
      acc[item.rating] = item;
      return acc;
    }, {});

    sortedReviews.forEach((review) => {
      const bucket = bucketMap[Math.round(review?.rating || 0)];
      if (bucket) bucket.count += 1;
    });

    return buckets;
  }, [sortedReviews]);

  const filteredReviews = useMemo(() => {
    switch (activeFilter) {
      case 'recent':
        return sortedReviews.slice(0, 6);
      case 'positive':
        return sortedReviews.filter((review) => (review?.rating || 0) >= 4);
      case 'with-notes':
        return sortedReviews.filter((review) => review?.comment?.trim());
      case 'needs-attention':
        return sortedReviews.filter((review) => {
          const rating = review?.rating || 0;
          return rating > 0 && rating <= 3;
        });
      default:
        return sortedReviews;
    }
  }, [activeFilter, sortedReviews]);

  const fiveStarStats = useMemo(() => {
    const bucket = ratingDistribution.find((item) => item.rating === 5);
    const count = bucket?.count ?? 0;
    const share = totalReviews ? Math.round((count / totalReviews) * 100) : 0;
    return { share, count };
  }, [ratingDistribution, totalReviews]);

  const commentStats = useMemo(() => {
    const count = sortedReviews.filter((review) => review?.comment?.trim()).length;
    const share = totalReviews ? Math.round((count / totalReviews) * 100) : 0;
    return { share, count };
  }, [sortedReviews, totalReviews]);

  const reviewSummaryItems = useMemo(
    () => [
      {
        id: 'total',
        label: 'Highlights collected',
        value: String(totalReviews || 0),
        icon: 'people-circle-outline',
        accent: '#1D4ED8',
        detail: totalReviews
          ? `${totalReviews} ${totalReviews === 1 ? 'family' : 'families'} shared feedback`
          : 'Invite families to leave a review',
        detailIcon: 'people-outline'
      },
      {
        id: 'five-star',
        label: '5★ share',
        value: totalReviews ? `${fiveStarStats.share}%` : '—',
        icon: 'star-outline',
        accent: '#F59E0B',
        detail: totalReviews
          ? `${fiveStarStats.count} five-star ${fiveStarStats.count === 1 ? 'review' : 'reviews'}`
          : 'No five-star ratings yet',
        detailIcon: 'star'
      },
      {
        id: 'stories',
        label: 'Reviews with notes',
        value: totalReviews ? `${commentStats.share}%` : '—',
        icon: 'chatbubble-ellipses-outline',
        accent: '#10B981',
        detail: totalReviews
          ? `${commentStats.count} highlight${commentStats.count === 1 ? '' : 's'} with stories`
          : 'Awaiting family stories',
        detailIcon: 'document-text-outline'
      }
    ],
    [commentStats.count, commentStats.share, fiveStarStats.count, fiveStarStats.share, totalReviews]
  );

  const handleSelectFilter = useCallback((filterId) => {
    setActiveFilter((current) => (current === filterId ? current : filterId));
  }, []);

  const reviewsEmptyComponent = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading highlights...</Text>
        </View>
      );
    }

    const hasReviews = totalReviews > 0;

    return (
      <View style={styles.reviewsEmptyCard}>
        <Ionicons
          name={hasReviews ? 'search-outline' : 'sparkles-outline'}
          size={32}
          color="#3B82F6"
        />
        <Text style={styles.reviewsEmptyTitle}>
          {hasReviews ? 'No highlights match this view' : 'No highlights yet'}
        </Text>
        <Text style={styles.reviewsEmptySubtitle}>
          {hasReviews
            ? 'Try a different filter or invite families to leave feedback.'
            : 'Once families share their experiences after bookings, their testimonials will appear here.'}
        </Text>
      </View>
    );
  }, [loading, totalReviews]);

  const reviewsFooterComponent = useMemo(
    () => (
      <View style={styles.reviewsFooterCard}>
        <View style={styles.reviewsFooterContent}>
          <Ionicons name="sparkles-outline" size={24} color="#1D4ED8" />
          <View style={styles.reviewsFooterTextWrapper}>
            <Text style={styles.reviewsFooterTitle}>Keep the stories coming</Text>
            <Text style={styles.reviewsFooterSubtitle}>
              Follow up with recent families to capture their experience while it's still fresh.
            </Text>
          </View>
        </View>
        <Pressable
          style={[styles.reviewsFooterButton, highlightRequestSending && { opacity: 0.6 }]}
          onPress={onRequestHighlight}
          disabled={highlightRequestSending}
        >
          <Ionicons name="mail-unread-outline" size={16} color="#FFFFFF" />
          <Text style={styles.reviewsFooterButtonText}>Request highlight</Text>
        </Pressable>
      </View>
    ),
    [highlightRequestSending, onRequestHighlight]
  );

  const reviewsHeaderComponent = useMemo(
    () => (
      <View>
        <LinearGradient
          colors={['#1d4ed8', '#1e40af']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.reviewsHeroCard}
        >
          <View style={styles.reviewsHeroHeader}>
            <Pressable
              style={styles.reviewsHeroMetric}
              onPress={onOpenRatings}
              accessibilityRole="button"
              accessibilityLabel="View ratings and reviews"
            >
              <Text style={styles.reviewsHeroLabel}>Average rating</Text>
              <View style={styles.reviewsHeroValueRow}>
                <Text style={styles.reviewsHeroValue}>{averageRating}</Text>
                <Ionicons name="star" size={22} color="#FACC15" />
              </View>
              <Text style={styles.reviewsHeroHint}>Based on family-submitted highlights</Text>
            </Pressable>
            <Pressable
              onPress={onRequestHighlight}
              style={[styles.reviewsHeroButton, highlightRequestSending && { opacity: 0.6 }]}
              disabled={highlightRequestSending}
            >
              <Ionicons name="sparkles-outline" size={8} color="#1D4ED8" />
              <Text style={styles.reviewsHeroButtonText}>Request highlight</Text>
            </Pressable>
          </View>

          <View style={styles.reviewsFilterRow}>
            {REVIEW_FILTERS.map((filter) => {
              const active = activeFilter === filter.id;
              return (
                <Pressable
                  key={filter.id}
                  style={[styles.reviewsFilterPill, active && styles.reviewsFilterPillActive]}
                  onPress={() => handleSelectFilter(filter.id)}
                >
                  <Text
                    style={[styles.reviewsFilterPillText, active && styles.reviewsFilterPillTextActive]}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </LinearGradient>

        <View style={styles.reviewsSummaryGrid}>
          {reviewSummaryItems.map((item) => (
            <View key={item.id} style={styles.reviewsSummaryCard}>
              <View style={[styles.reviewsSummaryIconWrap, { backgroundColor: `${item.accent}1A` }]}>
                <Ionicons name={item.icon} size={18} color={item.accent} />
              </View>
              <Text style={styles.reviewsSummaryLabel}>{item.label}</Text>
              <Text style={styles.reviewsSummaryMetric}>{item.value}</Text>
              {item.detail ? (
                <View style={styles.reviewsSummaryValueRow}>
                  {item.detailIcon ? (
                    <Ionicons
                      name={item.detailIcon}
                      size={16}
                      color={item.accent}
                      style={styles.reviewsSummaryDetailIcon}
                    />
                  ) : null}
                  <Text style={styles.reviewsSummaryDetailText}>{item.detail}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>

        <View style={styles.reviewsBreakdownCard}>
          <Text style={styles.reviewsBreakdownTitle}>Rating distribution</Text>
          {ratingDistribution.map((bucket) => {
            const percentage = totalReviews
              ? Math.round((bucket.count / totalReviews) * 100)
              : 0;
            return (
              <View key={bucket.rating} style={styles.reviewsBreakdownRow}>
                <Text style={styles.reviewsBreakdownLabel}>{`${bucket.rating}★`}</Text>
                <View style={styles.reviewsBreakdownBar}>
                  <View
                    style={[
                      styles.reviewsBreakdownFill,
                      {
                        width: `${Math.min(
                          100,
                          Math.max(bucket.count > 0 ? 12 : 0, percentage)
                        )}%`
                      }
                    ]}
                  />
                </View>
                <Text style={styles.reviewsBreakdownValue}>{bucket.count}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.reviewsContextBanner}>
          <Ionicons name="information-circle" size={18} color="#2563eb" />
          <Text style={styles.reviewsContextText}>
            Highlights are generated from verified family feedback. Reach out to families after successful
            bookings to grow your reputation.
          </Text>
        </View>
      </View>
    ),
    [
      activeFilter,
      averageRating,
      handleSelectFilter,
      highlightRequestSending,
      onOpenRatings,
      onRequestHighlight,
      ratingDistribution,
      reviewSummaryItems,
      totalReviews
    ]
  );

  return (
    <View style={styles.reviewsContainer}>
      <View style={styles.reviewsCard}>
        <ReviewList
          reviews={filteredReviews}
          currentUserId={currentUserId}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEditReview={onEditReview}
          ListHeaderComponent={reviewsHeaderComponent}
          ListFooterComponent={reviewsFooterComponent}
          ListEmptyComponent={reviewsEmptyComponent}
          contentContainerStyle={styles.reviewsListContent}
          useVirtualizedList={false}
        />
      </View>
    </View>
  );
};

export default CaregiverReviewsTab;
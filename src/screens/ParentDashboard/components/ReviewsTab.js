import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, ActivityIndicator } from 'react-native';
import { Star, TrendingUp, MessageCircle } from 'lucide-react-native';
import { reviewService, bookingService } from '../../../services/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import {
  SkeletonCard,
  SkeletonBlock,
  SkeletonCircle,
  SkeletonPill,
  SkeletonButton
} from '../../../components/common/SkeletonPlaceholder';
import ReviewList from '../../../components/features/profile/ReviewList';
import ReviewForm from '../../../components/forms/ReviewForm';
import { normalizeCaregiverReviewsForList, normalizeCaregiverReviews } from '../../../utils/reviews';

const ReviewsTab = ({ navigation }) => {
  // TODO: Replace bespoke review rendering with shared `ReviewList` and `ReviewForm`
  // components for consistency once summary analytics are extracted.
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [selectedReview, setSelectedReview] = useState(null);
  const [completedBookings, setCompletedBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const formModalVisible = Boolean(modalMode);
  const isCreateMode = modalMode === 'create';
  const hasBookings = useMemo(() => completedBookings.length > 0, [completedBookings]);

  const selectedReviewDetails = useMemo(() => {
    if (!selectedReview) return null;
    const [normalized] = normalizeCaregiverReviews([selectedReview]);
    return normalized || null;
  }, [selectedReview]);

  const editInitialRating = selectedReviewDetails?.rating ?? selectedReview?.rating ?? 0;
  const editInitialComment = selectedReviewDetails?.comment ?? selectedReview?.comment ?? '';
  const editInitialImages = useMemo(() => {
    if (Array.isArray(selectedReview?.images)) {
      return selectedReview.images;
    }
    if (Array.isArray(selectedReviewDetails?.images)) {
      return selectedReviewDetails.images;
    }
    return [];
  }, [selectedReview?.images, selectedReviewDetails?.images]);

  const normalizedReviews = useMemo(() => {
    const normalized = normalizeCaregiverReviewsForList(reviews);
    return normalized.map((review) => {
      const createdAtDate = review.createdAt ? new Date(review.createdAt) : null;
      const canEdit = createdAtDate
        ? (Date.now() - createdAtDate.getTime()) / (1000 * 60 * 60 * 24) <= 30
        : false;

      const bookingSubtitle = review.bookingDate
        ? `Booking on ${new Date(review.bookingDate).toLocaleDateString()}`
        : review.subjectSubtitle;

      return {
        ...review,
        canEdit,
        subjectSubtitle: bookingSubtitle,
      };
    });
  }, [reviews]);

  const loadCompletedBookings = async () => {
    if (!user?.id) return;

    try {
      setBookingsLoading(true);
      const bookings = await bookingService.getMyBookings(user.id, 'parent');
      const completed = (bookings || []).filter((booking) => (booking.status || '').toLowerCase() === 'completed');
      setCompletedBookings(completed);
      if (completed.length > 0) {
        setSelectedBookingId((current) => current || completed[0].id);
      }
    } catch (error) {
      console.error('Error loading completed bookings:', error);
    }
    setBookingsLoading(false);
  };

  useEffect(() => {
    if (!user?.id) return;
    loadReviews();
    loadCompletedBookings();
  }, [user?.id]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const reviewsData = await reviewService.getReviewsByParent(user.id);
      setReviews(reviewsData);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReviews();
    setRefreshing(false);
  };

  const handleOpenCreateReview = () => {
    if (!hasBookings) {
      Alert.alert(
        'No completed bookings',
        'Complete a booking before writing a review. Once a caregiver completes a job, they will appear here.'
      );
      return;
    }

    setSelectedBookingId((current) => current || completedBookings[0]?.id || null);
    setSelectedReview(null);
    setModalMode('create');
  };

  const handleEditReview = (reviewItem) => {
    const original = reviews.find((review) => review.id === reviewItem.id);
    if (!original) {
      return;
    }
    setSelectedReview(original);
    setModalMode('edit');
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedReview(null);
    setSelectedBookingId(null);
  };

  const handleSubmitReview = async ({ rating, comment }) => {
    try {
      if (rating === 0) {
        Alert.alert('Rating required', 'Please provide a rating before submitting.');
        return;
      }

      if (isCreateMode) {
        if (!selectedBookingId) {
          Alert.alert('Select a caregiver', 'Please choose a completed booking to review.');
          return;
        }

        const bookingToReview = completedBookings.find((booking) => booking.id === selectedBookingId);
        if (!bookingToReview) {
          Alert.alert('Invalid booking', 'The selected booking could not be found.');
          return;
        }

        const caregiverInfo = bookingToReview?.caregiverId || bookingToReview?.caregiver || null;
        const caregiverId = caregiverInfo?.id || caregiverInfo?._id || bookingToReview?.caregiver_id;

        if (!caregiverId) {
          Alert.alert('Missing caregiver information', 'Unable to determine caregiver for the selected booking.');
          return;
        }

        await reviewService.createReview({
          booking_id: bookingToReview.id,
          reviewer_id: user.id,
          reviewee_id: caregiverId,
          rating,
          comment: comment?.trim() || '',
        });

        Alert.alert('Success', 'Review submitted successfully');
      } else if (selectedReview) {
        await reviewService.updateReview(selectedReview.id, {
          rating,
          comment: comment?.trim() || '',
        });

        Alert.alert('Success', 'Review updated successfully');
      }

      await loadReviews();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving review:', error);
      Alert.alert('Error', error?.message || 'Failed to save review');
    }
  };

  const getAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const renderSummaryStats = () => (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Review Summary</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <TrendingUp size={20} color="#10b981" />
          <Text style={styles.statValue}>{getAverageRating()}</Text>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>
        <View style={styles.statItem}>
          <MessageCircle size={20} color="#3b82f6" />
          <Text style={styles.statValue}>{reviews.length}</Text>
          <Text style={styles.statLabel}>Total Reviews</Text>
        </View>
      </View>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Star size={64} color="#9ca3af" />
      <Text style={styles.emptyTitle}>No reviews yet</Text>
      <Text style={styles.emptySubtitle}>
        Reviews you give to caregivers will appear here
      </Text>
    </View>
  );

  if (loading) {
    return (
      <ScrollView contentContainerStyle={styles.skeletonContainer}>
        <SkeletonCard style={styles.summarySkeleton}>
          <View style={styles.summarySkeletonContent}>
            <SkeletonBlock width="50%" height={20} style={styles.summarySkeletonTitle} />
            <View style={styles.summarySkeletonGrid}>
              {[0, 1, 2].map((index) => (
                <View key={`stat-skeleton-${index}`} style={styles.summarySkeletonItem}>
                  <SkeletonCircle size={32} style={styles.summarySkeletonIcon} />
                  <SkeletonBlock width="40%" height={16} style={styles.summarySkeletonStat} />
                  <SkeletonPill width="60%" height={14} />
                </View>
              ))}
            </View>
          </View>
        </SkeletonCard>

        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonCard key={`review-skeleton-${index}`} style={styles.reviewSkeletonCard}>
            <View style={styles.reviewSkeletonHeader}>
              <SkeletonCircle size={40} style={styles.reviewSkeletonAvatar} />
              <View style={styles.reviewSkeletonInfo}>
                <SkeletonBlock width="55%" height={16} />
                <SkeletonBlock width="35%" height={14} style={styles.reviewSkeletonDate} />
              </View>
              <SkeletonButton style={styles.reviewSkeletonAction} />
            </View>
            <View style={styles.reviewSkeletonStars}>
              {Array.from({ length: 5 }).map((__, starIndex) => (
                <SkeletonCircle key={starIndex} size={20} style={styles.reviewSkeletonStar} />
              ))}
            </View>
            <SkeletonBlock width="90%" height={14} style={styles.reviewSkeletonLine} />
            <SkeletonBlock width="80%" height={14} style={styles.reviewSkeletonLine} />
            <SkeletonPill width="50%" height={16} style={styles.reviewSkeletonFooter} />
          </SkeletonCard>
        ))}
      </ScrollView>
    );
  }

  const renderReviewsHeader = () => (
    <View>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Reviews</Text>
        <Text style={styles.headerSubtitle}>
          Reviews you've given to caregivers
        </Text>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.writeReviewButton}
          onPress={handleOpenCreateReview}
        >
          <Text style={styles.writeReviewButtonText}>Write a Review</Text>
        </TouchableOpacity>
      </View>

      {reviews.length > 0 && renderSummaryStats()}
    </View>
  );

  return (
    <View style={styles.container}>
      <ReviewList
        reviews={normalizedReviews}
        currentUserId={user?.id}
        onEditReview={handleEditReview}
        ListEmptyComponent={<EmptyState />}
        ListHeaderComponent={renderReviewsHeader}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />

      <Modal
        visible={formModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalTitle}>
                {isCreateMode ? 'Write a Review' : 'Edit Review'}
              </Text>

              {!isCreateMode && selectedReviewDetails && (
                <View style={styles.editContextCard}>
                  <View style={styles.editContextHeader}>
                    <Text style={styles.editContextTitle}>
                      {selectedReviewDetails.caregiverName || 'Caregiver'}
                    </Text>
                    {selectedReviewDetails.createdAt && (
                      <Text style={styles.editContextDate}>
                        {new Date(selectedReviewDetails.createdAt).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  {selectedReviewDetails.jobTitle ? (
                    <Text style={styles.editContextSubtitle}>
                      {selectedReviewDetails.jobTitle}
                    </Text>
                  ) : null}
                  {selectedReviewDetails.bookingDate ? (
                    <Text style={styles.editContextMeta}>
                      {`Booking on ${new Date(selectedReviewDetails.bookingDate).toLocaleDateString()}`}
                    </Text>
                  ) : null}
                  <View style={styles.editContextBadge}>
                    <Text style={styles.editContextBadgeText}>
                      {`Current rating: ${selectedReviewDetails.rating}`}
                    </Text>
                  </View>
                </View>
              )}

              {isCreateMode && (
                <View style={styles.bookingSelector}>
                  <Text style={styles.editLabel}>Booking</Text>
                  {bookingsLoading ? (
                    <ActivityIndicator size="small" color="#3b82f6" />
                  ) : hasBookings ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.bookingOptions}
                    >
                      {completedBookings.map((booking) => {
                        const isSelected = booking.id === selectedBookingId;
                        const caregiverName =
                          booking.caregiver?.name ||
                          booking.caregiver_name ||
                          booking.caregiverId?.name ||
                          'Caregiver';
                        const bookingDate = booking.date
                          ? new Date(booking.date).toLocaleDateString()
                          : 'No date';

                        return (
                          <TouchableOpacity
                            key={booking.id}
                            style={[styles.bookingOption, isSelected && styles.bookingOptionSelected]}
                            onPress={() => setSelectedBookingId(booking.id)}
                          >
                            <Text style={styles.bookingOptionTitle} numberOfLines={1} ellipsizeMode="tail">
                              {caregiverName}
                            </Text>
                            <Text style={styles.bookingOptionSubtext}>{bookingDate}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <Text style={styles.bookingEmptyText}>
                      Complete a booking before writing a review. Once a caregiver completes a job, they will appear here.
                    </Text>
                  )}
                </View>
              )}

              <ReviewForm
                key={`${modalMode}-${selectedReview?.id || 'new'}`}
                onSubmit={handleSubmitReview}
                onCancel={handleCloseModal}
                initialRating={isCreateMode ? 0 : editInitialRating}
                initialComment={isCreateMode ? '' : editInitialComment}
                initialImages={isCreateMode ? [] : editInitialImages}
                heading={isCreateMode ? 'Your Review' : 'Update Your Review'}
                submitLabel={isCreateMode ? 'Submit Review' : 'Save Changes'}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  listContent: {
    paddingBottom: 40,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  writeReviewButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  writeReviewButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  bookingOptions: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    gap: 12,
  },
  bookingOption: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    minWidth: 180,
  },
  bookingOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  bookingOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  bookingOptionSubtext: {
    fontSize: 13,
    color: '#6b7280',
  },
  bookingScrollHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  bookingEmptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  reviewsList: {
    padding: 16,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  caregiverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  caregiverIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  caregiverDetails: {
    flex: 1,
  },
  caregiverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  reviewDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  editButton: {
    padding: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  reviewComment: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  bookingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  modalScrollContent: {
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  editContextCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  editContextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editContextTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  editContextDate: {
    fontSize: 13,
    color: '#6b7280',
  },
  editContextSubtitle: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 4,
  },
  editContextMeta: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 12,
  },
  editContextBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  editContextBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  editSection: {
    marginBottom: 20,
  },
  editLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  editStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  skeletonContainer: {
    padding: 16,
  },
  summarySkeleton: {
    padding: 16,
    marginBottom: 16,
  },
  summarySkeletonContent: {
    gap: 16,
  },
  summarySkeletonTitle: {
    marginBottom: 8,
  },
  summarySkeletonGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summarySkeletonItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  summarySkeletonIcon: {
    marginBottom: 4,
  },
  summarySkeletonStat: {
    marginBottom: 6,
  },
  reviewSkeletonCard: {
    padding: 16,
    marginBottom: 16,
  },
  reviewSkeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewSkeletonAvatar: {
    marginRight: 12,
  },
  reviewSkeletonInfo: {
    flex: 1,
    gap: 6,
  },
  reviewSkeletonDate: {
    marginTop: 2,
  },
  reviewSkeletonAction: {
    width: 72,
    alignSelf: 'flex-start',
  },
  reviewSkeletonStars: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  reviewSkeletonStar: {
    width: 20,
    height: 20,
  },
  reviewSkeletonLine: {
    marginBottom: 8,
  },
  reviewSkeletonFooter: {
    marginTop: 8,
  },
});

export default ReviewsTab;
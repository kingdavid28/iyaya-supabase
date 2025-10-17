import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { 
  Star, 
  Edit3, 
  Calendar, 
  User,
  TrendingUp,
  MessageCircle
} from 'lucide-react-native';
import { reviewService, bookingService } from '../../../services/supabase';
import { useAuth } from '../../../contexts/AuthContext';

const ReviewsTab = ({ navigation }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [writeModalVisible, setWriteModalVisible] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [completedBookings, setCompletedBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const hasBookings = useMemo(() => completedBookings.length > 0, [completedBookings]);

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
    } finally {
      setBookingsLoading(false);
    }
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

  const handleEditReview = (review) => {
    setSelectedReview(review);
    setEditRating(review.rating);
    setEditComment(review.comment || '');
    setEditModalVisible(true);
  };

  const handleCreateReview = async () => {
    try {
      if (!selectedBookingId) {
        Alert.alert('Select a caregiver', 'Please choose a completed booking to review.');
        return;
      }

      if (!newReviewComment.trim()) {
        Alert.alert('Missing information', 'Please share a short comment about your experience.');
        return;
      }

      const bookingToReview = completedBookings.find(booking => booking.id === selectedBookingId);

      const caregiverInfo = bookingToReview?.caregiverId || bookingToReview?.caregiver || null;
      const caregiverId = caregiverInfo?.id || caregiverInfo?._id || bookingToReview?.caregiver_id;

      if (!caregiverId) {
        Alert.alert('Missing caregiver information', 'Unable to determine caregiver for the selected booking.');
        return;
      }

      setSubmittingReview(true);

      await reviewService.createReview({
        booking_id: bookingToReview.id,
        reviewer_id: user.id,
        reviewee_id: caregiverId,
        rating: newReviewRating,
        comment: newReviewComment.trim(),
        reviewer_type: 'parent'
      });

      setWriteModalVisible(false);
      setNewReviewRating(5);
      setNewReviewComment('');
      setSelectedBookingId(null);
      await loadReviews();
      Alert.alert('Success', 'Review submitted successfully');
    } catch (error) {
      console.error('Error creating review:', error);
      Alert.alert('Error', error?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleUpdateReview = async () => {
    try {
      await reviewService.updateReview(selectedReview.id, {
        rating: editRating,
        comment: editComment.trim()
      });
      
      setReviews(prev => prev.map(review => 
        review.id === selectedReview.id 
          ? { ...review, rating: editRating, comment: editComment.trim() }
          : review
      ));
      
      setEditModalVisible(false);
      Alert.alert('Success', 'Review updated successfully');
    } catch (error) {
      console.error('Error updating review:', error);
      Alert.alert('Error', 'Failed to update review');
    }
  };

  const renderStars = (rating, size = 16) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={size}
        color={i < rating ? '#fbbf24' : '#d1d5db'}
        fill={i < rating ? '#fbbf24' : 'transparent'}
      />
    ));
  };

  const renderEditStars = (rating, onPress) => {
    return Array.from({ length: 5 }, (_, i) => (
      <TouchableOpacity key={i} onPress={() => onPress(i + 1)}>
        <Star
          size={24}
          color={i < rating ? '#fbbf24' : '#d1d5db'}
          fill={i < rating ? '#fbbf24' : 'transparent'}
        />
      </TouchableOpacity>
    ));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const canEditReview = (reviewDate) => {
    const daysSinceReview = (new Date() - new Date(reviewDate)) / (1000 * 60 * 60 * 24);
    return daysSinceReview <= 30; // Allow editing within 30 days
  };

  const getAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const renderReview = (review) => (
    <View key={review.id} style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.caregiverInfo}>
          <View style={styles.caregiverIcon}>
            <User size={20} color="#3b82f6" />
          </View>
          <View style={styles.caregiverDetails}>
            <Text style={styles.caregiverName}>
              {review.caregiver_name || 'Caregiver'}
            </Text>
            <Text style={styles.reviewDate}>
              {formatDate(review.created_at)}
            </Text>
          </View>
        </View>
        {canEditReview(review.created_at) && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditReview(review)}
          >
            <Edit3 size={16} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.ratingContainer}>
        <View style={styles.stars}>
          {renderStars(review.rating)}
        </View>
        <Text style={styles.ratingText}>{review.rating}/5</Text>
      </View>

      {review.comment && (
        <Text style={styles.reviewComment}>{review.comment}</Text>
      )}

      <View style={styles.reviewFooter}>
        <View style={styles.bookingInfo}>
          <Calendar size={14} color="#6b7280" />
          <Text style={styles.bookingText}>
            Booking: {formatDate(review.booking_date || review.created_at)}
          </Text>
        </View>
      </View>
    </View>
  );

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
        <View style={styles.statItem}>
          <User size={20} color="#8b5cf6" />
          <Text style={styles.statValue}>
            {new Set(reviews.map(r => r.caregiver_id)).size}
          </Text>
          <Text style={styles.statLabel}>Caregivers</Text>
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading reviews...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#3b82f6']}
          tintColor="#3b82f6"
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Reviews</Text>
        <Text style={styles.headerSubtitle}>
          Reviews you've given to caregivers
        </Text>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.writeReviewButton}
          onPress={() => setWriteModalVisible(true)}
        >
          <Text style={styles.writeReviewButtonText}>Write a Review</Text>
        </TouchableOpacity>
      </View>

      {reviews.length > 0 && renderSummaryStats()}

      {reviews.length === 0 ? (
        <EmptyState />
      ) : (
        <View style={styles.reviewsList}>
          {reviews.map(renderReview)}
        </View>
      )}

      {/* Edit Review Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Review</Text>
            
            <View style={styles.editSection}>
              <Text style={styles.editLabel}>Rating</Text>
              <View style={styles.editStars}>
                {renderEditStars(editRating, setEditRating)}
              </View>
            </View>

            <View style={styles.editSection}>
              <Text style={styles.editLabel}>Comment</Text>
              <TextInput
                style={styles.commentInput}
                value={editComment}
                onChangeText={setEditComment}
                placeholder="Share your experience..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateReview}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={writeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWriteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Write a Review</Text>

            <View style={styles.editSection}>
              <Text style={styles.editLabel}>Booking</Text>
              {bookingsLoading ? (
                <ActivityIndicator size="small" color="#3b82f6" />
              ) : hasBookings ? (
                <View style={styles.bookingOptions}>
                  {completedBookings.map((booking) => {
                    const isSelected = booking.id === selectedBookingId;
                    const caregiverName =
                      booking.caregiver?.name ||
                      booking.caregiver_name ||
                      booking.caregiverId?.name ||
                      'Caregiver';
                    const bookingDate = booking.date ? new Date(booking.date).toLocaleDateString() : 'No date';

                    return (
                      <TouchableOpacity
                        key={booking.id}
                        style={[styles.bookingOption, isSelected && styles.bookingOptionSelected]}
                        onPress={() => setSelectedBookingId(booking.id)}
                      >
                        <Text style={styles.bookingOptionTitle}>{caregiverName}</Text>
                        <Text style={styles.bookingOptionSubtext}>{bookingDate}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.bookingEmptyText}>
                  Complete a booking before writing a review. Once a caregiver completes a job, they will appear here.
                </Text>
              )}
            </View>

            <View style={styles.editSection}>
              <Text style={styles.editLabel}>Rating</Text>
              <View style={styles.editStars}>
                {renderEditStars(newReviewRating, setNewReviewRating)}
              </View>
            </View>

            <View style={styles.editSection}>
              <Text style={styles.editLabel}>Comment</Text>
              <TextInput
                style={styles.commentInput}
                value={newReviewComment}
                onChangeText={setNewReviewComment}
                placeholder="Share your experience..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setWriteModalVisible(false);
                  setNewReviewRating(5);
                  setNewReviewComment('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (submittingReview || !hasBookings || !selectedBookingId) && styles.saveButtonDisabled
                ]}
                onPress={handleCreateReview}
                disabled={submittingReview || !hasBookings || !selectedBookingId}
              >
                <Text style={styles.saveButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
    gap: 12,
  },
  bookingOption: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
  },
  bookingOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#e0ecff',
  },
  bookingOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  bookingOptionSubtext: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
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
});

export default ReviewsTab;
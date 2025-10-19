import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import StarRating, { StarRatingDisplay } from 'react-native-star-rating-widget';
import { useAuth } from '../contexts/AuthContext';
import { reviewService } from '../services';
import ReviewList from '../components/features/profile/ReviewList';
import { normalizeCaregiverReviews } from '../utils/reviews';

const CaregiverReviewsScreen = ({ route }) => {
  const { caregiverId, bookingId, caregiverName: caregiverNameFromRoute } = route.params || {};
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch reviews
  useEffect(() => {
    const fetchReviews = async () => {
      if (!caregiverId) {
        setReviews([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await reviewService.getReviews(caregiverId, 50);
        setReviews(normalizeCaregiverReviews(data));
      } catch (error) {
        console.error('Error fetching reviews:', error);
        Alert.alert('Error', 'Failed to load reviews. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [caregiverId]);

  const submitReview = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    try {
      if (!user?.id) {
        Alert.alert('Authentication required', 'Please sign in again to submit a review.');
        return;
      }

      if (!caregiverId) {
        Alert.alert('Missing caregiver', 'Unable to identify the caregiver to review.');
        return;
      }

      setSubmitting(true);

      await reviewService.createReview({
        reviewer_id: user.id,
        reviewee_id: caregiverId,
        booking_id: bookingId || null,
        rating,
        comment: comment.trim()
      });

      setRating(0);
      setComment('');
      setShowReviewForm(false);
      Alert.alert('Success', 'Review submitted successfully');

      const data = await reviewService.getReviews(caregiverId, 50);
      setReviews(normalizeCaregiverReviews(data));
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', error?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const averageRating = useMemo(() => {
    if (!reviews.length) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return total / reviews.length;
  }, [reviews]);

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>{caregiverNameFromRoute || 'Caregiver Reviews'}</Text>
        <View style={styles.ratingSummary}>
          <StarRatingDisplay rating={averageRating} starSize={24} color="#FFD700" />
          <Text style={styles.ratingText}>{averageRating.toFixed(1)} • {reviews.length} reviews</Text>
        </View>
      </View>

      {!showReviewForm ? (
        <TouchableOpacity
          style={styles.addReviewButton}
          onPress={() => setShowReviewForm(true)}
          disabled={submitting}
        >
          <Text style={styles.addReviewButtonText}>Add Review</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.reviewForm}>
          <StarRating
            rating={rating}
            onChange={setRating}
            starSize={30}
            color="#FFD700"
            animationConfig={{ scale: 1.1 }}
          />
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="Share your experience..."
            multiline
            numberOfLines={4}
          />
          <View style={styles.reviewButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowReviewForm(false);
                setComment('');
                setRating(0);
              }}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={submitReview}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : (
        <View style={styles.list}>
          <ReviewList
            reviews={reviews}
            currentUserId={user?.id}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No reviews yet</Text>
              </View>
            }
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  headerSection: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingText: {
    fontSize: 16,
    color: '#374151',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  addReviewButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  addReviewButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  reviewForm: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  reviewButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#757575',
  },
  cancelButtonText: {
    color: '#757575',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CaregiverReviewsScreen;
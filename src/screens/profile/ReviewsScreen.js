import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { Appbar, Button, FAB, Text, useTheme } from 'react-native-paper';
import { STORAGE_KEYS } from '../../../config/constants';
import { useAuth } from '../../../contexts/AuthContext';
import { reviewService } from '../../../services/reviewService';
import ReviewList from '../../components/features/profile/ReviewList';
import ReviewForm from '../../components/forms/ReviewForm';

const ReviewsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);

  // Get the user ID from route params or use current user's ID
  const targetUserId = route.params?.userId || user.uid;
  const isCurrentUser = targetUserId === user.uid;

  // Load reviews
  const loadReviews = async () => {
    try {
      setLoading(true);
      const userReviews = await reviewService.getUserReviews(targetUserId);

      const stored = await AsyncStorage.getItem(STORAGE_KEYS.HIDDEN_REVIEWS);
      const allHidden = stored ? JSON.parse(stored) : {};
      const hiddenForUser = new Set(allHidden[targetUserId] || []);

      const visibleReviews = userReviews.filter((review) => !hiddenForUser.has(review.id));
      setReviews(visibleReviews);
    } catch (error) {
      console.error('Failed to load reviews:', error);
      Alert.alert('Error', 'Failed to load reviews. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle review submission
  const handleSubmitReview = async (reviewData) => {
    try {
      if (editingReview) {
        // Update existing review
        await reviewService.updateReview(editingReview.id, {
          ...reviewData,
          updatedAt: new Date().toISOString(),
        });
        Alert.alert('Success', 'Review updated successfully!');
      } else {
        // Create new review
        await reviewService.createReview({
          ...reviewData,
          userId: targetUserId,
          reviewerId: user.uid,
          reviewerName: user.displayName || 'Anonymous',
          reviewerAvatar: user.photoURL,
        });
        Alert.alert('Success', 'Thank you for your review!');
      }

      // Refresh reviews and close form
      await loadReviews();
      setShowReviewForm(false);
      setEditingReview(null);
    } catch (error) {
      console.error('Failed to submit review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    }
  };

  // Handle review deletion
  const handleDeleteReview = async (reviewId) => {
    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await reviewService.deleteReview(reviewId);
              await loadReviews();
              Alert.alert('Success', 'Review deleted successfully');
            } catch (error) {
              console.error('Failed to delete review from server, applying local hide fallback:', error);
              try {
                const stored = await AsyncStorage.getItem(STORAGE_KEYS.HIDDEN_REVIEWS);
                const allHidden = stored ? JSON.parse(stored) : {};
                const userHidden = new Set(allHidden[targetUserId] || []);
                userHidden.add(reviewId);
                allHidden[targetUserId] = Array.from(userHidden);
                await AsyncStorage.setItem(STORAGE_KEYS.HIDDEN_REVIEWS, JSON.stringify(allHidden));
                setReviews((prev) => prev.filter((review) => review.id !== reviewId));
              } catch (storageError) {
                console.error('Failed to hide review locally:', storageError);
                Alert.alert('Error', 'Failed to delete review. Please try again.');
              }
            }
          },
        },
      ]
    );
  };

  // Load reviews on component mount
  useEffect(() => {
    loadReviews();
  }, [targetUserId]);

  // Calculate average rating
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  // Check if current user has already reviewed
  const userReview = reviews.find(review => review.reviewerId === user.uid);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={isCurrentUser ? "My Reviews" : "Reviews"} />
      </Appbar.Header>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <>
          {/* Reviews Summary */}
          <View style={styles.summaryContainer}>
            <View style={styles.ratingSummary}>
              <Text variant="headlineMedium" style={styles.averageRating}>
                {averageRating.toFixed(1)}
              </Text>
              <Text variant="bodyMedium" style={styles.ratingCount}>
                {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </Text>
            </View>

            {!isCurrentUser && !userReview && (
              <Button
                mode="contained"
                onPress={() => setShowReviewForm(true)}
                style={styles.writeReviewButton}
              >
                Write a Review
              </Button>
            )}
          </View>

          {/* Reviews List */}
          <ReviewList
            reviews={reviews}
            currentUserId={user.uid}
            onEditReview={(review) => {
              setEditingReview(review);
              setShowReviewForm(true);
            }}
            onDeleteReview={handleDeleteReview}
          />

          {/* Review Form Modal */}
          {showReviewForm && (
            <View style={styles.modalContainer}>
              <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <ReviewForm
                  onSubmit={handleSubmitReview}
                  initialRating={editingReview?.rating || 0}
                  initialComment={editingReview?.comment || ''}
                  onCancel={() => {
                    setShowReviewForm(false);
                    setEditingReview(null);
                  }}
                />
              </View>
            </View>
          )}
        </>
      )}

      {/* FAB for adding a new review (only if it's the current user's profile) */}
      {!isCurrentUser && !userReview && !showReviewForm && (
        <FAB
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          icon="pencil"
          onPress={() => setShowReviewForm(true)}
          color="white"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  ratingSummary: {
    alignItems: 'center',
  },
  averageRating: {
    fontWeight: 'bold',
  },
  ratingCount: {
    color: '#666',
  },
  writeReviewButton: {
    borderRadius: 20,
  },
  modalContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    margin: 20,
    borderRadius: 10,
    padding: 16,
    maxHeight: '80%',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default ReviewsScreen;

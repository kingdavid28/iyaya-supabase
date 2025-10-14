import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabaseService from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

const ReviewsSection = ({ userId, userType = 'caregiver', showAddReview = false, bookingId = null }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });

  useEffect(() => {
    loadReviews();
  }, [userId]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const reviewsData = await supabaseService.getReviews(userId);
      setReviews(reviewsData);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    if (!newReview.comment.trim()) {
      Alert.alert('Error', 'Please add a comment');
      return;
    }

    try {
      await supabaseService.createReview({
        bookingId,
        reviewerId: user.id,
        revieweeId: userId,
        rating: newReview.rating,
        comment: newReview.comment.trim()
      });

      setShowReviewModal(false);
      setNewReview({ rating: 5, comment: '' });
      loadReviews();
      Alert.alert('Success', 'Review submitted successfully');
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review');
    }
  };

  const renderStars = (rating, size = 16, color = '#FCD34D') => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={size}
            color={color}
          />
        ))}
      </View>
    );
  };

  const renderRatingSelector = () => (
    <View style={styles.ratingSelector}>
      <Text style={styles.ratingLabel}>Rating:</Text>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setNewReview(prev => ({ ...prev, rating: star }))}
          >
            <Ionicons
              name={star <= newReview.rating ? 'star' : 'star-outline'}
              size={32}
              color="#FCD34D"
              style={styles.starButton}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderReview = ({ item }) => (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewerName}>{item.reviewer?.name || 'Anonymous'}</Text>
        {renderStars(item.rating)}
      </View>
      <Text style={styles.reviewComment}>{item.comment}</Text>
      <Text style={styles.reviewDate}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </View>
  );

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reviews ({reviews.length})</Text>
        {reviews.length > 0 && (
          <View style={styles.averageRating}>
            {renderStars(Math.round(averageRating))}
            <Text style={styles.averageText}>
              {averageRating.toFixed(1)}
            </Text>
          </View>
        )}
      </View>

      {showAddReview && (
        <TouchableOpacity
          style={styles.addReviewButton}
          onPress={() => setShowReviewModal(true)}
        >
          <Ionicons name="add-circle-outline" size={20} color="#3B82F6" />
          <Text style={styles.addReviewText}>Write a Review</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={reviews}
        renderItem={renderReview}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="star-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No reviews yet</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showReviewModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowReviewModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Write Review</Text>
            <TouchableOpacity onPress={submitReview}>
              <Text style={styles.submitButton}>Submit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {renderRatingSelector()}
            
            <Text style={styles.commentLabel}>Comment:</Text>
            <TextInput
              style={styles.commentInput}
              value={newReview.comment}
              onChangeText={(text) => setNewReview(prev => ({ ...prev, comment: text }))}
              placeholder="Share your experience..."
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.characterCount}>
              {newReview.comment.length}/500
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  averageRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  averageText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  addReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 16,
  },
  addReviewText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  reviewItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  reviewComment: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  starsContainer: {
    flexDirection: 'row',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  cancelButton: {
    fontSize: 16,
    color: '#6B7280',
  },
  submitButton: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  ratingSelector: {
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  starButton: {
    marginRight: 4,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
});

export default ReviewsSection;
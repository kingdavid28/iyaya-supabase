import React, { useState, useEffect } from 'react';
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
import { reviewService } from '../../../services/supabase';
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

  useEffect(() => {
    loadReviews();
  }, []);

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
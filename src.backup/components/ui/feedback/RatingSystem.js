import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { Star } from 'lucide-react-native';

const RatingSystem = ({ 
  onSubmit, 
  existingRating = null, 
  readonly = false,
  size = 24,
  showReview = true 
}) => {
  const [rating, setRating] = useState(existingRating?.rating || 0);
  const [review, setReview] = useState(existingRating?.review || '');
  const [submitting, setSubmitting] = useState(false);

  const handleStarPress = (value) => {
    if (!readonly) {
      setRating(value);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ rating, review: review.trim() });
      Alert.alert('Success', 'Rating submitted successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      const isFilled = starValue <= rating;
      
      return (
        <TouchableOpacity
          key={index}
          onPress={() => handleStarPress(starValue)}
          disabled={readonly}
          style={styles.starButton}
        >
          <Star
            size={size}
            color={isFilled ? '#fbbf24' : '#d1d5db'}
            fill={isFilled ? '#fbbf24' : 'transparent'}
          />
        </TouchableOpacity>
      );
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.starsContainer}>
        {renderStars()}
        {rating > 0 && (
          <Text style={styles.ratingText}>
            {rating}/5 {rating === 1 ? 'star' : 'stars'}
          </Text>
        )}
      </View>

      {showReview && (
        <View style={styles.reviewContainer}>
          <Text style={styles.reviewLabel}>Review (optional):</Text>
          <TextInput
            style={styles.reviewInput}
            value={review}
            onChangeText={setReview}
            placeholder="Share your experience..."
            multiline
            numberOfLines={3}
            maxLength={500}
            editable={!readonly}
          />
          <Text style={styles.characterCount}>{review.length}/500</Text>
        </View>
      )}

      {!readonly && onSubmit && (
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting || rating === 0}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Submitting...' : 'Submit Rating'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const RatingDisplay = ({ rating, reviewCount, size = 16 }) => {
  if (!rating) return null;

  return (
    <View style={styles.displayContainer}>
      <Star size={size} color="#fbbf24" fill="#fbbf24" />
      <Text style={[styles.displayRating, { fontSize: size - 2 }]}>
        {rating.toFixed(1)}
      </Text>
      {reviewCount > 0 && (
        <Text style={[styles.displayCount, { fontSize: size - 4 }]}>
          ({reviewCount})
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  reviewContainer: {
    marginBottom: 16,
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  characterCount: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  displayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayRating: {
    marginLeft: 4,
    fontWeight: '600',
    color: '#374151',
  },
  displayCount: {
    marginLeft: 4,
    color: '#6b7280',
  },
});

export { RatingSystem, RatingDisplay };
export default RatingSystem;
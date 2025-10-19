import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ReviewForm = ({
  onSubmit,
  initialRating = 0,
  initialComment = '',
  onCancel,
  heading = 'Write a Review',
  submitLabel = 'Submit Review'
}) => {
  const theme = useTheme();
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setRating(initialRating);
  }, [initialRating]);

  useEffect(() => {
    setComment(initialComment);
  }, [initialComment]);

  const handleRatingChange = (newRating) => {
    setRating(newRating);
  };


  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please provide a rating before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);

      await onSubmit({
        rating,
        comment,
        createdAt: new Date().toISOString(),
      });
      
      // Reset form
      setRating(initialRating);
      setComment(initialComment);
      
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>{heading}</Text>
      
      <View style={styles.ratingContainer}>
        <View style={styles.ratingHeader}>
          <Text style={styles.label}>Your Rating</Text>
          <Text style={styles.ratingValue}>{rating > 0 ? `${rating} / 5` : 'Tap a star'}</Text>
        </View>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((value) => {
            const isFilled = value <= rating;
            return (
              <TouchableOpacity
                key={`rating-star-${value}`}
                style={styles.ratingStarButton}
                onPress={() => handleRatingChange(value)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${value} star${value === 1 ? '' : 's'}`}
              >
                <MaterialCommunityIcons
                  name={isFilled ? 'star' : 'star-outline'}
                  size={34}
                  color={isFilled ? '#f59e0b' : '#d1d5db'}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      
      <TextInput
        label="Your Review"
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={4}
        style={styles.commentInput}
        placeholder="Share your experience..."
      />
      
      <View style={styles.buttonContainer}>
        {onCancel && (
          <Button
            mode="outlined"
            onPress={onCancel}
            style={[styles.button, { marginRight: 12 }]}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting || rating === 0}
          style={styles.button}
        >
          {submitLabel}
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  ratingContainer: {
    marginBottom: 24,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  ratingValue: {
    fontSize: 14,
    color: '#6b7280',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ratingStarButton: {
    paddingHorizontal: 4,
  },
  commentInput: {
    marginBottom: 20,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  button: {
    minWidth: 140,
  },
});

export default ReviewForm;

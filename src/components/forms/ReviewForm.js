import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme, IconButton } from 'react-native-paper';
import { Rating } from 'react-native-ratings';
import * as ImagePicker from 'expo-image-picker';
import { uploadsAPI } from '../../config/api';

// Platform-specific FileSystem import
const FileSystem = Platform.OS === 'web' ? null : require('expo-file-system/legacy');

const ReviewForm = ({
  onSubmit,
  initialRating = 0,
  initialComment = '',
  initialImages = [],
  onCancel,
  heading = 'Write a Review',
  submitLabel = 'Submit Review',
  enableImageUpload = true
}) => {
  const theme = useTheme();
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [images, setImages] = useState(initialImages);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    setRating(initialRating);
  }, [initialRating]);

  useEffect(() => {
    setComment(initialComment);
  }, [initialComment]);

  useEffect(() => {
    setImages(initialImages);
  }, [initialImages]);

  const handleRatingChange = (newRating) => {
    setRating(newRating);
  };

  const pickImage = async () => {
    if (!enableImageUpload) {
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'We need access to your photos to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        setImages(prev => [...prev, ...result.assets.map(asset => asset.uri)]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please provide a rating before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(0);

      // Upload images first if any via backend uploads API
      let uploadedImageUrls = [];
      if (enableImageUpload && images.length > 0) {
        if (Platform.OS === 'web' || !FileSystem) {
          console.warn('Image upload not supported on web platform');
          Alert.alert('Upload Error', 'Image upload is not supported on web platform');
          setIsSubmitting(false);
          return;
        }
        
        const uploadPromises = images.map(async (uri, index) => {
          const imageBase64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
          const mimeType = uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
          const name = `review_${Date.now()}_${index}`;
          const folder = 'review_images';
          const res = await uploadsAPI.base64Upload({ imageBase64, mimeType, folder, name });
          if (!res?.success || !res?.url) throw new Error('Upload failed');
          // simple progress approximation
          setUploadProgress(Math.round(((index + 1) / images.length) * 100));
          return res.url;
        });
        uploadedImageUrls = await Promise.all(uploadPromises);
      }

      // Submit review with image URLs
      await onSubmit({
        rating,
        comment,
        images: uploadedImageUrls,
        createdAt: new Date().toISOString(),
      });
      
      // Reset form
      setRating(initialRating);
      setComment(initialComment);
      setImages(initialImages);
      
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
      setUploadProgress(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>{heading}</Text>
      
      <View style={styles.ratingContainer}>
        <Text style={styles.label}>Your Rating</Text>
        <Rating
          type="star"
          ratingCount={5}
          imageSize={36}
          showRating
          startingValue={rating}
          onFinishRating={handleRatingChange}
          style={styles.ratingStars}
        />
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
      
      {enableImageUpload && (
        <View style={styles.imageUploadContainer}>
          <Text style={styles.label}>Add Photos (Optional)</Text>
          <Text style={styles.hint}>Add up to 5 photos to your review</Text>
          
          <View style={styles.imagePreviews}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imagePreviewContainer}>
                <Image source={{ uri }} style={styles.imagePreview} />
                <IconButton
                  icon="close"
                  size={16}
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                />
              </View>
            ))}
            
            {images.length < 5 && (
              <TouchableOpacity 
                style={styles.addImageButton}
                onPress={pickImage}
                disabled={isSubmitting}
              >
                <Text style={styles.addImageText}>+</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      
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
      
      {uploadProgress > 0 && uploadProgress < 100 && (
        <View style={styles.progressContainer}>
          <Text>Uploading: {Math.round(uploadProgress)}%</Text>
        </View>
      )}
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
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
  },
  ratingStars: {
    alignSelf: 'flex-start',
    marginVertical: 8,
  },
  commentInput: {
    marginBottom: 20,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  imageUploadContainer: {
    marginBottom: 20,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  imagePreviews: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginRight: 8,
    marginBottom: 8,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 0,
    margin: 0,
    elevation: 2,
  },
  addImageButton: {
    width: 80,
    height: 80,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  addImageText: {
    fontSize: 24,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  button: {
    minWidth: 150,
  },
  progressContainer: {
    marginTop: 16,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    alignItems: 'center',
  },
});

export default ReviewForm;

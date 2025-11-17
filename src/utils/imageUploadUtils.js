import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';

// Compress image to reduce size and improve upload success
export const compressImage = async (imageUri, quality = 0.5, maxWidth = 600, maxHeight = 600) => {
  try {
    console.log('Compressing image:', imageUri);
    
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        { resize: { width: maxWidth, height: maxHeight } }
      ],
      {
        compress: quality,
        format: 'jpeg',
        base64: true
      }
    );
    
    console.log('Image compressed successfully');
    console.log('Original URI:', imageUri);
    console.log('Compressed URI:', result.uri);
    console.log('Base64 length:', result.base64?.length || 0);
    
    return result;
  } catch (error) {
    console.error('Image compression failed:', error);
    throw new Error('Failed to compress image');
  }
};

// Validate image size before upload
export const validateImageSize = (base64String, maxSizeMB = 5) => {
  const sizeInBytes = (base64String.length * 3) / 4;
  const sizeInMB = sizeInBytes / (1024 * 1024);
  
  console.log(`Image size: ${sizeInMB.toFixed(2)} MB`);
  
  if (sizeInMB > maxSizeMB) {
    throw new Error(`Image is too large (${sizeInMB.toFixed(2)} MB). Please select an image smaller than ${maxSizeMB} MB.`);
  }
  
  return true;
};

// Retry upload with exponential backoff
export const uploadWithRetry = async (uploadFunction, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Upload attempt ${attempt}/${maxRetries}`);
      const result = await uploadFunction();
      console.log('Upload successful on attempt', attempt);
      return result;
    } catch (error) {
      lastError = error;
      console.log(`Upload attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

// Show user-friendly error messages
export const handleUploadError = (error) => {
  console.error('Upload error:', error);
  
  let userMessage = 'Failed to upload image. Please try again.';
  
  if (error.message.includes('timeout')) {
    userMessage = 'Upload timed out. Please check your internet connection and try again.';
  } else if (error.message.includes('Network request failed')) {
    userMessage = 'Network error. Please check your internet connection.';
  } else if (error.message.includes('too large')) {
    userMessage = error.message;
  } else if (error.message.includes('401')) {
    userMessage = 'Authentication failed. Please log in again.';
  } else if (error.message.includes('413')) {
    userMessage = 'Image is too large. Please select a smaller image.';
  }
  
  Alert.alert('Upload Failed', userMessage);
};

export default {
  compressImage,
  validateImageSize,
  uploadWithRetry,
  handleUploadError
};
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Image, Platform } from 'react-native';

// Default options for image picker
const defaultOptions = {
  mediaTypes: ImagePicker.MediaType?.Images || 'images',
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
  base64: true,
};

// Check and request camera roll permissions
export const getCameraRollPermissions = async () => {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission to access media library is required!');
    }
  }
  return true;
};

// Check and request camera permissions
export const getCameraPermissions = async () => {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Camera permission is required to take photos!');
    }
  }
  return true;
};

// Pick an image from the device's media library
export const pickImage = async (options = {}) => {
  try {
    await getCameraRollPermissions();
    
    const result = await ImagePicker.launchImageLibraryAsync({
      ...defaultOptions,
      ...options,
    });

    if (result.canceled) {
      throw new Error('User cancelled image picker');
    }

    if (result.assets && result.assets.length > 0) {
      return {
        cancelled: false,
        uri: result.assets[0].uri,
        width: result.assets[0].width,
        height: result.assets[0].height,
        type: result.assets[0].type || 'image',
        base64: result.assets[0].base64,
      };
    }

    throw new Error('No image selected');
  } catch (error) {
    console.error('Error picking image:', error);
    throw error;
  }
};

// Take a photo using the device's camera
export const takePhoto = async (options = {}) => {
  try {
    await getCameraPermissions();
    
    const result = await ImagePicker.launchCameraAsync({
      ...defaultOptions,
      ...options,
    });

    if (result.canceled) {
      throw new Error('User cancelled taking photo');
    }

    if (result.assets && result.assets.length > 0) {
      return {
        cancelled: false,
        uri: result.assets[0].uri,
        width: result.assets[0].width,
        height: result.assets[0].height,
        type: result.assets[0].type || 'image',
        base64: result.assets[0].base64,
      };
    }

    throw new Error('Failed to take photo');
  } catch (error) {
    console.error('Error taking photo:', error);
    throw error;
  }
};

// Resize an image to a maximum dimension
export const resizeImage = async (uri, maxWidth, maxHeight) => {
  try {
    const imageInfo = await FileSystem.getInfoAsync(uri);
    if (!imageInfo.exists) {
      throw new Error('Image file not found');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType?.Images || 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled) {
      throw new Error('User cancelled image resize');
    }

    if (result.assets && result.assets.length > 0) {
      return {
        uri: result.assets[0].uri,
        width: result.assets[0].width,
        height: result.assets[0].height,
      };
    }

    throw new Error('Failed to resize image');
  } catch (error) {
    console.error('Error resizing image:', error);
    throw error;
  }
};

// Convert image to base64
export const imageToBase64 = async (uri) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
};

// Get image metadata (dimensions, size, etc.)
export const getImageInfo = async (uri) => {
  try {
    const imageInfo = await FileSystem.getInfoAsync(uri, { size: true });
    if (!imageInfo.exists) {
      throw new Error('Image file not found');
    }

    const dimensions = await new Promise((resolve, reject) => {
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        (error) => reject(error)
      );
    });

    return {
      uri,
      width: dimensions.width,
      height: dimensions.height,
      fileSize: imageInfo.size,
      fileUri: imageInfo.uri,
    };
  } catch (error) {
    console.error('Error getting image info:', error);
    throw error;
  }
};

// Compress an image
export const compressImage = async (uri, options = {}) => {
  try {
    const { quality = 0.8, base64 = false } = options;
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType?.Images || 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality,
      base64: true,
    });

    if (result.canceled) {
      throw new Error('User cancelled image compression');
    }

    if (result.assets && result.assets.length > 0) {
      return {
        uri: result.assets[0].uri,
        width: result.assets[0].width,
        height: result.assets[0].height,
        base64: result.assets[0].base64,
      };
    }

    throw new Error('Failed to compress image');
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
};

// Delete an image from the device
export const deleteImage = async (uri) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

// Export all functions
export default {
  pickImage,
  takePhoto,
  resizeImage,
  imageToBase64,
  getImageInfo,
  compressImage,
  deleteImage,
  getCameraRollPermissions,
  getCameraPermissions,
};
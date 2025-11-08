// src/utils/imageUtils.js
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'react-native';

/**
 * Get profile image URL with fallback and validation
 * @param {Object} user - User object containing profile image info
 * @returns {string} Image URL or null if no image available
 */
export const getProfileImageUrl = (user) => {
  try {
    let imageUrl = null;

    // If user has a profile image URL
    if (user?.profileImage) {
      imageUrl = user.profileImage;
    }
    // If user has an avatar URL
    else if (user?.avatar) {
      imageUrl = user.avatar;
    }
    // If user has a photoURL (Firebase auth)
    else if (user?.photoURL) {
      imageUrl = user.photoURL;
    }

    // Validate the image URL
    if (imageUrl) {
      // Check if it's a valid URL format
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:')) {
        return imageUrl;
      }
      // If it's a relative path, construct the full URL
      else if (imageUrl.startsWith('/') || imageUrl.includes('profile_')) {
        // Don't return relative paths that might not exist
        console.warn(`Skipping potentially invalid image path: ${imageUrl}`);
        return null;
      }
    }

    // Return null if no valid image is available
    return null;
  } catch (error) {
    console.error('Error getting profile image URL:', error);
    return null;
  }
};

/**
 * Download and cache an image
 * @param {string} uri - Remote image URI
 * @returns {Promise<string>} Local file URI
 */
export const cacheImage = async (uri) => {
  try {
    if (!uri) return null;

    // If it's a local file, return as is
    if (uri.startsWith('file://') || uri.startsWith('http://localhost')) {
      return uri;
    }

    // For remote images, download and cache
    const filename = uri.substring(uri.lastIndexOf('/') + 1);
    const cacheDir = FileSystem.cacheDirectory + 'cached_images/';
    const localUri = cacheDir + filename;

    // Ensure directory exists
    await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });

    // Check if file is already cached
    const fileInfo = await FileSystem.getInfoAsync(localUri);

    if (!fileInfo.exists) {
      // Download and save the file
      await FileSystem.downloadAsync(uri, localUri);
    }

    return localUri;
  } catch (error) {
    console.error('Error caching image:', error);
    return uri; // Return original URI if caching fails
  }
};

/**
 * Preload images for better performance
 * @param {Array<string>} imageUris - Array of image URIs to preload
 */
export const preloadImages = async (imageUris) => {
  try {
    const cachePromises = imageUris.map(uri => cacheImage(uri));
    return await Promise.all(cachePromises);
  } catch (error) {
    console.error('Error preloading images:', error);
    return [];
  }
};

/**
 * Resize and compress an image prior to upload
 * @param {string} uri - Image URI to process
 * @param {Object} options - Processing options
 * @param {number} [options.maxWidth=1024]
 * @param {number} [options.maxHeight=1024]
 * @param {number} [options.compress=0.8]
 * @returns {Promise<{ uri: string, base64: string }>} Processed image data
 */
export const processImageForUpload = async (uri, options = {}) => {
  if (!uri) {
    throw new Error('Image URI is required for processing');
  }

  const {
    maxWidth = 1024,
    maxHeight = 1024,
    compress = 0.8,
    format = ImageManipulator.SaveFormat.JPEG,
  } = options;

  let originalWidth = maxWidth;
  let originalHeight = maxHeight;

  try {
    const dimensions = await getImageDimensions(uri);
    if (dimensions?.width && dimensions?.height) {
      originalWidth = dimensions.width;
      originalHeight = dimensions.height;
    }
  } catch (dimensionError) {
    console.warn('processImageForUpload: unable to read image dimensions, falling back to max dimensions.', dimensionError);
  }

  let targetWidth = originalWidth;
  let targetHeight = originalHeight;

  if (originalWidth > maxWidth || originalHeight > maxHeight) {
    const widthScale = maxWidth / (originalWidth || maxWidth);
    const heightScale = maxHeight / (originalHeight || maxHeight);
    const scale = Math.min(widthScale, heightScale, 1);

    if (Number.isFinite(scale) && scale > 0) {
      targetWidth = Math.max(1, Math.round(originalWidth * scale));
      targetHeight = Math.max(1, Math.round(originalHeight * scale));
    }
  }

  const shouldResize = targetWidth > 0 && targetHeight > 0 && (targetWidth !== originalWidth || targetHeight !== originalHeight);
  const actions = shouldResize
    ? [{ resize: { width: targetWidth, height: targetHeight } }]
    : [];

  const resolvedCompress = Math.max(0.05, Math.min(1, compress ?? 0.8));

  const manipResult = await ImageManipulator.manipulateAsync(
    uri,
    actions,
    {
      compress: resolvedCompress,
      format,
      base64: true,
    }
  );

  if (!manipResult.base64) {
    throw new Error('Failed to process image for upload');
  }

  const resolvedMimeType =
    format === ImageManipulator.SaveFormat.PNG
      ? 'image/png'
      : format === ImageManipulator.SaveFormat.WEBP
        ? 'image/webp'
        : 'image/jpeg';

  return {
    uri: manipResult.uri,
    base64: `data:${resolvedMimeType};base64,${manipResult.base64}`,
    width: shouldResize ? targetWidth : originalWidth,
    height: shouldResize ? targetHeight : originalHeight,
    mimeType: resolvedMimeType,
  };
};

/**
 * Get image dimensions
 * @param {string} uri - Image URI
 * @returns {Promise<{width: number, height: number}>} Image dimensions
 */
export const getImageDimensions = (uri) => {
  return new Promise((resolve, reject) => {
    if (!uri) {
      reject(new Error('No URI provided'));
      return;
    }

    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => {
        console.error('Error getting image dimensions:', error);
        reject(error);
      }
    );
  });
};

/**
 * Get a placeholder image source when no profile image is available
 * @returns {Object} Image source object with a placeholder
 */
export const getPlaceholderImage = () => require('../../assets/placeholder-avatar.png');

/**
 * Get image source object for React Native Image component
 * @param {Object|string} userOrUrl - User object containing profile image info or direct URL string
 * @param {Object} options - Additional options for image source
 * @returns {Object} Image source object compatible with React Native Image
 */
export const getImageSource = (userOrUrl, options = {}) => {
  try {
    const { cache = false, width, height, ...restOptions } = options;

    let imageUrl = null;

    // Check if first parameter is a user object or a direct URL
    if (typeof userOrUrl === 'string') {
      imageUrl = userOrUrl;
    } else if (userOrUrl && typeof userOrUrl === 'object') {
      imageUrl = getProfileImageUrl(userOrUrl);
    }

    if (!imageUrl || imageUrl.trim() === '' || imageUrl === 'null') {
      return getPlaceholderImage();
    }

    const buildSource = (uri) => {
      const source = {
        uri,
        ...restOptions,
      };

      if (typeof width === 'number') {
        source.width = width;
      }

      if (typeof height === 'number') {
        source.height = height;
      }

      return source;
    };

    if (cache) {
      return cacheImage(imageUrl)
        .then((cachedUri) => buildSource(cachedUri))
        .catch(() => getPlaceholderImage());
    }

    return buildSource(imageUrl);
  } catch (error) {
    console.error('Error getting image source:', error);
    return getPlaceholderImage();
  }
};

// Export default object for easier imports
export default {
  getProfileImageUrl,
  cacheImage,
  preloadImages,
  processImageForUpload,
  getImageDimensions,
  getPlaceholderImage,
  getImageSource,
};
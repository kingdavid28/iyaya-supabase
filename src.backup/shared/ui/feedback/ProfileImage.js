import { useTheme } from '@react-navigation/native';
import { User } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { getImageSource } from '../../../utils/imageUtils';

/**
 * @typedef {Object} ProfileImageProps
 * @property {string|null} [imageUrl]
 * @property {*} [source]
 * @property {number} [size]
 * @property {*} [style]
 * @property {boolean} [showBorder]
 * @property {string} [borderColor]
 * @property {number} [borderWidth]
 * @property {string} [placeholderBackground]
 * @property {string} [fallbackIconColor]
 * @property {number} [fallbackIconSize]
 * @property {React.ReactNode} [fallbackIconElement]
 * @property {number} [defaultIconSize]
 * @property {number} [imageScale]
 * @property {'cover'|'contain'|'stretch'|'repeat'|'center'} [resizeMode]
 * @property {boolean} [showLoadingIndicator]
 * @property {React.ReactNode} [loadingIndicatorElement]
 * @property {Function} [onLoad]
 * @property {Function} [onError]
 * @property {number} [imagePadding]
 */

/**
 * @param {ProfileImageProps} props
 */
const ProfileImage = ({
  imageUrl,
  source,
  size = 80,
  style,
  showBorder = true,
  borderColor,
  borderWidth = 3,
  placeholderBackground,
  fallbackIconColor,
  fallbackIconSize,
  fallbackIconElement,
  defaultIconSize,
  imageScale = 1,
  resizeMode = 'cover',
  showLoadingIndicator = false,
  loadingIndicatorElement,
  onLoad,
  onError,
  imagePadding,
  ...imageProps
}) => {
  const { colors = {} } = useTheme();
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageMetrics, setImageMetrics] = useState(null);

  // Reset states when image source changes
  useEffect(() => {
    setHasError(false);
    setImageMetrics(null);
  }, [imageUrl, source]);

  // Memoize the resolved image source
  const resolvedSource = useMemo(() => {
    if (hasError) return null;

    if (source) {
      return source;
    }

    if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() && imageUrl !== 'null') {
      if (imageUrl.startsWith('data:') || imageUrl.startsWith('http') || imageUrl.startsWith('file:')) {
        return { uri: imageUrl };
      }
      return getImageSource(imageUrl);
    }

    return null;
  }, [hasError, imageUrl, source]);

  // Handle image loading and metrics
  useEffect(() => {
    if (!resolvedSource) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Only get image size for URI sources
    if (resolvedSource.uri) {
      Image.getSize(
        resolvedSource.uri,
        (width, height) => {
          if (width > 0 && height > 0) {
            setImageMetrics({ width, height, aspectRatio: width / height });
          }
          setIsLoading(false);
        },
        () => {
          setImageMetrics(null);
          setIsLoading(false);
          setHasError(true);
        }
      );
    } else {
      // For non-URI sources, we'll rely on onLoad/onError
      setIsLoading(true);
    }
  }, [resolvedSource]);

  // Calculate derived values
  const resolvedBorderColor = borderColor ?? colors.primary ?? '#3b82f6';
  const resolvedPlaceholderBackground = placeholderBackground ?? colors.background ?? 'rgba(255, 255, 255, 0.9)';
  const resolvedFallbackIconColor = fallbackIconColor ?? resolvedBorderColor;
  const iconSize = fallbackIconSize ?? defaultIconSize ?? Math.max(24, size * 0.4);
  const resolvedPadding = imagePadding ?? Math.max(Math.round(size * 0.06), 2);
  const innerSize = Math.max(size - (showBorder ? borderWidth * 2 : 0) - resolvedPadding * 2, 1);

  const radius = innerSize / 2;
  const displayWidth = innerSize;
  const displayHeight = innerSize;

  const handleError = (error) => {
    const errorMessage = error?.nativeEvent?.error || 'Failed to load image';

    // Only log non-file-not-found errors
    if (!String(errorMessage).includes("couldn't be opened because there is no such file")) {
      console.warn('Failed to load profile image:', errorMessage);
    }

    setHasError(true);
    setIsLoading(false);
    setImageMetrics(null);
    onError?.(error);
  };

  const handleLoad = (event) => {
    setIsLoading(false);
    const nativeSource = event?.nativeEvent?.source;

    if (nativeSource?.width && nativeSource?.height) {
      setImageMetrics({
        width: nativeSource.width,
        height: nativeSource.height,
        aspectRatio: nativeSource.width / nativeSource.height,
      });
    }

    onLoad?.(event);
  };

  const fallbackContent = fallbackIconElement ?? (
    <User size={iconSize} color={resolvedFallbackIconColor} />
  );

  const loadingContent = loadingIndicatorElement ?? fallbackContent;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: showBorder ? borderWidth : 0,
          borderColor: showBorder ? resolvedBorderColor : 'transparent',
          backgroundColor: resolvedPlaceholderBackground,
          padding: resolvedPadding,
        },
        style,
      ]}
    >
      {resolvedSource && !hasError ? (
        <View style={styles.imageContainer}>
          {/* Loading indicator */}
          {showLoadingIndicator && isLoading && (
            <View style={[styles.loadingOverlay, { backgroundColor: resolvedPlaceholderBackground }]}>
              {loadingContent}
            </View>
          )}

          {/* Main image */}
          <Image
            source={resolvedSource}
            style={[
              styles.image,
              {
                width: innerSize,
                height: innerSize,
                borderRadius: radius,
              },
              imageScale !== 1 ? { transform: [{ scale: imageScale }] } : null,
            ]}
            resizeMode={resizeMode}
            onError={handleError}
            onLoad={handleLoad}
            onLoadEnd={() => setIsLoading(false)}
            {...imageProps}
          />
        </View>
      ) : (
        /* Fallback placeholder */
        <View
          style={[
            styles.placeholder,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
            },
          ]}
        >
          {fallbackContent}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  image: {
    backgroundColor: 'transparent',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});

export default ProfileImage;
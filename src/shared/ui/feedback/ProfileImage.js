import { useTheme } from '@react-navigation/native';
import { User } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { getImageSource } from '../../../utils/imageUtils';

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
  const { colors } = useTheme();
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [imageUrl, source]);

  const resolvedSource = useMemo(() => {
    if (hasError) return null;
    if (source) {
      return source;
    }
    if (typeof imageUrl === 'string' && imageUrl.trim() && imageUrl !== 'null') {
      if (imageUrl.startsWith('data:')) {
        return { uri: imageUrl };
      }
      return getImageSource(imageUrl);
    }
    return null;
  }, [hasError, imageUrl, source]);

  useEffect(() => {
    setIsLoading(!!resolvedSource);
  }, [resolvedSource]);

  const resolvedBorderColor = borderColor ?? colors.primary ?? '#3b82f6';
  const resolvedPlaceholderBackground = placeholderBackground ?? 'rgba(255, 255, 255, 0.9)';
  const resolvedFallbackIconColor = fallbackIconColor ?? resolvedBorderColor;
  const iconSize = fallbackIconSize ?? defaultIconSize ?? Math.max(24, size * 0.4);
  const resolvedPadding = imagePadding ?? Math.max(Math.round(size * 0.06), 2);
  const innerSize = Math.max(size - (showBorder ? borderWidth * 2 : 0) - resolvedPadding * 2, 0);

  const handleError = (error) => {
    const errorMessage = error?.nativeEvent?.error || error;
    if (errorMessage && !String(errorMessage).includes("couldn't be opened because there is no such file")) {
      console.warn('Failed to load profile image:', errorMessage);
    }
    setHasError(true);
    setIsLoading(false);
    onError?.(error);
  };

  const handleLoad = (event) => {
    setIsLoading(false);
    onLoad?.(event);
  };

  const fallbackContent = fallbackIconElement ?? (
    <User size={iconSize} color={resolvedFallbackIconColor} />
  );

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
        },
        { padding: resolvedPadding },
        style,
      ]}
    >
      {resolvedSource ? (
        <>
          {showLoadingIndicator && isLoading && (
            <View style={[styles.loadingOverlay, { backgroundColor: resolvedPlaceholderBackground }]}>
              {loadingIndicatorElement ?? fallbackContent}
            </View>
          )}
          <Image
            source={resolvedSource}
            style={[
              styles.image,
              {
                width: innerSize,
                height: innerSize,
                borderRadius: innerSize / 2,
              },
              imageScale !== 1 ? { transform: [{ scale: imageScale }] } : null,
            ]}
            resizeMode={resizeMode}
            onError={handleError}
            onLoad={handleLoad}
            {...imageProps}
          />
        </>
      ) : (
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
  },
  image: {
    backgroundColor: 'transparent',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ProfileImage;
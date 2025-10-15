import React, { useState, useMemo } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { User } from 'lucide-react-native';
import { getImageSource } from '../../../utils/imageUtils';

const ProfileImage = ({ 
  imageUrl, 
  size = 80, 
  style, 
  defaultIconSize = 40,
  borderColor = '#3b82f6',
  borderWidth = 3 
}) => {
  const [imageError, setImageError] = useState(false);
  
  const imageSource = useMemo(() => {
    if (!imageUrl || imageUrl.trim() === '' || imageUrl === 'null' || imageError) {
      return null;
    }
    
    // Handle base64 data URLs
    if (imageUrl.startsWith('data:')) {
      return { uri: imageUrl };
    }
    
    // Use getImageSource which handles both local and remote URLs
    return getImageSource(imageUrl);
  }, [imageUrl, imageError]);
  const imageSize = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={[styles.container, imageSize, { borderColor, borderWidth }, style]}>
      {imageSource && !imageError ? (
        <Image 
          source={imageSource}
          style={[styles.image, imageSize]}
          onError={(error) => {
            // Reduce log noise - only log actual errors, not missing files
            const errorMessage = error?.nativeEvent?.error || error;
            if (errorMessage && !errorMessage.includes("couldn't be opened because there is no such file")) {
              console.warn('Failed to load profile image:', errorMessage);
            }
            setImageError(true);
          }}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.placeholder, imageSize]}>
          <User size={defaultIconSize} color={borderColor} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    backgroundColor: '#f3f4f6',
  },
  placeholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ProfileImage;
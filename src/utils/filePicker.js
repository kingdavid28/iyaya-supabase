import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

export const pickImage = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to share images.');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      return {
        name: asset.fileName || `image_${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
        size: asset.fileSize || 0,
        base64: asset.base64,
        uri: asset.uri
      };
    }
    return null;
  } catch (error) {
    console.error('Error picking image:', error);
    Alert.alert('Error', 'Failed to pick image');
    return null;
  }
};

export const pickDocument = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      
      // Convert to base64 for small files only (< 5MB)
      if (asset.size > 5 * 1024 * 1024) {
        Alert.alert('File too large', 'Please select a file smaller than 5MB');
        return null;
      }

      // For demo purposes, we'll just return file info
      // In production, you'd upload to a file storage service
      return {
        name: asset.name,
        type: asset.mimeType,
        size: asset.size,
        uri: asset.uri,
        base64: null // Would need proper file reading for base64
      };
    }
    return null;
  } catch (error) {
    console.error('Error picking document:', error);
    Alert.alert('Error', 'Failed to pick document');
    return null;
  }
};

export const takePhoto = async () => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions to take photos.');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      return {
        name: `photo_${Date.now()}.jpg`,
        type: 'image/jpeg',
        size: asset.fileSize || 0,
        base64: asset.base64,
        uri: asset.uri
      };
    }
    return null;
  } catch (error) {
    console.error('Error taking photo:', error);
    Alert.alert('Error', 'Failed to take photo');
    return null;
  }
};
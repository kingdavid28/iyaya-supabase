import * as ImagePicker from 'expo-image-picker';
import { supabaseService } from './supabase';

export const imageUploadService = {
  async pickAndUploadProfileImage(userId) {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access media library is required');
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled) {
        throw new Error('User cancelled image selection');
      }

      if (!result.assets || result.assets.length === 0) {
        throw new Error('No image selected');
      }

      const asset = result.assets[0];
      if (!asset.base64) {
        throw new Error('Failed to get image data');
      }

      // Upload to Supabase using new architecture
      const uploadResult = await supabaseService.user.uploadProfileImage(userId, asset.base64);
      return uploadResult;

    } catch (error) {
      console.error('❌ [DEBUG] Profile image upload failed:', error);
      throw error;
    }
  }
};

export default imageUploadService;
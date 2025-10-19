import * as ImagePicker from 'expo-image-picker';
import { supabaseService } from './supabase';
import { processImageForUpload } from '../utils/imageUtils';

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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      let uploadPayload;
      try {
        const processed = await processImageForUpload(asset.uri, {
          maxWidth: 1024,
          maxHeight: 1024,
          compress: 0.8,
        });
        uploadPayload = processed.base64;
      } catch (processingError) {
        console.warn('Failed to process image before upload, falling back to original asset.', processingError);
        if (asset.base64) {
          uploadPayload = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
        } else {
          throw new Error('Failed to process image for upload');
        }
      }

      const uploadResult = await supabaseService.uploadProfileImage(userId, uploadPayload);
      return uploadResult;

    } catch (error) {
      console.error('❌ [DEBUG] Profile image upload failed:', error);
      throw error;
    }
  }
};

export default imageUploadService;
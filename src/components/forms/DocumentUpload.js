import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Alert, Platform } from 'react-native';
import { Button, Text, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { uploadsAPI, authAPI } from '../../config/api';

// Platform-specific FileSystem import
const FileSystem = Platform.OS === 'web' ? null : require('expo-file-system/legacy');

const DocumentUpload = ({ label, documentType, onUploadComplete, initialUri = '' }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [documentUri, setDocumentUri] = useState(initialUri);
  const [uploadProgress, setUploadProgress] = useState(0);

  const pickDocument = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'We need access to your photos to upload documents.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadDocument(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const uploadDocument = async (uri) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      // Read file as base64 (skip on web)
      let imageBase64 = '';
      if (Platform.OS !== 'web' && FileSystem) {
        imageBase64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      } else {
        // For web, we'll need to handle file reading differently
        console.warn('FileSystem not available on web platform');
        Alert.alert('Upload Error', 'File upload is not supported on web platform');
        return;
      }
      // Best-effort mime type guess
      const mimeType = uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      const name = `${documentType}_${Date.now()}`;
      const folder = 'verification_documents';

      // Try uploadsAPI first, fallback to authAPI
      let res;
      try {
        res = await uploadsAPI.base64Upload({ imageBase64, mimeType, folder, name });
      } catch (uploadError) {
        console.log('Upload API failed, trying auth API:', uploadError.message);
        res = await authAPI.uploadProfileImage(uri);
      }
      
      const url = res?.data?.url || res?.url;
      if (!res?.success && !url) throw new Error('Upload failed');
      
      setUploadProgress(100);
      setDocumentUri(url);
      onUploadComplete(url, documentType);
      setIsUploading(false);
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload document. Please try again.');
      setIsUploading(false);
    }
  };

  const removeDocument = () => {
    setDocumentUri('');
    onUploadComplete('', documentType);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      {documentUri ? (
        <View style={styles.documentPreview}>
          <Image 
            source={{ uri: documentUri }} 
            style={styles.documentImage} 
            resizeMode="contain"
          />
          <View style={styles.documentActions}>
            <Button 
              mode="outlined" 
              onPress={pickDocument}
              style={styles.actionButton}
              disabled={isUploading}
            >
              Change
            </Button>
            <IconButton
              icon="delete"
              size={20}
              onPress={removeDocument}
              disabled={isUploading}
              style={styles.deleteButton}
            />
          </View>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.uploadButton}
          onPress={pickDocument}
          disabled={isUploading}
        >
          <Text style={styles.uploadButtonText}>
            {isUploading ? `Uploading... ${Math.round(uploadProgress)}%` : 'Upload Document'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
  },
  uploadButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    color: '#666',
  },
  documentPreview: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  documentImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
  },
  documentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 8,
    backgroundColor: '#f9f9f9',
  },
  actionButton: {
    marginRight: 8,
  },
  deleteButton: {
    margin: 0,
  },
});

export default DocumentUpload;

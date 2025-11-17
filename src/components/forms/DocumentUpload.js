import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, IconButton, Text } from 'react-native-paper';
import { uploadsAPI } from '../../config/api';

const SUPPORTED_TYPES = ['application/pdf', 'image/*'];

const DocumentUpload = ({ label, documentType, onUploadComplete, initialUri = '' }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [documentUri, setDocumentUri] = useState(initialUri);
  const [uploadProgress, setUploadProgress] = useState(0);

  const allowedTypes = useMemo(() => SUPPORTED_TYPES, []);

  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: allowedTypes,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      await uploadDocument(result.assets[0]);
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  }, [allowedTypes, uploadDocument]);

  const uploadDocument = useCallback(async (asset) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      const { uri, name, mimeType, size } = asset;

      if (!uri) {
        throw new Error('Selected file is missing a URI');
      }

      const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
      if (!fileInfo.exists) {
        throw new Error('Unable to read the selected file');
      }

      const inferredMimeType = mimeType || inferMimeType(name);
      const fileName = name || `${documentType || 'document'}-${Date.now()}`;

      const filePayload = {
        uri,
        name: fileName,
        type: inferredMimeType,
        size: size || fileInfo.size || 0,
        documentType: documentType || 'general',
      };

      const uploadResult = await uploadsAPI.uploadDocument(filePayload);
      const url = uploadResult?.url || uploadResult?.data?.url;

      if (!url) {
        throw new Error('Upload did not return a file URL');
      }

      setUploadProgress(100);
      setDocumentUri(url);
      onUploadComplete(url, documentType);
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [documentType, onUploadComplete]);

  const removeDocument = useCallback(() => {
    setDocumentUri('');
    onUploadComplete('', documentType);
  }, [documentType, onUploadComplete]);

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

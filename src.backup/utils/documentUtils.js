import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

export const pickDocument = async (allowedTypes = ['application/pdf', 'image/*']) => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: allowedTypes,
      copyToCacheDirectory: true,
    });
    
    if (!result.canceled) {
      return result.assets[0];
    }
    return null;
  } catch (error) {
    console.error('Error picking document:', error);
    throw error;
  }
};

export const uploadDocument = async (document, category = 'general') => {
  try {
    // Mock upload - replace with actual API call
    console.log('Uploading document:', document.name, 'Category:', category);
    return { success: true, url: 'mock-url', id: Date.now().toString() };
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

export const getUserDocuments = async (category = 'general') => {
  try {
    // Mock fetch - replace with actual API call
    console.log('Fetching documents for category:', category);
    return [];
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
};

export const deleteDocument = async (documentId) => {
  try {
    // Mock delete - replace with actual API call
    console.log('Deleting document:', documentId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};
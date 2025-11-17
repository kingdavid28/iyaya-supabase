import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pickDocument, uploadDocument, getUserDocuments, deleteDocument } from '../../utils/documentUtils';
import { LoadingSpinner } from '../../shared/ui';

const DocumentManager = ({ category = 'general', onDocumentUploaded }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await getUserDocuments();
      setDocuments(docs.filter(doc => doc.category === category));
    } catch (error) {
      Alert.alert('Error', 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handlePickAndUpload = async () => {
    try {
      setUploading(true);
      const document = await pickDocument();
      if (document) {
        const result = await uploadDocument(document, category);
        setDocuments(prev => [...prev, result]);
        onDocumentUploaded?.(result);
        Alert.alert('Success', 'Document uploaded successfully');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId) => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDocument(documentId);
              setDocuments(prev => prev.filter(doc => doc.id !== documentId));
              Alert.alert('Success', 'Document deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete document');
            }
          }
        }
      ]
    );
  };

  const renderDocument = ({ item }) => (
    <View style={styles.documentItem}>
      <View style={styles.documentInfo}>
        <Ionicons name="document" size={24} color="#3b82f6" />
        <View style={styles.documentDetails}>
          <Text style={styles.documentName}>{item.name}</Text>
          <Text style={styles.documentSize}>{(item.size / 1024).toFixed(1)} KB</Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item.id)}>
        <Ionicons name="trash" size={20} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return <LoadingSpinner text="Loading documents..." />;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.uploadButton} 
        onPress={handlePickAndUpload}
        disabled={uploading}
      >
        {uploading ? (
          <LoadingSpinner size="small" />
        ) : (
          <>
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.uploadText}>Upload Document</Text>
          </>
        )}
      </TouchableOpacity>

      <FlatList
        data={documents}
        renderItem={renderDocument}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No documents uploaded yet</Text>
        }
      />
    </View>
  );
};

const styles = {
  container: { flex: 1, padding: 16 },
  uploadButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#3b82f6', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 16 
  },
  uploadText: { color: '#fff', marginLeft: 8, fontWeight: '600' },
  documentItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: 12, 
    backgroundColor: '#f9fafb', 
    borderRadius: 8, 
    marginBottom: 8 
  },
  documentInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  documentDetails: { marginLeft: 12, flex: 1 },
  documentName: { fontSize: 16, fontWeight: '500' },
  documentSize: { fontSize: 12, color: '#6b7280' },
  emptyText: { textAlign: 'center', color: '#6b7280', marginTop: 32 }
};

export default DocumentManager;
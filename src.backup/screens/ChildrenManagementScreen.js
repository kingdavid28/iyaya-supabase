// screens/ChildrenManagementScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services';
import { styles } from './styles/ChildrenManagementScreen.styles';
import ChildModal from './ParentDashboard/modals/ChildModal';

const ChildrenManagementScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const [childForm, setChildForm] = useState({
    name: '',
    age: '5',
    allergies: '',
    preferences: ''
  });

  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    try {
      setLoading(true);
      const response = await apiService.children.getMy();
      // Handle both array and object responses
      const childrenData = Array.isArray(response) ? response : response.children || response.data || [];
      setChildren(childrenData);
    } catch (error) {
      console.error('Error loading children:', error);
      Alert.alert('Error', 'Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingChild(null);
    setChildForm({
      name: '',
      age: '5',
      allergies: '',
      preferences: ''
    });
    setModalVisible(true);
  };

  const openEditModal = (child) => {
    setEditingChild(child);
    setChildForm({
      name: child.name || '',
      age: child.age?.toString() || '5',
      allergies: child.allergies || '',
      preferences: child.preferences || ''
    });
    setModalVisible(true);
  };

  const handleSaveChild = async () => {
    // Validate input
    if (!childForm.name.trim()) {
      Alert.alert('Error', 'Please enter a child name');
      return;
    }

    try {
      setSaving(true);

      // Clean the data to remove any ID fields before sending to backend
      const cleanChildData = {
        name: childForm.name.trim(),
        age: parseInt(childForm.age, 10) || 5,
        allergies: childForm.allergies.trim(),
        preferences: childForm.preferences.trim()
      };

      // Ensure no ID fields are included
      delete cleanChildData.id;
      delete cleanChildData._id;
      delete cleanChildData.childId;

      if (editingChild) {
        // Update existing child - include the ID for update
        const updateData = {
          ...cleanChildData,
          id: editingChild._id || editingChild.id
        };
        const updatedChild = await apiService.children.update(editingChild._id || editingChild.id, updateData);
        setChildren(prev => prev.map(child =>
          child._id === editingChild._id || child.id === editingChild.id ? updatedChild : child
        ));
        Alert.alert('Success', 'Child updated successfully');
      } else {
        // Create new child - let MongoDB generate the ID
        const savedChild = await apiService.children.create(cleanChildData);
        setChildren(prev => [...prev, savedChild]);
        Alert.alert('Success', 'Child added successfully');
      }

      setModalVisible(false);
    } catch (error) {
      console.error('Error saving child:', error);

      if (error.message?.includes('Child ID already exists') || error.code === 11000) {
        Alert.alert('Error', 'A child with this name already exists. Please choose a different name.');
      } else {
        Alert.alert('Error', 'Failed to save child. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChild = async (childId) => {
    try {
      // Use the correct ID field (_id or id)
      const idToDelete = childId._id || childId.id || childId;
      
      Alert.alert(
        'Delete Child',
        'Are you sure you want to delete this child?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await apiService.children.delete(idToDelete);
              setChildren(prev => prev.filter(child => 
                (child._id || child.id) !== (childId._id || childId.id || childId)
              ));
              Alert.alert('Success', 'Child deleted successfully');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting child:', error);
      Alert.alert('Error', 'Failed to delete child');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading children...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Children</Text>

      <TouchableOpacity
        style={styles.addButton}
        onPress={openAddModal}
        disabled={saving}
      >
        <Ionicons name="add" size={24} color="white" />
        <Text style={styles.addButtonText}>Add Child</Text>
      </TouchableOpacity>

      <ScrollView style={styles.childrenList}>
        {children.map(child => (
          <ChildCard
            key={child.id}
            child={child}
            onEdit={() => openEditModal(child)}
            onDelete={() => handleDeleteChild(child.id)}
          />
        ))}
      </ScrollView>

      {/* Use ParentDashboard's ChildModal */}
      <ChildModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        childName={childForm.name}
        setChildName={(name) => setChildForm(prev => ({ ...prev, name }))}
        childAge={childForm.age}
        setChildAge={(age) => setChildForm(prev => ({ ...prev, age }))}
        childAllergies={childForm.allergies}
        setChildAllergies={(allergies) => setChildForm(prev => ({ ...prev, allergies }))}
        childNotes={childForm.preferences}
        setChildNotes={(notes) => setChildForm(prev => ({ ...prev, preferences: notes }))}
        onSave={handleSaveChild}
        editing={!!editingChild}
      />
    </View>
  );
};

const ChildCard = ({ child, onEdit, onDelete }) => {
  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <Text style={styles.childName}>{child.name}</Text>
        <Text style={styles.childInfo}>Age: {child.age}</Text>
        {child.allergies && (
          <Text style={styles.childInfo}>Allergies: {child.allergies}</Text>
        )}
        {child.preferences && (
          <Text style={styles.childInfo}>Preferences: {child.preferences}</Text>
        )}
      </View>
      
      <View style={styles.cardActions}>
        <TouchableOpacity 
          style={styles.editButton} 
          onPress={onEdit}
        >
          <Ionicons name="pencil" size={16} color="#007AFF" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={onDelete}
        >
          <Ionicons name="trash" size={16} color="#FF3B30" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ChildrenManagementScreen;
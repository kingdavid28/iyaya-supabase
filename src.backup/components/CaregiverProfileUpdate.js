import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { caregiversAPI } from '../services';

const CaregiverProfileUpdate = ({ currentProfile, onUpdate }) => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: currentProfile?.name || '',
    bio: currentProfile?.bio || '',
    hourlyRate: currentProfile?.hourlyRate?.toString() || '',
    skills: currentProfile?.skills?.join(', ') || '',
    experience: {
      years: currentProfile?.experience?.years?.toString() || '0',
      months: currentProfile?.experience?.months?.toString() || '0',
      description: currentProfile?.experience?.description || ''
    }
  });

  const handleUpdate = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        name: formData.name.trim(),
        bio: formData.bio.trim(),
        hourlyRate: parseFloat(formData.hourlyRate) || 0,
        skills: formData.skills.split(',').map(s => s.trim()).filter(s => s),
        experience: {
          years: parseInt(formData.experience.years) || 0,
          months: parseInt(formData.experience.months) || 0,
          description: formData.experience.description.trim()
        }
      };

      const response = await caregiversAPI.updateProfile(updateData);
      
      if (response.success) {
        Alert.alert('Success', response.message || 'Profile updated successfully', [
          {
            text: 'View Profile',
            onPress: () => navigation.navigate('CaregiverProfileComplete', { 
              profile: response.caregiver
            })
          }
        ]);
        onUpdate?.(response.caregiver);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Update Profile
      </Text>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, marginBottom: 8 }}>Name *</Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 8,
            padding: 12,
            fontSize: 16
          }}
          value={formData.name}
          onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
          placeholder="Enter your name"
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, marginBottom: 8 }}>Bio</Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 8,
            padding: 12,
            fontSize: 16,
            minHeight: 100
          }}
          value={formData.bio}
          onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
          placeholder="Tell us about yourself"
          multiline
          textAlignVertical="top"
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, marginBottom: 8 }}>Hourly Rate (₱)</Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 8,
            padding: 12,
            fontSize: 16
          }}
          value={formData.hourlyRate}
          onChangeText={(text) => setFormData(prev => ({ ...prev, hourlyRate: text }))}
          placeholder="0"
          keyboardType="numeric"
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, marginBottom: 8 }}>Skills (comma separated)</Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 8,
            padding: 12,
            fontSize: 16
          }}
          value={formData.skills}
          onChangeText={(text) => setFormData(prev => ({ ...prev, skills: text }))}
          placeholder="e.g. Childcare, Cooking, First Aid"
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, marginBottom: 8 }}>Experience</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, marginBottom: 4 }}>Years</Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                padding: 12,
                fontSize: 16
              }}
              value={formData.experience.years}
              onChangeText={(text) => setFormData(prev => ({
                ...prev,
                experience: { ...prev.experience, years: text }
              }))}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, marginBottom: 4 }}>Months</Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                padding: 12,
                fontSize: 16
              }}
              value={formData.experience.months}
              onChangeText={(text) => setFormData(prev => ({
                ...prev,
                experience: { ...prev.experience, months: text }
              }))}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
        </View>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 8,
            padding: 12,
            fontSize: 16,
            minHeight: 80
          }}
          value={formData.experience.description}
          onChangeText={(text) => setFormData(prev => ({
            ...prev,
            experience: { ...prev.experience, description: text }
          }))}
          placeholder="Describe your experience"
          multiline
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity
        style={{
          backgroundColor: loading ? '#ccc' : '#007bff',
          padding: 16,
          borderRadius: 8,
          alignItems: 'center',
          marginTop: 20
        }}
        onPress={handleUpdate}
        disabled={loading}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
          {loading ? 'Updating...' : 'Update Profile'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default CaregiverProfileUpdate;
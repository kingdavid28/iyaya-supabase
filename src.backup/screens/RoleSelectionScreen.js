import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const RoleSelectionScreen = ({ navigation, route }) => {
  const { session } = route.params || {};

  const selectRole = async (role) => {
    // Store role selection and navigate to callback with role
    navigation.replace('AuthCallback', { role, session });
  };

  return (
    <LinearGradient
      colors={['#fce8f4', '#f3e8ff']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Choose Your Role</Text>
        <Text style={styles.subtitle}>How would you like to use iYaya?</Text>

        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => selectRole('parent')}
        >
          <LinearGradient
            colors={['#fce7f3', '#fbcfe8']}
            style={styles.iconContainer}
          >
            <Ionicons name="happy-outline" size={48} color="#db2777" />
          </LinearGradient>
          <Text style={styles.roleTitle}>I'm a Parent</Text>
          <Text style={styles.roleDescription}>
            Looking for trusted caregivers for my children
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => selectRole('caregiver')}
        >
          <LinearGradient
            colors={['#d1fae5', '#a7f3d0']}
            style={styles.iconContainer}
          >
            <Ionicons name="heart-outline" size={48} color="#10b981" />
          </LinearGradient>
          <Text style={styles.roleTitle}>I'm a Caregiver</Text>
          <Text style={styles.roleDescription}>
            Ready to provide care and support for families
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 48,
    textAlign: 'center',
  },
  roleCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default RoleSelectionScreen;

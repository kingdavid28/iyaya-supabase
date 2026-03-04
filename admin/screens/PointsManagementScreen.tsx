import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';

interface PointsManagementProps {
  caregiverId: string;
  onUpdate?: () => void;
}

export function PointsManagementScreen({ caregiverId, onUpdate }: PointsManagementProps) {
  const [adjustment, setAdjustment] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const addPointsAdjustment = async () => {
    const delta = parseInt(adjustment);
    if (!delta || !reason.trim()) {
      Alert.alert('Error', 'Please enter valid points and reason');
      return;
    }

    setLoading(true);
    try {
      // Insert adjustment to ledger
      await supabase.from('caregiver_points_ledger').insert({
        caregiver_id: caregiverId,
        metric: 'admin_adjustment',
        delta,
        reason: `Admin: ${reason}`
      });

      // Trigger recalculation
      await fetch('/api/points/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caregiverId })
      });

      setAdjustment('');
      setReason('');
      onUpdate?.();
      Alert.alert('Success', 'Points adjustment applied');
    } catch (error) {
      Alert.alert('Error', 'Failed to apply adjustment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Points Adjustment</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Points (+/-)"
        value={adjustment}
        onChangeText={setAdjustment}
        keyboardType="numeric"
      />
      
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Reason for adjustment"
        value={reason}
        onChangeText={setReason}
        multiline
        numberOfLines={3}
      />
      
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={addPointsAdjustment}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Applying...' : 'Apply Adjustment'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
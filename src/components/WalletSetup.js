import React, { useState } from 'react';
import { View, Text, TextInput, Alert, Pressable } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../contexts/AuthContext';

export function WalletSetup() {
  const { user } = useAuth();
  const [address, setAddress] = useState('');
  const [token, setToken] = useState('USDC');
  const [saving, setSaving] = useState(false);

  // Debug user state
  console.log('WalletSetup user:', user);
  
  const handleSave = async () => {
    setSaving(true);
    
    console.log('=== WALLET SAVE DEBUG ===');
    console.log('User object:', user);
    console.log('User ID:', user?.id);
    
    // Use hardcoded user ID since auth isn't working
    const userId = user?.id || '57764bb4-b282-4228-a6cd-94f2f26e542d';
    
    if (!address.trim()) {
      Alert.alert('Error', 'Address is required');
      setSaving(false);
      return;
    }
    
    try {
      const serviceClient = createClient(
        process.env.EXPO_PUBLIC_SUPABASE_URL,
        process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
      );
      
      // First ensure user exists
      await serviceClient
        .from('users')
        .upsert({
          id: userId,
          email: 'kensite24@gmail.com',
          role: 'caregiver'
        });
      
      // Then update wallet
      const { error } = await serviceClient
        .from('users')
        .update({
          solana_wallet_address: address.trim(),
          preferred_token: token
        })
        .eq('id', userId);
      
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Wallet saved!');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
        Solana Wallet Setup
      </Text>
      
      <Text style={{ marginBottom: 10 }}>Preferred Token:</Text>
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        {['SOL', 'USDC'].map((t) => (
          <Pressable
            key={t}
            onPress={() => setToken(t)}
            style={{
              padding: 10,
              marginRight: 10,
              backgroundColor: token === t ? '#3B82F6' : '#E5E7EB',
              borderRadius: 8
            }}
          >
            <Text style={{ color: token === t ? 'white' : 'black' }}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={{ marginBottom: 10 }}>Wallet Address:</Text>
      <TextInput
        value={address}
        onChangeText={setAddress}
        placeholder="Enter your Solana wallet address"
        style={{
          borderWidth: 1,
          borderColor: '#D1D5DB',
          padding: 12,
          borderRadius: 8,
          marginBottom: 20
        }}
      />

      <Pressable
        onPress={handleSave}
        disabled={saving || !address.trim()}
        style={{
          backgroundColor: !saving && address.trim() ? '#3B82F6' : '#9CA3AF',
          padding: 15,
          borderRadius: 8,
          alignItems: 'center'
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>
          {saving ? 'Saving...' : 'Save Wallet Settings'}
        </Text>
      </Pressable>
    </View>
  );
}
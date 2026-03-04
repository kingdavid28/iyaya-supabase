import React, { useState } from 'react';
import { View, Text, TextInput, Alert, Pressable } from 'react-native';
import { PublicKey } from '@solana/web3.js';
import { useAuth } from '../contexts/AuthContext';
import { supabaseService } from '../services/supabase';

export function WalletSetup() {
  const { user } = useAuth();
  const [address, setAddress] = useState('');
  const [token, setToken] = useState('USDC');
  const [saving, setSaving] = useState(false);

  const validateAddress = (walletAddress) => {
    try {
      new PublicKey(walletAddress);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    // Input validation
    if (!address.trim()) {
      Alert.alert('Error', 'Wallet address is required');
      return;
    }

    if (!validateAddress(address)) {
      Alert.alert('Error', 'Invalid Solana wallet address');
      return;
    }

    setSaving(true);

    try {
      const userId = user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Use the singleton supabaseService instead of creating a new client
      await supabaseService.saveWallet(userId, {
        solana_wallet_address: address.trim(),
        preferred_token: token,
      });

      Alert.alert('Success', 'Wallet settings saved successfully!');
      
    } catch (error) {
      console.error('Wallet save error:', error);
      Alert.alert('Error', error.message || 'Failed to save wallet settings');
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
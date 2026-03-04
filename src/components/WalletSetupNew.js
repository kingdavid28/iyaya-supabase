import React, { useState } from 'react';
import { View, Text, TextInput, Alert, Pressable } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export function WalletSetup() {
  const { user } = useAuth();
  const [address, setAddress] = useState('');
  const [token, setToken] = useState('USDC');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    
    if (!user?.id || !address.trim()) {
      Alert.alert('Error', 'Missing user ID or address');
      setSaving(false);
      return;
    }

    try {
      const serviceClient = createClient(
        'https://myiyrmiiywwgismcpith.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15aXlybWlpeXd3Z2lzbWNwaXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTgwODM0NiwiZXhwIjoyMDc1Mzg0MzQ2fQ.WWqfmf8hai5mVBC4iZcfjjlpNfkdd_IHk9NNju2Ehjc'
      );
      
      const { error } = await serviceClient
        .from('users')
        .update({
          solana_wallet_address: address.trim(),
          preferred_token: token
        })
        .eq('id', user.id);
      
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Wallet saved!');
      }
    } catch (error) {
      Alert.alert('Error', 'Save failed');
    }
    
    setSaving(false);
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
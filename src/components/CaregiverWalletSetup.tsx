import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { PublicKey } from '@solana/web3.js';

interface WalletSetupProps {
  onSave: (prefs: { address: string; token: 'SOL' | 'USDC' }) => void;
}

export function CaregiverWalletSetup({ onSave }: WalletSetupProps) {
  const [address, setAddress] = useState('');
  const [token, setToken] = useState<'SOL' | 'USDC'>('USDC');

  const isValidAddress = () => {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = () => {
    if (!isValidAddress()) {
      Alert.alert('Invalid Address', 'Please enter a valid Solana address');
      return;
    }
    onSave({ address, token });
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Payout Token:</Text>
      <View style={{ flexDirection: 'row', marginVertical: 10 }}>
        <Button 
          title="USDC" 
          onPress={() => setToken('USDC')}
          color={token === 'USDC' ? '#007AFF' : '#8E8E93'}
        />
        <Button 
          title="SOL" 
          onPress={() => setToken('SOL')}
          color={token === 'SOL' ? '#007AFF' : '#8E8E93'}
        />
      </View>
      
      <Text>Solana Wallet Address:</Text>
      <TextInput
        value={address}
        onChangeText={setAddress}
        placeholder="Enter your Solana wallet address"
        style={{ 
          borderWidth: 1, 
          borderColor: '#ccc', 
          padding: 10, 
          marginVertical: 10,
          borderRadius: 5
        }}
      />
      
      <Button
        title="Save Payout Settings"
        disabled={!isValidAddress()}
        onPress={handleSave}
      />
    </View>
  );
}
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { useSolana } from '../../contexts/SolanaContext';
import { Button } from '../../shared/ui';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

export const CaregiverWalletSetup = ({ onComplete }) => {
  const [address, setAddress] = useState('');
  const [token, setToken] = useState('USDC');
  const [loading, setLoading] = useState(false);
  const [existingWallet, setExistingWallet] = useState(null);
  const { validateAddress } = useSolana();
  const { user } = useAuth();

  useEffect(() => {
    loadExistingWallet();
  }, []);

  const loadExistingWallet = async () => {
    try {
      const { data } = await supabase
        .from('caregiver_wallets')
        .select('*')
        .eq('caregiver_id', user.id)
        .single();
      
      if (data) {
        setExistingWallet(data);
        setAddress(data.wallet_address);
        setToken(data.preferred_token);
      }
    } catch (error) {
      // No existing wallet found
    }
  };

  const handleSave = async () => {
    if (!validateAddress(address)) {
      Alert.alert('Error', 'Please enter a valid Solana wallet address');
      return;
    }

    setLoading(true);
    try {
      const walletData = {
        caregiver_id: user.id,
        wallet_address: address,
        preferred_token: token,
        verified: false,
        updated_at: new Date()
      };

      if (existingWallet) {
        await supabase
          .from('caregiver_wallets')
          .update(walletData)
          .eq('id', existingWallet.id);
      } else {
        await supabase
          .from('caregiver_wallets')
          .insert(walletData);
      }

      Alert.alert('Success', 'Wallet settings saved successfully!');
      onComplete?.();
    } catch (error) {
      console.error('Failed to save wallet:', error);
      Alert.alert('Error', 'Failed to save wallet settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wallet Setup</Text>
      <Text style={styles.subtitle}>
        Set up your Solana wallet to receive payments
      </Text>

      <View style={styles.section}>
        <Text style={styles.label}>Preferred Token</Text>
        <View style={styles.tokenButtons}>
          {['SOL', 'USDC'].map(tokenOption => (
            <Button
              key={tokenOption}
              title={tokenOption}
              onPress={() => setToken(tokenOption)}
              variant={token === tokenOption ? 'primary' : 'outline'}
              style={styles.tokenButton}
            />
          ))}
        </View>
        <Text style={styles.hint}>
          {token === 'USDC' ? 'Stable value, good for accounting' : 'Native Solana token, lower fees'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Wallet Address</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Enter your Solana wallet address"
          multiline
          numberOfLines={2}
        />
        <Text style={styles.hint}>
          Compatible with Maya, Phantom, Backpack, Solflare
        </Text>
      </View>

      <Button
        title={existingWallet ? "Update Wallet" : "Save Wallet"}
        onPress={handleSave}
        loading={loading}
        disabled={!address}
        style={styles.saveButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tokenButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  tokenButton: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#2E7D32',
  },
});
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { PublicKey } from '@solana/web3.js';
import { useSolana } from '../../contexts/SolanaContext';
import solanaPaymentService from '../../services/solanaPaymentService';
import { Button } from '../../shared/ui';
import { useAuth } from '../../contexts/AuthContext';

export const SolanaPaymentFlow = ({ 
  booking, 
  caregiverWallet, 
  onPaymentComplete,
  onCancel 
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState('USDC');
  const { connection, validateAddress } = useSolana();
  const { user } = useAuth();

  const handlePayment = async () => {
    if (!validateAddress(caregiverWallet.address)) {
      Alert.alert('Error', 'Invalid caregiver wallet address');
      return;
    }

    setLoading(true);
    try {
      // Create payment intent
      const intent = await solanaPaymentService.createPaymentIntent(
        booking.id,
        selectedToken,
        booking.amount_usd,
        caregiverWallet.address
      );

      // For now, simulate wallet connection and transaction
      // In production, integrate with actual wallet adapter
      const mockSignature = 'mock_signature_' + Date.now();
      
      // Record payment
      await solanaPaymentService.recordPayment(intent.id, mockSignature);
      
      Alert.alert('Success', 'Payment completed successfully!');
      onPaymentComplete?.(mockSignature);
      
    } catch (error) {
      console.error('Payment failed:', error);
      Alert.alert('Error', 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pay Caregiver</Text>
      
      <View style={styles.bookingInfo}>
        <Text style={styles.amount}>${booking.amount_usd}</Text>
        <Text style={styles.caregiver}>To: {caregiverWallet.address.slice(0, 8)}...</Text>
      </View>

      <View style={styles.tokenSelector}>
        <Text style={styles.label}>Payment Token:</Text>
        <View style={styles.tokenButtons}>
          {['SOL', 'USDC'].map(token => (
            <TouchableOpacity
              key={token}
              style={[
                styles.tokenButton,
                selectedToken === token && styles.selectedToken
              ]}
              onPress={() => setSelectedToken(token)}
            >
              <Text style={[
                styles.tokenText,
                selectedToken === token && styles.selectedTokenText
              ]}>
                {token}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title="Pay Now"
          onPress={handlePayment}
          loading={loading}
          style={styles.payButton}
        />
        <Button
          title="Cancel"
          onPress={onCancel}
          variant="outline"
          style={styles.cancelButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  bookingInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  caregiver: {
    fontSize: 14,
    color: '#666',
  },
  tokenSelector: {
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
  },
  tokenButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  selectedToken: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E8',
  },
  tokenText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  selectedTokenText: {
    color: '#2E7D32',
  },
  actions: {
    gap: 12,
  },
  payButton: {
    backgroundColor: '#2E7D32',
  },
  cancelButton: {
    borderColor: '#666',
  },
});
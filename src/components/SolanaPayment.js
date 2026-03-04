import React, { useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';
import { solanaService } from '../services/solana';
import 'react-native-get-random-values';

const connection = new Connection('https://api.devnet.solana.com');
const USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';

export function SolanaPayment({ 
  booking, 
  caregiver, 
  amount, 
  onPaymentComplete 
}) {
  const [paying, setPaying] = useState(false);

  const payWithSOL = async (payerWallet) => {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payerWallet.publicKey,
        toPubkey: new PublicKey(caregiver.solana_wallet_address),
        lamports: Math.round(amount * LAMPORTS_PER_SOL),
      })
    );

    const signature = await payerWallet.sendTransaction(tx, connection);
    return signature;
  };

  const payWithUSDC = async (payerWallet) => {
    const mint = new PublicKey(USDC_MINT);
    const fromAta = await getAssociatedTokenAddress(mint, payerWallet.publicKey);
    const toAta = await getAssociatedTokenAddress(mint, new PublicKey(caregiver.solana_wallet_address));
    
    const ix = createTransferInstruction(
      fromAta,
      toAta,
      payerWallet.publicKey,
      Math.round(amount * 1000000) // 6 decimals
    );

    const tx = new Transaction().add(ix);
    const signature = await payerWallet.sendTransaction(tx, connection);
    return signature;
  };

  const handlePayment = async () => {
    setPaying(true);
    try {
      // Demo mode - simulate payment
      const mockSignature = `mock_${caregiver.preferred_token}_${Date.now()}`;
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      Alert.alert('Demo Payment', `Mock payment of ${amount} ${caregiver.preferred_token} completed!\nSignature: ${mockSignature.substring(0, 20)}...`);
      onPaymentComplete?.(mockSignature);
      
    } catch (error) {
      Alert.alert('Payment Failed', error.message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 16, marginBottom: 10 }}>
        Pay {amount} {caregiver.preferred_token} to {caregiver.name} (Demo Mode)
      </Text>
      
      <Pressable
        onPress={handlePayment}
        disabled={paying}
        style={{
          backgroundColor: paying ? '#9CA3AF' : '#3B82F6',
          padding: 15,
          borderRadius: 8,
          alignItems: 'center'
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>
          {paying ? 'Processing...' : `Demo Pay with ${caregiver.preferred_token}`}
        </Text>
      </Pressable>
    </View>
  );
}

// Placeholder for wallet connection - implement based on your wallet choice
async function connectWallet() {
  // Return wallet object with publicKey and sendTransaction methods
  throw new Error('Implement wallet connection');
}
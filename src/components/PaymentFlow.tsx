import React from 'react';
import { View, Button, Alert } from 'react-native';
import { useWallet } from '@solana/wallet-adapter-react-native';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';

const connection = new Connection('https://api.devnet.solana.com');
const USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';

interface PaymentProps {
  caregiverAddress: string;
  tokenType: 'SOL' | 'USDC';
  amountSol?: number;
  amountUsdc?: number;
  bookingId: string;
  onSuccess: (signature: string) => void;
}

export function PayCaregiver({ caregiverAddress, tokenType, amountSol, amountUsdc, bookingId, onSuccess }: PaymentProps) {
  const { publicKey, sendTransaction, connected, connect } = useWallet();

  const paySOL = async () => {
    if (!publicKey || !amountSol) return;
    
    const toPubkey = new PublicKey(caregiverAddress);
    const tx = new Transaction().add(SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey,
      lamports: Math.round(amountSol * LAMPORTS_PER_SOL),
    }));
    
    return await sendTransaction(tx, connection);
  };

  const payUSDC = async () => {
    if (!publicKey || !amountUsdc) return;
    
    const mint = new PublicKey(USDC_MINT);
    const fromAta = await getAssociatedTokenAddress(mint, publicKey);
    const toAta = await getAssociatedTokenAddress(mint, new PublicKey(caregiverAddress));
    const amount = Math.round(amountUsdc * 1e6);
    
    const ix = createTransferInstruction(fromAta, toAta, publicKey, amount);
    const tx = new Transaction().add(ix);
    return await sendTransaction(tx, connection);
  };

  const handlePay = async () => {
    try {
      if (!connected) await connect();
      
      const signature = tokenType === 'SOL' ? await paySOL() : await payUSDC();
      if (!signature) throw new Error('Payment failed');
      
      // Send to backend for verification
      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature,
          bookingId,
          expected: {
            amount: tokenType === 'SOL' ? amountSol : amountUsdc,
            token: tokenType,
            caregiver: caregiverAddress,
            payer: publicKey?.toString()
          }
        })
      });
      
      const result = await response.json();
      if (result.status === 'confirmed') {
        onSuccess(signature);
        Alert.alert('Success', 'Payment confirmed!');
      } else {
        throw new Error(result.error || 'Verification failed');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Button 
        title={`Pay ${tokenType === 'SOL' ? amountSol : amountUsdc} ${tokenType}`}
        onPress={handlePay}
      />
    </View>
  );
}
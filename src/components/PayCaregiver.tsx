// Week 4: Payment Component
import React from 'react';
import { Button } from 'react-native';
import { useWallet } from '@solana/wallet-adapter-react-native';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');

export function PayCaregiver({ caregiverAddress, tokenType, amountSol, bookingId }: any) {
    const { publicKey, sendTransaction, connected, connect } = useWallet();
    
    const paySOL = async () => {
        const toPubkey = new PublicKey(caregiverAddress);
        const tx = new Transaction().add(SystemProgram.transfer({
            fromPubkey: publicKey!,
            toPubkey,
            lamports: Math.round(amountSol * LAMPORTS_PER_SOL),
        }));
        const sig = await sendTransaction(tx, connection);
        return sig;
    };
    
    const onPay = async () => {
        if (!connected) await connect();
        const signature = await paySOL();
        
        // Send to backend for verification
        await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                signature,
                bookingId,
                expected: {
                    amount: amountSol,
                    token: 'SOL',
                    caregiver: caregiverAddress,
                    payer: publicKey?.toString()
                }
            })
        });
    };
    
    return <Button title="Pay caregiver" onPress={onPay} />;
}
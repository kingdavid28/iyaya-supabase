import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react-native';
import { Connection } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');

export function useWalletConnection() {
  const { publicKey, connected, connect, disconnect } = useWallet();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const getBalance = async () => {
    if (!publicKey) return;
    
    try {
      const lamports = await connection.getBalance(publicKey);
      setBalance(lamports / 1e9); // Convert to SOL
    } catch (error) {
      console.error('Failed to get balance:', error);
    }
  };

  const connectWallet = async () => {
    setLoading(true);
    try {
      await connect();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connected && publicKey) {
      getBalance();
    }
  }, [connected, publicKey]);

  return {
    publicKey,
    connected,
    balance,
    loading,
    connect: connectWallet,
    disconnect,
    refreshBalance: getBalance
  };
}
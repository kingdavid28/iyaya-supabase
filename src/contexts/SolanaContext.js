import React, { createContext, useContext, useState, useEffect } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

const SolanaContext = createContext();

export const useSolana = () => {
  const context = useContext(SolanaContext);
  if (!context) {
    throw new Error('useSolana must be used within SolanaProvider');
  }
  return context;
};

export const SolanaProvider = ({ children }) => {
  const [connection, setConnection] = useState(null);
  const [network, setNetwork] = useState('devnet');

  useEffect(() => {
    const rpcUrl = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network);
    setConnection(new Connection(rpcUrl, 'confirmed'));
  }, [network]);

  const validateAddress = (address) => {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  };

  const value = {
    connection,
    network,
    setNetwork,
    validateAddress,
  };

  return (
    <SolanaContext.Provider value={value}>
      {children}
    </SolanaContext.Provider>
  );
};
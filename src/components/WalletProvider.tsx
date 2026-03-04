import React from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react-native';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

const network = WalletAdapterNetwork.Devnet;
const endpoint = 'https://api.devnet.solana.com';

export function WalletProviderWrapper({ children }) {
    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={[]} autoConnect>
                {children}
            </WalletProvider>
        </ConnectionProvider>
    );
}
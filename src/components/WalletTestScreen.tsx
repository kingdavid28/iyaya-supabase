import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useWalletConnection } from '../hooks/useWalletConnection';

export function WalletTestScreen() {
  const { publicKey, connected, balance, loading, connect, disconnect } = useWalletConnection();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wallet Test</Text>
      
      <View style={styles.status}>
        <Text>Status: {connected ? '✅ Connected' : '❌ Disconnected'}</Text>
        {publicKey && <Text>Address: {publicKey.toString().slice(0, 20)}...</Text>}
        {connected && <Text>Balance: {balance.toFixed(4)} SOL</Text>}
      </View>

      <View style={styles.buttons}>
        {!connected ? (
          <Button 
            title={loading ? "Connecting..." : "Connect Wallet"} 
            onPress={connect}
            disabled={loading}
          />
        ) : (
          <Button title="Disconnect" onPress={disconnect} />
        )}
      </View>

      {connected && (
        <View style={styles.testPayment}>
          <Text style={styles.subtitle}>Ready for Payment Testing</Text>
          <Text>• Wallet connected ✅</Text>
          <Text>• Balance available ✅</Text>
          <Text>• Ready to send SOL/USDC ✅</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  status: { backgroundColor: '#f5f5f5', padding: 15, borderRadius: 8, marginBottom: 20 },
  buttons: { marginBottom: 20 },
  testPayment: { backgroundColor: '#e8f5e8', padding: 15, borderRadius: 8 },
  subtitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 }
});
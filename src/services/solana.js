import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { supabaseService } from './supabase';
import 'react-native-get-random-values';

const DEVNET_ENDPOINT = 'https://api.devnet.solana.com';
const USDC_MINT_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';

class SolanaService {

  constructor() {
    this.connection = new Connection(DEVNET_ENDPOINT);
  }

  async verifyTransaction(signature, expected) {
    // Demo mode - simulate verification
    console.log('Demo: Verifying transaction', signature);
    return { valid: true, signature };
  }

  async recordTransaction(data) {
    // Demo mode - simulate recording
    console.log('Demo: Recording transaction', data);
    return { success: true, id: 'mock_record_' + Date.now() };
  }

  validateAddress(address) {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }
}

export const solanaService = new SolanaService();
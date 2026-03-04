import { supabase } from '../config/supabase';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';

class SolanaPaymentService {
  constructor() {
    this.connection = new Connection(
      process.env.EXPO_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );
    this.usdcMint = new PublicKey(
      process.env.EXPO_PUBLIC_USDC_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
    );
  }

  // Create payment intent
  async createPaymentIntent(bookingId, token, amount, caregiverAddress) {
    const { data, error } = await supabase
      .from('payment_intents')
      .insert({
        booking_id: bookingId,
        token,
        amount,
        caregiver_address: caregiverAddress,
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Build SOL transfer transaction
  async buildSOLTransfer(fromPubkey, toPubkey, amount) {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: Math.round(amount * LAMPORTS_PER_SOL),
      })
    );
    
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;
    
    return transaction;
  }

  // Build USDC transfer transaction
  async buildUSDCTransfer(fromPubkey, toPubkey, amount) {
    const fromAta = await getAssociatedTokenAddress(this.usdcMint, fromPubkey);
    const toAta = await getAssociatedTokenAddress(this.usdcMint, toPubkey);
    const transferAmount = Math.round(amount * 10 ** 6); // USDC decimals

    const transaction = new Transaction().add(
      createTransferInstruction(fromAta, toAta, fromPubkey, transferAmount)
    );

    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    return transaction;
  }

  // Verify transaction on-chain
  async verifyTransaction(signature, expectedAmount, expectedToken, expectedCaregiver) {
    try {
      const tx = await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0
      });

      if (!tx || tx.meta?.err) return false;

      // Basic validation - implement proper parsing based on token type
      return tx.meta.err === null;
    } catch (error) {
      console.error('Transaction verification failed:', error);
      return false;
    }
  }

  // Record payment in ledger
  async recordPayment(intentId, signature, status = 'confirmed') {
    const { error } = await supabase
      .from('transaction_ledger')
      .insert({
        payment_intent_id: intentId,
        signature,
        status,
        confirmed_at: status === 'confirmed' ? new Date() : null
      });

    if (error) throw error;

    // Update booking status if confirmed
    if (status === 'confirmed') {
      await this.updateBookingStatus(intentId);
    }
  }

  // Update booking status after payment
  async updateBookingStatus(intentId) {
    const { data: intent } = await supabase
      .from('payment_intents')
      .select('booking_id')
      .eq('id', intentId)
      .single();

    if (intent) {
      await supabase
        .from('booking')
        .update({ status: 'paid' })
        .eq('id', intent.booking_id);
    }
  }
}

export default new SolanaPaymentService();
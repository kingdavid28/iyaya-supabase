import { Connection, PublicKey } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';

const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com');
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function verifyTransaction(signature: string, bookingId: string, expected: {
  amount: number;
  token: 'SOL' | 'USDC';
  caregiver: string;
  payer: string;
}) {
  try {
    const tx = await connection.getTransaction(signature, { maxSupportedTransactionVersion: 0 });
    if (!tx) throw new Error('Transaction not found');

    // Basic validation - implement robust parser based on token type
    const isValid = validateTransactionData(tx, expected);
    if (!isValid) throw new Error('Transaction validation failed');

    // Store in ledger
    const { error } = await supabase.from('transaction_ledger').insert({
      booking_id: bookingId,
      signature,
      token: expected.token,
      amount_lamports: expected.token === 'SOL' ? expected.amount * 1e9 : null,
      amount_spl: expected.token === 'USDC' ? expected.amount * 1e6 : null,
      payer_address: expected.payer,
      caregiver_address: expected.caregiver,
      status: 'confirmed',
      confirmed_at: new Date().toISOString()
    });

    if (error) throw error;

    // Award points on successful payment
    await awardCompletionPoints(bookingId);

    return { status: 'confirmed' };
  } catch (error) {
    console.error('Transaction verification failed:', error);
    return { status: 'failed', error: error.message };
  }
}

function validateTransactionData(tx: any, expected: any): boolean {
  // Implement proper SOL/USDC transfer validation
  // This is a simplified version - add robust parsing
  return true;
}

async function awardCompletionPoints(bookingId: string) {
  const { data: booking } = await supabase
    .from('booking')
    .select('caregiver_id')
    .eq('id', bookingId)
    .single();

  if (booking) {
    await supabase.from('caregiver_points_ledger').insert({
      caregiver_id: booking.caregiver_id,
      booking_id: bookingId,
      metric: 'completion',
      delta: 10,
      reason: 'Payment confirmed'
    });
  }
}
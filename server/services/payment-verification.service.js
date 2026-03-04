const { Connection, clusterApiUrl, PublicKey } = require('@solana/web3.js');
const { createClient } = require('@supabase/supabase-js');

// Initialize Solana connection
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'devnet';
const connection = new Connection(clusterApiUrl(SOLANA_NETWORK), 'confirmed');

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Verify a Solana transaction on the blockchain
 * @param {string} signature - Transaction signature
 * @returns {Promise<Object>} Transaction details
 */
async function verifySolanaTransaction(signature) {
  try {
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });

    if (!transaction) {
      return { valid: false, error: 'Transaction not found on blockchain' };
    }

    if (!transaction.meta || transaction.meta.err) {
      return {
        valid: false,
        error: 'Transaction failed or not confirmed',
        meta: transaction.meta
      };
    }

    return {
      valid: true,
      signature,
      blockTime: transaction.blockTime,
      slot: transaction.slot,
      fee: transaction.meta.fee,
      sender: transaction.transaction.message.accountKeys[0]?.toString(),
      recipient: transaction.transaction.message.accountKeys[1]?.toString(),
      preBalance: transaction.meta.preBalances[0],
      postBalance: transaction.meta.postBalances[0],
      amount: transaction.meta.preBalances[0] - transaction.meta.postBalances[0] - transaction.meta.fee
    };
  } catch (error) {
    console.error('Solana verification error:', error);
    return { valid: false, error: error.message };
  }
}

/**
 * Validate transaction matches expected payment details
 */
function validateTransaction(tx, expected) {
  const errors = [];

  if (expected.caregiverAddress && tx.recipient !== expected.caregiverAddress) {
    errors.push(`Recipient mismatch: expected ${expected.caregiverAddress}, got ${tx.recipient}`);
  }

  if (expected.amount) {
    const expectedLamports = expected.amount * 1000000000;
    const minAcceptable = expectedLamports * 0.95;
    if (tx.amount < minAcceptable) {
      errors.push(`Amount too low: expected ~${expected.amount} SOL, got ${tx.amount / 1000000000} SOL`);
    }
  }

  if (tx.blockTime) {
    const txTime = new Date(tx.blockTime * 1000);
    const maxAge = 24 * 60 * 60 * 1000;
    if (Date.now() - txTime.getTime() > maxAge) {
      errors.push('Transaction is too old (> 24 hours)');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Record verified payment in transaction ledger
 */
async function recordPayment(intentId, signature, status = 'confirmed', details = {}) {
  try {
    const { error } = await supabase
      .from('transaction_ledger')
      .insert({
        payment_intent_id: intentId,
        signature,
        status,
        token: details.token || 'SOL',
        amount_lamports: details.amount,
        payer_address: details.sender,
        caregiver_address: details.recipient,
        confirmed_at: new Date().toISOString()
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to record payment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update booking status after payment
 */
async function updateBookingStatus(bookingId, status = 'paid') {
  try {
    const { error } = await supabase
      .from('booking')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to update booking:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Main verify transaction function
 */
async function verifyTransaction(signature, bookingId, expected = {}) {
  console.log('🔍 Verifying transaction:', { signature: signature?.substring(0, 16) + '...', bookingId });

  if (!signature || !bookingId) {
    throw new Error('Missing signature or bookingId');
  }

  const cleanSignature = signature.trim();

  // Get payment intent
  const { data: intent, error: intentError } = await supabase
    .from('payment_intents')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('status', 'pending')
    .single();

  if (intentError || !intent) {
    throw new Error('Payment intent not found or already processed');
  }

  // Verify on blockchain
  const txDetails = await verifySolanaTransaction(cleanSignature);

  if (!txDetails.valid) {
    throw new Error(`Blockchain verification failed: ${txDetails.error}`);
  }

  // Validate against expected values
  const validation = validateTransaction(txDetails, {
    caregiverAddress: expected.caregiverAddress || intent.caregiver_address,
    amount: expected.amount || intent.amount
  });

  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  // Record in ledger
  await recordPayment(intent.id, cleanSignature, 'confirmed', txDetails);

  // Update payment intent
  await supabase
    .from('payment_intents')
    .update({ status: 'completed', signature: cleanSignature, completed_at: new Date().toISOString() })
    .eq('id', intent.id);

  // Update booking status
  await updateBookingStatus(bookingId, 'paid');

  // Update contract status if exists
  await supabase
    .from('job_contracts')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('booking_id', bookingId);

  console.log('✅ Payment verified and recorded:', { bookingId, signature: cleanSignature.substring(0, 16) + '...' });

  return {
    success: true,
    status: 'confirmed',
    signature: cleanSignature,
    bookingId,
    transaction: {
      sender: txDetails.sender,
      recipient: txDetails.recipient,
      amount: txDetails.amount / 1000000000,
      fee: txDetails.fee / 1000000000,
      blockTime: txDetails.blockTime
    }
  };
}

module.exports = { verifyTransaction, verifySolanaTransaction, validateTransaction };

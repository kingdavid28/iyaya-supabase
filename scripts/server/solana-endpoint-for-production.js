// Add this to your production backend: https://iyaya-backend.vercel.app
// File: routes/solanaRoutes.js (or similar)

const express = require('express');
const router = express.Router();
const { Connection, PublicKey, clusterApiUrl } = require('@solana/web3.js');

// Initialize Solana connection (mainnet-beta, devnet, or testnet)
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'devnet';
const connection = new Connection(clusterApiUrl(SOLANA_NETWORK), 'confirmed');

/**
 * Verify a Solana transaction signature on the blockchain
 * @param {string} signature - Transaction signature
 * @returns {Promise<Object>} Transaction details
 */
async function verifySolanaTransaction(signature) {
  try {
    // Get transaction details from blockchain
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });

    if (!transaction) {
      return { valid: false, error: 'Transaction not found on blockchain' };
    }

    // Check if transaction is confirmed
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

  // Check recipient matches caregiver address
  if (expected.caregiverAddress && tx.recipient !== expected.caregiverAddress) {
    errors.push(`Recipient mismatch: expected ${expected.caregiverAddress}, got ${tx.recipient}`);
  }

  // Check minimum amount (allowing for small variance due to fees)
  if (expected.amount) {
    const expectedLamports = expected.amount * 1000000000; // Convert SOL to lamports
    const minAcceptable = expectedLamports * 0.95; // Allow 5% variance
    if (tx.amount < minAcceptable) {
      errors.push(`Amount too low: expected ~${expected.amount} SOL, got ${tx.amount / 1000000000} SOL`);
    }
  }

  // Check transaction is not too old (e.g., within last 24 hours)
  if (tx.blockTime) {
    const txTime = new Date(tx.blockTime * 1000);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - txTime.getTime() > maxAge) {
      errors.push('Transaction is too old (> 24 hours)');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// POST /api/solana/verify - Solana Payment Verification
router.post('/verify', async (req, res) => {
  try {
    const { signature, bookingId, expected } = req.body;

    console.log('🔍 Solana payment verification:', { 
      signature: signature?.substring(0, 16) + '...', 
      bookingId,
      network: SOLANA_NETWORK 
    });

    // Validate required fields
    if (!signature || !bookingId) {
      return res.status(400).json({
        success: false,
        error: 'Missing signature or bookingId'
      });
    }

    // Clean signature (remove any whitespace)
    const cleanSignature = signature.trim();

    // Verify on blockchain
    const txDetails = await verifySolanaTransaction(cleanSignature);

    if (!txDetails.valid) {
      return res.status(400).json({
        success: false,
        error: 'Blockchain verification failed',
        details: txDetails.error,
        network: SOLANA_NETWORK
      });
    }

    // Validate against expected values if provided
    if (expected) {
      const validation = validateTransaction(txDetails, expected);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Transaction validation failed',
          details: validation.errors,
          transaction: {
            signature: cleanSignature,
            sender: txDetails.sender,
            recipient: txDetails.recipient,
            amount: txDetails.amount / 1000000000, // Convert to SOL
            fee: txDetails.fee / 1000000000,
            blockTime: txDetails.blockTime
          }
        });
      }
    }

    // Log successful verification
    console.log('✅ Solana payment verified:', {
      signature: cleanSignature.substring(0, 16) + '...',
      bookingId,
      amount: txDetails.amount / 1000000000,
      fee: txDetails.fee / 1000000000,
      sender: txDetails.sender?.substring(0, 8) + '...',
      recipient: txDetails.recipient?.substring(0, 8) + '...'
    });

    res.json({
      success: true,
      status: 'confirmed',
      signature: cleanSignature,
      bookingId,
      network: SOLANA_NETWORK,
      transaction: {
        sender: txDetails.sender,
        recipient: txDetails.recipient,
        amount: txDetails.amount / 1000000000, // SOL
        fee: txDetails.fee / 1000000000,
        blockTime: txDetails.blockTime,
        slot: txDetails.slot
      },
      message: 'Solana payment verified successfully'
    });

  } catch (error) {
    console.error('❌ Solana payment verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Payment verification failed',
      details: error.message,
      network: SOLANA_NETWORK
    });
  }
});

// GET /api/solana/status - Check Solana network status
router.get('/status', async (req, res) => {
  try {
    const slot = await connection.getSlot();
    const blockTime = await connection.getBlockTime(slot);
    
    res.json({
      success: true,
      network: SOLANA_NETWORK,
      currentSlot: slot,
      blockTime: blockTime ? new Date(blockTime * 1000).toISOString() : null,
      healthy: true
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Unable to connect to Solana network',
      details: error.message
    });
  }
});

module.exports = router;

// Add to your main app.js:
// app.use('/api/solana', require('./routes/solanaRoutes'));
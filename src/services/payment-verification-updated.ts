import { Connection, PublicKey } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';
import { awardPoints } from './points-engine';

const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com');
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function verifyPayment(signature: string, bookingId: string) {
    try {
        // Verify transaction exists on blockchain
        const tx = await connection.getTransaction(signature, { maxSupportedTransactionVersion: 0 });
        if (!tx) throw new Error('Transaction not found');

        // Update transaction ledger
        const { error: ledgerError } = await supabase
            .from('transaction_ledger')
            .insert({
                booking_id: bookingId,
                signature,
                status: 'confirmed',
                confirmed_at: new Date().toISOString()
            });

        if (ledgerError) throw ledgerError;

        // Update booking status
        const { error: bookingError } = await supabase
            .from('booking')
            .update({ status: 'completed' })
            .eq('id', bookingId);

        if (bookingError) throw bookingError;

        // Award completion points automatically
        const { data: booking } = await supabase
            .from('booking')
            .select('caregiver_id')
            .eq('id', bookingId)
            .single();

        if (booking?.caregiver_id) {
            await awardPoints(booking.caregiver_id, 4, bookingId); // Default 4-star for completion
        }

        return { 
            status: 'confirmed',
            bookingId,
            signature 
        };

    } catch (error) {
        console.error('Payment verification failed:', error);
        
        // Mark as failed
        await supabase
            .from('transaction_ledger')
            .insert({
                booking_id: bookingId,
                signature,
                status: 'failed'
            });

        return { 
            status: 'failed', 
            error: error.message 
        };
    }
}
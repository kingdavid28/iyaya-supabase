// Week 2-3: Payment Verification with Points Integration
import { Connection } from '@solana/web3.js';
import { supabase } from './supabase';
import { awardPoints } from './points-engine';

const connection = new Connection(process.env.SOLANA_RPC_URL!);

export async function verifyPayment(req: any, res: any) {
    const { signature, bookingId, expected } = req.body;
    
    try {
        const tx = await connection.getTransaction(signature, { 
            maxSupportedTransactionVersion: 0 
        });
        
        if (!tx) return res.status(404).json({ error: 'Not found' });
        
        const isValid = validateTransaction(tx, expected);
        if (!isValid) return res.status(400).json({ error: 'Mismatch' });
        
        await supabase.from('transaction_ledger').insert({
            booking_id: bookingId,
            signature,
            token: expected.token,
            amount_lamports: expected.token === 'SOL' ? expected.amount : null,
            amount_spl: expected.token === 'USDC' ? expected.amount : null,
            payer_address: expected.payer,
            caregiver_address: expected.caregiver,
            status: 'confirmed',
            confirmed_at: new Date().toISOString()
        });
        
        await supabase.from('booking').update({ status: 'completed' }).eq('id', bookingId);
        
        // Award points after payment confirmation
        await awardCompletionPoints(bookingId);
        
        res.json({ status: 'confirmed' });
    } catch (error) {
        res.status(500).json({ error: 'Verification failed' });
    }
}

async function awardCompletionPoints(bookingId: string) {
    const { data: booking } = await supabase
        .from('booking')
        .select('caregiver_id')
        .eq('id', bookingId)
        .single();
    
    if (booking?.caregiver_id) {
        await awardPoints(booking.caregiver_id, 4, bookingId);
    }
}

function validateTransaction(tx: any, expected: any): boolean {
    // Implement SOL/USDC parsing
    return true;
}
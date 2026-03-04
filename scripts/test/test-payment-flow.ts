import { verifyPayment } from './services/payment-verification-updated';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function testPaymentToPoints() {
    console.log('🧪 Testing Payment → Points Flow...');
    
    const testSignature = 'test-signature-' + Date.now();
    const testBookingId = 'test-booking-' + Date.now();
    const testCaregiverId = 'test-caregiver-' + Date.now();
    
    try {
        // Setup: Create test booking
        console.log('Setup: Creating test booking...');
        await supabase.from('booking').insert({
            id: testBookingId,
            caregiver_id: testCaregiverId,
            customer_id: 'test-customer',
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 3600000).toISOString(),
            status: 'confirmed',
            amount_usd: 50.00,
            token: 'SOL'
        });

        // Setup: Create test caregiver
        await supabase.from('caregiver').insert({
            id: testCaregiverId,
            display_name: 'Test Caregiver',
            payout_address: 'test-address',
            payout_token: 'SOL'
        });

        console.log('✅ Test data created');

        // Test: Verify payment (this will award points automatically)
        console.log('Test: Verifying payment...');
        const result = await verifyPayment(testSignature, testBookingId);
        console.log('✅ Payment result:', result);

        // Verify: Check booking status changed
        const { data: booking } = await supabase
            .from('booking')
            .select('status')
            .eq('id', testBookingId)
            .single();
        
        console.log('✅ Booking status:', booking?.status);

        // Verify: Check points were awarded
        const { data: points } = await supabase
            .from('caregiver_points_ledger')
            .select('*')
            .eq('caregiver_id', testCaregiverId);
        
        console.log('✅ Points awarded:', points);

        // Verify: Check tier calculation
        const { data: caregiver } = await supabase
            .from('caregiver')
            .select('tier')
            .eq('id', testCaregiverId)
            .single();
        
        console.log('✅ Caregiver tier:', caregiver?.tier);

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run test
testPaymentToPoints();
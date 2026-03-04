import { awardPoints } from './services/points-engine';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function testPointsSystem() {
    console.log('🧪 Testing Points System...');
    
    // Test data
    const testCaregiverId = 'test-caregiver-123';
    const testBookingId = 'test-booking-456';
    
    try {
        // Test 1: Award points for 5-star rating
        console.log('Test 1: Award 10 points for 5-star rating');
        const result1 = await awardPoints(testCaregiverId, 5, testBookingId);
        console.log('✅ Result:', result1);
        
        // Test 2: Award points for 3-star rating
        console.log('Test 2: Award 5 points for 3-star rating');
        const result2 = await awardPoints(testCaregiverId, 3, testBookingId);
        console.log('✅ Result:', result2);
        
        // Test 3: Check points history
        console.log('Test 3: Check points history');
        const { data: history } = await supabase
            .from('caregiver_points_ledger')
            .select('*')
            .eq('caregiver_id', testCaregiverId)
            .order('created_at', { ascending: false });
        
        console.log('✅ Points History:', history);
        
        // Test 4: Verify tier calculation
        console.log('Test 4: Check current tier');
        const { data: caregiver } = await supabase
            .from('caregiver')
            .select('tier')
            .eq('id', testCaregiverId)
            .single();
        
        console.log('✅ Current Tier:', caregiver?.tier);
        
        // Test 5: Check points summary
        console.log('Test 5: Check points summary');
        const { data: summary } = await supabase
            .from('caregiver_points_summary')
            .select('*')
            .eq('caregiver_id', testCaregiverId)
            .single();
        
        console.log('✅ Points Summary:', summary);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run tests
testPointsSystem();
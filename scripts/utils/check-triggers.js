#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Get Supabase credentials
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials. Please check your .env file.');
    process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTriggers() {
    try {
        console.log('🔍 Checking database triggers and functions...');

        // The triggers mentioned in your table definition might be calling functions that don't exist
        // Let's check what happens when we try to create a user directly in auth.users

        console.log('\n1️⃣ Testing direct auth signup without profile creation...');

        const testEmail = `trigger-test-${Date.now()}@example.com`;
        const testPassword = 'TestPassword123!';

        // Try signup with minimal metadata
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword
            // No user metadata to avoid triggering profile creation
        });

        if (signupError) {
            console.error('❌ Even basic signup failed:', signupError.message);
            console.log('');
            console.log('🔧 This suggests the issue is with database triggers or functions.');
            console.log('   The triggers mentioned in your table might be calling functions that don\'t exist:');
            console.log('   - handle_user_update()');
            console.log('   - update_updated_at_column()');
            console.log('');
            console.log('💡 Solution: Create the missing functions or disable the problematic triggers.');
            console.log('   Run this SQL in Supabase Dashboard to check and fix:');
            console.log('');
            console.log(`-- Check what triggers exist on the users table
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'users';

-- Check what functions are missing
SELECT proname FROM pg_proc WHERE proname IN ('handle_user_update', 'update_updated_at_column');

-- If functions are missing, either create them or drop the triggers:
-- DROP TRIGGER IF EXISTS on_user_updated ON users;
-- DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
-- DROP TRIGGER IF EXISTS update_users_updated_at ON users;`);

        } else {
            console.log('✅ Basic signup worked!');
            console.log(`📧 User: ${signupData.user?.email}`);

            // Check if a profile was automatically created
            const { data: autoProfile, error: autoError } = await supabase
                .from('users')
                .select('*')
                .eq('id', signupData.user.id)
                .single();

            if (autoError) {
                console.log('ℹ️ No automatic profile created (this is expected)');
            } else {
                console.log('🤖 Automatic profile was created:', autoProfile);
            }
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

checkTriggers();
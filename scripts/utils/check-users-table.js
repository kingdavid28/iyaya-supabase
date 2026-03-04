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

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function checkUsersTable() {
    try {
        console.log('🔄 Checking users table with service role...');

        // Try to query the users table with service role (should bypass RLS)
        const { data, error } = await supabase
            .from('users')
            .select('id, email, role')
            .limit(5);

        if (error) {
            console.error('❌ Error accessing users table:', error.message);
            console.log('');
            console.log('🔧 The table might exist but have RLS issues. Please run this SQL in Supabase Dashboard:');
            console.log('');
            console.log(`-- Enable RLS and create policies for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_select_own_profile" ON users;
DROP POLICY IF EXISTS "users_insert_own_profile" ON users;
DROP POLICY IF EXISTS "users_update_own_profile" ON users;

-- Create RLS policies
CREATE POLICY "users_select_own_profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own_profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own_profile" ON users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Allow service role to bypass RLS for admin operations
CREATE POLICY "service_role_access" ON users
    FOR ALL USING (auth.role() = 'service_role');`);
            return;
        }

        console.log('✅ Users table exists and is accessible!');
        console.log(`📊 Found ${data.length} users in the table`);

        if (data.length > 0) {
            console.log('👥 Sample users:');
            data.forEach(user => {
                console.log(`  - ${user.email} (${user.role})`);
            });
        }

        // Test creating a sample user profile
        console.log('');
        console.log('🧪 Testing user profile creation...');

        const testUserId = '00000000-0000-0000-0000-000000000001'; // Dummy UUID for testing
        const { data: insertData, error: insertError } = await supabase
            .from('users')
            .insert({
                id: testUserId,
                email: 'test@example.com',
                role: 'parent',
                name: 'Test User'
            })
            .select();

        if (insertError) {
            if (insertError.message.includes('duplicate key')) {
                console.log('ℹ️ Test user already exists (this is fine)');
            } else {
                console.error('❌ Error creating test user:', insertError.message);
            }
        } else {
            console.log('✅ Test user created successfully');

            // Clean up test user
            await supabase
                .from('users')
                .delete()
                .eq('id', testUserId);
            console.log('🧹 Test user cleaned up');
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

checkUsersTable();
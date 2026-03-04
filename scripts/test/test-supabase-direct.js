#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Get Supabase credentials
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase configuration...');
console.log(`📍 URL: ${supabaseUrl}`);
console.log(`🔑 Anon Key: ${supabaseAnonKey?.substring(0, 20)}...`);

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials. Please check your .env file.');
    process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabaseDirectly() {
    try {
        // Test 1: Check if Supabase is reachable
        console.log('\n1️⃣ Testing Supabase connection...');

        const { data: healthCheck, error: healthError } = await supabase.auth.getSession();

        if (healthError) {
            console.error('❌ Supabase connection failed:', healthError.message);
            return;
        }

        console.log('✅ Supabase connection successful');

        // Test 2: Try the most basic signup possible
        console.log('\n2️⃣ Testing absolute minimal signup...');

        const testEmail = `basic-${Date.now()}@test.com`;

        try {
            const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseAnonKey,
                    'Authorization': `Bearer ${supabaseAnonKey}`
                },
                body: JSON.stringify({
                    email: testEmail,
                    password: 'SimplePass123!'
                })
            });

            const result = await response.text();

            console.log(`📊 Response status: ${response.status}`);
            console.log(`📄 Response body: ${result}`);

            if (response.status === 500) {
                console.log('');
                console.log('🔧 500 Error suggests server-side configuration issues:');
                console.log('   1. Database triggers or constraints');
                console.log('   2. Auth hooks that are failing');
                console.log('   3. SMTP configuration issues');
                console.log('   4. Database connection problems');
                console.log('');
                console.log('💡 Next steps:');
                console.log('   - Check Supabase Dashboard > Settings > Database for connection issues');
                console.log('   - Check Auth > Hooks for any failing hooks');
                console.log('   - Check Auth > Settings for SMTP configuration');
            }

        } catch (fetchError) {
            console.error('❌ Direct fetch failed:', fetchError.message);
        }

        // Test 3: Check if we can access other Supabase features
        console.log('\n3️⃣ Testing database access...');

        const { data: dbTest, error: dbError } = await supabase
            .from('users')
            .select('count(*)')
            .limit(1);

        if (dbError) {
            console.error('❌ Database access failed:', dbError.message);
        } else {
            console.log('✅ Database access works');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testSupabaseDirectly();
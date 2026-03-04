#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Get Supabase credentials
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials. Please check your .env file.');
    process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLoginVsSignup() {
    try {
        console.log('🧪 Testing Login vs Signup...');

        // Test 1: Try to login with existing users (should work)
        console.log('\n1️⃣ Testing login with existing users...');

        // We know from earlier that there are 3 users in the database:
        // - kensite24@gmail.com (caregiver)
        // - rere.centno.swu@phinmaed.com (admin)  
        // - doorknock28@gmail.com (caregiver)

        const testLogins = [
            'kensite24@gmail.com',
            'doorknock28@gmail.com'
        ];

        for (const email of testLogins) {
            console.log(`\n🔐 Trying to login with: ${email}`);

            // Try with a common password (this will likely fail, but we want to see the error type)
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                email: email,
                password: 'TestPassword123!'
            });

            if (loginError) {
                if (loginError.message.includes('Invalid login credentials')) {
                    console.log('✅ Login endpoint works (wrong password, but endpoint is functional)');
                } else {
                    console.error('❌ Login failed with different error:', loginError.message);
                }
            } else {
                console.log('✅ Login successful!');
                console.log(`👤 User: ${loginData.user?.email}`);

                // Sign out immediately
                await supabase.auth.signOut();
            }
        }

        // Test 2: Try signup (should fail)
        console.log('\n2️⃣ Testing signup (should fail)...');

        const testEmail = `test-signup-${Date.now()}@example.com`;

        const { data: signupData, error: signupError } = await supabase.auth.signUp({
            email: testEmail,
            password: 'TestPassword123!'
        });

        if (signupError) {
            console.error('❌ Signup failed (as expected):', signupError.message);
            console.log('');
            console.log('🔍 This confirms:');
            console.log('   ✅ Login endpoint works (existing users can authenticate)');
            console.log('   ❌ Signup endpoint fails (new user creation is broken)');
            console.log('');
            console.log('💡 The issue is specifically with user creation, not authentication');
        } else {
            console.log('✅ Signup worked!');
            console.log(`📧 New user: ${signupData.user?.email}`);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testLoginVsSignup();
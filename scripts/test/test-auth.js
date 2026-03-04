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

// Create Supabase client with anon key (same as the app uses)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
    try {
        console.log('🧪 Testing authentication flow...');

        // Test 1: Check if we can access the users table (should fail without auth)
        console.log('\n1️⃣ Testing unauthenticated access to users table...');
        const { data: unauthData, error: unauthError } = await supabase
            .from('users')
            .select('count(*)')
            .limit(1);

        if (unauthError) {
            console.log('✅ Good! Unauthenticated access is blocked (RLS working)');
        } else {
            console.log('⚠️ Warning: Unauthenticated access allowed - check RLS policies');
        }

        // Test 2: Try to sign up a test user
        console.log('\n2️⃣ Testing user signup...');
        const testEmail = `test-${Date.now()}@example.com`;
        const testPassword = 'TestPassword123!';

        const { data: signupData, error: signupError } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
            options: {
                data: {
                    name: 'Test User',
                    role: 'parent',
                    first_name: 'Test',
                    last_name: 'User'
                }
            }
        });

        if (signupError) {
            console.error('❌ Signup failed:', signupError.message);
            return;
        }

        console.log('✅ Signup successful!');
        console.log(`📧 User created: ${signupData.user?.email}`);
        console.log(`🔑 User ID: ${signupData.user?.id}`);

        // Test 3: Try to create user profile
        if (signupData.user) {
            console.log('\n3️⃣ Testing user profile creation...');

            const { data: profileData, error: profileError } = await supabase
                .from('users')
                .insert({
                    id: signupData.user.id,
                    email: signupData.user.email,
                    role: 'parent',
                    name: 'Test User',
                    first_name: 'Test',
                    last_name: 'User',
                    auth_provider: 'supabase'
                })
                .select();

            if (profileError) {
                console.error('❌ Profile creation failed:', profileError.message);
            } else {
                console.log('✅ Profile created successfully!');
                console.log('👤 Profile data:', profileData[0]);
            }
        }

        // Test 4: Try to sign in with the test user
        console.log('\n4️⃣ Testing user signin...');

        const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword
        });

        if (signinError) {
            console.error('❌ Signin failed:', signinError.message);
        } else {
            console.log('✅ Signin successful!');
            console.log(`👋 Welcome back: ${signinData.user?.email}`);

            // Test 5: Try to fetch user profile after signin
            console.log('\n5️⃣ Testing profile fetch after signin...');

            const { data: fetchedProfile, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('id', signinData.user.id)
                .single();

            if (fetchError) {
                console.error('❌ Profile fetch failed:', fetchError.message);
            } else {
                console.log('✅ Profile fetched successfully!');
                console.log(`👤 User role: ${fetchedProfile.role}`);
                console.log(`📧 User email: ${fetchedProfile.email}`);
            }
        }

        // Cleanup: Sign out
        console.log('\n🧹 Cleaning up...');
        await supabase.auth.signOut();
        console.log('✅ Signed out successfully');

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

testAuth();
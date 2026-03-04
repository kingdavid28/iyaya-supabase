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

async function testRealisticSignup() {
    try {
        console.log('🧪 Testing realistic signup flow...');

        const testEmail = `realistic-test-${Date.now()}@example.com`;
        const testPassword = 'TestPassword123!';

        // Step 1: Sign up the user
        console.log('\n1️⃣ Signing up user...');
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
            options: {
                data: {
                    name: 'Realistic Test User',
                    role: 'parent',
                    first_name: 'Realistic',
                    last_name: 'User'
                }
            }
        });

        if (signupError) {
            console.error('❌ Signup failed:', signupError.message);
            return;
        }

        console.log('✅ Signup successful!');
        console.log(`📧 User: ${signupData.user?.email}`);
        console.log(`🔑 ID: ${signupData.user?.id}`);
        console.log(`📋 Metadata:`, signupData.user?.user_metadata);

        // Step 2: Check if we have a session
        console.log('\n2️⃣ Checking session...');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            console.error('❌ Session error:', sessionError.message);
        } else if (sessionData.session) {
            console.log('✅ Session established');
            console.log(`👤 Session user: ${sessionData.session.user.email}`);
        } else {
            console.log('⚠️ No session (email verification might be required)');
        }

        // Step 3: Try to create profile (this is what AuthContext does)
        console.log('\n3️⃣ Creating user profile...');

        const profileData = {
            id: signupData.user.id,
            email: signupData.user.email,
            role: 'parent',
            first_name: signupData.user.user_metadata?.first_name || 'Realistic',
            last_name: signupData.user.user_metadata?.last_name || 'User',
            name: signupData.user.user_metadata?.name || 'Realistic Test User',
            auth_provider: signupData.user.app_metadata?.provider || 'supabase'
        };

        console.log('📝 Profile data:', profileData);

        const { data: profileResult, error: profileError } = await supabase
            .from('users')
            .upsert(profileData, { onConflict: 'id' })
            .select()
            .single();

        if (profileError) {
            console.error('❌ Profile creation failed:', profileError);
            console.log('');

            // Check what the current auth state is
            const { data: currentUser } = await supabase.auth.getUser();
            console.log('🔍 Current auth user:', currentUser.user?.email || 'None');

            if (profileError.message.includes('RLS') || profileError.message.includes('policy')) {
                console.log('💡 This is likely an RLS policy issue.');
                console.log('   The user might not be properly authenticated when trying to create the profile.');
                console.log('');
                console.log('🔧 Suggested fix: Update RLS policy to allow profile creation during signup');
                console.log('   Run this SQL in Supabase Dashboard:');
                console.log('');
                console.log(`-- Allow users to create their own profile during signup
DROP POLICY IF EXISTS "users_insert_own_profile" ON users;
CREATE POLICY "users_insert_own_profile" ON users
    FOR INSERT WITH CHECK (
        auth.uid() = id OR 
        auth.email() = email
    );`);
            }
        } else {
            console.log('✅ Profile created successfully!');
            console.log('👤 Profile:', profileResult);
        }

        // Step 4: Test signin
        console.log('\n4️⃣ Testing signin...');

        // First sign out
        await supabase.auth.signOut();

        const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword
        });

        if (signinError) {
            console.error('❌ Signin failed:', signinError.message);

            if (signinError.message.includes('email not confirmed')) {
                console.log('💡 Email verification is required. This is normal for new signups.');
            }
        } else {
            console.log('✅ Signin successful!');

            // Try to fetch profile after signin
            const { data: fetchedProfile, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('id', signinData.user.id)
                .single();

            if (fetchError) {
                console.error('❌ Profile fetch failed:', fetchError.message);
            } else {
                console.log('✅ Profile fetched after signin!');
                console.log(`👤 Role: ${fetchedProfile.role}`);
            }
        }

        console.log('\n🧹 Test completed');

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

testRealisticSignup();
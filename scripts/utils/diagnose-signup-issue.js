#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Get Supabase credentials
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    console.error('❌ Missing Supabase credentials. Please check your .env file.');
    process.exit(1);
}

// Create both clients
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function diagnoseSignupIssue() {
    try {
        console.log('🔍 Diagnosing signup issue...');

        // Step 1: Check if triggers are really gone
        console.log('\n1️⃣ Checking triggers on users table...');
        const { data: triggers, error: triggerError } = await supabaseAdmin
            .rpc('exec_sql', {
                sql: `SELECT trigger_name, event_manipulation, action_statement 
              FROM information_schema.triggers 
              WHERE event_object_table = 'users';`
            });

        if (triggerError) {
            // Try alternative approach
            console.log('⚠️ Cannot check triggers via RPC, trying direct query...');
        } else {
            console.log('📋 Triggers found:', triggers);
        }

        // Step 2: Check if there are any other constraints or issues
        console.log('\n2️⃣ Checking users table structure...');
        const { data: tableInfo, error: tableError } = await supabaseAdmin
            .from('users')
            .select('id, email, role')
            .limit(1);

        if (tableError) {
            console.error('❌ Cannot access users table:', tableError.message);
        } else {
            console.log('✅ Users table is accessible');
        }

        // Step 3: Try creating a user directly in auth.users (bypassing our users table)
        console.log('\n3️⃣ Testing auth.signUp with minimal data...');

        const testEmail = `minimal-test-${Date.now()}@example.com`;
        const testPassword = 'TestPassword123!';

        // Try with absolutely minimal signup data
        const { data: minimalSignup, error: minimalError } = await supabaseClient.auth.signUp({
            email: testEmail,
            password: testPassword
        });

        if (minimalError) {
            console.error('❌ Even minimal signup failed:', minimalError.message);
            console.log('');
            console.log('🔧 This suggests the issue might be:');
            console.log('   1. Email confirmation is required but not configured');
            console.log('   2. There are still database triggers or constraints');
            console.log('   3. The auth.users table has issues');
            console.log('');
            console.log('💡 Let\'s check Supabase Auth settings...');

            // Check if email confirmation is required
            console.log('   Go to Supabase Dashboard > Authentication > Settings');
            console.log('   Check if "Enable email confirmations" is turned ON');
            console.log('   If it is, that might be causing the issue during development');

        } else {
            console.log('✅ Minimal signup worked!');
            console.log(`📧 User created: ${minimalSignup.user?.email}`);
            console.log(`🔑 User ID: ${minimalSignup.user?.id}`);
            console.log(`📋 Session:`, minimalSignup.session ? 'Yes' : 'No (email confirmation required)');

            // Now try with metadata
            console.log('\n4️⃣ Testing signup with metadata...');

            const testEmail2 = `metadata-test-${Date.now()}@example.com`;

            const { data: metadataSignup, error: metadataError } = await supabaseClient.auth.signUp({
                email: testEmail2,
                password: testPassword,
                options: {
                    data: {
                        name: 'Test User',
                        role: 'parent'
                    }
                }
            });

            if (metadataError) {
                console.error('❌ Signup with metadata failed:', metadataError.message);
                console.log('💡 The issue is with user metadata or profile creation');
            } else {
                console.log('✅ Signup with metadata worked!');
                console.log(`📧 User: ${metadataSignup.user?.email}`);
                console.log(`📋 Metadata:`, metadataSignup.user?.user_metadata);
            }
        }

    } catch (error) {
        console.error('❌ Diagnostic error:', error.message);
    }
}

diagnoseSignupIssue();
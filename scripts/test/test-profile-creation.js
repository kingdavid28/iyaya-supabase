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

async function testProfileCreation() {
    try {
        console.log('🧪 Testing profile creation like AuthContext does...');

        // Simulate what AuthContext does
        const testUserId = '12345678-1234-1234-1234-123456789012'; // Dummy UUID
        const testEmail = 'test-profile@example.com';

        const profileData = {
            id: testUserId,
            email: testEmail,
            role: 'parent',
            first_name: 'Test',
            last_name: 'User',
            name: 'Test User',
            auth_provider: 'supabase',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        console.log('📝 Attempting to insert profile data:', profileData);

        // Try the exact same upsert that AuthContext does
        const { data, error } = await supabase
            .from('users')
            .upsert(profileData, { onConflict: 'id' })
            .select()
            .single();

        if (error) {
            console.error('❌ Profile creation failed:', error);
            console.log('');
            console.log('🔧 This might be due to constraints. Let\'s try a simpler insert:');

            // Try a simpler insert without created_at/updated_at
            const simpleProfileData = {
                id: testUserId,
                email: testEmail,
                role: 'parent',
                name: 'Test User',
                auth_provider: 'supabase'
            };

            const { data: simpleData, error: simpleError } = await supabase
                .from('users')
                .insert(simpleProfileData)
                .select()
                .single();

            if (simpleError) {
                console.error('❌ Simple insert also failed:', simpleError);

                // Check if it's a foreign key constraint issue
                if (simpleError.message.includes('foreign key') || simpleError.message.includes('auth.users')) {
                    console.log('');
                    console.log('🔧 The issue is likely that the users table references auth.users(id)');
                    console.log('   but we\'re trying to insert a UUID that doesn\'t exist in auth.users');
                    console.log('');
                    console.log('💡 Solution: The user profile should only be created AFTER Supabase auth.signUp succeeds');
                    console.log('   and should use the actual user ID from the auth response.');
                }
            } else {
                console.log('✅ Simple insert worked:', simpleData);

                // Clean up
                await supabase.from('users').delete().eq('id', testUserId);
                console.log('🧹 Test data cleaned up');
            }
        } else {
            console.log('✅ Profile creation successful:', data);

            // Clean up
            await supabase.from('users').delete().eq('id', testUserId);
            console.log('🧹 Test data cleaned up');
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

testProfileCreation();
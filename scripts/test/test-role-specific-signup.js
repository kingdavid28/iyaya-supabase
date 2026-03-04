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

// Create Supabase client (same as the app uses)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRoleSpecificSignup() {
    try {
        console.log('🧪 Testing role-specific signup...');

        // Test 1: Try signup with 'caregiver' role (should work like CaregiverAuth)
        console.log('\n1️⃣ Testing signup with caregiver role...');

        const caregiverEmail = `test-caregiver-${Date.now()}@example.com`;
        const testPassword = 'TestPassword123!';

        const { data: caregiverData, error: caregiverError } = await supabase.auth.signUp({
            email: caregiverEmail,
            password: testPassword,
            options: {
                data: {
                    name: 'Test Caregiver',
                    firstName: 'Test',
                    lastName: 'Caregiver',
                    phone: '+1234567890',
                    role: 'caregiver'
                }
            }
        });

        if (caregiverError) {
            console.error('❌ Caregiver signup failed:', caregiverError.message);
        } else {
            console.log('✅ Caregiver signup successful!');
            console.log(`📧 Email: ${caregiverData.user?.email}`);
            console.log(`📋 Metadata:`, caregiverData.user?.user_metadata);
        }

        // Test 2: Try signup with 'parent' role (this should fail like ParentAuth)
        console.log('\n2️⃣ Testing signup with parent role...');

        const parentEmail = `test-parent-${Date.now()}@example.com`;

        const { data: parentData, error: parentError } = await supabase.auth.signUp({
            email: parentEmail,
            password: testPassword,
            options: {
                data: {
                    name: 'Test Parent',
                    firstName: 'Test',
                    lastName: 'Parent',
                    phone: '+1234567890',
                    role: 'parent'
                }
            }
        });

        if (parentError) {
            console.error('❌ Parent signup failed:', parentError.message);
            console.log('');
            console.log('🔍 This confirms the issue is role-specific!');
            console.log('   There might be:');
            console.log('   1. A database trigger that only affects parent role');
            console.log('   2. A constraint or validation that blocks parent signups');
            console.log('   3. An Auth Hook that processes parent roles differently');
        } else {
            console.log('✅ Parent signup successful!');
            console.log(`📧 Email: ${parentData.user?.email}`);
            console.log(`📋 Metadata:`, parentData.user?.user_metadata);
        }

        // Test 3: Try signup without any role metadata
        console.log('\n3️⃣ Testing signup without role metadata...');

        const noRoleEmail = `test-norole-${Date.now()}@example.com`;

        const { data: noRoleData, error: noRoleError } = await supabase.auth.signUp({
            email: noRoleEmail,
            password: testPassword,
            options: {
                data: {
                    name: 'Test User',
                    firstName: 'Test',
                    lastName: 'User'
                }
            }
        });

        if (noRoleError) {
            console.error('❌ No-role signup failed:', noRoleError.message);
        } else {
            console.log('✅ No-role signup successful!');
            console.log(`📧 Email: ${noRoleData.user?.email}`);
        }

        // Test 4: Try signup with admin role
        console.log('\n4️⃣ Testing signup with admin role...');

        const adminEmail = `test-admin-${Date.now()}@example.com`;

        const { data: adminData, error: adminError } = await supabase.auth.signUp({
            email: adminEmail,
            password: testPassword,
            options: {
                data: {
                    name: 'Test Admin',
                    role: 'admin'
                }
            }
        });

        if (adminError) {
            console.error('❌ Admin signup failed:', adminError.message);
        } else {
            console.log('✅ Admin signup successful!');
            console.log(`📧 Email: ${adminData.user?.email}`);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testRoleSpecificSignup();
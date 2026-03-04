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

async function createUsersTable() {
    try {
        console.log('🔄 Checking if users table exists...');

        // First, let's check if the table already exists by trying to query it
        const { data, error } = await supabase
            .from('users')
            .select('count(*)')
            .limit(1);

        if (!error) {
            console.log('✅ Users table already exists!');
            return;
        }

        console.log('📝 Users table does not exist. Please create it manually in Supabase Dashboard.');
        console.log('');
        console.log('🔧 Go to your Supabase Dashboard > SQL Editor and run this SQL:');
        console.log('');
        console.log(`-- Create users table for AuthContext compatibility
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT CHECK (role IN ('parent', 'caregiver', 'admin')) NOT NULL,
    name TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    auth_provider TEXT DEFAULT 'supabase',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "users_select_own_profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own_profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own_profile" ON users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS users_updated_at_trigger ON users;
CREATE TRIGGER users_updated_at_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`);

        console.log('');
        console.log('🌐 Supabase Dashboard URL:', `${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}/sql`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

createUsersTable();
-- Create users table for AuthContext compatibility
-- This table will be used by the AuthContext for user profile management
-- Run this in Supabase SQL Editor

-- Create users table with the structure expected by AuthContext
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
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS users_updated_at_trigger ON users;
CREATE TRIGGER users_updated_at_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Migrate existing data from app_user to users table (if any exists)
-- This is a one-time migration to preserve existing user data
INSERT INTO users (id, email, role, created_at)
SELECT 
    au.id,
    au.email,
    CASE 
        WHEN au.role = 'customer' THEN 'parent'
        ELSE au.role
    END as role,
    au.created_at
FROM app_user au
ON CONFLICT (id) DO NOTHING;

-- Update caregiver users to have correct role
UPDATE users 
SET role = 'caregiver' 
WHERE id IN (SELECT id FROM caregiver);
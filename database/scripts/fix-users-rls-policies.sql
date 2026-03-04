-- Fix RLS policies for users table
-- Run this in Supabase Dashboard > SQL Editor

-- Step 1: Check current policies
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;

-- Step 2: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "users_select_own_profile" ON users;
DROP POLICY IF EXISTS "users_insert_own_profile" ON users;
DROP POLICY IF EXISTS "users_update_own_profile" ON users;
DROP POLICY IF EXISTS "service_role_access" ON users;

-- Step 3: Create comprehensive RLS policies

-- Allow users to read their own profile
CREATE POLICY "users_select_own_profile" ON users
    FOR SELECT USING (
        auth.uid() = id OR 
        auth.role() = 'service_role'
    );

-- Allow users to insert their own profile (during signup)
CREATE POLICY "users_insert_own_profile" ON users
    FOR INSERT WITH CHECK (
        auth.uid() = id OR 
        auth.role() = 'service_role'
    );

-- Allow users to update their own profile
CREATE POLICY "users_update_own_profile" ON users
    FOR UPDATE USING (
        auth.uid() = id OR 
        auth.role() = 'service_role'
    ) WITH CHECK (
        auth.uid() = id OR 
        auth.role() = 'service_role'
    );

-- Allow users to delete their own profile (optional)
CREATE POLICY "users_delete_own_profile" ON users
    FOR DELETE USING (
        auth.uid() = id OR 
        auth.role() = 'service_role'
    );

-- Step 4: Verify RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 5: Check the new policies
SELECT 
    policyname, 
    permissive, 
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;
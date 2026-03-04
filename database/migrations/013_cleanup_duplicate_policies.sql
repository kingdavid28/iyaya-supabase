-- Clean up duplicate RLS policies
-- Run this in Supabase SQL Editor

-- ============================================
-- REMOVE DUPLICATE POLICIES ON users TABLE
-- ============================================

-- Remove old/duplicate policies
DROP POLICY IF EXISTS "Authenticated users can view caregiver profiles" ON users;
DROP POLICY IF EXISTS "Authenticated users can view parent profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;

-- Keep only the standard named policies
-- These should already exist from migration 011
-- users_select_own_profile
-- users_insert_own_profile  
-- users_update_own_profile
-- users_delete_own_profile
-- Service role can manage users

-- Verify policies remain
DO $$
DECLARE
    policy_count INT;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'users';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS POLICY CLEANUP COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Remaining policies on users table: %', policy_count;
    RAISE NOTICE '========================================';
END $$;

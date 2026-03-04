-- Fix RLS policies for wallet updates
-- This ensures users can update their own wallet information
-- Run this in Supabase Dashboard > SQL Editor as a user with admin privileges

-- Step 1: Check current RLS status
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'app_user';

-- Step 2: Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can update their own profile" ON app_user;
DROP POLICY IF EXISTS "allow_update_own_profile" ON app_user;
DROP POLICY IF EXISTS "allow_own_profile_update" ON app_user;
DROP POLICY IF EXISTS "Users can view their own profile" ON app_user;
DROP POLICY IF EXISTS "Users can create their profile" ON app_user;

-- Step 3: Create comprehensive UPDATE policy that allows users to update their own wallet info
CREATE POLICY "app_user_update_own_profile" ON app_user
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Step 4: Ensure SELECT policy exists for users to read their own profile
CREATE POLICY "app_user_select_own_profile" ON app_user
  FOR SELECT
  USING (auth.uid() = id OR role = 'admin');

-- Step 5: Ensure INSERT policy exists for new user profiles
CREATE POLICY "app_user_insert_own_profile" ON app_user
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Step 6: Verify RLS is enabled
ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;

-- Step 7: Verify policies were created
-- SELECT policyname, permissive, roles, qual, with_check FROM pg_policies WHERE tablename = 'app_user' ORDER BY policyname;

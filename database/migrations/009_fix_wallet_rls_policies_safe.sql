-- Safe RLS policy fix for wallet updates
-- This version safely handles existing policies
-- Run this in Supabase Dashboard > SQL Editor

-- Step 1: Drop all existing app_user policies
DROP POLICY IF EXISTS "Users can update their own profile" ON app_user;
DROP POLICY IF EXISTS "allow_update_own_profile" ON app_user;
DROP POLICY IF EXISTS "allow_own_profile_update" ON app_user;
DROP POLICY IF EXISTS "Users can view their own profile" ON app_user;
DROP POLICY IF EXISTS "Users can create their profile" ON app_user;
DROP POLICY IF EXISTS "Users manage own data" ON app_user;
DROP POLICY IF EXISTS "app_user_update_own_profile" ON app_user;
DROP POLICY IF EXISTS "app_user_select_own_profile" ON app_user;
DROP POLICY IF EXISTS "app_user_insert_own_profile" ON app_user;

-- Step 2: Ensure RLS is enabled
ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;

-- Step 3: Create comprehensive policies with unique names
CREATE POLICY "app_user_allow_update_own_wallet" ON app_user
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "app_user_allow_select_own_profile" ON app_user
  FOR SELECT
  USING (auth.uid() = id OR role = 'admin');

CREATE POLICY "app_user_allow_insert_own_profile" ON app_user
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Step 4: Verify policies were created
SELECT policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'app_user'
ORDER BY policyname;

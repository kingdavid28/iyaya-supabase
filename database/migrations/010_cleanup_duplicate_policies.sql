-- Final cleanup - remove duplicate/conflicting policies
-- Run this in Supabase Dashboard > SQL Editor

-- Drop the old redundant policies
DROP POLICY IF EXISTS "user_own_data" ON app_user;
DROP POLICY IF EXISTS "users_own_data" ON app_user;

-- Verify final state
SELECT policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'app_user'
ORDER BY policyname;

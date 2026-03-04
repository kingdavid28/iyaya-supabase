-- Fix caregiver_profiles API access
-- Run this in Supabase SQL Editor

-- 1. Ensure table is in public schema and exposed to API
ALTER TABLE caregiver_profiles REPLICA IDENTITY FULL;

-- 2. Drop and recreate RLS policies
DROP POLICY IF EXISTS "Caregiver profiles are viewable by everyone" ON caregiver_profiles;
DROP POLICY IF EXISTS "Caregivers can update own profile" ON caregiver_profiles;
DROP POLICY IF EXISTS "Caregivers can insert own profile" ON caregiver_profiles;

-- 3. Create permissive policies
CREATE POLICY "Enable read access for all users"
  ON caregiver_profiles FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON caregiver_profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for users based on user_id"
  ON caregiver_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Grant permissions
GRANT SELECT ON caregiver_profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON caregiver_profiles TO authenticated;

-- 5. Verify table is accessible
SELECT * FROM caregiver_profiles LIMIT 1;

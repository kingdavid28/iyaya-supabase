-- Fix caregiver roles based on caregiver table
-- IMPORTANT: This migration must be run as a Supabase Admin or with Service Role key
-- because of Row Level Security (RLS) policies on app_user table

-- Step 1: Temporarily disable RLS to allow the update
ALTER TABLE app_user DISABLE ROW LEVEL SECURITY;

-- Step 2: Check which users are actually caregivers
-- SELECT au.id, au.email, au.role, c.display_name 
-- FROM app_user au
-- LEFT JOIN caregiver c ON au.id = c.id
-- WHERE c.id IS NOT NULL AND au.role != 'caregiver';

-- Step 3: Update users with caregiver records to have caregiver role
UPDATE app_user 
SET role = 'caregiver' 
WHERE id IN (SELECT id FROM caregiver);

-- Step 4: Re-enable RLS for security
ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;

-- Step 5: Verify the update worked
-- SELECT au.id, au.email, au.role, c.display_name 
-- FROM app_user au
-- LEFT JOIN caregiver c ON au.id = c.id
-- WHERE c.id IS NOT NULL;

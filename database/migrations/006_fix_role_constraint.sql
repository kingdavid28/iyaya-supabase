-- Fix role constraint to match application logic
-- Run this in Supabase SQL Editor

-- First, check for invalid roles
-- SELECT DISTINCT role FROM app_user WHERE role NOT IN ('parent', 'caregiver', 'admin');

-- Update any NULL or invalid roles to 'parent' as default
UPDATE app_user 
SET role = 'parent' 
WHERE role IS NULL OR role NOT IN ('parent', 'caregiver', 'admin');

-- Drop existing constraint if it exists
ALTER TABLE app_user 
DROP CONSTRAINT IF EXISTS app_user_role_check;

-- Add the new constraint
ALTER TABLE app_user 
ADD CONSTRAINT app_user_role_check 
CHECK (role = ANY (ARRAY['parent'::text, 'caregiver'::text, 'admin'::text]));

-- Verify the constraint is in place
-- SELECT constraint_name FROM information_schema.table_constraints 
-- WHERE table_name='app_user' AND constraint_type='CHECK';
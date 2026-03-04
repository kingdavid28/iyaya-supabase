-- Fix existing user roles
-- These users signed up via Google OAuth which doesn't pass role metadata

-- Check current roles
SELECT id, email, role FROM users ORDER BY created_at DESC;

-- Update doorknock28@gmail.com to caregiver (if they should be caregiver)
UPDATE users 
SET role = 'caregiver', updated_at = NOW()
WHERE email = 'doorknock28@gmail.com';

-- Update kensite24@gmail.com role (change to 'caregiver' or keep 'parent')
UPDATE users 
SET role = 'parent', updated_at = NOW()
WHERE email = 'kensite24@gmail.com';

-- Verify changes
SELECT id, email, role, updated_at FROM users ORDER BY created_at DESC;

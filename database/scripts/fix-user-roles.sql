-- Fix User Roles
-- Run this in Supabase SQL Editor to correct user roles

-- First, check current roles
SELECT id, email, role, created_at 
FROM users 
ORDER BY created_at DESC;

-- Update specific users to caregiver role
-- Replace emails with actual caregiver emails
UPDATE users 
SET role = 'caregiver', updated_at = NOW()
WHERE email IN (
  'kingdavid28a@gmail.com',  -- Add caregiver emails here
  'reycelrcentino@gmail.com'  -- Add more as needed
);

-- Verify the changes
SELECT id, email, role, updated_at 
FROM users 
ORDER BY created_at DESC;

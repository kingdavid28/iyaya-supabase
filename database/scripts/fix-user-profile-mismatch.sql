-- Check user mismatch and fix
-- Run this in Supabase SQL Editor

-- 1. Check which user is authenticated
SELECT id, email, role FROM app_user WHERE id = '9c8f2a78-db0d-445d-8138-5cc93a415080';

-- 2. Check existing profile
SELECT * FROM caregiver_profiles WHERE user_id = '57764bb4-b282-4228-a6cd-94f2f26e542d';

-- 3. Create profile for the authenticated user if needed
INSERT INTO caregiver_profiles (
  user_id,
  bio,
  experience,
  skills,
  hourly_rate,
  background_check_status,
  trust_score
) VALUES (
  '9c8f2a78-db0d-445d-8138-5cc93a415080',
  'Experienced caregiver',
  'Professional caregiver',
  ARRAY['Childcare', 'First Aid'],
  25,
  'pending',
  0
)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Verify
SELECT * FROM caregiver_profiles WHERE user_id = '9c8f2a78-db0d-445d-8138-5cc93a415080';

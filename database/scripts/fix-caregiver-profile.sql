-- Check current caregiver profile data
SELECT 
  id, 
  email, 
  role, 
  name, 
  phone, 
  bio,
  profile_image,
  location,
  address
FROM users 
WHERE role = 'caregiver'
ORDER BY created_at DESC;

-- Update caregiver profile with basic data (replace email with actual caregiver email)
UPDATE users 
SET 
  name = COALESCE(name, first_name || ' ' || last_name, 'Caregiver'),
  bio = COALESCE(bio, 'Experienced caregiver'),
  updated_at = NOW()
WHERE role = 'caregiver' 
  AND email = 'doorknock28@gmail.com';  -- Replace with actual caregiver email

-- Verify the update
SELECT 
  id, 
  email, 
  role, 
  name, 
  phone, 
  bio,
  updated_at
FROM users 
WHERE role = 'caregiver';

-- COMPLETE FIX: Update handle_new_user trigger to read role from signup metadata
-- Run this entire script in Supabase SQL Editor

-- Step 1: Drop and recreate the function with proper metadata reading
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_first_name TEXT;
  user_last_name TEXT;
  is_oauth BOOLEAN;
BEGIN
  -- Check if this is OAuth signup (Google, etc)
  is_oauth := (NEW.raw_app_meta_data->>'provider' IS NOT NULL 
               AND NEW.raw_app_meta_data->>'provider' != 'email');

  -- Extract role from metadata
  user_role := NEW.raw_user_meta_data->>'role';
  
  -- For OAuth signups without role, don't insert yet - let app handle it
  -- For email signups without role, default to parent
  IF user_role IS NULL THEN
    IF is_oauth THEN
      -- Skip insert for OAuth, app will call ensureUserProfileExists
      RETURN NEW;
    ELSE
      user_role := 'parent';
    END IF;
  END IF;

  -- Extract first name
  user_first_name := COALESCE(
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'firstName',
    NEW.raw_user_meta_data->>'given_name'
  );

  -- Extract last name  
  user_last_name := COALESCE(
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'lastName',
    NEW.raw_user_meta_data->>'family_name'
  );

  -- Insert into users table
  INSERT INTO public.users (
    id,
    email,
    role,
    first_name,
    last_name,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    user_role,
    user_first_name,
    user_last_name,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    first_name = COALESCE(EXCLUDED.first_name, users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, users.last_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Verify trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Step 3: Test by checking a user's metadata
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as metadata_role,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Fix handle_new_user trigger to properly read role from metadata
-- This fixes the bug where all signups default to 'parent' role

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_first_name TEXT;
  user_last_name TEXT;
BEGIN
  -- Extract role from multiple possible metadata locations
  user_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    NEW.raw_app_meta_data->>'role',
    'parent'  -- Default fallback
  );

  -- Extract first name
  user_first_name := COALESCE(
    NEW.raw_user_meta_data->>'firstName',
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'firstname'
  );

  -- Extract last name
  user_last_name := COALESCE(
    NEW.raw_user_meta_data->>'lastName',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'lastname'
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
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the trigger is still active
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

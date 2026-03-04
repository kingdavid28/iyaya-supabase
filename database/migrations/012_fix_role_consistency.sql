-- Fix role consistency across the entire database
-- This ensures 'parent' is used consistently everywhere
-- Run this in Supabase SQL Editor AFTER running 005 and 006

-- 1. Update app_user table constraint to use 'parent' instead of 'customer'
ALTER TABLE app_user 
DROP CONSTRAINT IF EXISTS app_user_role_check;

ALTER TABLE app_user 
ADD CONSTRAINT app_user_role_check 
CHECK (role = ANY (ARRAY['parent'::text, 'caregiver'::text, 'admin'::text]));

-- 2. Migrate any 'customer' roles to 'parent' in app_user
UPDATE app_user 
SET role = 'parent' 
WHERE role = 'customer';

-- 3. Ensure users table has correct constraint
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role = ANY (ARRAY['parent'::text, 'caregiver'::text, 'admin'::text]));

-- 4. Migrate any 'customer' roles to 'parent' in users table
UPDATE users 
SET role = 'parent' 
WHERE role = 'customer';

-- 5. Update the is_admin function to work with both tables
CREATE OR REPLACE FUNCTION app.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    uid UUID := auth.uid();
    res BOOLEAN;
BEGIN
    -- Check users table first (primary table for auth)
    SELECT (role = 'admin') INTO res
    FROM users
    WHERE id = uid;
    
    -- If not found, check app_user table
    IF res IS NULL THEN
        SELECT (role = 'admin') INTO res
        FROM app_user
        WHERE id = uid;
    END IF;
    
    RETURN COALESCE(res, false);
END;
$$;

-- 6. Verify the changes
DO $$
DECLARE
    app_user_count INT;
    users_count INT;
BEGIN
    SELECT COUNT(*) INTO app_user_count FROM app_user WHERE role NOT IN ('parent', 'caregiver', 'admin');
    SELECT COUNT(*) INTO users_count FROM users WHERE role NOT IN ('parent', 'caregiver', 'admin');
    
    IF app_user_count > 0 OR users_count > 0 THEN
        RAISE EXCEPTION 'Invalid roles still exist! app_user: %, users: %', app_user_count, users_count;
    ELSE
        RAISE NOTICE 'All roles are valid. Migration successful!';
    END IF;
END $$;

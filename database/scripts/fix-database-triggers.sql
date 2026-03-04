-- Fix Database Triggers for Users Table
-- Run this in Supabase Dashboard > SQL Editor

-- Step 1: Check what triggers currently exist on the users table
SELECT 
    trigger_name, 
    event_manipulation, 
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'users'
ORDER BY trigger_name;

-- Step 2: Check what functions are referenced by the triggers
SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname IN ('handle_user_update', 'update_updated_at_column');

-- Step 3: Drop all problematic triggers
DROP TRIGGER IF EXISTS on_user_updated ON users;
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Step 4: Create the missing function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create a simple, working trigger for updated_at
CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Verify the fix by checking triggers again
SELECT 
    trigger_name, 
    event_manipulation, 
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users';

-- Step 7: Test that the users table is accessible
SELECT COUNT(*) as user_count FROM users;
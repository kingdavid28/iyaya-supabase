-- Check the handle_new_user function
-- Run this in Supabase Dashboard > SQL Editor

-- Check if the handle_new_user function exists
SELECT 
    proname as function_name,
    prosrc as function_body,
    pronamespace::regnamespace as schema_name
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Check the trigger details
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing,
    action_orientation
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- If the function doesn't exist, we'll need to either:
-- 1. Create the missing function, or
-- 2. Drop the trigger

-- Let's also check what tables this function might be trying to access
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('users', 'profiles', 'user_profiles')
ORDER BY schemaname, tablename;
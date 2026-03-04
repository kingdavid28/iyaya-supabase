-- Check Auth Schema for Issues
-- Run this in Supabase Dashboard > SQL Editor

-- Check if auth.users table exists and is accessible
SELECT COUNT(*) as auth_users_count FROM auth.users;

-- Check if there are any triggers on auth.users
SELECT 
    trigger_name, 
    event_manipulation, 
    action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' AND event_object_table = 'users';

-- Check if there are any functions in auth schema that might be failing
SELECT 
    proname as function_name,
    pronamespace::regnamespace as schema_name
FROM pg_proc 
WHERE pronamespace = 'auth'::regnamespace
ORDER BY proname;

-- Check for any foreign key constraints from our users table to auth.users
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND (tc.table_name='users' OR ccu.table_name='users');

-- Check current auth configuration
SELECT * FROM auth.config;
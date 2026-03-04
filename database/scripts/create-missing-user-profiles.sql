-- Create missing user profiles for users who signed up after trigger was removed
-- Run this in Supabase Dashboard > SQL Editor

-- Step 1: Check which auth users don't have profiles in the users table
SELECT 
    au.id,
    au.email,
    au.created_at as auth_created_at,
    u.id as profile_exists
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL
ORDER BY au.created_at DESC;

-- Step 2: Create profiles for users who don't have them
INSERT INTO public.users (id, email, role, name, auth_provider, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'role', 'parent') as role,
    COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
    'supabase' as auth_provider,
    au.created_at,
    NOW() as updated_at
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 3: Verify all users now have profiles
SELECT 
    COUNT(*) as auth_users_count,
    (SELECT COUNT(*) FROM public.users) as profile_users_count
FROM auth.users;
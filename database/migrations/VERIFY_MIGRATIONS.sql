-- Verification Script
-- Run this in Supabase SQL Editor AFTER running all migrations
-- This will verify that everything is set up correctly

-- ============================================
-- 1. CHECK ROLE CONSTRAINTS
-- ============================================
SELECT 
    'Role Constraints' as check_type,
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%role%'
ORDER BY constraint_name;

-- ============================================
-- 2. CHECK WALLET COLUMNS EXIST
-- ============================================
SELECT 
    'Wallet Columns' as check_type,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('app_user', 'users')
AND column_name IN ('solana_wallet_address', 'preferred_token')
ORDER BY table_name, column_name;

-- ============================================
-- 3. CHECK FOR INVALID ROLES
-- ============================================
SELECT 
    'Invalid Roles in app_user' as check_type,
    role,
    COUNT(*) as count
FROM app_user 
WHERE role NOT IN ('parent', 'caregiver', 'admin')
GROUP BY role;

SELECT 
    'Invalid Roles in users' as check_type,
    role,
    COUNT(*) as count
FROM users 
WHERE role NOT IN ('parent', 'caregiver', 'admin')
GROUP BY role;

-- ============================================
-- 4. CHECK ROLE DISTRIBUTION
-- ============================================
SELECT 
    'Role Distribution - app_user' as check_type,
    role,
    COUNT(*) as count
FROM app_user 
GROUP BY role
ORDER BY role;

SELECT 
    'Role Distribution - users' as check_type,
    role,
    COUNT(*) as count
FROM users 
GROUP BY role
ORDER BY role;

-- ============================================
-- 5. CHECK RPC FUNCTION EXISTS
-- ============================================
SELECT 
    'RPC Functions' as check_type,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'update_user_wallet'
AND routine_schema = 'public';

-- ============================================
-- 6. CHECK RLS POLICIES
-- ============================================
SELECT 
    'RLS Policies' as check_type,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE tablename IN ('app_user', 'users')
ORDER BY tablename, policyname;

-- ============================================
-- 7. SUMMARY CHECK
-- ============================================
DO $$
DECLARE
    app_user_invalid INT;
    users_invalid INT;
    wallet_cols INT;
    rpc_exists INT;
BEGIN
    -- Check for invalid roles
    SELECT COUNT(*) INTO app_user_invalid 
    FROM app_user 
    WHERE role NOT IN ('parent', 'caregiver', 'admin');
    
    SELECT COUNT(*) INTO users_invalid 
    FROM users 
    WHERE role NOT IN ('parent', 'caregiver', 'admin');
    
    -- Check wallet columns
    SELECT COUNT(*) INTO wallet_cols
    FROM information_schema.columns 
    WHERE table_name = 'app_user'
    AND column_name IN ('solana_wallet_address', 'preferred_token');
    
    -- Check RPC function
    SELECT COUNT(*) INTO rpc_exists
    FROM information_schema.routines 
    WHERE routine_name = 'update_user_wallet';
    
    -- Report results
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION VERIFICATION SUMMARY';
    RAISE NOTICE '========================================';
    
    IF app_user_invalid = 0 THEN
        RAISE NOTICE '✅ app_user: All roles are valid';
    ELSE
        RAISE WARNING '❌ app_user: % invalid roles found', app_user_invalid;
    END IF;
    
    IF users_invalid = 0 THEN
        RAISE NOTICE '✅ users: All roles are valid';
    ELSE
        RAISE WARNING '❌ users: % invalid roles found', users_invalid;
    END IF;
    
    IF wallet_cols = 2 THEN
        RAISE NOTICE '✅ Wallet columns exist in app_user';
    ELSE
        RAISE WARNING '❌ Wallet columns missing (found % of 2)', wallet_cols;
    END IF;
    
    IF rpc_exists = 1 THEN
        RAISE NOTICE '✅ update_user_wallet RPC function exists';
    ELSE
        RAISE WARNING '❌ update_user_wallet RPC function missing';
    END IF;
    
    RAISE NOTICE '========================================';
    
    IF app_user_invalid = 0 AND users_invalid = 0 AND wallet_cols = 2 AND rpc_exists = 1 THEN
        RAISE NOTICE '🎉 ALL CHECKS PASSED! Database is ready.';
    ELSE
        RAISE WARNING '⚠️ Some checks failed. Review the output above.';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;

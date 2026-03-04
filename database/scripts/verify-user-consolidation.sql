-- Verification script for user table consolidation
-- Run this after executing 008-consolidate-user-tables.sql

-- 1. Verify app_user table is dropped
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'app_user'
) AS app_user_still_exists;
-- Expected: false

-- 2. Verify users table has wallet columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('solana_wallet_address', 'preferred_token');
-- Expected: 2 rows

-- 3. Check role constraint on users table
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'users_role_check';
-- Expected: CHECK role = ANY (ARRAY['parent', 'caregiver', 'admin'])

-- 4. Verify foreign keys point to users table
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND ccu.table_name = 'users'
ORDER BY tc.table_name;
-- Expected: All foreign keys should reference 'users', not 'app_user'

-- 5. Check for any remaining 'customer' roles
SELECT id, email, role FROM users WHERE role = 'customer';
-- Expected: 0 rows (all should be 'parent')

-- 6. Verify wallet index exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users' 
AND indexname = 'idx_users_wallet_address';
-- Expected: 1 row

-- 7. Count users with wallet addresses
SELECT 
  COUNT(*) as total_users,
  COUNT(solana_wallet_address) as users_with_wallet,
  COUNT(DISTINCT preferred_token) as token_types
FROM users;

-- 8. Verify no orphaned records
SELECT 'booking' as table_name, COUNT(*) as orphaned_count
FROM booking b
WHERE b.customer_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM users WHERE id = b.customer_id)
UNION ALL
SELECT 'caregiver', COUNT(*)
FROM caregiver c
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = c.id)
UNION ALL
SELECT 'solana_transactions', COUNT(*)
FROM solana_transactions st
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = st.caregiver_id);
-- Expected: All counts should be 0

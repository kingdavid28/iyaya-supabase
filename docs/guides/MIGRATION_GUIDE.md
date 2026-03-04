# Database Migration and Testing Guide

## CRITICAL: Run Migrations in Order

### Step 1: Run Database Migrations in Supabase SQL Editor

Run these migrations **in order** in your Supabase SQL Editor:

1. **005_complete_wallet_fix.sql** - Adds wallet columns and RPC function
2. **006_fix_role_constraint.sql** - Fixes role constraint to use 'parent'
3. **012_fix_role_consistency.sql** - Ensures consistency across all tables

### Step 2: Verify Database State

After running migrations, verify in Supabase SQL Editor:

```sql
-- Check role constraints
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%role%';

-- Check for invalid roles
SELECT 'app_user' as table_name, role, COUNT(*) 
FROM app_user 
GROUP BY role
UNION ALL
SELECT 'users' as table_name, role, COUNT(*) 
FROM users 
GROUP BY role;

-- Verify wallet columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'app_user' 
AND column_name IN ('solana_wallet_address', 'preferred_token');
```

### Step 3: Test Authentication Flow

#### Test 1: Caregiver Signup
1. Open app and navigate to Caregiver signup
2. Fill in all required fields
3. Use a unique email (e.g., caregiver_test_001@example.com)
4. Submit form
5. **Expected**: Email verification message appears
6. Check email and verify account
7. Login with credentials
8. **Expected**: Navigate to CaregiverDashboard

#### Test 2: Parent Signup
1. Open app and navigate to Parent signup
2. Fill in all required fields
3. Use a unique email (e.g., parent_test_001@example.com)
4. Submit form
5. **Expected**: Email verification message appears
6. Check email and verify account
7. Login with credentials
8. **Expected**: Navigate to ParentDashboard

#### Test 3: Wallet Save Functionality
1. Login as parent or caregiver
2. Navigate to wallet settings
3. Enter a Solana wallet address
4. Select preferred token (SOL or USDC)
5. Save changes
6. **Expected**: Success message appears
7. Refresh page
8. **Expected**: Wallet address and token preference are preserved

### Step 4: Verify Role Mapping

Check in Supabase SQL Editor:

```sql
-- Verify user roles after signup
SELECT 
    u.id,
    u.email,
    u.role,
    au.role as app_user_role
FROM users u
LEFT JOIN app_user au ON u.id = au.id
ORDER BY u.created_at DESC
LIMIT 10;
```

### Step 5: Common Issues and Solutions

#### Issue: "Role constraint violation"
**Solution**: Run migration 012_fix_role_consistency.sql

#### Issue: "Wallet columns don't exist"
**Solution**: Run migration 005_complete_wallet_fix.sql

#### Issue: "User redirected to wrong dashboard"
**Solution**: Check that role in database matches expected role ('parent' or 'caregiver')

#### Issue: "Email already exists"
**Solution**: Use a different email or delete test user from Supabase Auth dashboard

### Step 6: Clean Up Test Data (Optional)

```sql
-- Delete test users (BE CAREFUL!)
DELETE FROM users WHERE email LIKE '%test%@example.com';
DELETE FROM app_user WHERE email LIKE '%test%@example.com';

-- Also delete from Supabase Auth dashboard manually
```

## Role Mapping Reference

| User Type | Database Role | Dashboard Route |
|-----------|--------------|-----------------|
| Parent    | 'parent'     | ParentDashboard |
| Caregiver | 'caregiver'  | CaregiverDashboard |
| Admin     | 'admin'      | AdminDashboard |

## Important Notes

1. **Always use 'parent'** in the code, NOT 'customer'
2. **Email verification** is required before login
3. **Unique emails** must be used for each account
4. **Password requirements**: 12+ characters, uppercase, lowercase, number, symbol
5. **Age requirement** for caregivers: 18+ years old

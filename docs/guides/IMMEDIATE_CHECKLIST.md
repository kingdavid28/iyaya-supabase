# IMMEDIATE ACTION CHECKLIST

## ✅ Step-by-Step Instructions

### 1. Run Database Migrations (IN ORDER!)

Open Supabase SQL Editor and run these files in order:

#### Migration 1: `005_complete_wallet_fix.sql`
```sql
-- Copy and paste the entire contents of:
-- migrations/005_complete_wallet_fix.sql
-- This adds wallet columns and RPC function
```

#### Migration 2: `006_fix_role_constraint.sql`
```sql
-- Copy and paste the entire contents of:
-- migrations/006_fix_role_constraint.sql
-- This fixes role constraint to use 'parent'
```

#### Migration 3: `012_fix_role_consistency.sql`
```sql
-- Copy and paste the entire contents of:
-- migrations/012_fix_role_consistency.sql
-- This ensures consistency across all tables
```

#### Migration 4: `013_cleanup_duplicate_policies.sql`
```sql
-- Copy and paste the entire contents of:
-- migrations/013_cleanup_duplicate_policies.sql
-- This removes duplicate RLS policies
```

### 2. Verify Migrations Succeeded

Run this in Supabase SQL Editor:

```sql
-- Should show 'parent', 'caregiver', 'admin' as valid roles
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%role%';

-- Should show wallet columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'app_user' 
AND column_name IN ('solana_wallet_address', 'preferred_token');
```

### 3. Test Authentication Flow

#### Test Caregiver Signup → CaregiverDashboard
1. Navigate to Caregiver signup screen
2. Fill form with test data:
   - Email: `test_caregiver_001@example.com`
   - Password: `TestPass123!@#`
   - Fill all required fields
3. Submit → Should see "Check Your Email" alert
4. Check email and verify
5. Login → Should navigate to **CaregiverDashboard**

#### Test Parent Signup → ParentDashboard
1. Navigate to Parent signup screen
2. Fill form with test data:
   - Email: `test_parent_001@example.com`
   - Password: `TestPass123!@#`
   - Fill all required fields
3. Submit → Should see "Check Your Email" alert
4. Check email and verify
5. Login → Should navigate to **ParentDashboard**

### 4. Test Wallet Save Functionality

1. Login as any user
2. Navigate to wallet/settings
3. Enter Solana wallet address
4. Select token preference (SOL or USDC)
5. Save
6. Verify success message
7. Refresh and verify data persists

### 5. Fix Role Mapping (ALREADY DONE ✅)

The code already uses 'parent' consistently:
- ✅ ParentAuth.js uses `role: 'parent'`
- ✅ CaregiverAuth.js uses `role: 'caregiver'`
- ✅ AuthContext.js handles roles correctly
- ✅ Database migrations enforce 'parent' role

## 🎯 Expected Results

| Action | Expected Result |
|--------|----------------|
| Caregiver Signup | Email verification → Login → CaregiverDashboard |
| Parent Signup | Email verification → Login → ParentDashboard |
| Wallet Save | Success message → Data persists after refresh |
| Role Check | Database shows 'parent', not 'customer' |

## 🚨 Common Issues

### "Role constraint violation"
**Fix**: Run migration 012_fix_role_consistency.sql

### "Column does not exist: solana_wallet_address"
**Fix**: Run migration 005_complete_wallet_fix.sql

### "User redirected to wrong dashboard"
**Fix**: Check user role in database:
```sql
SELECT id, email, role FROM users WHERE email = 'your@email.com';
```

### "Email already exists"
**Fix**: Use different email or delete from Supabase Auth dashboard

## 📝 Notes

- Password must be 12+ characters with uppercase, lowercase, number, and symbol
- Email verification is required before login
- Caregivers must be 18+ years old
- Always use 'parent' in code, NOT 'customer'

## ✅ Completion Checklist

- [ ] Ran migration 005_complete_wallet_fix.sql
- [ ] Ran migration 006_fix_role_constraint.sql
- [ ] Ran migration 012_fix_role_consistency.sql
- [ ] Ran migration 013_cleanup_duplicate_policies.sql
- [ ] Verified migrations with SQL queries
- [ ] Tested caregiver signup → CaregiverDashboard
- [ ] Tested parent signup → ParentDashboard
- [ ] Tested wallet save functionality
- [ ] Verified role consistency in database

## 🎉 Success Criteria

All checkboxes above are checked ✅ and:
- Caregivers can sign up and access CaregiverDashboard
- Parents can sign up and access ParentDashboard
- Wallet addresses can be saved and retrieved
- No role constraint errors in database

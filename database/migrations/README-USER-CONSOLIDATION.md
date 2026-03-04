# User Table Consolidation Migration

## Problem
The database schema has duplicate user tables (`users` and `app_user`) with:
- Overlapping purposes and data
- Inconsistent role constraints ('parent' vs 'customer')
- Foreign keys pointing to different tables
- Data integrity issues

## Solution
Consolidate into a single `users` table with all necessary columns.

## Migration Files

### 1. `008-consolidate-user-tables.sql`
Main migration script that:
- Adds wallet columns to `users` table
- Migrates data from `app_user` to `users`
- Updates all foreign keys to reference `users`
- Drops `app_user` table
- Standardizes role constraint to 'parent'/'caregiver'/'admin'
- Creates index on wallet address

### 2. `008-rollback-consolidate-user-tables.sql`
Rollback script (use only if migration fails)

### 3. `verify-user-consolidation.sql`
Verification queries to confirm migration success

## Pre-Migration Checklist

1. **Backup your database**
   ```sql
   -- In Supabase Dashboard: Settings > Database > Create backup
   ```

2. **Check for data conflicts**
   ```sql
   -- Check if same IDs exist in both tables with different data
   SELECT u.id, u.email as users_email, a.email as app_user_email
   FROM users u
   INNER JOIN app_user a ON u.id = a.id
   WHERE u.email != a.email OR u.role != a.role;
   ```

3. **Count records**
   ```sql
   SELECT 'users' as table_name, COUNT(*) FROM users
   UNION ALL
   SELECT 'app_user', COUNT(*) FROM app_user;
   ```

## Migration Steps

### Step 1: Run Pre-Migration Checks
```sql
-- Copy and run queries from Pre-Migration Checklist
```

### Step 2: Execute Migration
```sql
-- In Supabase SQL Editor, run:
-- database/migrations/008-consolidate-user-tables.sql
```

### Step 3: Verify Migration
```sql
-- Run all queries from:
-- database/scripts/verify-user-consolidation.sql
```

### Step 4: Update Application Code
After successful migration, update your code:

#### AuthContext.js
```javascript
// Change from:
const { data, error } = await supabase
  .from('app_user')
  .select('*')
  
// To:
const { data, error } = await supabase
  .from('users')
  .select('*')
```

#### WalletSetup.js
```javascript
// Already uses 'users' table - no changes needed
```

## Expected Results

### Before Migration
- 2 user tables: `users` and `app_user`
- Foreign keys split between both tables
- Role constraint mismatch

### After Migration
- 1 user table: `users`
- All foreign keys reference `users`
- Consistent role constraint: 'parent'/'caregiver'/'admin'
- Wallet columns in `users` table
- Index on `solana_wallet_address`

## Rollback Instructions

If migration fails:

1. **Stop immediately**
2. **Run rollback script**
   ```sql
   -- database/migrations/008-rollback-consolidate-user-tables.sql
   ```
3. **Restore from backup** (if rollback fails)
4. **Report the error** with full error message

## Post-Migration Tasks

1. **Update RLS policies** that reference `app_user`
   ```sql
   -- Find policies referencing app_user
   SELECT schemaname, tablename, policyname, definition
   FROM pg_policies
   WHERE definition LIKE '%app_user%';
   ```

2. **Update application queries** to use `users` table

3. **Test critical flows**:
   - User registration
   - User login
   - Wallet setup
   - Profile updates
   - Booking creation

4. **Monitor for errors** in application logs

## Affected Tables

Tables with foreign keys updated:
- `booking` (customer_id, parent_id)
- `solana_transactions` (caregiver_id, payer_id)
- `caregiver` (id)

## Notes

- Migration is **irreversible** without rollback script
- Estimated downtime: 2-5 minutes
- All existing user data is preserved
- Wallet addresses are migrated automatically
- Role 'customer' is converted to 'parent'

## Support

If you encounter issues:
1. Check verification queries output
2. Review Supabase logs
3. Check application error logs
4. Use rollback script if needed

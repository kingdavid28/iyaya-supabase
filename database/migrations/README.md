# Database Migrations

## 🚀 Quick Start

**Run these 3 migrations in Supabase SQL Editor (in order):**

1. `005_complete_wallet_fix.sql`
2. `006_fix_role_constraint.sql`
3. `012_fix_role_consistency.sql`

Then verify with: `VERIFY_MIGRATIONS.sql`

## 📋 Migration Files

### Critical Migrations (Run These Now!)

| File | Purpose | Status |
|------|---------|--------|
| `005_complete_wallet_fix.sql` | Adds wallet columns and RPC function | ⚠️ **RUN NOW** |
| `006_fix_role_constraint.sql` | Fixes role constraint to use 'parent' | ⚠️ **RUN NOW** |
| `012_fix_role_consistency.sql` | Ensures consistency across tables | ⚠️ **RUN NOW** |
| `VERIFY_MIGRATIONS.sql` | Verifies all changes | ✅ Run after above |

### Previously Run Migrations

| File | Purpose | Status |
|------|---------|--------|
| `001_initial_setup.sql` | Initial database setup | ✅ Already run |
| `002_fix_schema.sql` | Schema fixes | ✅ Already run |
| `003_add_wallet_columns.sql` | First wallet attempt | ⚠️ Superseded by 005 |
| `004_wallet_update_function.sql` | Wallet function | ⚠️ Superseded by 005 |
| `007_fix_caregiver_roles.sql` | Caregiver role fix | ✅ Already run |
| `008_fix_wallet_rls_policies.sql` | RLS policies | ✅ Already run |
| `009_fix_wallet_rls_policies_safe.sql` | Safe RLS policies | ✅ Already run |
| `010_cleanup_duplicate_policies.sql` | Policy cleanup | ✅ Already run |
| `011_create_users_table.sql` | Users table creation | ✅ Already run |

## 🎯 What These Migrations Fix

### 005_complete_wallet_fix.sql
- ✅ Adds `solana_wallet_address` column to app_user
- ✅ Adds `preferred_token` column to app_user
- ✅ Creates `update_user_wallet()` RPC function
- ✅ Updates RLS policies for wallet access

### 006_fix_role_constraint.sql
- ✅ Updates role constraint to accept 'parent' instead of 'customer'
- ✅ Migrates any existing 'customer' roles to 'parent'
- ✅ Ensures only valid roles: 'parent', 'caregiver', 'admin'

### 012_fix_role_consistency.sql
- ✅ Fixes role constraints on both app_user and users tables
- ✅ Migrates all 'customer' roles to 'parent' in both tables
- ✅ Updates is_admin() function to work with both tables
- ✅ Verifies no invalid roles remain

## 🔍 How to Run

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project
2. Click "SQL Editor" in the left sidebar
3. Click "New query"

### Step 2: Copy and Paste Migration
1. Open `005_complete_wallet_fix.sql`
2. Copy entire contents
3. Paste into SQL Editor
4. Click "Run"
5. Wait for success message

### Step 3: Repeat for Other Migrations
Repeat Step 2 for:
- `006_fix_role_constraint.sql`
- `012_fix_role_consistency.sql`

### Step 4: Verify
1. Open `VERIFY_MIGRATIONS.sql`
2. Copy and paste into SQL Editor
3. Click "Run"
4. Check output for "ALL CHECKS PASSED"

## ✅ Success Indicators

After running migrations, you should see:

```
✅ app_user: All roles are valid
✅ users: All roles are valid
✅ Wallet columns exist in app_user
✅ update_user_wallet RPC function exists
🎉 ALL CHECKS PASSED! Database is ready.
```

## 🚨 If Something Goes Wrong

### Migration Fails
- Check error message in SQL Editor
- Ensure you're running migrations in order
- Check if migration was already run

### Verification Fails
- Review which check failed
- Re-run the corresponding migration
- Check Supabase logs for details

### Still Having Issues?
1. Check `TROUBLESHOOTING.md` in root folder
2. Review `MIGRATION_GUIDE.md` for detailed steps
3. Check Supabase dashboard for error logs

## 📚 Additional Resources

- `../IMMEDIATE_CHECKLIST.md` - Quick action checklist
- `../MIGRATION_GUIDE.md` - Comprehensive guide
- `../ROLE_MAPPING_FIX_SUMMARY.md` - Complete summary
- `../QUICK_START.txt` - Visual quick reference

## 🔒 Safety Notes

- ✅ All migrations are idempotent (safe to run multiple times)
- ✅ Migrations use IF NOT EXISTS and IF EXISTS checks
- ✅ No data will be lost
- ✅ Existing users will be migrated automatically
- ⚠️ Always backup before running migrations in production

## 📊 Migration History

| Date | Migration | Status |
|------|-----------|--------|
| Initial | 001-011 | ✅ Completed |
| Current | 005, 006, 012 | ⚠️ **Pending** |

---

**Next Step**: Open Supabase SQL Editor and run the 3 critical migrations!

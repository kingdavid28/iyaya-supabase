# 🚨 IMMEDIATE TASKS - Role Mapping & Wallet Fix

## ⚡ Quick Action (15 minutes)

### 1. Run Database Migrations

Open **Supabase SQL Editor** and run these files **in order**:

```
1. migrations/005_complete_wallet_fix.sql
2. migrations/006_fix_role_constraint.sql  
3. migrations/012_fix_role_consistency.sql
4. migrations/013_cleanup_duplicate_policies.sql
5. migrations/VERIFY_MIGRATIONS.sql (to verify)
```

### 2. Test Authentication

- **Caregiver**: Signup → Verify Email → Login → Should go to **CaregiverDashboard** ✅
- **Parent**: Signup → Verify Email → Login → Should go to **ParentDashboard** ✅

### 3. Test Wallet Functionality

- Login → Settings → Add Wallet Address → Save → Refresh → Verify it persists ✅

---

## 📁 Documentation Files

| File | Purpose |
|------|---------|
| `QUICK_START.txt` | Visual quick reference card |
| `IMMEDIATE_CHECKLIST.md` | Step-by-step checklist |
| `MIGRATION_GUIDE.md` | Comprehensive testing guide |
| `ROLE_MAPPING_FIX_SUMMARY.md` | Complete technical summary |
| `migrations/README.md` | Migration file documentation |

---

## ✅ What Was Fixed

### Role Consistency ✅
- **Before**: Mixed 'customer' and 'parent' roles causing errors
- **After**: Consistent 'parent' role everywhere
- **Impact**: Users now correctly routed to their dashboards

### Wallet Functionality ✅
- **Before**: Missing wallet columns and update function
- **After**: Full wallet support with RPC function
- **Impact**: Users can save and retrieve wallet addresses

### Code Consistency ✅
- **Before**: Potential mismatches between code and database
- **After**: All code uses 'parent' role consistently
- **Impact**: No more role-related errors

---

## 🎯 Role Mapping Reference

| User Type | Database Role | Auth Screen | Dashboard |
|-----------|--------------|-------------|-----------|
| Parent | `'parent'` | ParentAuth | ParentDashboard |
| Caregiver | `'caregiver'` | CaregiverAuth | CaregiverDashboard |
| Admin | `'admin'` | AdminAuth | AdminDashboard |

**⚠️ CRITICAL**: Always use `'parent'`, NEVER `'customer'`

---

## 🔍 Verification

After running migrations, verify in Supabase SQL Editor:

```sql
-- Check roles are correct
SELECT role, COUNT(*) FROM users GROUP BY role;

-- Should show: parent, caregiver, admin
-- Should NOT show: customer

-- Check wallet columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'app_user' 
AND column_name IN ('solana_wallet_address', 'preferred_token');

-- Should return 2 rows
```

---

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Role constraint violation" | Run `012_fix_role_consistency.sql` |
| "Column does not exist: solana_wallet_address" | Run `005_complete_wallet_fix.sql` |
| "Wrong dashboard redirect" | Check user role in database |
| "Email already exists" | Use different email or delete from Auth |

---

## 📊 Success Criteria

✅ All 3 migrations run without errors  
✅ Verification script shows "ALL CHECKS PASSED"  
✅ Caregiver signup → CaregiverDashboard  
✅ Parent signup → ParentDashboard  
✅ Wallet save functionality works  
✅ No 'customer' roles in database  

---

## 🎉 Next Steps After Completion

1. ✅ Test with multiple user accounts
2. ✅ Monitor logs for any errors
3. ✅ Update any custom queries that reference 'customer'
4. ✅ Consider cleanup of old app_user table (optional)
5. ✅ Backup database before further changes

---

## 📞 Need Help?

1. Check `IMMEDIATE_CHECKLIST.md` for detailed steps
2. Review `MIGRATION_GUIDE.md` for testing procedures
3. See `ROLE_MAPPING_FIX_SUMMARY.md` for technical details
4. Check Supabase logs for error messages

---

## 🔐 Security Notes

- ✅ All migrations are safe and idempotent
- ✅ RLS policies protect user data
- ✅ Email verification required
- ✅ No data loss during migration
- ✅ Existing users automatically migrated

---

**Status**: ⚠️ Ready to Deploy  
**Priority**: 🔴 Critical  
**Time Required**: ⏱️ 15-20 minutes  
**Risk Level**: 🟢 Low (migrations are safe)  

---

## 🚀 START HERE

1. Open Supabase SQL Editor
2. Run `migrations/005_complete_wallet_fix.sql`
3. Run `migrations/006_fix_role_constraint.sql`
4. Run `migrations/012_fix_role_consistency.sql`
5. Run `migrations/VERIFY_MIGRATIONS.sql`
6. Test authentication flows
7. Test wallet functionality
8. ✅ Done!

---

**Last Updated**: 2024  
**Version**: 1.0  
**Author**: Amazon Q Developer

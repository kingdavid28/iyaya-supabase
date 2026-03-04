# Authentication & Role Mapping Flow

## 🔄 Complete User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER STARTS APP                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Choose Role    │
                    └─────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
        ┌──────────────┐            ┌──────────────┐
        │ ParentAuth   │            │CaregiverAuth │
        │ Screen       │            │ Screen       │
        └──────────────┘            └──────────────┘
                │                           │
                ▼                           ▼
        ┌──────────────┐            ┌──────────────┐
        │ Signup Form  │            │ Signup Form  │
        │ role='parent'│            │role='caregiver'│
        └──────────────┘            └──────────────┘
                │                           │
                └─────────────┬─────────────┘
                              ▼
                    ┌─────────────────┐
                    │  AuthContext    │
                    │  signUp()       │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Supabase Auth   │
                    │ Create Account  │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Create Profile  │
                    │ in 'users' table│
                    │ with role       │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Send Verification│
                    │ Email           │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ User Verifies   │
                    │ Email           │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ User Logs In    │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Fetch Profile   │
                    │ with Role       │
                    └─────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
        ┌──────────────┐            ┌──────────────┐
        │ role='parent'│            │role='caregiver'│
        └──────────────┘            └──────────────┘
                │                           │
                ▼                           ▼
        ┌──────────────┐            ┌──────────────┐
        │ParentDashboard│           │CaregiverDashboard│
        └──────────────┘            └──────────────┘
```

## 🗄️ Database Tables & Roles

```
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE STRUCTURE                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ auth.users (Supabase Auth)                                      │
├─────────────────────────────────────────────────────────────────┤
│ • id (UUID)                                                     │
│ • email                                                         │
│ • encrypted_password                                            │
│ • email_confirmed_at                                            │
│ • user_metadata (JSON)                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ References
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ users (Primary Profile Table) ✅ PREFERRED                      │
├─────────────────────────────────────────────────────────────────┤
│ • id (UUID) → auth.users.id                                     │
│ • email                                                         │
│ • role ('parent' | 'caregiver' | 'admin') ✅                    │
│ • name                                                          │
│ • first_name                                                    │
│ • last_name                                                     │
│ • phone                                                         │
│ • auth_provider                                                 │
│ • created_at                                                    │
│ • updated_at                                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Also synced to
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ app_user (Legacy Table) ⚠️ BEING PHASED OUT                     │
├─────────────────────────────────────────────────────────────────┤
│ • id (UUID)                                                     │
│ • email                                                         │
│ • role ('parent' | 'caregiver' | 'admin') ✅                    │
│ • solana_wallet_address ✅ NEW                                  │
│ • preferred_token ('SOL' | 'USDC') ✅ NEW                       │
│ • created_at                                                    │
└─────────────────────────────────────────────────────────────────┘
```

## 🔐 Role Constraint (FIXED)

```
BEFORE FIX ❌:
┌─────────────────────────────────────────┐
│ app_user_role_check                     │
├─────────────────────────────────────────┤
│ role IN ('customer', 'caregiver', 'admin')│
└─────────────────────────────────────────┘
         ↓
    Code uses 'parent' ❌
    Database expects 'customer' ❌
    = CONSTRAINT VIOLATION ERROR ❌

AFTER FIX ✅:
┌─────────────────────────────────────────┐
│ app_user_role_check                     │
├─────────────────────────────────────────┤
│ role IN ('parent', 'caregiver', 'admin')│
└─────────────────────────────────────────┘
         ↓
    Code uses 'parent' ✅
    Database expects 'parent' ✅
    = SUCCESS ✅
```

## 💰 Wallet Functionality (ADDED)

```
┌─────────────────────────────────────────────────────────────────┐
│                      WALLET SAVE FLOW                           │
└─────────────────────────────────────────────────────────────────┘

User in Dashboard
       │
       ▼
Navigate to Wallet Settings
       │
       ▼
Enter Wallet Address
       │
       ▼
Select Token (SOL/USDC)
       │
       ▼
Click Save
       │
       ▼
┌─────────────────────┐
│ Call RPC Function   │
│ update_user_wallet()│
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│ Update app_user     │
│ • wallet_address    │
│ • preferred_token   │
└─────────────────────┘
       │
       ▼
Success Message ✅
       │
       ▼
Data Persists ✅
```

## 🔄 Migration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      MIGRATION SEQUENCE                         │
└─────────────────────────────────────────────────────────────────┘

START
  │
  ▼
┌─────────────────────────────────────────┐
│ 005_complete_wallet_fix.sql             │
├─────────────────────────────────────────┤
│ • Add solana_wallet_address column      │
│ • Add preferred_token column            │
│ • Create update_user_wallet() function  │
│ • Update RLS policies                   │
└─────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────┐
│ 006_fix_role_constraint.sql             │
├─────────────────────────────────────────┤
│ • Update role constraint                │
│ • Migrate 'customer' → 'parent'         │
│ • Verify no invalid roles               │
└─────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────┐
│ 012_fix_role_consistency.sql            │
├─────────────────────────────────────────┤
│ • Fix both app_user and users tables    │
│ • Update is_admin() function            │
│ • Verify consistency                    │
└─────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────┐
│ VERIFY_MIGRATIONS.sql                   │
├─────────────────────────────────────────┤
│ • Check role constraints                │
│ • Check wallet columns                  │
│ • Check RPC function                    │
│ • Show summary                          │
└─────────────────────────────────────────┘
  │
  ▼
✅ ALL CHECKS PASSED
  │
  ▼
READY FOR TESTING
```

## 🧪 Testing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      TESTING SEQUENCE                           │
└─────────────────────────────────────────────────────────────────┘

Test 1: Caregiver Flow
  │
  ├─ Signup with test email
  ├─ Verify email
  ├─ Login
  └─ ✅ Should land on CaregiverDashboard

Test 2: Parent Flow
  │
  ├─ Signup with test email
  ├─ Verify email
  ├─ Login
  └─ ✅ Should land on ParentDashboard

Test 3: Wallet Flow
  │
  ├─ Login as any user
  ├─ Navigate to wallet settings
  ├─ Enter wallet address
  ├─ Select token preference
  ├─ Save
  ├─ Refresh page
  └─ ✅ Data should persist

Test 4: Database Verification
  │
  ├─ Check user roles in database
  ├─ Verify no 'customer' roles exist
  ├─ Verify wallet columns exist
  └─ ✅ All checks pass
```

## 📊 Success Metrics

```
┌─────────────────────────────────────────────────────────────────┐
│                      SUCCESS INDICATORS                         │
└─────────────────────────────────────────────────────────────────┘

Database:
  ✅ Role constraint accepts 'parent'
  ✅ No 'customer' roles exist
  ✅ Wallet columns exist
  ✅ RPC function exists
  ✅ RLS policies correct

Authentication:
  ✅ Caregiver signup works
  ✅ Parent signup works
  ✅ Email verification works
  ✅ Login redirects correctly
  ✅ Role-based routing works

Wallet:
  ✅ Can save wallet address
  ✅ Can select token preference
  ✅ Data persists after refresh
  ✅ RPC function works
  ✅ RLS allows user access

Code:
  ✅ ParentAuth uses 'parent'
  ✅ CaregiverAuth uses 'caregiver'
  ✅ AuthContext handles roles
  ✅ No 'customer' references
  ✅ Consistent role mapping
```

---

**Visual Guide Version**: 1.0  
**Last Updated**: 2024  
**Status**: Ready for Implementation

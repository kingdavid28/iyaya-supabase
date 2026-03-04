# Wallet Setup Fix Guide

## Problem

Wallet data is not saving to Supabase when users try to add/update their wallet address.

## Root Cause

Row Level Security (RLS) policies on the `app_user` table may be too restrictive and blocking UPDATE operations for wallet fields.

## Solution

### Step 1: Run the RLS Migration in Supabase

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **SQL Editor** (in the left sidebar)
4. Click **New query**
5. Copy and paste the contents of `migrations/008_fix_wallet_rls_policies.sql`
6. Click **Run** (or press Ctrl+Enter)

**OR** if you prefer to run commands individually:

```sql
-- Drop conflicting policies
DROP POLICY IF EXISTS "Users can update their own profile" ON app_user;
DROP POLICY IF EXISTS "allow_update_own_profile" ON app_user;
DROP POLICY IF EXISTS "allow_own_profile_update" ON app_user;
DROP POLICY IF EXISTS "Users can view their own profile" ON app_user;
DROP POLICY IF EXISTS "Users can create their profile" ON app_user;

-- Create new comprehensive policies
CREATE POLICY "app_user_update_own_profile" ON app_user
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "app_user_select_own_profile" ON app_user
  FOR SELECT
  USING (auth.uid() = id OR role = 'admin');

CREATE POLICY "app_user_insert_own_profile" ON app_user
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Enable RLS
ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;
```

### Step 2: Verify the Policies

Run this query to confirm policies are set correctly:

```sql
SELECT policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'app_user'
ORDER BY policyname;
```

You should see:

- `app_user_insert_own_profile` - INSERT
- `app_user_select_own_profile` - SELECT
- `app_user_update_own_profile` - UPDATE

### Step 3: Test Wallet Save

1. Refresh the web app (or restart with `npx expo start --web`)
2. Navigate to the **Wallet** tab in the dashboard
3. Try adding or updating a wallet address
4. You should see success toast notification

### Step 4: Monitor for Errors

Open **Browser Developer Console** (F12) and look for:

**Success:**

```
💾 Attempting to save wallet for user: [user-id]
✅ Wallet saved successfully: {address: "...", token: "USDC"}
```

**Errors:**

```
❌ Error saving wallet: permission denied
```

If you see permission errors, check Step 1 was completed correctly.

## What Changed

### walletService.js

- Added detailed logging for debugging
- Added user existence check before saving
- Auto-creates user entry if needed
- Logs full error details

### WalletManagementTab.js

- Enhanced error messages
- Categorizes errors for user
- Provides recovery suggestions
- Better validation feedback

### Database

- Fixed RLS policies to allow wallet updates
- Ensured users can only update their own data
- Admin can view all profiles

## Troubleshooting

### "Permission denied" error

- Run the RLS migration again (Step 1)
- Check that the policies were created: `SELECT * FROM pg_policies WHERE tablename = 'app_user';`
- Verify RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'app_user';` (should show `t` for TRUE)

### "User not found" error

- Log out and log back in
- Make sure you're authenticated

### Still not working?

1. Check browser console for detailed error (F12)
2. Check Supabase logs: Dashboard > Logs > API Activity
3. Try disabling RLS temporarily to isolate the issue:
   ```sql
   ALTER TABLE app_user DISABLE ROW LEVEL SECURITY;
   ```
   If this fixes it, the issue is definitely RLS-related.

## Verification Checklist

- [ ] Migration 008 executed successfully in Supabase
- [ ] Policies show in `pg_policies` query
- [ ] RLS is enabled on app_user table
- [ ] Can refresh wallet tab without errors
- [ ] Wallet address saves successfully
- [ ] Success toast appears after save
- [ ] Saved data persists after page refresh

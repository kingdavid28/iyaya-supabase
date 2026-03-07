# OAuth Callback Flow - Fix Summary

## Latest Fix: Malformed URL with Double Question Marks ✅

**Issue**: The OAuth callback URL has `??code=` instead of `?code=`
- Example: `https://iyaya-supabase.vercel.app/??code=123bc2e5-6187-4551-b741-d5518487b81a`
- This malformed URL prevents Supabase from parsing the OAuth code

**Root Cause**: The `callback.html` file was redirecting to `/?${search}`, which created `/?code=...` that became `??code=...` when combined with the existing `?` in the URL.

**Fixes Applied**:
1. **Updated `public/auth/callback.html`** - Now detects and fixes `??` URLs, and redirects to `/auth/callback?code=...` instead of `/?code=...`
2. **Updated `AuthCallbackScreen.js`** - Detects and normalizes malformed URLs before processing
3. **Updated `AuthContext.js`** - Normalizes URLs in `handleOAuthCallback()`
4. **Updated `vercel.json`** - Changed rewrite to use `/index.html` instead of `/auth/callback.html`

## How It Works Now

1. Supabase redirects to: `https://iyaya-supabase.vercel.app/auth/callback?code=xxx`
2. Vercel serves `callback.html` (if still configured) OR `index.html` (new config)
3. If `callback.html` loads:
   - Detects `??` and fixes it to `?`
   - Redirects to `/auth/callback?code=xxx` (React route)
4. React app (`AuthCallbackScreen`) processes the OAuth code
5. User is authenticated and redirected to dashboard

## Previous Fixes

### 1. Missing Email Field Error ✅
**Error**: `null value in column 'email' violates not-null constraint`

**Root Cause**: The `ensureUserProfileExists()` function wasn't including required fields when creating user profiles.

**Fix Applied**: Updated `AuthContext.js` line ~200 to include:
```javascript
const userData = {
  id: authUser.id,           // Added
  email: authUser.email,     // Added - fixes the null constraint error
  name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || null,  // Added
  role: role,
  updated_at: now
};
```

### 2. Better OAuth Error Detection ✅
**Problem**: Couldn't tell if OAuth tokens were missing vs session issues.

**Fix Applied**: Added URL token validation in `handleOAuthCallback()` (line ~730):
```javascript
// Check if we have OAuth tokens in the URL
const hasAccessToken = window.location.hash.includes('access_token')
const hasCode = window.location.search.includes('code=')

if (!hasAccessToken && !hasCode) {
  throw new AuthError(
    'OAuth tokens not received. Please check your Supabase OAuth configuration.',
    AuthErrorTypes.AUTH_ERROR
  )
}
```

### 3. Enhanced Logging ✅
Added detailed console logs throughout the OAuth flow to help identify where issues occur.

## Critical Issue: OAuth Not Configured ⚠️

**UPDATE**: The URL you shared shows OAuth IS working! The `code=123bc2e5...` is the OAuth authorization code from Supabase. The issue was just the malformed URL format (`??` instead of `?`), which is now fixed.

## What You Need to Do

### Step 1: Configure Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your OAuth 2.0 Client ID
3. Add this redirect URI:
   ```
   https://myiyrmiiywwgismcpith.supabase.co/auth/v1/callback
   ```
4. Save

### Step 2: Configure Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to: Your Project → Authentication → Providers → Google
3. Enable Google provider
4. Enter your Google Client ID and Secret
5. Save

### Step 3: Set Redirect URLs in Supabase
1. Go to: Authentication → URL Configuration
2. Set **Site URL**: `http://localhost:8081`
3. Add **Redirect URLs**:
   - `http://localhost:8081/auth/callback`
   - `https://iyaya-supabase.vercel.app/auth/callback`

### Step 4: Test
1. Clear browser cache: Open console, run `localStorage.clear()`
2. Try Google sign-in
3. The OAuth flow should now work correctly with the URL normalization fix

## Root Cause of Double Question Marks - FIXED ✅

**Root Cause Found**: The `vercel.json` was rewriting `/auth/callback` to `/auth/callback.html`, which caused Vercel to mangle the query parameters when Supabase redirected with `?code=xxx`.

**Fix Applied**: Updated `vercel.json` to rewrite `/auth/callback` to `/index.html` instead, letting your React app handle the OAuth callback directly.

**What Changed**:
```json
// Before (caused ??code= issue)
{
  "source": "/auth/callback",
  "destination": "/auth/callback.html"
}

// After (fixed)
{
  "source": "/auth/callback",
  "destination": "/index.html"
}
```

The `callback.html` file is no longer needed since your React app (`AuthCallbackScreen.js`) handles the OAuth callback properly.

## About the 409 Conflicts

The `409 Conflict` errors on `caregiver_profiles` table are handled by the code with retry logic. If they persist after OAuth is configured, it might indicate duplicate data in your database.

## Files Modified
- `src/contexts/AuthContext.js` - Fixed email field, added OAuth validation, URL normalization
- `src/screens/AuthCallbackScreen.js` - Added URL normalization for malformed URLs
- `public/auth/callback.html` - Fixed redirect logic to prevent double question marks (PRIMARY FIX)
- `vercel.json` - Fixed rewrite rule to prevent double question marks
- `OAUTH_TROUBLESHOOTING.md` - Detailed troubleshooting guide

## Next Steps After Configuration
Once OAuth is properly configured and tokens are flowing:
1. Test the complete sign-in flow
2. Verify user profiles are created correctly
3. Check that role assignment works
4. Monitor for any remaining 409 conflicts

The code is ready - it just needs the OAuth configuration to be completed in Google Cloud Console and Supabase Dashboard.

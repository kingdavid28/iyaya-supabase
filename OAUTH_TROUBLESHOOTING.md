# OAuth Callback Flow - Fixes Applied

## Issues Fixed

### 1. Missing Email Field in User Profile Creation
**Problem**: The `ensureUserProfileExists()` function was not including the `email` field when upserting to the `users` table, causing "null value in column 'email' violates not-null constraint" errors.

**Fix**: Updated the `userData` object to include:
- `id: authUser.id` - Ensures proper upsert matching
- `email: authUser.email` - Provides required email field
- `name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || null` - Extracts name from OAuth metadata

### 2. Better Error Handling in OAuth Callback
**Problem**: The callback handler couldn't distinguish between missing OAuth tokens vs missing session.

**Fix**: Added URL token validation before attempting to get session:
- Checks for `access_token` in URL hash
- Checks for `code` in URL query params
- Provides specific error message if tokens are missing
- Logs detailed OAuth URL information for debugging

## CRITICAL: OAuth Configuration Issue Detected

Your logs show: `{hasAccessToken: false, hasCode: false, hash: '', search: ''}`

This means **Google is NOT sending OAuth tokens back to your app**. This is a configuration issue, not a code issue.

## Required Steps to Fix OAuth

### 1. Get Your Supabase Project Reference URL
Your Supabase URL is: `https://myiyrmiiywwgismcpith.supabase.co`

The OAuth callback URL that Google will redirect to is:
`https://myiyrmiiywwgismcpith.supabase.co/auth/v1/callback`

### 2. Configure Google Cloud Console
Go to: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

1. Select your OAuth 2.0 Client ID
2. Under "Authorized redirect URIs", add:
   - `https://myiyrmiiywwgismcpith.supabase.co/auth/v1/callback`
3. Save changes

### 3. Configure Supabase Dashboard
Go to: [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → Authentication → Providers → Google

1. Enable Google provider
2. Enter your Google Client ID
3. Enter your Google Client Secret
4. Save

### 4. Configure Site URL in Supabase
Go to: Supabase Dashboard → Authentication → URL Configuration

Set these URLs:
- **Site URL**: `http://localhost:8081` (for development)
- **Redirect URLs**: Add both:
  - `http://localhost:8081/auth/callback`
  - `https://iyaya-supabase.vercel.app/auth/callback`

### 5. Test the Flow
1. Clear browser cache and localStorage: `localStorage.clear()` in console
2. Try signing in with Google
3. Watch the browser console for logs
4. The URL should redirect through Google and back with tokens

## Common Issues

**Issue**: "No OAuth tokens in URL"
**Cause**: Google redirect URI doesn't match Supabase callback URL
**Fix**: Ensure Google Cloud Console has the exact Supabase callback URL

**Issue**: 409 Conflict on caregiver_profiles
**Cause**: Duplicate user_id in caregiver_profiles table
**Fix**: This is now handled by the code with proper error handling

**Issue**: "null value in column 'email'"
**Cause**: Missing email field in user creation
**Fix**: Already fixed in the code

## Debugging Tips

The code now logs detailed information:
- OAuth URL tokens presence
- Session details after OAuth
- Profile creation attempts
- Any errors with full context

Check your browser console for these logs to identify where the flow is breaking.

# Google OAuth Troubleshooting Guide

## Issues Fixed

### 1. Password Reset Not Working
- **Problem**: ResetPasswordScreen was calling non-existent `confirmPasswordReset` method
- **Solution**: Updated to use `updatePassword` from AuthContext
- **Solution**: Added ResetPasswordScreen to navigation routes

### 2. Google Sign-In Implementation

#### Changes Made:
1. **Role Hint Storage**: Now stores role hint in sessionStorage before OAuth redirect
2. **Removed Connection Test**: Removed unnecessary Supabase connection test that could cause delays
3. **Improved Callback Handling**: AuthCallbackScreen now reads role hint from sessionStorage
4. **Better Error Handling**: Added detailed error logging and user-friendly error messages

#### How Google OAuth Works Now:

1. User clicks "Continue with Google" on CaregiverAuth or ParentAuth
2. `signInWithGoogle('caregiver')` or `signInWithGoogle('parent')` is called
3. Role hint is stored in sessionStorage
4. User is redirected to Google OAuth
5. After Google authentication, user is redirected to `/auth/callback`
6. AuthCallbackScreen reads role hint from sessionStorage
7. `handleOAuthCallback` creates user profile with correct role
8. User is redirected to appropriate dashboard

## Common Issues and Solutions

### Issue: "Google Sign-In not working"

**Possible Causes:**

1. **Supabase OAuth Not Configured**
   - Go to Supabase Dashboard → Authentication → Providers
   - Enable Google provider
   - Add your Google OAuth Client ID and Secret
   - Add authorized redirect URIs:
     - `https://myiyrmiiywwgismcpith.supabase.co/auth/v1/callback`
     - `https://iyaya-supabase.vercel.app/auth/callback`

2. **Google Cloud Console Configuration**
   - Ensure OAuth 2.0 Client ID is created
   - Add authorized JavaScript origins:
     - `https://iyaya-supabase.vercel.app`
     - `http://localhost:8081` (for development)
   - Add authorized redirect URIs:
     - `https://myiyrmiiywwgismcpith.supabase.co/auth/v1/callback`
     - `https://iyaya-supabase.vercel.app/auth/callback`

3. **Missing Environment Variables**
   - Check `.env` file has:
     ```
     EXPO_PUBLIC_SUPABASE_URL=https://myiyrmiiywwgismcpith.supabase.co
     EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
     ```

4. **Browser Blocking Popups**
   - Ensure browser allows popups for your domain
   - Check browser console for blocked popup warnings

5. **Session Storage Issues**
   - Clear browser cache and cookies
   - Try in incognito/private mode

### Issue: "User redirected but not logged in"

**Solutions:**
1. Check browser console for errors
2. Verify role hint is being stored: Look for `💾 Stored role hint in sessionStorage` log
3. Check if profile creation succeeds: Look for `✅ Profile created successfully` log
4. Verify user has correct role in Supabase `users` table

### Issue: "OAuth redirect URL mismatch"

**Solutions:**
1. Ensure redirect URL in code matches Supabase configuration
2. Current redirect URL: `https://iyaya-supabase.vercel.app/auth/callback`
3. Update in Supabase Dashboard → Authentication → URL Configuration

## Testing Google OAuth

1. Open browser console (F12)
2. Click "Continue with Google"
3. Check for these logs:
   - `🔄 Starting Google Sign-In...`
   - `💾 Stored role hint in sessionStorage`
   - `🔗 OAuth redirect URL`
   - `✅ Google OAuth response`
4. After redirect:
   - `🔄 Processing OAuth callback...`
   - `🔍 Role hint from sessionStorage`
   - `✅ OAuth session found`
   - `✅ User authenticated with role`

## Database Schema Requirements

Ensure these tables exist in Supabase:

### users table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  name TEXT,
  role TEXT NOT NULL CHECK (role IN ('parent', 'caregiver')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### caregiver_profiles table
```sql
CREATE TABLE caregiver_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) UNIQUE,
  bio TEXT,
  experience TEXT,
  skills TEXT[],
  hourly_rate NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Next Steps if Still Not Working

1. Check Supabase logs: Dashboard → Logs → Auth Logs
2. Verify Google OAuth credentials are correct
3. Test with a different Google account
4. Check if email domain is restricted in Google Cloud Console
5. Verify Supabase project is not paused or has billing issues

# Fix Google OAuth 400 Error

## Problem
Google OAuth failing with 400 Bad Request - missing redirect URL configuration

## Solution

### 1. Configure Supabase Redirect URLs

Go to Supabase Dashboard → Authentication → URL Configuration

Add these URLs:

**Site URL:**
```
http://localhost:8081
```

**Redirect URLs:**
```
http://localhost:8081/auth/callback
http://localhost:19006/auth/callback
exp://localhost:8081
exp://localhost:19006
```

### 2. Update Google Cloud Console

Go to Google Cloud Console → APIs & Services → Credentials

**Authorized JavaScript origins:**
```
http://localhost:8081
http://localhost:19006
```

**Authorized redirect URIs:**
```
http://localhost:8081/auth/callback
http://localhost:19006/auth/callback
https://myiyrmiiywwgismcpith.supabase.co/auth/v1/callback
```

### 3. Verify Environment Variables

Check `.env.production`:
```
EXPO_PUBLIC_SUPABASE_URL=https://myiyrmiiywwgismcpith.supabase.co
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=998196800470-k3los9p540onooj79g69q9urln8lqbn3.apps.googleusercontent.com
```

### 4. Restart App

```bash
npm start -- --clear
```

## Alternative: Use Email/Password

If Google OAuth is not critical, use email/password authentication which is already working.

# PKCE Flow Fix - OAuth 400 Error

## The Problem

You were getting a 400 Bad Request error when Supabase tried to exchange the OAuth code for a session:
```
POST https://myiyrmiiywwgismcpith.supabase.co/auth/v1/token?grant_type=pkce 400 (Bad Request)
```

## Root Cause

The PKCE (Proof Key for Code Exchange) authorization code can only be used ONCE. Your flow was attempting to use it multiple times:

1. Supabase redirects to: `/auth/callback?code=xxx`
2. `callback.html` loads and tries to process the code
3. `callback.html` redirects to `/?code=xxx`
4. Supabase tries to exchange the code again → **400 Error** (code already used)

## The Fix

Updated `callback.html` to immediately redirect to the React app's `/auth/callback` route WITHOUT processing the code:

**Before** (caused 400 error):
```javascript
// callback.html redirected to home, causing Supabase to process code twice
window.location.href = `/?${search}`;
```

**After** (fixed):
```javascript
// callback.html redirects to React app, which processes code once
window.location.href = `/auth/callback${search}${hash}`;
```

## How It Works Now

1. **Supabase redirects** → `https://iyaya-supabase.vercel.app/auth/callback?code=xxx`
2. **Vercel serves** → `callback.html` (due to rewrite rule)
3. **callback.html** → Fixes any `??` issues, then redirects to `/auth/callback?code=xxx`
4. **React app loads** → `AuthCallbackScreen` component
5. **AuthCallbackScreen** → Calls `handleOAuthCallback()`
6. **handleOAuthCallback()** → Calls `supabase.auth.getSession()`
7. **Supabase** → Exchanges code for session (ONCE)
8. **Success** → User is authenticated and redirected to dashboard

## Key Points

- PKCE codes are single-use only
- The code must be exchanged by Supabase's client library, not manually
- `supabase.auth.getSession()` automatically detects and exchanges the code
- Multiple redirects with the code in the URL will cause 400 errors

## Files Modified

- `public/auth/callback.html` - Now redirects to `/auth/callback` instead of `/`
- `src/screens/AuthCallbackScreen.js` - Already handles the OAuth callback correctly
- `src/contexts/AuthContext.js` - Already has proper session handling

## Testing

After deploying, the OAuth flow should work without 400 errors. Watch the console logs:

```
🔐 OAuth Callback HTML Loaded
✅ OAuth data found, redirecting to React app
🔄 Redirecting to: /auth/callback?code=xxx
🎯 AuthCallbackScreen mounted!
🔄 Processing OAuth callback...
🔄 Handling OAuth callback...
✅ OAuth session found
✅ User authenticated with role: caregiver
🧭 Navigating to: CaregiverDashboard
```

No 400 errors should appear!

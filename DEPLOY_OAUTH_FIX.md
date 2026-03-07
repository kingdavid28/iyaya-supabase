# Deploy OAuth Fix

## What Was Fixed

1. **Email constraint error** - User profiles now include required email field
2. **Malformed URL handling** - Multiple layers of protection:
   - `callback.html` detects and fixes `??` before redirecting
   - React app normalizes URLs if they slip through
   - Proper redirect to `/auth/callback?code=...` instead of `/?code=...`
3. **Root cause** - Fixed `callback.html` redirect logic (primary fix) and Vercel configuration

## Deploy Steps

### 1. Commit and Push Changes
```bash
git add .
git commit -m "Fix OAuth callback - handle malformed URLs at multiple layers"
git push
```

### 2. Vercel Will Auto-Deploy
Vercel will automatically deploy when you push to your main branch.

### 3. Clear Vercel Cache (Important!)
Since we modified `callback.html`, you may need to clear Vercel's cache:
1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → General
4. Scroll to "Build & Development Settings"
5. Click "Clear Cache" or redeploy

Alternatively, force a fresh deployment:
```bash
vercel --prod --force
```

### 4. Test the OAuth Flow
1. Go to: https://iyaya-supabase.vercel.app
2. Click "Sign in with Google"
3. Complete Google authentication
4. You should be redirected back successfully

## What to Watch For

### Success Indicators
- URL should be: `https://iyaya-supabase.vercel.app/auth/callback?code=xxx` (single `?`)
- Console logs should show: "✅ OAuth session found"
- User should be redirected to appropriate dashboard

### If Issues Persist
1. Clear browser cache and localStorage
2. Check browser console for error messages
3. Verify Supabase OAuth configuration:
   - Google provider is enabled
   - Redirect URLs include: `https://iyaya-supabase.vercel.app/auth/callback`
   - Site URL is set correctly

## Files Changed
- `src/contexts/AuthContext.js` - Email field fix, URL normalization
- `src/screens/AuthCallbackScreen.js` - URL normalization
- `public/auth/callback.html` - Fixed redirect logic (PRIMARY FIX)
- `vercel.json` - Updated rewrite rules
- `OAUTH_FIX_SUMMARY.md` - Documentation
- `OAUTH_TROUBLESHOOTING.md` - Troubleshooting guide

## Next Steps After Deployment
1. Test OAuth flow with Google
2. Verify user profiles are created correctly
3. Check that role assignment works
4. Monitor for any 409 conflicts (should be handled by retry logic)

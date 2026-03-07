# OAuth Fix - Deployment Checklist

## Critical Fix Applied
Fixed the PKCE 400 error by ensuring the OAuth authorization code is only used once.

## Pre-Deployment Checklist

- [ ] All code changes committed
- [ ] `public/auth/callback.html` updated (redirects to `/auth/callback` not `/`)
- [ ] `src/contexts/AuthContext.js` includes email field in user creation
- [ ] `src/screens/AuthCallbackScreen.js` has URL normalization
- [ ] `vercel.json` rewrite rules updated

## Deployment Steps

### 1. Commit and Push
```bash
git add .
git commit -m "Fix OAuth PKCE flow - prevent 400 error by using code only once"
git push
```

### 2. Wait for Vercel Deployment
- Vercel will auto-deploy from your main branch
- Check deployment status in Vercel dashboard
- Estimated time: 2-3 minutes

### 3. Clear Vercel Cache (if needed)
If the old `callback.html` is still being served:
```bash
vercel --prod --force
```

Or in Vercel Dashboard:
- Go to Settings → General
- Scroll to "Build & Development Settings"
- Click "Clear Cache"

## Post-Deployment Testing

### 1. Clear Browser State
Open browser console and run:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### 2. Test OAuth Flow
1. Go to: https://iyaya-supabase.vercel.app
2. Click "Sign in with Google"
3. Complete Google authentication
4. Watch console logs

### 3. Expected Console Output
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

### 4. Success Indicators
- ✅ No 400 Bad Request errors
- ✅ No `??code=` in URL (should be `?code=`)
- ✅ User redirected to dashboard
- ✅ User profile created in database with email

### 5. Verify Database
Check that user was created properly:

**users table**:
```sql
SELECT id, email, name, role, created_at 
FROM users 
WHERE email = 'your-email@gmail.com';
```

**caregiver_profiles table** (if role is caregiver):
```sql
SELECT user_id, bio, experience, created_at
FROM caregiver_profiles 
WHERE user_id = 'your-user-id';
```

## Troubleshooting

### Issue: Still getting 400 error
**Possible Causes**:
1. Old `callback.html` still cached by Vercel
2. Browser cache not cleared
3. OAuth code expired (try signing in again)

**Solutions**:
1. Force redeploy: `vercel --prod --force`
2. Clear browser: `localStorage.clear(); sessionStorage.clear();`
3. Try OAuth flow again with fresh code

### Issue: Still seeing `??code=`
**Cause**: Vercel cache not cleared

**Solution**: 
1. Clear Vercel cache in dashboard
2. Or force redeploy
3. Hard refresh browser (Ctrl+Shift+R)

### Issue: "No OAuth tokens found"
**Cause**: OAuth not configured in Supabase/Google

**Solution**: Follow configuration steps in `OAUTH_FIX_SUMMARY.md`

### Issue: Email constraint error
**Cause**: Old code still deployed

**Solution**: Verify deployment completed and `AuthContext.js` includes email field

## Rollback Plan

If issues persist, you can rollback:
```bash
git revert HEAD
git push
```

Then investigate the specific error before redeploying.

## Success Criteria

- [ ] OAuth sign-in completes without errors
- [ ] User is redirected to correct dashboard
- [ ] User profile exists in database with email
- [ ] No 400 errors in console
- [ ] No `??code=` URLs

## Next Steps After Success

1. Test with multiple users
2. Test both caregiver and parent roles
3. Monitor for any 409 conflicts
4. Consider removing `callback.html` entirely if using Vercel rewrite to `/index.html`

## Documentation Created

- `OAUTH_FIX_SUMMARY.md` - Complete overview of all fixes
- `PKCE_FLOW_FIX.md` - Detailed explanation of PKCE 400 error
- `OAUTH_TROUBLESHOOTING.md` - Configuration and troubleshooting guide
- `OAUTH_TESTING_GUIDE.md` - Testing procedures
- `DEPLOY_OAUTH_FIX.md` - Deployment instructions
- `DEPLOY_CHECKLIST.md` - This file

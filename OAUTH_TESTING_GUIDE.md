# OAuth Testing Guide

## Quick Test After Deployment

### 1. Clear Everything
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
4. Watch the URL changes

### 3. Expected URL Flow

**Step 1**: Supabase redirects to:
```
https://iyaya-supabase.vercel.app/auth/callback?code=xxx-xxx-xxx
```

**Step 2**: `callback.html` loads and checks URL:
- If URL has `??`, it fixes it to `?` and reloads
- Otherwise, redirects to: `/auth/callback?code=xxx`

**Step 3**: React app (`AuthCallbackScreen`) processes:
- Extracts the code from URL
- Calls Supabase to exchange code for session
- Creates user profile with email
- Redirects to dashboard

### 4. Console Logs to Watch For

**Success Path**:
```
🔐 OAuth Callback Page Loaded
✅ OAuth search params found, redirecting to app
🔄 Redirecting to React app with OAuth params...
🎯 AuthCallbackScreen mounted!
🔄 Processing OAuth callback...
✅ OAuth session found
✅ User authenticated with role: caregiver
🧭 Navigating to: CaregiverDashboard
```

**If Double Question Mark Detected**:
```
🔐 OAuth Callback Page Loaded
🔧 Fixing malformed URL with double question marks
🔧 Fixed URL: https://iyaya-supabase.vercel.app/auth/callback?code=xxx
[Page reloads with fixed URL]
```

### 5. Common Issues

**Issue**: Still seeing `??code=` after deployment
**Solution**: Clear Vercel cache or force redeploy:
```bash
vercel --prod --force
```

**Issue**: "No OAuth tokens found in URL"
**Solution**: Check Supabase OAuth configuration:
- Google provider is enabled
- Redirect URL includes: `https://iyaya-supabase.vercel.app/auth/callback`
- Site URL is set correctly

**Issue**: "null value in column 'email'"
**Solution**: This should be fixed now. If it persists, check the console logs for the exact error.

**Issue**: 409 Conflict on caregiver_profiles
**Solution**: The code has retry logic. If it persists, there may be duplicate data in the database.

### 6. Verify User Profile Creation

After successful login, check the database:

**users table**:
```sql
SELECT id, email, name, role FROM users WHERE email = 'your-email@gmail.com';
```

Should show:
- `id`: User UUID
- `email`: Your Google email
- `name`: Your Google name
- `role`: 'caregiver' or 'parent'

**caregiver_profiles table** (if role is caregiver):
```sql
SELECT user_id, bio, experience FROM caregiver_profiles WHERE user_id = 'your-user-id';
```

Should show a profile linked to your user_id.

### 7. Debug Mode

To see detailed logs, open browser console before signing in. All OAuth steps are logged with emojis for easy identification:
- 🔐 = OAuth callback page
- 🔧 = URL fixing
- 🔄 = Processing/redirecting
- ✅ = Success
- ❌ = Error
- ⚠️ = Warning

### 8. Manual URL Test

If you want to test the URL normalization directly, you can manually visit:
```
https://iyaya-supabase.vercel.app/auth/callback??code=test-code-123
```

You should see:
1. Console log: "🔧 Fixing malformed URL with double question marks"
2. URL changes to: `https://iyaya-supabase.vercel.app/auth/callback?code=test-code-123`
3. Page reloads with fixed URL

(Note: This will fail authentication since `test-code-123` is not a real OAuth code, but it proves the URL normalization works)

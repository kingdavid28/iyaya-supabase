# Web Deployment Guide

## Issues Fixed

### 1. Vercel Build Error - Wrong Output Directory
**Problem**: Vercel was looking for `web-build` directory, but Expo exports to `dist`
**Solution**: Updated `vercel.json` to use `outputDirectory: "dist"`

### 2. Missing Context Export
**Problem**: `ensureUserProfileExists` was used but not exported from AuthContext
**Solution**: Added `ensureUserProfileExists` to the context value exports

## How to Test

### Local Web Testing
```bash
# Build for web
npx expo export -p web

# The output will be in the `dist` directory
# You can serve it locally with:
npx serve dist
```

### Vercel Deployment
- Vercel automatically rebuilds when you push to GitHub
- Check deployment status at: https://vercel.com/dashboard
- Your app URL: https://iyaya-supabase.vercel.app/

## Important Notes

### Expo Go Limitations
- **Expo Go does NOT support web** - it's only for iOS/Android
- To test web locally, use: `npx expo start --web` (opens in browser)
- Or build and serve: `npx expo export -p web && npx serve dist`

### Environment Variables
- Local: Uses `.env` file
- Vercel: Uses `.env.production` (automatically loaded)
- Make sure all `EXPO_PUBLIC_*` variables are set in Vercel dashboard

### Build Commands
- `npm run web` - Start local web dev server
- `npm run vercel-build` - Build for Vercel deployment (exports to `dist`)
- `npx expo export -p web` - Manual web build

## Troubleshooting

### If Vercel build fails:
1. Check Vercel build logs for specific errors
2. Verify environment variables are set in Vercel dashboard
3. Test build locally: `npm run vercel-build`
4. Ensure `dist` directory is created after build

### If web app doesn't load:
1. Check browser console for errors
2. Verify Supabase environment variables are loaded
3. Check network tab for failed API requests
4. Ensure Google OAuth redirect URL includes your Vercel domain

### If Google Sign-In doesn't work on web:
1. Add Vercel URL to Google Cloud Console authorized redirect URIs
2. Format: `https://iyaya-supabase.vercel.app/auth/callback`
3. Also add: `https://iyaya-supabase.vercel.app`

<!-- Copilot instructions for AI coding agents working on this repo -->

# Copilot Instructions — iyaya-parentchildcare

This file gives concise, actionable guidance for AI coding agents (like Copilot) to be immediately productive in this repository.

- **Project type**: Expo React Native app (managed) with serverless-style Supabase integrations.
- **Main entry**: `node_modules/expo/AppEntry.js` (see `package.json` `main`).

Key developer commands (from `package.json`):

- `npm start` — Run the Expo dev server (`expo start`).
- `npm run android|ios|web` — Start on specific platforms.
- `npm test` — Run Jest unit tests. Use `test:watch` for development and `test:coverage` for coverage reports.
- `npm run lint` / `npm run lint:fix` — Run ESLint on `src/` and auto-fix.
- `npm run type-check` — Run TypeScript checks (`tsc --noEmit`).

Where to look first

- `src/` — Primary app code: `components/`, `screens/`, `services/`, `hooks/`, `contexts/`.
- `src/services/` — Contains backend/service integrations. See `src/services/supabase/` for Supabase helpers.
- `db/migrations/` and `supabase/` — SQL migrations and Supabase config; useful for understanding schema and data flows.
- `__tests__/` and `jest.config.js` — Tests and test setup.

Supabase / service patterns (explicit examples)

- Supabase services subclass a base helper. Example: `src/services/supabase/reportService.js` imports `{ SupabaseBase, supabase } from './base'` and uses helpers like `_getCurrentUser()`, `_ensureUserId()`, and `_handleError()`.
- Cache helpers live alongside Supabase services. Example usage: `getCachedOrFetch(cacheKey, async () => { ... }, ttl)` and `invalidateCache(key)`; cache keys follow simple string patterns like `reports:${userId}` and `report:${reportId}`.
- Queries use Supabase client chained calls and relational selects via aliases: e.g. `.select('\n  *,\n  reporter:reporter_id(id, name, email),\n  reported_user:reported_user_id(id, name, email)\n')`.
- Authorization is enforced in service methods: e.g. `_requireAdmin()` checks `user.role === 'admin'` and methods call it before admin-only operations.

Error handling & return conventions

- Service methods wrap logic in `try/catch` and return via `this._handleError('methodName', error, fallback)` when errors occur.
- Methods that return lists typically return `[]` as a safe fallback; single-entity retrievals return `null` on failure.

Conventions to follow when editing or adding code

Platform-specific code (web vs native)

- This repo runs on **three platforms**: Android/iOS (Expo Go or EAS Build), and Web (Vercel/Next.js).
- Use `Platform.OS === 'web'` to branch code. Example: `src/contexts/AuthContext.js` detects web to use `https://iyaya-supabase.vercel.app/auth/callback` for Vercel; native uses `iyaya-app://auth/callback` deep links.
- Native modules (e.g., `@react-native-google-signin/google-signin`) are only loaded for native builds; see `app.config.js` `plugins` array which conditionally adds them based on `!isWeb`.
- Web imports go through `react-native-web`; avoid importing RN-only modules directly in web-shared code.

Testing and CI hints

- **EAS Build** (`npm run build:android`): Produces standalone APK/IPA with native modules (Google Sign-In works). Requires `eas.json` config and EAS project ID in `app.config.js.extra.eas.projectId`.
- **Expo Go** (`npm start`): Fast dev mode, no native modules required; Google OAuth works via Supabase's hosted flow.
- **Vercel** (web): Deploy via `vercel deploy` after `npm run vercel-build`. Run `npm run vercel-build` locally to test static build. Only web-compatible code runs; all `Platform.OS === 'native'` branches are stripped.
- **Vercel OAuth callback**: Supabase redirects to `/auth/callback` on successful OAuth. This requires `public/auth/callback.html` (static page extracting OAuth hash) and `vercel.json` routes to serve it. The callback page forwards the `#access_token=...` to app root.
- Unit tests use Jest; test files live under `__tests__/`. Use `npm test` or `npm run test:watch` locally.
- If you change DB schema, update `db/migrations/` and related `supabase/` config files.

Supabase OAuth setup for web & native

- Web platform (Vercel): `signInWithGoogle()` redirects to `https://iyaya-supabase.vercel.app/auth/callback`; callback handler at `public/auth/callback.html` extracts and forwards OAuth data.
- Native platforms: `signInWithGoogle()` redirects to `iyaya-app://auth/callback` (deep link scheme from `app.config.js`).
- Both use `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect } })` in `src/contexts/AuthContext.js`.
- See `vercel.json` for static routing rules and `app.config.js` scheme configuration.

When in doubt

- Search `src/services/supabase/` for examples of patterns (authorization, caching, error handling).
- Check `package.json` scripts for the canonical commands.

If anything here is unclear or you need more repository-specific examples (e.g., other service files besides `reportService.js`), tell me which areas to expand and I'll iterate.

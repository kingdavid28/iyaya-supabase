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

- Keep Supabase access in `src/services/supabase/*` and prefer adding new helpers to `base` or `cache` when common functionality is needed.
- Preserve existing query shapes and aliasing when extending selects so front-end consumers continue to receive expected nested objects (e.g., `reporter:reporter_id(...)`).
- Follow the project's linting and type-check commands before pushing: run `npm run lint` and `npm run type-check`.

Testing and CI hints

- Unit tests use Jest; test files live under `__tests__/`. Use `npm test` or `npm run test:watch` locally.
- If you change DB schema, update `db/migrations/` and related `supabase/` config files.

When in doubt

- Search `src/services/supabase/` for examples of patterns (authorization, caching, error handling).
- Check `package.json` scripts for the canonical commands.

If anything here is unclear or you need more repository-specific examples (e.g., other service files besides `reportService.js`), tell me which areas to expand and I'll iterate.

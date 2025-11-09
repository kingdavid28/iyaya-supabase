



# Summary
The app feels slow primarily because every dashboard render eagerly loads large data sets and assets over an occasionally flaky network connection. You can gain significant speed by combining better Supabase usage (leaner queries, caching) with Expo/React Native performance practices (code-splitting, asset optimization, memoization).

# Findings
- **[src/screens/ParentDashboard/ParentDashboard.js](cci:7://file:///c:/Users/reycel/iYayaAll2/iyayabackupzip/iyayaparentredirect/09172025cleandatabase/iyayaSupa/src/screens/ParentDashboard/ParentDashboard.js:0:0-0:0)** fetches jobs, caregivers, bookings, children, and notifications simultaneously on mount and each refresh—even when tabs aren’t visited.  
- **[src/services/supabase/index.js](cci:7://file:///c:/Users/reycel/iYayaAll2/iyayabackupzip/iyayaparentredirect/09172025cleandatabase/iyayaSupa/src/services/supabase/index.js:0:0-0:0)** routes all Supabase calls without client-side caching; repeated queries (e.g., notification counts, profile) hit the network anew.  
- **`src/components/features/profile/ReviewList.js`** and other list components render large payloads with no virtualization or memoization.  
- **Asset handling** (profile/caregiver images) still relies on full-size uploads; Expo isn’t optimizing them at build time.  
- **Metro bundle** currently includes every screen/component (≈2700 modules) because there’s no lazy loading for infrequently used flows (e.g., legacy wizards, Auth screens).  
- **Hermes/JS engine & updates**: ensure Hermes is active (default on RN 0.81+) and that the Expo SDK/bundle cache is slim (`expo start --clear` already used but can be optimized further).

# Recommended Actions
- **Data fetching & Supabase**
  - Restrict columns in Supabase queries (`select('id,name,profile_image')`) and add `range` pagination where lists can grow ([reviewService.getReviews()](cci:1://file:///c:/Users/reycel/iYayaAll2/iyayabackupzip/iyayaparentredirect/09172025cleandatabase/iyayaSupa/src/services/supabase/index.js:94:2-95:83)).
  - Cache common results in `integratedService` or adopt TanStack Query to deduplicate network calls and provide stale-while-revalidate behavior.
  - Defer heavy fetches until needed. For example, load bookings only when `activeTab === 'bookings'` and notifications on a background interval.
  - Batch related calls with Supabase’s stored procedures/RPC endpoints or `Promise.allSettled` wrappers to reduce serialized latency.
  - Enable Supabase Edge Functions for expensive aggregations (e.g., notification counts) and schedule background sync to warm caches.

- **UI rendering**
  - Memoize list items using `React.memo` and introduce virtualization (`FlatList` with `getItemLayout` / `initialNumToRender`) for long feeds in [BookingsTab](cci:1://file:///c:/Users/reycel/iYayaAll2/iyayabackupzip/iyayaparentredirect/09172025cleandatabase/iyayaSupa/src/screens/ParentDashboard/components/BookingsTab.js:9:0-358:2), `ReviewsTab`, etc.
  - Move rarely used flows (`EnhancedCaregiverProfileWizard`, `AvailabilityManagementScreen`) behind dynamic imports (`React.lazy`) so they don’t inflate the initial bundle.
  - Use skeleton loaders for profile/images so the UI stays responsive while assets stream.

- **Assets & images**
  - Run `npx expo-optimize` to generate multiple resolutions of local images; enforce max dimensions on uploaded profile photos using `expo-image-manipulator`.
  - Serve Supabase Storage images via signed URLs with size params (`?width=256&quality=70`) when fetching avatars.

- **State & architecture**
  - Introduce a lightweight global store (Zustand/TanStack Query) to centralize Supabase session and cached data, replacing repeated context calls.
  - Schedule background tasks (e.g., via `expo-task-manager`) for periodic syncs instead of on-demand full reloads.
  - Trim legacy code paths referenced in [SUPABASE_MIGRATION_COMPLETE.md](cci:7://file:///c:/Users/reycel/iYayaAll2/iyayabackupzip/iyayaparentredirect/09172025cleandatabase/iyayaSupa/SUPABASE_MIGRATION_COMPLETE.md:0:0-0:0)—unused modules still inflate the bundle; archive or delete them after confirming parity.

- **Build & runtime**
  - Ensure Hermes is enabled (`expo prebuild --clean` if needed) and monitor bundle size via `npm run analyze-bundle`.
  - Leverage Expo’s EAS Build cache and consider splitting the project into feature-based Metro bundles with `expo-router` lazy routes.
  - Audit dependencies in [package.json](cci:7://file:///c:/Users/reycel/iYayaAll2/iyayabackupzip/iyayaparentredirect/09172025cleandatabase/iyayaSupa/package.json:0:0-0:0); remove unused libraries left from the migration (e.g., legacy APIs).

- **Testing & monitoring**
  - Add performance instrumentation (React Native Performance, Sentry Performance) to capture slow render traces.
  - Profile Supabase queries with the dashboard (execution plan/latency) and add indexes on frequently filtered columns.

Implementing the above will align the app with the post-migration modular design while keeping runtime light and responsive. Let me know which areas you’d like to tackle first, and I can help draft the concrete changes.


Messaging skeleton set
Build a chat-specific skeleton (conversation rows, message bubbles) and reuse across messaging components.
Profile & auth flows
Implement skeletons for profile headers/cards and leverage lightweight placeholders during auth/verification waits.

# Review components inventory
- **`src/components/features/profile/ReviewList.js`** – shared list renderer (avatars, ratings, images). Re-exported via `src/components/index.js` and `src/components/ReviewsSection.js`.
- **`src/components/forms/ReviewForm.js`** – reusable form for create/update flows with optional photo upload.
- **`src/components/messaging/ReviewItemLocal.js`** – legacy caregiver card; superseded by `ReviewList` but kept for bespoke layouts.
- **`src/screens/ParentDashboard/components/ReviewsTab.js`** – parent dashboard tab that now depends on `reviewService` and should migrate toward the shared `ReviewForm`/`ReviewList` combo.
- **`src/screens/CaregiverDashboard.js`** – “Best of Me” tab now normalizes with `normalizeCaregiverReviewsForList()` and renders the shared `ReviewList` with a CTA into `CaregiverReviewsScreen`.
- **`src/utils/reviews.js`** – houses `normalizeCaregiverReviews()` utilities used by caregiver-facing screens to keep Supabase payloads consistent.
- **Maintenance** – When adding or removing review-related modules, update this inventory so newcomers can locate the current components quickly.


To speed up the app, focus on the biggest bottlenecks first:

Profile images & media
We already stopped downscaling new uploads in 
storageService.uploadProfileImage
, but large originals still enlarge UI bandwidth. Add client-side resizing/compression before upload (e.g., keep longest side ≤ 512 px) and store a smaller derivative.
For existing avatars, consider a background job to regenerate optimized versions and update stored URLs.
Network calls & caching
useParentDashboard
 fires several API requests on mount (loadProfile, fetchJobs, fetchCaregivers, fetchChildren). Debounce or lazy-load secondary data (e.g., bookings/applications only when their tab is opened).
Cache immutable data locally (AsyncStorage or react-query SWR) and reuse until refresh.
Avoid duplicate calls; ensure hooks like fetchCaregivers aren’t triggered twice by multiple effects.
Reduce render work
Check expensive tabs (Home, Search) for heavy lists; wrap list items in React.memo / useCallback to prevent unnecessary re-renders.
Use FlatList’s windowSize, initialNumToRender, and removeClippedSubviews tuned for your data.
Split large components (e.g., 
ParentDashboard.js
) into smaller memoized sections to limit updates.
Optimize images and assets
The image-optimizer.js run compressed local PNGs drastically. Keep the optimized versions under version control and ensure notification-icon.png is converted to a supported format.
Enable Expo asset bundling (expo-optimize) in CI so end-users download smaller bundles.
Build & metro caching
Use expo start --no-dev --minify for realistic performance checks.
On iOS/Android device builds, enable Hermes (Expo SDK 49+) to improve JS execution.
Split bundles if needed (expo export with modern bundler).
Profiling & monitoring
Record performance via React Native Performance Monitor (Cmd+D → “Show Perf Monitor”) to spot slow renders.
Add logging/timing around API calls to identify slow endpoints; consider pagination or limiting payload sizes.
Once you’ve profiled with these steps, we can target actual hotspots (e.g., a particular API or list). Let me know which area you tackle first and I can help implement concrete changes.




Best practices for edit-contract functionality across bookings/applications:

Shared service layer
Centralize contract CRUD in a single service (e.g., contractService.updateContract) so all screens hit the same validation, Supabase calls, and error handling.
Validate access: parent/caregiver can only edit contracts tied to bookings they own; service-role bypasses if needed.
Schema + versioning
Store immutable historical copies or maintain version, updated_at, updated_by fields so edits are auditable.
Consider soft-locking signed contracts (no edits once all parties have signed) unless creating a new version for re-signing.
UI/UX consistency
Reuse a modal/form component for contract editing across bookings and applications to avoid divergence.
Prefill existing values, highlight required fields, show read-only sections if contract is finalized.
Validation + draft workflow
Enforce schema-level validation (Supabase RLS/functions) plus client-side checks (required terms, payment clauses).
Allow saving as draft vs. “send for signature”; notify other party when a contract was modified.
State + cache updates
On successful edit, update React Query caches / context so contract details refresh instantly in all tabs.
Emit toast/snackbar confirming changes; handle optimistic updates carefully (revert on failure).
Security + RLS
Ensure Supabase RLS policies allow updates only when auth.uid() matches parent or caregiver for that booking/application.
Restrict sensitive fields (e.g., payment terms) so only parent can modify, caregiver can view/ack.
Testing
Cover unit tests for the shared service, integration tests for Supabase function/policy, and UI tests for both bookings and applications flows.
These patterns keep contract editing consistent, secure, and maintainable across the dashboard.
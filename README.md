# Iyaya - Nanny & Employer Matching App

A React Native app built with Expo that connects nannies with families looking for childcare services.

## Features

### For Parents
- **Job Posting**: Create detailed job listings with date/time requirements
- **Caregiver Search**: Browse and filter available caregivers
- **Booking System**: Schedule childcare services with conflict detection
- **Children Management**: Manage child profiles with date of birth tracking
- **Real-time Messaging**: Chat with caregivers
- **Payment Confirmation**: Upload payment proof and track transactions

### For Caregivers
- **Job Search**: Browse available jobs with advanced filtering
- **Application Management**: Apply to jobs and track application status
- **Availability Management**: Set working hours and time preferences
- **Booking Management**: View and manage confirmed bookings
- **Profile Management**: Complete profile with skills and certifications
- **Real-time Messaging**: Communicate with parents

### Shared Features
- **Authentication System**: Secure login/registration for both user types
- **Profile Management**: Complete user profiles with photo upload
- **Real-time Notifications**: Stay updated on bookings and messages
- **Responsive Design**: Optimized for both iOS and Android

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Node.js with Express
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT tokens with AsyncStorage
- **Real-time**: Socket.IO for messaging
- **UI Components**: 
  - React Native Paper
  - Expo Vector Icons
  - Custom Date/Time Pickers
  - Lucide React Native Icons
- **Navigation**: React Navigation v6
- **State Management**: React Context API
- **Form Handling**: Custom validation utilities
- **Image Handling**: Expo Image Picker with base64 upload

## App Architecture

### Navigation Structure
```
App
├── Welcome Screen
├── Authentication
│   ├── Parent Auth
│   └── Caregiver Auth
├── Parent Dashboard
│   ├── Job Posting
│   ├── Caregiver Search
│   ├── Booking Management
│   ├── Children Management
│   └── Messages
└── Caregiver Dashboard
    ├── Job Search
    ├── Application Management
    ├── Availability Management
    ├── Booking Management
    └── Messages
```

### Key Components
- **CustomDateTimePicker**: Consistent date/time input with iOS modal support
- **TimePicker**: Custom time selection with AM/PM and 24-hour formats
- **LoadingSpinner**: Reusable loading states
- **ErrorBoundary**: Error handling and recovery

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- MongoDB (local or MongoDB Atlas)

### Quick Start

1. **Clone and Install**
```bash
git clone <repository-url>
cd iyayav0CleanStart
npm install
```

2. **Backend Setup**
```bash
cd iyaya-backend
npm install
cp .env.example .env
# Configure your MongoDB connection and JWT secret in .env
```

3. **Start Backend Server**
```bash
# From iyaya-backend directory
node app.js
# Or use the provided batch file from root:
start-backend.bat
```

4. **Start Expo Development Server**
```bash
# From root directory
npx expo start
```

5. **Run on Device/Simulator**
- **Expo Go (Physical Device):** See [EXPO_GO_SETUP.md](./EXPO_GO_SETUP.md) for detailed setup
- **Quick Expo Go Setup:** Run `npm run setup-network` then scan QR code
- **iOS Simulator:** Press 'i' in Expo CLI
- **Android Emulator:** Press 'a' in Expo CLI
- **Network Issues:** Use `npx expo start --tunnel`

## Project Layout

```
iyayaSupa/
 App.js                     # Expo entry point
 app.json                   # Expo manifest
 app.config.js              # Expo configuration overrides
 babel.config.js            # Babel configuration
 metro.config.js            # Metro bundler configuration
 package.json               # Project dependencies & scripts
 package-lock.json          # Lockfile
 .env*                      # Environment configuration files
 assets/                    # Images, fonts, icons
 db/
    migrations/            # SQL migration scripts
 docs/
    features/              # Feature playbooks & implementation notes
    migrations/            # Migration plans & status reports
 scripts/                   # Node/batch utilities and automation scripts
 src/                       # React Native application source
 __tests__/                 # Jest test suites
 iyaya-backend/             # Legacy Node/Express backend
 README.md                  # Project documentation (this file)
```

The `src/` directory houses the active mobile app, while supporting documentation now lives under `docs/`, helper scripts under `scripts/`, and database change scripts under `db/migrations/`.
## API Endpoints Reference

### Authentication Routes (`/api/auth`)
- `POST /register` - Register new user (parent/caregiver)
- `POST /login` - User login
- `POST /logout` - User logout
- `POST /refresh-token` - Refresh JWT token
- `POST /reset-password` - Request password reset
- `POST /confirm-reset-password` - Confirm password reset
- `POST /check-email` - Check if email exists
- `GET /verify-email/:token` - Verify email address
- `POST /resend-verification` - Resend verification email
- `POST /firebase-sync` - Sync Firebase user
- `GET /firebase-profile` - Get Firebase profile
- `PUT /firebase-profile` - Update Firebase profile
- `POST /send-custom-verification` - Send custom verification
- `GET /me` - Get current user profile
- `GET /profile` - Get user profile (alias)
- `PUT /profile` - Update user profile
- `PATCH /role` - Update user role
- `POST /profile/image-base64` - Upload profile image
- `PUT /profile/children` - Update children info
- `GET /health-check` - Service health check

### Caregiver Routes (`/api/caregivers`)
- `GET /` - Search/browse caregivers (public)
- `GET /:id` - Get caregiver details (public)
- `GET /profile` - Get authenticated caregiver profile
- `PUT /profile` - Update caregiver profile
- `POST /documents` - Upload documents/certifications
- `POST /refresh-token` - Refresh auth token
- `POST /background-check` - Request background check

### Job Routes (`/api/jobs`)
- `GET /` - Get all available jobs
- `GET /my` - Get user's posted jobs
- `POST /` - Create new job posting
- `PUT /:id` - Update job
- `GET /:id` - Get job by ID
- `DELETE /:id` - Delete job
- `GET /:id/applications` - Get applications for job

### Application Routes (`/api/applications`)
- `POST /` - Apply to job
- `GET /my-applications` - Get caregiver's applications
- `GET /my` - Get applications (alias)
- `GET /:id` - Get single application
- `PATCH /:id/status` - Update application status
- `DELETE /:id` - Withdraw application
- `GET /job/:jobId` - Get applications for specific job

### Booking Routes (`/api/bookings`)
- `POST /` - Create new booking
- `GET /my` - Get user's bookings
- `GET /:id` - Get booking details
- `PATCH /:id/status` - Update booking status
- `POST /:id/payment-proof` - Upload payment proof
- `DELETE /:id` - Cancel booking

### Message Routes (`/api/messages`)
- `GET /conversations` - Get all conversations
- `GET /conversation/:id` - Get conversation messages
- `GET /conversation/:id/info` - Get conversation info
- `POST /` - Send message
- `POST /conversation/:id/read` - Mark messages as read
- `POST /start` - Start new conversation
- `DELETE /:messageId` - Delete message

### Other Routes
- `/api/profile` - User profile management
- `/api/children` - Child profile management
- `/api/uploads` - File upload handling
- `/api/contracts` - Service contract management
- `/api/privacy` - Privacy settings
- `/api/notifications` - Push notifications
- `/api/payments` - Payment processing
- `/api/data` - Data export/import
- `/api/availability` - Caregiver availability
- `/api/health` - Server health check

**Authentication**: All protected routes require `Authorization: Bearer <token>` header with Firebase or JWT token.

## Features to Implement

### Phase 1 (Current)
- ✅ Authentication with Firebase
- ✅ Role-based navigation
- ✅ Job posting and browsing
- ✅ Basic profile management
- ✅ Application tracking
- ✅ Basic messaging interface

### Phase 2 (Future)
- [ ] Real-time messaging with Socket.IO
- [ ] Push notifications
- [🔄] Image upload for profiles (Backend ✅, Frontend partial)
- [ ] Advanced filtering and search
- [ ] Rating and review system
- [ ] Payment integration
- [ ] Background check verification
- [ ] Calendar integration for scheduling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Configuration & Environment

### Build-time secrets
- Store API keys and other secrets in environment files (for example, `.env`, `.env.local`, or Expo’s `app.config.js` `extra` block) and never commit them to version control.
- Reference secrets in `app.config.js` via `process.env.EXPO_PUBLIC_*` so they are injected by Metro at build time.
- Keep sample values in `.env.example` or in documentation without real credentials.

### Runtime configuration modules
- `src/config/constants.js` centralises runtime behaviour (timeouts, feature flags, currency, storage keys). Update this file instead of scattering duplicates.
- `src/config/environment.js` selects the correct environment profile based on Expo release channels at runtime.
- Avoid importing build-time secrets directly inside runtime modules; pass them in through the `Constants.expoConfig` or environment helpers above.

### Navigation & integration guidelines
- `src/app/navigation/AppNavigator.js` hosts the **only** `NavigationContainer`. Screens should use hooks (`useNavigation`, `useRoute`) or callbacks rather than creating their own containers.
- `src/app/AppIntegration.js` is reserved for idempotent one-time bootstrapping (analytics, security checks). Add new behaviour here only if it can safely rerun during hot reloads.

### Linting & logging
- Run `npm run lint` before committing. ESLint is configured to warn on `console` usage outside `console.warn` / `console.error` so production builds stay clean.
- Prefer structured logging (or `logger` helpers) for persistent diagnostics.

### Secrets hygiene
- If secrets accidentally land in version control, rotate them immediately and purge the history if possible.
- Use Expo’s `eas secret` or CI secret stores when automating builds.

## API Service Migration Roadmap

`src/config/api.js` currently re-exports the consolidated service layer to ease migration from older modules. New features should import the specific service they need (e.g. `import { bookingsAPI } from '../services'`). As legacy code is updated, trim unused re-exports to keep bundles lean and dependencies explicit.


Based on the package.json and file structure, here are key performance optimization recommendations for your React Native/Expo app:

Bundle Analysis:
Run npm run analyze-bundle to identify large dependencies
Look for opportunities to lazy load components
Immediate Optimizations:
Upgrade Expo to latest version (current: 54.0.21)
Consider replacing axios with native fetch since you're on React Native 0.81.5
Check if all Expo modules are actually used (several image-related ones)
Performance Monitoring:
The src/utils/performanceMonitor.js suggests you already have monitoring - review its findings
Check src/utils/performance.js for existing optimization patterns
Image Handling:
Review src/utils/imageUtils.js and related files for optimization opportunities
Implement proper image caching and resizing
State Management:
You're using Zustand (good choice) - ensure proper selectors are used to prevent unnecessary re-renders
Network Calls:
Review src/utils/networkConfig.js for API call optimizations
Implement request deduplication where possible
Would you like me to investigate any of these areas in more depth? For example:

Analyze a specific performance bottleneck
Review the performance monitoring implementation
Optimize image handling further
Let me know which area you'd like to focus on first.


node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
7b9a5bc895c3fa52e92e4507b06be47d9c8486e5b55f7357b4469733ff07761f value supabase secret

Here’s how to hook your background‑check provider up to the Edge Function you just finished, in a production‑safe way.




---

## 1. Webhook endpoint details

Give your provider this configuration:

- **URL**

  ```text
  https://myiyrmiiywwgismcpith.supabase.co/functions/v1/background-check-webhook
  ```

- **Method**

  ```text
  POST
  ```

- **Headers**

  - `Content-Type: application/json`
  - `x-webhook-secret: <YOUR_BACKGROUND_CHECK_WEBHOOK_SECRET>`

  Replace `<YOUR_BACKGROUND_CHECK_WEBHOOK_SECRET>` with the **exact** value you stored in Supabase as `BACKGROUND_CHECK_WEBHOOK_SECRET`  
  (the raw string, not the SHA256 digest shown in the UI).

- **Body (example)**

  ```json
  {
    "caregiver_user_id": "53de9502-90be-4769-a147-17efcddba30a",
    "status": "clear",
    "report_id": "rep_123",
    "expiry_date": "2030-01-01T00:00:00Z",
    "notes": "Clear record"
  }
  ```

Best is to have the provider send your **Supabase user id** as `caregiver_user_id` (you’ve already tested with this value).

If they can’t, you’d adapt the function later to look up the user by email or external ID.

---

## 2. Status mapping contract

Tell the provider what values you expect in `status` (or equivalent):

- `"clear"` / `"passed"` / `"approved"` → **treated as** `approved`
- `"pending"` / `"in_progress"` / `"processing"` / `"queued"` → `pending`
- `"consider"` / `"failed"` / `"rejected"` / `"flagged"` / `"error"` → `failed`

They can keep their own vocabulary as long as you normalize it in [mapProviderStatus](cci:1://file:///c:/Users/reycel/Documents/iyayabeforereadme/forTransferIyaya/iyayaSupa/supabase/functions/background-check-webhook/index.ts:24:0-46:1).

---

## 3. Security best practices

- **Keep the secret private**
  - Never commit it to git (you’ve already moved it to Edge Function Secrets, good).
  - Use different secrets per environment:
    - e.g. `BACKGROUND_CHECK_WEBHOOK_SECRET_STAGING`, `BACKGROUND_CHECK_WEBHOOK_SECRET_PROD`, and different URLs.

- **Mutual agreement on header name**
  - Document for your provider:  
    “Webhook requests must include `x-webhook-secret: <value>`”.

- **Optionally add IP allow‑listing**
  - If your provider publishes static IPs, you can add network restrictions on your Supabase project or drop requests from unknown ranges inside the function.

- **Logging**
  - Don’t log full payloads containing sensitive PII.
  - Log just high‑level info (user id, mapped status, success/failure, report id).

---

## 4. Data protection considerations (Cebu / Philippines)

Since you’re in Cebu / PH:

- Make sure your provider’s terms and processing comply with the **Philippines Data Privacy Act (DPA)**:
  - Only send the minimum necessary data.
  - Don’t include extremely sensitive info in the webhook payload (no full documents, just IDs / statuses).
- Store long‑lived PII (full reports) on the provider side; in Supabase keep:
  - `report_id`
  - `status`
  - `expiry_date`
  - high‑level `notes`

Your current schema (`caregiver_background_checks` + `profile_data.background_check.status`) already follows that pattern.

---

## 5. Quick checklist

1. **Supabase**
   - `BACKGROUND_CHECK_WEBHOOK_SECRET` set.
   - `verify_jwt = false` for `background-check-webhook`.
   - `users.profile_data` column exists (you already added it).
2. **Provider**
   - Webhook URL set to the Edge Function URL.
   - Method `POST`.
   - Headers: `Content-Type: application/json`, `x-webhook-secret` with your secret.
   - Body includes at least:
     - `caregiver_user_id` (Supabase `users.id`)
     - `status`
     - `report_id` (optional but recommended)
     - `expiry_date` (if they provide it)
     - `notes` (optional)

Once they send a real event, you should see the same behavior you just tested: `{"ok": true}`, and the caregiver’s background‑check status updating through your app.
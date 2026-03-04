# 📁 Root Folders Explanation - Why Keep Them?

## 🎯 Summary

Your project has **TWO separate code structures**:
1. **`src/`** - Main React Native mobile app
2. **Root folders** - Specialized features & backend services

Both are needed and serve different purposes!

## 📊 What Each Root Folder Contains

### `components/` (9 files) - Wallet & Payment Components
**Purpose**: Specialized wallet and payment components for blockchain features

**Files**:
- `BookingPaymentScreen.tsx` - Payment screen for bookings
- `CaregiverWalletSetup.tsx` - Caregiver wallet setup
- `PayCaregiver.tsx` - Pay caregiver component
- `PayCaregiverButton.js` - Payment button
- `PaymentFlow.tsx` - Payment flow logic
- `PointsDashboard.tsx` - Points dashboard
- `PointsManagement.tsx` - Points management
- `WalletProvider.tsx` - Wallet context provider
- `WalletTestScreen.tsx` - Wallet testing

**Used By**: Payment features, wallet integration, blockchain transactions

**Keep?** ✅ YES - These are specialized payment/wallet components

---

### `services/` (6 files) - Backend Services
**Purpose**: Server-side services for payments and points

**Files**:
- `payment-verification-updated.ts` - Payment verification
- `payment-verification.service.ts` - Payment verification service
- `payment.service.ts` - Payment service
- `points-calculation.service.ts` - Points calculation
- `points-engine.ts` - Points engine
- `points.service.ts` - Points service

**Used By**: Backend API, payment processing, points system

**Keep?** ✅ YES - These are backend services

---

### `api/` (3 files) - API Routes
**Purpose**: API endpoints for backend services

**Files**:
- `points/recalculate.ts` - Recalculate points endpoint
- `points-routes.ts` - Points API routes
- `routes.ts` - Main API routes

**Used By**: Backend API server, points system

**Keep?** ✅ YES - These are API endpoints

---

### `server/` (1 file) - Server Entry Point
**Purpose**: Backend server entry point

**Files**:
- `index.js` - Server entry point

**Used By**: Backend server startup

**Keep?** ✅ YES - This is the server entry point

---

### `hooks/` (1 file) - Custom Hook
**Purpose**: Wallet connection hook

**Files**:
- `useWalletConnection.ts` - Wallet connection hook

**Used By**: Wallet features, blockchain integration

**Keep?** ✅ YES - Used by wallet features

---

### `screens/` (1 file) - Test Screen
**Purpose**: Testing screen

**Files**:
- `Week4TestScreen.js` - Week 4 test screen

**Used By**: Testing/development

**Keep?** ⚠️ MAYBE - Can be deleted if not needed

---

### `admin/` - Admin Features
**Purpose**: Admin dashboard and features

**Keep?** ✅ YES - Admin functionality

---

## 🏗️ Architecture Explanation

```
Your App Has Two Parts:

1. MOBILE APP (src/)
   ├── Main React Native app
   ├── User-facing features
   └── Mobile screens & components

2. BACKEND/SPECIALIZED (Root folders)
   ├── components/ → Wallet/Payment UI
   ├── services/ → Backend services
   ├── api/ → API endpoints
   ├── server/ → Server entry
   ├── hooks/ → Wallet hooks
   └── admin/ → Admin features
```

## 🔄 How They Work Together

```
Mobile App (src/)
    ↓
Uses wallet components (components/)
    ↓
Calls backend services (services/)
    ↓
Through API routes (api/)
    ↓
Running on server (server/)
```

## ✅ Recommendation: Keep All Root Folders

**Reason**: They provide essential backend and specialized features that `src/` doesn't have.

### Only Safe to Delete:
- `screens/Week4TestScreen.js` - If you don't need it

### Must Keep:
- ✅ `components/` - Wallet/payment UI
- ✅ `services/` - Backend services
- ✅ `api/` - API endpoints
- ✅ `server/` - Server code
- ✅ `hooks/` - Wallet hooks
- ✅ `admin/` - Admin features

## 📝 Better Organization (Optional Future Task)

If you want cleaner structure later, you could:

```
Option 1: Move to src/
src/
├── features/
│   ├── wallet/
│   │   ├── components/ (from root components/)
│   │   └── hooks/ (from root hooks/)
│   └── payments/
│       └── services/ (from root services/)

Option 2: Create backend/ folder
backend/
├── api/ (from root api/)
├── services/ (from root services/)
└── server/ (from root server/)
```

But this requires updating imports throughout the codebase!

## 🎯 Current Action: Keep Everything

**For now, keep all root folders as they are.**

They contain working code that's actively used by your application.

---

**Summary**: Root folders = Backend & specialized features. Keep them! ✅

# 💰 Complete Payment Flow: Contract → Wallet → Payment

## 🔄 End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: USER SETUP                                              │
└─────────────────────────────────────────────────────────────────┘

Parent Signs Up
    ↓
Sets Wallet Address (optional at signup)
    ↓
Stored in: `users.solana_wallet_address`
           `users.preferred_token` (SOL/USDC)

Caregiver Signs Up
    ↓
Sets Payout Wallet Address (REQUIRED)
    ↓
Stored in: `users.solana_wallet_address` (role must be 'caregiver')
           `users.preferred_token` (SOL/USDC)

┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: JOB BOOKING                                             │
└─────────────────────────────────────────────────────────────────┘

Parent Creates Booking
    ↓
booking table:
  - customer_id (parent)
  - caregiver_id
  - start_time, end_time
  - amount_usd
  - token (SOL/USDC)
  - status: 'pending'

┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: CONTRACT CREATION & SIGNING                             │
└─────────────────────────────────────────────────────────────────┘

System Creates Contract
    ↓
job_contracts table:
  - booking_id
  - parent_id
  - caregiver_id
  - terms (job details, payment terms)
  - status: 'draft'
    ↓
Parent Reviews & Signs
    ↓
  - parent_signed_at: timestamp
  - parent_signature: signature data
  - parent_signature_hash: hash
  - status: 'signed_parent'
    ↓
Caregiver Reviews & Signs
    ↓
  - caregiver_signed_at: timestamp
  - caregiver_signature: signature data
  - caregiver_signature_hash: hash
  - status: 'active' ✅
    ↓
Contract is now LEGALLY BINDING

┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: PAYMENT EXECUTION                                       │
└─────────────────────────────────────────────────────────────────┘

Contract Active → Payment Required
    ↓
System Fetches:
  - Parent wallet: `users.solana_wallet_address` (parent row)
  - Caregiver wallet: `users.solana_wallet_address` (caregiver row)
  - Amount: booking.amount_usd
  - Token: booking.token (SOL/USDC)
    ↓
Create Payment Intent
    ↓
payment_intents table:
  - booking_id
  - token (SOL/USDC)
  - amount
  - caregiver_address
  - status: 'pending'
  - expires_at: 30 minutes
    ↓
Build Solana Transaction
    ↓
IF token = 'SOL':
  SystemProgram.transfer(
    from: parent_wallet,
    to: caregiver_wallet,
    amount: amount_in_lamports
  )
    ↓
IF token = 'USDC':
  SPL Token Transfer(
    from: parent_usdc_account,
    to: caregiver_usdc_account,
    amount: amount_in_usdc
  )
    ↓
Parent Signs Transaction (in wallet app)
    ↓
Submit to Solana Blockchain
    ↓
Get Transaction Signature
    ↓
Verify Transaction On-Chain
    ↓
Record in Ledger
    ↓
transaction_ledger table:
  - booking_id
  - signature (blockchain tx hash)
  - token (SOL/USDC)
  - amount_lamports or amount_spl
  - payer_address (parent)
  - caregiver_address
  - status: 'confirmed'
  - confirmed_at: timestamp
    ↓
Update Booking Status
    ↓
booking.status = 'paid' ✅
    ↓
Update Contract Status
    ↓
job_contracts.status = 'completed' ✅

┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: POINTS & REWARDS (Optional)                             │
└─────────────────────────────────────────────────────────────────┘

Payment Confirmed
    ↓
Award Points to Caregiver
    ↓
caregiver_points_ledger:
  - caregiver_id
  - booking_id
  - metric: 'job_completed'
  - delta: +points
    ↓
Update Points Summary
    ↓
caregiver_points_summary:
  - total_points
  - rolling_avg_rating
```

## 📊 Database Tables Relationship

```
users (auth/profile)
    ↓
■ Wallet fields added directly to users table
  ├─ solana_wallet_address ← Parent or caregiver wallet
  ├─ preferred_token (SOL/USDC)
  └─ role ("parent" or "caregiver")
    ↓
(The same users table is used for both parent and caregiver; caregiver rows have role='caregiver')
    ↓
booking (job details)
  ├─ customer_id → users.id (parent)
  ├─ caregiver_id → users.id (caregiver)
  ├─ amount_usd
  ├─ token (SOL/USDC)
  └─ status
    ↓
job_contracts (legal agreement)
  ├─ booking_id → booking.id
  ├─ parent_id → users.id (parent)
  ├─ caregiver_id → users.id (caregiver)
  ├─ terms (payment terms included)
  ├─ parent_signature
  ├─ caregiver_signature
  └─ status
    ↓
payment_intents (payment request)
  ├─ booking_id → booking.id
  ├─ token (SOL/USDC)
  ├─ amount
  ├─ caregiver_address
  └─ status
    ↓
transaction_ledger (blockchain record)
  ├─ booking_id → booking.id
  ├─ signature (blockchain tx)
  ├─ token (SOL/USDC)
  ├─ payer_address (parent)
  ├─ caregiver_address
  └─ status
```

## 🔐 Security & Legal Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ LEGAL PROTECTION                                                │
└─────────────────────────────────────────────────────────────────┘

Contract Signed by Both Parties
    ↓
Signatures Hashed & Stored
    ↓
IP Addresses Recorded
    ↓
Timestamps Captured
    ↓
Contract Terms Immutable
    ↓
Payment Terms Agreed Upon
    ↓
Payment Executed Per Contract
    ↓
Blockchain Proof of Payment
    ↓
Transaction Signature = Immutable Receipt

┌─────────────────────────────────────────────────────────────────┐
│ DISPUTE RESOLUTION                                              │
└─────────────────────────────────────────────────────────────────┘

If Dispute Occurs:
  1. Check contract signatures ✅
  2. Verify payment on blockchain ✅
  3. Review transaction_ledger ✅
  4. Check timestamps & IP addresses ✅
  5. All data is immutable & verifiable ✅
```

## 💡 Key Integration Points

### 1. Wallet Setup → Contract Creation

```javascript
// Parent's wallet used for payment
const parentWallet = app_user.solana_wallet_address;

// Caregiver's wallet used for payout
const caregiverWallet = caregiver.payout_address;

// Both stored BEFORE contract is created
```

### 2. Contract Terms → Payment Amount

```javascript
// Contract includes payment terms
contract.terms = {
  hourlyRate: 500,
  hours: 8,
  totalAmount: 4000,
  paymentToken: "SOL",
  paymentDue: "upon_completion",
};

// Booking reflects same amount
booking.amount_usd = 4000;
booking.token = "SOL";
```

### 3. Contract Active → Payment Enabled

```javascript
// Payment can only happen if contract is active
if (contract.status === "active") {
  // Both parties signed
  // Payment can proceed
  createPaymentIntent(booking);
}
```

### 4. Payment Confirmed → Contract Completed

```javascript
// After blockchain confirmation
if (transaction.status === "confirmed") {
  booking.status = "paid";
  contract.status = "completed";
  awardPoints(caregiver);
}
```

## 🎯 Why This Design is Best Practice

### ✅ Separation of Concerns

- **Contract** = Legal agreement
- **Wallet** = Payment infrastructure
- **Transaction** = Blockchain proof

### ✅ Audit Trail

- Every step is recorded
- Timestamps on everything
- Blockchain provides immutable proof

### ✅ Legal Compliance

- Dual signatures required
- Terms agreed before payment
- Dispute resolution data available

### ✅ Security

- Wallets stored separately from auth
- RLS policies protect data
- Blockchain prevents fraud

### ✅ Flexibility

- Support multiple tokens (SOL/USDC)
- Can add more payment methods
- Contract terms customizable

## 📝 Summary

**Contract** → Establishes legal agreement & payment terms
**Wallet** → Stores payment addresses for both parties
**Payment** → Executes transfer per contract terms
**Blockchain** → Provides immutable proof of payment

All three work together to create a secure, legally-binding, and verifiable payment system! 🎉

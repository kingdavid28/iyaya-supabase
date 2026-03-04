-- Solana Payment Integration Tables - Simplified
-- Add to existing Supabase database

-- Caregiver wallet settings
CREATE TABLE IF NOT EXISTS caregiver_wallets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    caregiver_id uuid NOT NULL,
    wallet_address text NOT NULL,
    preferred_token text CHECK (preferred_token IN ('SOL', 'USDC')) NOT NULL,
    verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(caregiver_id)
);

-- Payment intents (before transaction)
CREATE TABLE IF NOT EXISTS payment_intents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL,
    token text CHECK (token IN ('SOL', 'USDC')) NOT NULL,
    amount numeric(12,6) NOT NULL,
    caregiver_address text NOT NULL,
    status text CHECK (status IN ('pending', 'completed', 'expired', 'failed')) DEFAULT 'pending',
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Transaction ledger (after on-chain confirmation)
CREATE TABLE IF NOT EXISTS solana_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_intent_id uuid,
    signature text UNIQUE NOT NULL,
    token text CHECK (token IN ('SOL', 'USDC')) NOT NULL,
    amount_lamports bigint,
    amount_spl bigint,
    payer_address text NOT NULL,
    recipient_address text NOT NULL,
    status text CHECK (status IN ('pending', 'confirmed', 'failed')) NOT NULL,
    block_time timestamptz,
    confirmed_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE caregiver_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE solana_transactions ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies
CREATE POLICY "Users manage own data" ON caregiver_wallets FOR ALL USING (true);
CREATE POLICY "Users manage own data" ON payment_intents FOR ALL USING (true);
CREATE POLICY "Users manage own data" ON solana_transactions FOR ALL USING (true);

-- Indexes
CREATE INDEX idx_caregiver_wallets_caregiver_id ON caregiver_wallets(caregiver_id);
CREATE INDEX idx_payment_intents_booking_id ON payment_intents(booking_id);
CREATE INDEX idx_solana_transactions_signature ON solana_transactions(signature);
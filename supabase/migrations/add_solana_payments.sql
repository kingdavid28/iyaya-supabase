-- Solana Payment Integration Tables
-- Add to existing Supabase database

-- Caregiver wallet settings
CREATE TABLE IF NOT EXISTS caregiver_wallets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    caregiver_id uuid REFERENCES app_user(id) ON DELETE CASCADE,
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
    booking_id uuid REFERENCES booking(id) ON DELETE CASCADE,
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
    payment_intent_id uuid REFERENCES payment_intents(id),
    signature text UNIQUE NOT NULL,
    token text CHECK (token IN ('SOL', 'USDC')) NOT NULL,
    amount_lamports bigint, -- for SOL
    amount_spl bigint,      -- for USDC/SPL tokens
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

-- RLS Policies
CREATE POLICY "Caregivers manage own wallet" ON caregiver_wallets
    FOR ALL USING (caregiver_id = auth.uid());

CREATE POLICY "Users see related payment intents" ON payment_intents
    FOR SELECT USING (
        booking_id IN (
            SELECT b.id FROM booking b
            WHERE b.parent_id = auth.uid() OR b.caregiver_id = auth.uid()
        )
    );

CREATE POLICY "Users see transactions" ON solana_transactions
    FOR SELECT USING (true);

-- Admin policies
CREATE POLICY "Admins manage all payment data" ON caregiver_wallets
    FOR ALL USING (
        EXISTS (SELECT 1 FROM app_user WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins manage all intents" ON payment_intents
    FOR ALL USING (
        EXISTS (SELECT 1 FROM app_user WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins manage all transactions" ON solana_transactions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM app_user WHERE id = auth.uid() AND role = 'admin')
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_caregiver_wallets_caregiver_id ON caregiver_wallets(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_booking_id ON payment_intents(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_solana_transactions_signature ON solana_transactions(signature);
CREATE INDEX IF NOT EXISTS idx_solana_transactions_intent_id ON solana_transactions(payment_intent_id);
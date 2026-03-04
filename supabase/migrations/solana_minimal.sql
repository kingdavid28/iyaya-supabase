-- Solana Payment Tables - Minimal Working Version

-- Create tables first
CREATE TABLE IF NOT EXISTS caregiver_wallets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    caregiver_id uuid NOT NULL,
    wallet_address text NOT NULL,
    preferred_token text CHECK (preferred_token IN ('SOL', 'USDC')) NOT NULL,
    verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_intents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL,
    token text CHECK (token IN ('SOL', 'USDC')) NOT NULL,
    amount numeric(12,6) NOT NULL,
    caregiver_address text NOT NULL,
    status text DEFAULT 'pending',
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS solana_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_intent_id uuid,
    signature text UNIQUE NOT NULL,
    token text CHECK (token IN ('SOL', 'USDC')) NOT NULL,
    amount_lamports bigint,
    amount_spl bigint,
    payer_address text NOT NULL,
    recipient_address text NOT NULL,
    status text DEFAULT 'pending',
    confirmed_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE caregiver_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE solana_transactions ENABLE ROW LEVEL SECURITY;

-- Simple policies that work
CREATE POLICY "Allow all for now" ON caregiver_wallets FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON payment_intents FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON solana_transactions FOR ALL USING (true);
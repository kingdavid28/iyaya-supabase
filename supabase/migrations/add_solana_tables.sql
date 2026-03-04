-- Add Solana payment columns to existing tables
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS solana_wallet_address TEXT;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS preferred_token TEXT CHECK (preferred_token IN ('SOL', 'USDC')) DEFAULT 'USDC';

-- Create transactions table
CREATE TABLE IF NOT EXISTS solana_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature TEXT UNIQUE NOT NULL,
  booking_id UUID REFERENCES booking(id),
  caregiver_id UUID REFERENCES app_user(id),
  payer_id UUID REFERENCES app_user(id),
  amount_lamports BIGINT,
  amount_spl BIGINT,
  token TEXT CHECK (token IN ('SOL', 'USDC')) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

-- Add points columns to existing caregiver table
ALTER TABLE caregiver ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;

-- Create points ledger
CREATE TABLE IF NOT EXISTS caregiver_points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id UUID REFERENCES caregiver(id),
  booking_id UUID REFERENCES booking(id),
  delta INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE solana_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_points_ledger ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own transactions" ON solana_transactions
  FOR SELECT USING (caregiver_id = auth.uid() OR payer_id = auth.uid());

CREATE POLICY "Users can view their own points" ON caregiver_points_ledger
  FOR SELECT USING (caregiver_id = auth.uid());
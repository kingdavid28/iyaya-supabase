-- Complete RLS Scaffold for Iyaya App
-- Minimal production-ready setup for user app and admin panel

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper functions
CREATE OR REPLACE FUNCTION app.get_current_user_id()
RETURNS UUID LANGUAGE SQL STABLE
AS $$ SELECT auth.uid(); $$;

CREATE OR REPLACE FUNCTION app.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    uid UUID := auth.uid();
    res BOOLEAN;
BEGIN
    SELECT (role = 'admin') INTO res FROM app_user WHERE id = uid;
    RETURN COALESCE(res, false);
END;
$$;

-- Core tables (consolidated from existing migrations)
CREATE TABLE IF NOT EXISTS app_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT CHECK (role IN ('customer', 'caregiver', 'admin')) NOT NULL,
    email TEXT UNIQUE NOT NULL,
    solana_wallet_address TEXT,
    preferred_token TEXT CHECK (preferred_token IN ('SOL', 'USDC')) DEFAULT 'USDC',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS caregiver (
    id UUID PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    payout_address TEXT NOT NULL,
    payout_token TEXT CHECK (payout_token IN ('SOL', 'USDC')) NOT NULL,
    verified BOOLEAN DEFAULT false,
    tier TEXT CHECK (tier IN ('Bronze', 'Silver', 'Gold', 'Platinum')) DEFAULT 'Bronze',
    total_points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS booking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES app_user(id),
    caregiver_id UUID REFERENCES caregiver(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')) NOT NULL,
    amount_usd NUMERIC(12,2) NOT NULL,
    token TEXT CHECK (token IN ('SOL', 'USDC')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transaction_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES booking(id),
    signature TEXT NOT NULL UNIQUE,
    token TEXT CHECK (token IN ('SOL', 'USDC')) NOT NULL,
    amount_lamports BIGINT,
    amount_spl BIGINT,
    payer_address TEXT NOT NULL,
    caregiver_address TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'confirmed', 'failed')) NOT NULL,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS caregiver_points_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caregiver_id UUID REFERENCES caregiver(id),
    booking_id UUID REFERENCES booking(id),
    metric TEXT,
    delta INT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS caregiver_points_summary (
    caregiver_id UUID PRIMARY KEY REFERENCES caregiver(id),
    total_points INT NOT NULL DEFAULT 0,
    rolling_avg_rating NUMERIC(3,2),
    last_updated TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_points_summary ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users manage own data" ON app_user;
DROP POLICY IF EXISTS "Caregiver profile access" ON caregiver;
DROP POLICY IF EXISTS "Booking access" ON booking;
DROP POLICY IF EXISTS "Transaction access" ON transaction_ledger;
DROP POLICY IF EXISTS "Points access" ON caregiver_points_ledger;
DROP POLICY IF EXISTS "Points summary access" ON caregiver_points_summary;

-- RLS Policies for User App
CREATE POLICY "user_own_data" ON app_user FOR ALL USING (id = auth.uid() OR app.is_admin());

CREATE POLICY "caregiver_read" ON caregiver FOR SELECT USING (verified = true OR id = auth.uid() OR app.is_admin());
CREATE POLICY "caregiver_update" ON caregiver FOR UPDATE USING (id = auth.uid() OR app.is_admin());

CREATE POLICY "booking_access" ON booking FOR ALL USING (customer_id = auth.uid() OR caregiver_id = auth.uid() OR app.is_admin());

CREATE POLICY "transaction_read" ON transaction_ledger FOR SELECT USING (
    app.is_admin() OR EXISTS (
        SELECT 1 FROM booking b WHERE b.id = booking_id 
        AND (b.customer_id = auth.uid() OR b.caregiver_id = auth.uid())
    )
);

CREATE POLICY "points_ledger_read" ON caregiver_points_ledger FOR SELECT USING (caregiver_id = auth.uid() OR app.is_admin());

CREATE POLICY "points_summary_read" ON caregiver_points_summary FOR SELECT USING (caregiver_id = auth.uid() OR app.is_admin());

-- Admin-only policies for write operations
CREATE POLICY "admin_transaction_write" ON transaction_ledger FOR INSERT WITH CHECK (app.is_admin());
CREATE POLICY "admin_points_write" ON caregiver_points_ledger FOR INSERT WITH CHECK (app.is_admin());
CREATE POLICY "admin_points_summary_write" ON caregiver_points_summary FOR ALL USING (app.is_admin());

-- Trigger to update points summary
CREATE OR REPLACE FUNCTION update_points_summary()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO caregiver_points_summary (caregiver_id, total_points, last_updated)
    VALUES (NEW.caregiver_id, NEW.delta, now())
    ON CONFLICT (caregiver_id) 
    DO UPDATE SET 
        total_points = caregiver_points_summary.total_points + NEW.delta,
        last_updated = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS points_summary_trigger ON caregiver_points_ledger;
CREATE TRIGGER points_summary_trigger
    AFTER INSERT ON caregiver_points_ledger
    FOR EACH ROW EXECUTE FUNCTION update_points_summary();
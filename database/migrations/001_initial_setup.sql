-- Week 1: Core Database Setup
-- Run this in Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Core user management
CREATE TABLE IF NOT EXISTS app_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT CHECK (role IN ('customer', 'caregiver', 'admin')) NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Caregiver profiles with crypto settings
CREATE TABLE IF NOT EXISTS caregiver (
    id UUID PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    payout_address TEXT NOT NULL,
    payout_token TEXT CHECK (payout_token IN ('SOL', 'USDC')) NOT NULL,
    verified BOOLEAN DEFAULT false,
    tier TEXT CHECK (tier IN ('Bronze', 'Silver', 'Gold', 'Platinum')) DEFAULT 'Bronze',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Booking system
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

-- Transaction ledger for crypto payments
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

-- Points system
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

-- Enable RLS
ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_points_summary ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION app.get_current_user_id()
RETURNS UUID LANGUAGE SQL STABLE
AS $$
    SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION app.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    uid UUID := auth.uid();
    res BOOLEAN;
BEGIN
    SELECT (role = 'admin') INTO res
    FROM app_user
    WHERE id = uid;
    RETURN COALESCE(res, false);
END;
$$;

-- Basic RLS policies
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_user' AND policyname = 'Users manage own data') THEN
        CREATE POLICY "Users manage own data" ON app_user FOR ALL USING (id = auth.uid() OR app.is_admin());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caregiver' AND policyname = 'Caregiver profile access') THEN
        CREATE POLICY "Caregiver profile access" ON caregiver FOR SELECT USING (verified = true OR id = auth.uid() OR app.is_admin());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'booking' AND policyname = 'Booking access') THEN
        CREATE POLICY "Booking access" ON booking FOR SELECT USING (customer_id = auth.uid() OR caregiver_id = auth.uid() OR app.is_admin());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transaction_ledger' AND policyname = 'Transaction access') THEN
        CREATE POLICY "Transaction access" ON transaction_ledger USING (app.is_admin() OR EXISTS (SELECT 1 FROM booking b WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR b.caregiver_id = auth.uid())));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caregiver_points_ledger' AND policyname = 'Points access') THEN
        CREATE POLICY "Points access" ON caregiver_points_ledger FOR SELECT USING (caregiver_id = auth.uid() OR app.is_admin());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caregiver_points_summary' AND policyname = 'Points summary access') THEN
        CREATE POLICY "Points summary access" ON caregiver_points_summary FOR SELECT USING (caregiver_id = auth.uid() OR app.is_admin());
    END IF;
END $$;
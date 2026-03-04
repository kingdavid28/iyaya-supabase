-- Week 1: Fix existing schema and add missing parts
-- Run this in Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add missing columns to existing tables
DO $$ BEGIN
    -- Add customer_id to booking if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking' AND column_name = 'customer_id') THEN
        ALTER TABLE booking ADD COLUMN customer_id UUID REFERENCES app_user(id);
    END IF;
    
    -- Add caregiver_id to booking if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking' AND column_name = 'caregiver_id') THEN
        ALTER TABLE booking ADD COLUMN caregiver_id UUID REFERENCES caregiver(id);
    END IF;
    
    -- Add amount_usd to booking if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking' AND column_name = 'amount_usd') THEN
        ALTER TABLE booking ADD COLUMN amount_usd NUMERIC(12,2);
    END IF;
    
    -- Add token to booking if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking' AND column_name = 'token') THEN
        ALTER TABLE booking ADD COLUMN token TEXT CHECK (token IN ('SOL', 'USDC'));
    END IF;
END $$;

-- Create missing tables
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

-- Drop existing policies first, then recreate
DROP POLICY IF EXISTS "Users manage own data" ON app_user;
DROP POLICY IF EXISTS "Caregiver profile access" ON caregiver;
DROP POLICY IF EXISTS "Booking access" ON booking;
DROP POLICY IF EXISTS "Transaction access" ON transaction_ledger;
DROP POLICY IF EXISTS "Points access" ON caregiver_points_ledger;
DROP POLICY IF EXISTS "Points summary access" ON caregiver_points_summary;

-- Create policies
CREATE POLICY "Users manage own data" ON app_user FOR ALL USING (id = auth.uid() OR app.is_admin());
CREATE POLICY "Caregiver profile access" ON caregiver FOR SELECT USING (verified = true OR id = auth.uid() OR app.is_admin());
CREATE POLICY "Booking access" ON booking FOR SELECT USING (customer_id = auth.uid() OR caregiver_id = auth.uid() OR app.is_admin());
CREATE POLICY "Transaction access" ON transaction_ledger USING (app.is_admin() OR EXISTS (SELECT 1 FROM booking b WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR b.caregiver_id = auth.uid())));
CREATE POLICY "Points access" ON caregiver_points_ledger FOR SELECT USING (caregiver_id = auth.uid() OR app.is_admin());
CREATE POLICY "Points summary access" ON caregiver_points_summary FOR SELECT USING (caregiver_id = auth.uid() OR app.is_admin());
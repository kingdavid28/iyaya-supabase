-- Add wallet columns to app_user table
-- Run this in Supabase SQL Editor

ALTER TABLE app_user 
ADD COLUMN IF NOT EXISTS solana_wallet_address TEXT,
ADD COLUMN IF NOT EXISTS preferred_token TEXT CHECK (preferred_token IN ('SOL', 'USDC')) DEFAULT 'SOL';
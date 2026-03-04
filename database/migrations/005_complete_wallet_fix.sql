-- Complete wallet setup fix
-- Run this in Supabase SQL Editor

-- Add columns if they don't exist
ALTER TABLE app_user 
ADD COLUMN IF NOT EXISTS solana_wallet_address TEXT,
ADD COLUMN IF NOT EXISTS preferred_token TEXT CHECK (preferred_token IN ('SOL', 'USDC')) DEFAULT 'SOL';

-- Update RLS policy to allow updates
DROP POLICY IF EXISTS "Users manage own data" ON app_user;
CREATE POLICY "Users manage own data" ON app_user 
FOR ALL USING (id = auth.uid() OR app.is_admin())
WITH CHECK (id = auth.uid() OR app.is_admin());

-- Create the RPC function
CREATE OR REPLACE FUNCTION update_user_wallet(
  user_id UUID,
  wallet_address TEXT,
  token TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  UPDATE app_user 
  SET 
    solana_wallet_address = wallet_address,
    preferred_token = token
  WHERE id = user_id;
  
  SELECT json_build_object('success', true, 'message', 'Wallet updated') INTO result;
  RETURN result;
END;
$$;
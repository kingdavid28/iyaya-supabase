-- Create RPC function to update wallet data
-- Run this in Supabase SQL Editor

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
  -- Update the user's wallet info
  UPDATE app_user 
  SET 
    solana_wallet_address = wallet_address,
    preferred_token = token
  WHERE id = user_id;
  
  -- Return success
  SELECT json_build_object('success', true, 'message', 'Wallet updated') INTO result;
  RETURN result;
END;
$$;
-- Migration: Consolidate user tables and fix schema inconsistencies
-- This migration:
-- 1. Adds missing columns to users table
-- 2. Migrates data from app_user to users
-- 3. Updates all foreign keys to reference users table
-- 4. Drops app_user table
-- 5. Fixes role constraints

-- Step 1: Add wallet columns to users table if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS solana_wallet_address text,
ADD COLUMN IF NOT EXISTS preferred_token text DEFAULT 'USDC' CHECK (preferred_token = ANY (ARRAY['SOL'::text, 'USDC'::text]));

-- Step 2: Migrate data from app_user to users (if app_user has data not in users)
INSERT INTO users (id, email, role, created_at, solana_wallet_address, preferred_token)
SELECT id, email, role, created_at, solana_wallet_address, preferred_token
FROM app_user
WHERE id NOT IN (SELECT id FROM users)
ON CONFLICT (id) DO UPDATE SET
  solana_wallet_address = EXCLUDED.solana_wallet_address,
  preferred_token = EXCLUDED.preferred_token;

-- Step 3: Update foreign key references from app_user to users

-- Drop existing foreign keys that reference app_user
ALTER TABLE booking DROP CONSTRAINT IF EXISTS booking_customer_id_fkey;
ALTER TABLE booking DROP CONSTRAINT IF EXISTS booking_parent_id_fkey;
ALTER TABLE solana_transactions DROP CONSTRAINT IF EXISTS solana_transactions_caregiver_id_fkey;
ALTER TABLE solana_transactions DROP CONSTRAINT IF EXISTS solana_transactions_payer_id_fkey;

-- Recreate foreign keys to reference users table
ALTER TABLE booking 
ADD CONSTRAINT booking_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES users(id),
ADD CONSTRAINT booking_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES users(id);

ALTER TABLE solana_transactions
ADD CONSTRAINT solana_transactions_caregiver_id_fkey FOREIGN KEY (caregiver_id) REFERENCES users(id),
ADD CONSTRAINT solana_transactions_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES users(id);

-- Step 4: Drop caregiver table foreign key to app_user and recreate to users
ALTER TABLE caregiver DROP CONSTRAINT IF EXISTS caregiver_id_fkey;
ALTER TABLE caregiver ADD CONSTRAINT caregiver_id_fkey FOREIGN KEY (id) REFERENCES users(id);

-- Step 5: Drop app_user table and its dependencies
DROP TABLE IF EXISTS app_user CASCADE;

-- Step 6: Update role constraint to use consistent values
-- Change 'parent' to 'customer' for consistency, or keep 'parent' - choosing to keep 'parent'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role = ANY (ARRAY['parent'::text, 'caregiver'::text, 'admin'::text]));

-- Step 7: Remove app_user_id column from users if it exists
ALTER TABLE users DROP COLUMN IF EXISTS app_user_id;

-- Step 8: Create index on wallet address for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(solana_wallet_address);

-- Step 9: Update any 'customer' roles to 'parent' for consistency
UPDATE users SET role = 'parent' WHERE role = 'customer';

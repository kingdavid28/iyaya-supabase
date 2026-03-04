-- Rollback script for 008-consolidate-user-tables.sql
-- WARNING: Only use if migration fails and you need to restore app_user table

-- Step 1: Recreate app_user table
CREATE TABLE IF NOT EXISTS app_user (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role = ANY (ARRAY['parent'::text, 'caregiver'::text, 'admin'::text])),
  email text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  solana_wallet_address text,
  preferred_token text DEFAULT 'USDC'::text CHECK (preferred_token = ANY (ARRAY['SOL'::text, 'USDC'::text])),
  user_id uuid,
  CONSTRAINT app_user_pkey PRIMARY KEY (id),
  CONSTRAINT app_user_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Step 2: Copy data back from users to app_user
INSERT INTO app_user (id, email, role, created_at, solana_wallet_address, preferred_token, user_id)
SELECT id, email, role, created_at, solana_wallet_address, preferred_token, id
FROM users;

-- Step 3: Restore foreign keys to app_user
ALTER TABLE booking DROP CONSTRAINT IF EXISTS booking_customer_id_fkey;
ALTER TABLE booking DROP CONSTRAINT IF EXISTS booking_parent_id_fkey;
ALTER TABLE solana_transactions DROP CONSTRAINT IF EXISTS solana_transactions_caregiver_id_fkey;
ALTER TABLE solana_transactions DROP CONSTRAINT IF EXISTS solana_transactions_payer_id_fkey;
ALTER TABLE caregiver DROP CONSTRAINT IF EXISTS caregiver_id_fkey;

ALTER TABLE booking 
ADD CONSTRAINT booking_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES app_user(id),
ADD CONSTRAINT booking_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES app_user(id);

ALTER TABLE solana_transactions
ADD CONSTRAINT solana_transactions_caregiver_id_fkey FOREIGN KEY (caregiver_id) REFERENCES app_user(id),
ADD CONSTRAINT solana_transactions_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES app_user(id);

ALTER TABLE caregiver ADD CONSTRAINT caregiver_id_fkey FOREIGN KEY (id) REFERENCES app_user(id);

-- Step 4: Drop index
DROP INDEX IF EXISTS idx_users_wallet_address;

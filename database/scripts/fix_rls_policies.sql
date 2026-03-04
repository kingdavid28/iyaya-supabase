-- Enable RLS on tables
ALTER TABLE caregiver ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for caregiver table
CREATE POLICY "Users can view own caregiver profile" ON caregiver
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own caregiver profile" ON caregiver
  FOR UPDATE USING (auth.uid() = id);

-- RLS policies for caregiver_profiles table  
CREATE POLICY "Users can view own profile" ON caregiver_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON caregiver_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON caregiver_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add Solana columns to app_user
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS solana_wallet_address TEXT;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS preferred_token TEXT CHECK (preferred_token IN ('SOL', 'USDC')) DEFAULT 'USDC';
-- Create caregiver_profiles table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS caregiver_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_user(id) ON DELETE CASCADE UNIQUE,
  bio TEXT,
  experience TEXT,
  skills TEXT[],
  certifications TEXT[],
  hourly_rate NUMERIC(10,2),
  availability JSONB,
  background_check_status TEXT,
  age_care_ranges JSONB DEFAULT '[]',
  emergency_contacts JSONB DEFAULT '[]',
  portfolio JSONB DEFAULT '{}',
  documents JSONB DEFAULT '[]',
  languages TEXT[] DEFAULT '{}',
  address JSONB DEFAULT '{}',
  education TEXT,
  trust_score NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE caregiver_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Caregiver profiles are viewable by everyone"
  ON caregiver_profiles FOR SELECT
  USING (true);

CREATE POLICY "Caregivers can update own profile"
  ON caregiver_profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Caregivers can insert own profile"
  ON caregiver_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_user_id ON caregiver_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_background_check ON caregiver_profiles(background_check_status);

-- Add all missing JSONB columns to caregiver_profiles table
-- This fixes the PGRST204 error and enables proper complex data storage

-- Add all missing columns
ALTER TABLE caregiver_profiles 
ADD COLUMN IF NOT EXISTS age_care_ranges JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS emergency_contacts JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS portfolio JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS address JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS education TEXT;

-- Update existing records to have proper default values
UPDATE caregiver_profiles 
SET 
  age_care_ranges = COALESCE(age_care_ranges, '[]'::jsonb),
  emergency_contacts = COALESCE(emergency_contacts, '[]'::jsonb),
  portfolio = COALESCE(portfolio, '{}'::jsonb),
  documents = COALESCE(documents, '[]'::jsonb),
  languages = COALESCE(languages, '[]'::jsonb),
  address = COALESCE(address, '{}'::jsonb)
WHERE 
  age_care_ranges IS NULL 
  OR emergency_contacts IS NULL 
  OR portfolio IS NULL 
  OR documents IS NULL 
  OR languages IS NULL 
  OR address IS NULL;
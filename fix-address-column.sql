-- Fix missing address column in caregiver_profiles table
-- This addresses the PGRST204 error: "Could not find the 'address' column"

-- Add the missing address column as JSONB
ALTER TABLE caregiver_profiles 
ADD COLUMN IF NOT EXISTS address JSONB DEFAULT '{}';

-- Update existing records to have proper default values
UPDATE caregiver_profiles 
SET address = COALESCE(address, '{}'::jsonb)
WHERE address IS NULL;
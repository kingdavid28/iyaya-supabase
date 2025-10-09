-- Create caregiver_profiles table to match MongoDB Caregiver schema
CREATE TABLE IF NOT EXISTS public.caregiver_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  caregiver_id VARCHAR(50) UNIQUE NOT NULL,
  
  -- Basic Information
  name VARCHAR(100) NOT NULL,
  bio TEXT,
  profile_image TEXT,
  
  -- Contact/Location
  address JSONB,
  location VARCHAR(100),
  
  -- Professional Details
  skills TEXT[], -- Array of skills
  experience JSONB, -- Flexible experience data
  hourly_rate DECIMAL(10,2),
  education TEXT,
  languages TEXT[], -- Array of languages
  
  -- Certifications
  certifications JSONB DEFAULT '[]'::jsonb, -- Array of certification objects
  
  -- Age care specializations
  age_care_ranges TEXT[] DEFAULT '{}', -- INFANT, TODDLER, PRESCHOOL, SCHOOL_AGE, TEEN
  
  -- Availability
  availability JSONB DEFAULT '{}'::jsonb,
  
  -- Rating and Reviews
  rating DECIMAL(3,2) DEFAULT 1.0 CHECK (rating >= 1 AND rating <= 5),
  reviews JSONB DEFAULT '[]'::jsonb,
  
  -- Background Check
  background_check JSONB DEFAULT '{
    "status": "not_started",
    "provider": "internal"
  }'::jsonb,
  
  -- Profile Verification
  verification JSONB DEFAULT '{
    "profileComplete": false,
    "identityVerified": false,
    "certificationsVerified": false,
    "referencesVerified": false,
    "trustScore": 0,
    "badges": []
  }'::jsonb,
  
  -- Portfolio/Gallery
  portfolio JSONB DEFAULT '{}'::jsonb,
  
  -- Emergency Contacts
  emergency_contacts JSONB DEFAULT '[]'::jsonb,
  
  -- Documents
  documents JSONB DEFAULT '[]'::jsonb,
  
  -- Job completion tracking
  has_completed_jobs BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_user_id ON public.caregiver_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_caregiver_id ON public.caregiver_profiles(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_skills ON public.caregiver_profiles USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_age_care_ranges ON public.caregiver_profiles USING GIN(age_care_ranges);
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_rating ON public.caregiver_profiles(rating DESC);
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_hourly_rate ON public.caregiver_profiles(hourly_rate);
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_location ON public.caregiver_profiles(location);

-- Enable Row Level Security
ALTER TABLE public.caregiver_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Caregivers can view and modify their own profiles
DROP POLICY IF EXISTS caregiver_profiles_own_access ON public.caregiver_profiles;
CREATE POLICY caregiver_profiles_own_access ON public.caregiver_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Anyone can view caregiver profiles (for browsing)
DROP POLICY IF EXISTS caregiver_profiles_public_read ON public.caregiver_profiles;
CREATE POLICY caregiver_profiles_public_read ON public.caregiver_profiles
  FOR SELECT TO authenticated USING (true);

-- Function to generate unique caregiver ID
CREATE OR REPLACE FUNCTION generate_caregiver_id()
RETURNS TEXT AS $$
DECLARE
  timestamp_part TEXT;
  random_part TEXT;
  caregiver_id TEXT;
BEGIN
  -- Generate timestamp part (base36)
  timestamp_part := UPPER(SUBSTRING(TO_HEX(EXTRACT(EPOCH FROM NOW())::BIGINT), 1, 8));
  
  -- Generate random part
  random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 5));
  
  -- Combine parts
  caregiver_id := 'CG' || timestamp_part || random_part;
  
  RETURN caregiver_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate caregiver_id
CREATE OR REPLACE FUNCTION set_caregiver_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.caregiver_id IS NULL OR NEW.caregiver_id = '' THEN
    NEW.caregiver_id := generate_caregiver_id();
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_caregiver_id ON public.caregiver_profiles;
CREATE TRIGGER trigger_set_caregiver_id
  BEFORE INSERT OR UPDATE ON public.caregiver_profiles
  FOR EACH ROW EXECUTE FUNCTION set_caregiver_id();

-- Function to calculate profile completion percentage
CREATE OR REPLACE FUNCTION calculate_profile_completion(profile_data JSONB)
RETURNS INTEGER AS $$
DECLARE
  completed INTEGER := 0;
  total INTEGER := 10;
BEGIN
  -- Check each required field
  IF profile_data->>'name' IS NOT NULL AND profile_data->>'name' != '' THEN completed := completed + 1; END IF;
  IF profile_data->>'bio' IS NOT NULL AND profile_data->>'bio' != '' THEN completed := completed + 1; END IF;
  IF profile_data->>'profile_image' IS NOT NULL AND profile_data->>'profile_image' != '' THEN completed := completed + 1; END IF;
  IF profile_data->'skills' IS NOT NULL AND jsonb_array_length(profile_data->'skills') > 0 THEN completed := completed + 1; END IF;
  IF profile_data->'experience'->>'description' IS NOT NULL AND profile_data->'experience'->>'description' != '' THEN completed := completed + 1; END IF;
  IF profile_data->>'hourly_rate' IS NOT NULL AND (profile_data->>'hourly_rate')::DECIMAL > 0 THEN completed := completed + 1; END IF;
  IF profile_data->'certifications' IS NOT NULL AND jsonb_array_length(profile_data->'certifications') > 0 THEN completed := completed + 1; END IF;
  IF profile_data->'availability'->'days' IS NOT NULL AND jsonb_array_length(profile_data->'availability'->'days') > 0 THEN completed := completed + 1; END IF;
  IF profile_data->'emergency_contacts' IS NOT NULL AND jsonb_array_length(profile_data->'emergency_contacts') > 0 THEN completed := completed + 1; END IF;
  IF profile_data->'age_care_ranges' IS NOT NULL AND jsonb_array_length(profile_data->'age_care_ranges') > 0 THEN completed := completed + 1; END IF;
  
  RETURN ROUND((completed::DECIMAL / total::DECIMAL) * 100);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate trust score
CREATE OR REPLACE FUNCTION calculate_trust_score(profile_data JSONB)
RETURNS INTEGER AS $$
DECLARE
  score DECIMAL := 0;
  profile_completion INTEGER;
  rating DECIMAL;
  verified_certs INTEGER;
BEGIN
  -- Profile completeness (30 points)
  profile_completion := calculate_profile_completion(profile_data);
  score := score + (profile_completion::DECIMAL / 100) * 30;
  
  -- Background check (25 points)
  IF profile_data->'background_check'->>'status' = 'approved' THEN
    score := score + 25;
  END IF;
  
  -- Certifications (20 points)
  SELECT COUNT(*) INTO verified_certs
  FROM jsonb_array_elements(COALESCE(profile_data->'certifications', '[]'::jsonb)) AS cert
  WHERE (cert->>'verified')::BOOLEAN = true;
  
  score := score + LEAST(verified_certs * 5, 20);
  
  -- Reviews and rating (15 points)
  rating := COALESCE((profile_data->>'rating')::DECIMAL, 0);
  IF rating >= 4.5 THEN score := score + 15;
  ELSIF rating >= 4.0 THEN score := score + 10;
  ELSIF rating >= 3.5 THEN score := score + 5;
  END IF;
  
  -- Identity verification (10 points)
  IF (profile_data->'verification'->>'identityVerified')::BOOLEAN = true THEN
    score := score + 10;
  END IF;
  
  RETURN LEAST(ROUND(score), 100);
END;
$$ LANGUAGE plpgsql;
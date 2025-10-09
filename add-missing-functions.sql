-- Add missing RLS policies
ALTER TABLE public.caregiver_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS caregiver_profiles_own_access ON public.caregiver_profiles;
CREATE POLICY caregiver_profiles_own_access ON public.caregiver_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id);

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
  timestamp_part := UPPER(SUBSTRING(TO_HEX(EXTRACT(EPOCH FROM NOW())::BIGINT), 1, 8));
  random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 5));
  caregiver_id := 'CG' || timestamp_part || random_part;
  RETURN caregiver_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-generate caregiver_id
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
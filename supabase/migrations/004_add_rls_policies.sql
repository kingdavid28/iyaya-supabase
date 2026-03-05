-- Essential RLS Policies for Iyaya App
-- These policies allow users to access their own data and enable basic app functionality

-- ========================================
-- Users Table Policies
-- ========================================

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile (during signup)
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow authenticated users to view basic user info (for search/directory)
CREATE POLICY "Authenticated users can view basic user info" ON public.users
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        (email_verified = true OR status = 'active')
    );

-- ========================================
-- Caregiver Profiles Table Policies
-- ========================================

-- Allow users to view their own caregiver profile
CREATE POLICY "Users can view own caregiver profile" ON public.caregiver_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own caregiver profile
CREATE POLICY "Users can insert own caregiver profile" ON public.caregiver_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own caregiver profile
CREATE POLICY "Users can update own caregiver profile" ON public.caregiver_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow authenticated users to view caregiver profiles (for parents searching)
CREATE POLICY "Authenticated users can view caregiver profiles" ON public.caregiver_profiles
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = caregiver_profiles.user_id 
            AND users.role = 'caregiver' 
            AND users.status = 'active'
        )
    );

-- ========================================
-- Privacy Settings Table Policies
-- ========================================

-- Allow users to view their own privacy settings
CREATE POLICY "Users can view own privacy settings" ON public.privacy_settings
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own privacy settings
CREATE POLICY "Users can insert own privacy settings" ON public.privacy_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own privacy settings
CREATE POLICY "Users can update own privacy settings" ON public.privacy_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- ========================================
-- Enable RLS (if not already enabled)
-- ========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregiver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Grant necessary permissions
-- ========================================

-- Grant usage on schema to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

GRANT SELECT, INSERT, UPDATE ON public.caregiver_profiles TO authenticated;
GRANT SELECT ON public.caregiver_profiles TO anon;

GRANT SELECT, INSERT, UPDATE ON public.privacy_settings TO authenticated;

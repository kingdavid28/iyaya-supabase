-- Fix schema issues
-- Run this in your Supabase SQL Editor

-- Add missing applied_at column to applications table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to have applied_at = created_at
UPDATE applications SET applied_at = created_at WHERE applied_at IS NULL;

-- Create caregiver_profiles table
CREATE TABLE IF NOT EXISTS caregiver_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  experience TEXT,
  skills TEXT[],
  certifications TEXT[],
  hourly_rate INTEGER,
  availability JSONB,
  background_check_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add caregiver_id column to reviews table
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS caregiver_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Enable RLS for caregiver_profiles
ALTER TABLE caregiver_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for caregiver_profiles
CREATE POLICY "Caregivers can manage their own profile" ON caregiver_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view caregiver profiles" ON caregiver_profiles FOR SELECT USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_user_id ON caregiver_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_caregiver_id ON reviews(caregiver_id);

-- Create storage buckets for images
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-images', 'profile-images', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', true) ON CONFLICT DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload their own profile images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view profile images" ON storage.objects FOR SELECT USING (bucket_id = 'profile-images');
CREATE POLICY "Users can update their own profile images" ON storage.objects FOR UPDATE USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own profile images" ON storage.objects FOR DELETE USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload payment proofs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view payment proofs" ON storage.objects FOR SELECT USING (bucket_id = 'payment-proofs');
CREATE POLICY "Users can update payment proofs" ON storage.objects FOR UPDATE USING (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete payment proofs" ON storage.objects FOR DELETE USING (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
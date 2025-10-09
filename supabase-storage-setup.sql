-- Storage bucket creation for profile images and payment proofs
-- Run this in Supabase SQL Editor

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('profile-images', 'profile-images', true),
  ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Note: Storage policies must be created through Supabase Dashboard
-- Go to Storage > Settings > Policies to create the following policies:
--
-- For profile-images bucket:
-- 1. Allow authenticated users to INSERT
-- 2. Allow public SELECT (for viewing images)
-- 3. Allow authenticated users to UPDATE their own files
-- 4. Allow authenticated users to DELETE their own files
--
-- For payment-proofs bucket:
-- 1. Allow authenticated users to INSERT
-- 2. Allow authenticated users to SELECT their own files
-- 3. Allow authenticated users to UPDATE their own files
-- 4. Allow authenticated users to DELETE their own files
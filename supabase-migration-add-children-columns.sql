-- Migration: Add missing columns to children table
-- Run this in Supabase SQL Editor

-- Add age column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'children' 
    AND column_name = 'age'
  ) THEN
    ALTER TABLE public.children ADD COLUMN age INTEGER;
  END IF;
END
$$;

-- Add allergies column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'children' 
    AND column_name = 'allergies'
  ) THEN
    ALTER TABLE public.children ADD COLUMN allergies TEXT;
  END IF;
END
$$;

-- Update notes column to allow NULL if it's not already
ALTER TABLE public.children ALTER COLUMN notes DROP NOT NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'children' 
ORDER BY ordinal_position;
-- Add parent_name column to bookings table to fix "Unknown Parent" issue
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS parent_name VARCHAR(100);

-- Add comment to document the schema update
COMMENT ON COLUMN public.bookings.parent_name IS 'Name of the parent for easy reference';
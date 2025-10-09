-- Update bookings table to include missing columns needed by BookingModal
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS selected_children TEXT[],
ADD COLUMN IF NOT EXISTS special_instructions TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact JSONB,
ADD COLUMN IF NOT EXISTS caregiver_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS time_display VARCHAR(50),
ADD COLUMN IF NOT EXISTS feedback TEXT;

-- Add comment to document the schema update
COMMENT ON COLUMN public.bookings.address IS 'Full address where childcare will be provided';
COMMENT ON COLUMN public.bookings.contact_phone IS 'Parent contact phone number';
COMMENT ON COLUMN public.bookings.selected_children IS 'Array of selected children names';
COMMENT ON COLUMN public.bookings.special_instructions IS 'Special instructions for the caregiver';
COMMENT ON COLUMN public.bookings.emergency_contact IS 'Emergency contact information as JSON';
COMMENT ON COLUMN public.bookings.caregiver_name IS 'Name of the caregiver for easy reference';
COMMENT ON COLUMN public.bookings.time_display IS 'Human-readable time display (e.g., "9:00 AM - 1:00 PM")';
COMMENT ON COLUMN public.bookings.feedback IS 'Feedback or reason for status changes';
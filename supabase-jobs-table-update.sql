-- Update jobs table to include missing columns needed by job posting
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS children JSONB,
ADD COLUMN IF NOT EXISTS special_instructions TEXT,
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS emergency_contact JSONB;

-- Add comment to document the schema update
COMMENT ON COLUMN public.jobs.children IS 'Array of children information as JSON';
COMMENT ON COLUMN public.jobs.special_instructions IS 'Special instructions for caregivers';
COMMENT ON COLUMN public.jobs.contact_phone IS 'Contact phone number for the job';
COMMENT ON COLUMN public.jobs.emergency_contact IS 'Emergency contact information as JSON';
-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_user_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create user_reports table
CREATE TABLE IF NOT EXISTS public.user_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_user_id uuid NOT NULL,
  report_type character varying(50) NOT NULL,
  category character varying(100) NULL,
  title character varying(255) NOT NULL,
  description text NOT NULL,
  severity character varying(20) NULL DEFAULT 'medium'::character varying,
  status character varying(20) NULL DEFAULT 'pending'::character varying,
  evidence_urls text[] NULL,
  booking_id uuid NULL,
  job_id uuid NULL,
  admin_notes text NULL,
  reviewed_by uuid NULL,
  reviewed_at timestamp with time zone NULL,
  resolution text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT user_reports_pkey PRIMARY KEY (id),
  CONSTRAINT user_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT user_reports_reported_user_id_fkey FOREIGN KEY (reported_user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT user_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT user_reports_report_type_check CHECK (
    (report_type)::text = ANY (
      ARRAY[
        'caregiver_misconduct'::character varying,
        'parent_maltreatment'::character varying,
        'inappropriate_behavior'::character varying,
        'safety_concern'::character varying,
        'payment_dispute'::character varying,
        'other'::character varying
      ]::text[]
    )
  ),
  CONSTRAINT user_reports_status_check CHECK (
    (status)::text = ANY (
      ARRAY[
        'pending'::character varying,
        'under_review'::character varying,
        'resolved'::character varying,
        'dismissed'::character varying
      ]::text[]
    )
  ),
  CONSTRAINT user_reports_severity_check CHECK (
    (severity)::text = ANY (
      ARRAY[
        'low'::character varying,
        'medium'::character varying,
        'high'::character varying,
        'critical'::character varying
      ]::text[]
    )
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.user_reports USING btree (reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON public.user_reports USING btree (reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.user_reports USING btree (status);
CREATE INDEX IF NOT EXISTS idx_reports_type ON public.user_reports USING btree (report_type);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.user_reports USING btree (created_at DESC);

-- Create trigger (drop if exists first)
DROP TRIGGER IF EXISTS user_reports_updated_at ON public.user_reports;
CREATE TRIGGER user_reports_updated_at 
  BEFORE UPDATE ON public.user_reports 
  FOR EACH ROW 
  EXECUTE FUNCTION update_user_reports_updated_at();

-- Enable RLS
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop if exists first)
DROP POLICY IF EXISTS "Users can view their own reports" ON public.user_reports;
CREATE POLICY "Users can view their own reports" ON public.user_reports
  FOR SELECT USING (
    auth.uid() = reporter_id OR 
    auth.uid() = reported_user_id
  );

DROP POLICY IF EXISTS "Admins can view all reports" ON public.user_reports;
CREATE POLICY "Admins can view all reports" ON public.user_reports
  FOR SELECT USING (
    (auth.jwt() ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Users can create reports" ON public.user_reports;
CREATE POLICY "Users can create reports" ON public.user_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Only admins can update reports" ON public.user_reports;
CREATE POLICY "Only admins can update reports" ON public.user_reports
  FOR UPDATE USING (
    (auth.jwt() ->> 'role') = 'admin'
  );
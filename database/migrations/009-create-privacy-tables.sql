-- Migration: Create privacy tables
-- These tables are referenced by privacyService.js but may not exist

-- 1. Create privacy_settings table if not exists
CREATE TABLE IF NOT EXISTS privacy_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  share_phone boolean DEFAULT false,
  share_address boolean DEFAULT false,
  share_emergency_contact boolean DEFAULT false,
  share_child_medical_info boolean DEFAULT false,
  share_child_allergies boolean DEFAULT false,
  share_child_behavior_notes boolean DEFAULT false,
  share_financial_info boolean DEFAULT false,
  share_documents boolean DEFAULT false,
  share_background_check boolean DEFAULT false,
  share_portfolio boolean DEFAULT false,
  share_availability boolean DEFAULT false,
  share_languages boolean DEFAULT false,
  share_references boolean DEFAULT false,
  share_rate_history boolean DEFAULT false,
  share_work_history boolean DEFAULT false,
  auto_approve_basic_info boolean DEFAULT true,
  allow_direct_messages boolean DEFAULT true,
  profile_visibility boolean DEFAULT true,
  show_online_status boolean DEFAULT true,
  show_ratings boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create privacy_permissions table if not exists
CREATE TABLE IF NOT EXISTS privacy_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field text NOT NULL CHECK (char_length(field) > 0),
  status text DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  granted_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}',
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE(target_id, viewer_id, field)
);

-- 3. Create privacy_notifications table if not exists
CREATE TABLE IF NOT EXISTS privacy_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  acknowledged_at timestamptz
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_privacy_permissions_target ON privacy_permissions(target_id);
CREATE INDEX IF NOT EXISTS idx_privacy_permissions_viewer ON privacy_permissions(viewer_id);
CREATE INDEX IF NOT EXISTS idx_privacy_notifications_user ON privacy_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_notifications_read ON privacy_notifications(user_id, read);

-- 5. Create view for enriched permissions (optional, used by privacyService)
CREATE OR REPLACE VIEW privacy_permissions_enriched AS
SELECT * FROM privacy_permissions WHERE status = 'active';

-- 6. Enable RLS
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_notifications ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
CREATE POLICY "Users can view own privacy settings"
  ON privacy_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own privacy settings"
  ON privacy_settings FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view permissions where they are target or viewer"
  ON privacy_permissions FOR SELECT
  USING (auth.uid() = target_id OR auth.uid() = viewer_id);

CREATE POLICY "Users can manage permissions they granted"
  ON privacy_permissions FOR ALL
  USING (auth.uid() = granted_by OR auth.uid() = target_id);

CREATE POLICY "Users can view own notifications"
  ON privacy_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON privacy_notifications FOR UPDATE
  USING (auth.uid() = user_id);

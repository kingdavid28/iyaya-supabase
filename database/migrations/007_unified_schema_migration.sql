-- Unified Database Schema Migration
-- Combines the best features from both iyaya-supabase and iyaya-admin apps
-- Follows best practices for zero-downtime migration

-- ============================================
-- PRE-MIGRATION PREPARATION
-- ============================================

-- Step 1: Create backup tables
CREATE TABLE users_migration_backup AS SELECT * FROM users;
CREATE TABLE caregiver_profiles_migration_backup AS SELECT * FROM caregiver_profiles;
CREATE TABLE children_migration_backup AS SELECT * FROM children;
CREATE TABLE jobs_migration_backup AS SELECT * FROM jobs;
CREATE TABLE bookings_migration_backup AS SELECT * FROM bookings;
CREATE TABLE applications_migration_backup AS SELECT * FROM applications;
CREATE TABLE reviews_migration_backup AS SELECT * FROM reviews;
CREATE TABLE messages_migration_backup AS SELECT * FROM messages;
CREATE TABLE conversations_migration_backup AS SELECT * FROM conversations;
CREATE TABLE notifications_migration_backup AS SELECT * FROM notifications;

-- Step 2: Create migration tracking table
CREATE TABLE schema_migration_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    error_message TEXT,
    rollback_sql TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO schema_migration_log (migration_name, status, rollback_sql) 
VALUES ('007_unified_schema_migration', 'in_progress', 
'-- Rollback script will be generated during migration');

-- ============================================
-- PHASE 1: ANALYZE CURRENT SCHEMA DIFFERENCES
-- ============================================

-- Check current schema structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('users', 'caregiver_profiles', 'children', 'jobs', 'bookings', 'applications', 'reviews', 'messages', 'conversations', 'notifications')
ORDER BY table_name, ordinal_position;

-- ============================================
-- PHASE 2: CREATE UNIFIED SCHEMA STRUCTURE
-- ============================================

-- Create unified users table (combines best from both schemas)
CREATE TABLE users_unified (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Authentication fields (from both schemas)
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    auth_provider TEXT DEFAULT 'supabase',
    email_verified BOOLEAN DEFAULT FALSE,
    
    -- Basic profile fields (from main app)
    first_name TEXT,
    last_name TEXT,
    name TEXT, -- Computed field
    phone TEXT,
    avatar_url TEXT,
    bio TEXT,
    
    -- Location fields (from admin app)
    address TEXT,
    location TEXT,
    
    -- Role and status (enhanced from both)
    role TEXT NOT NULL DEFAULT 'parent' CHECK (role IN ('parent', 'caregiver', 'admin', 'superadmin')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'banned')),
    status_reason TEXT,
    status_updated_at TIMESTAMP,
    status_updated_by UUID REFERENCES users_unified(id),
    
    -- Caregiver-specific fields (from admin app - for convenience)
    experience TEXT,
    skills TEXT[],
    certifications TEXT[],
    hourly_rate DECIMAL(10,2),
    rating DECIMAL(3,2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    
    -- Soft delete (from admin app)
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users_unified(id),
    
    -- Metadata (from both schemas)
    availability JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create computed name trigger
CREATE OR REPLACE FUNCTION compute_user_name()
RETURNS TRIGGER AS $$
BEGIN
    NEW.name = COALESCE(
        NEW.first_name || ' ' || NEW.last_name,
        NEW.last_name,
        NEW.first_name,
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER compute_user_name_trigger
BEFORE INSERT OR UPDATE ON users_unified
FOR EACH ROW EXECUTE FUNCTION compute_user_name();

-- Create unified caregiver_profiles table (enhanced from admin app)
CREATE TABLE caregiver_profiles_unified (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users_unified(id) ON DELETE CASCADE,
    caregiver_id TEXT UNIQUE, -- For external references
    
    -- Profile information (enhanced from both)
    profile_image TEXT,
    bio TEXT,
    experience JSONB, -- Structured experience data
    hourly_rate DECIMAL(10,2),
    education TEXT,
    languages TEXT[],
    age_care_ranges TEXT[],
    certifications JSONB,
    availability JSONB,
    portfolio JSONB,
    emergency_contacts JSONB,
    
    -- Verification and trust (from admin app)
    verification JSONB,
    rating DECIMAL(3,2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    trust_score INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    background_check_status TEXT DEFAULT 'not_started',
    
    -- Performance metrics
    completed_jobs INTEGER DEFAULT 0,
    cancelled_jobs INTEGER DEFAULT 0,
    average_response_time INTEGER, -- in minutes
    
    -- Metadata
    last_active TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT caregiver_profiles_user_id_unique UNIQUE (user_id)
);

-- Create unified children table (enhanced)
CREATE TABLE children_unified (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES users_unified(id) ON DELETE CASCADE,
    
    -- Basic information
    first_name TEXT NOT NULL,
    last_name TEXT,
    name TEXT, -- Computed
    birth_date DATE,
    age INTEGER, -- Computed from birth_date
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    
    -- Care requirements
    special_needs TEXT,
    allergies TEXT,
    medical_conditions TEXT,
    dietary_restrictions TEXT,
    medications TEXT,
    
    -- Emergency information
    emergency_contact JSONB,
    doctor_info JSONB,
    
    -- School information
    school_name TEXT,
    school_grade TEXT,
    
    -- Preferences
    favorite_activities TEXT[],
    fears TEXT[],
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT children_name_not_empty CHECK (first_name IS NOT NULL AND first_name != '')
);

-- Create computed fields for children
CREATE OR REPLACE FUNCTION compute_child_name()
RETURNS TRIGGER AS $$
BEGIN
    NEW.name = COALESCE(
        NEW.first_name || ' ' || NEW.last_name,
        NEW.last_name,
        NEW.first_name
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION compute_child_age()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.birth_date IS NOT NULL THEN
        NEW.age = EXTRACT(YEAR FROM AGE(NEW.birth_date));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER compute_child_name_trigger
BEFORE INSERT OR UPDATE ON children_unified
FOR EACH ROW EXECUTE FUNCTION compute_child_name();

CREATE TRIGGER compute_child_age_trigger
BEFORE INSERT OR UPDATE ON children_unified
FOR EACH ROW EXECUTE FUNCTION compute_child_age();

-- Create unified jobs table (enhanced)
CREATE TABLE jobs_unified (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES users_unified(id) ON DELETE CASCADE,
    
    -- Job details
    title TEXT NOT NULL,
    description TEXT,
    requirements TEXT[],
    
    -- Location and timing
    location TEXT,
    is_remote BOOLEAN DEFAULT FALSE,
    start_date DATE,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    
    -- Compensation
    hourly_rate DECIMAL(10,2),
    fixed_rate DECIMAL(10,2),
    budget DECIMAL(10,2),
    payment_type TEXT CHECK (payment_type IN ('hourly', 'fixed', 'negotiable')),
    
    -- Children information
    number_of_children INTEGER DEFAULT 1,
    children_ages TEXT[],
    children_ids UUID[], -- References children_unified
    
    -- Special requirements
    special_instructions TEXT,
    special_needs TEXT,
    languages_required TEXT[],
    
    -- Status and urgency
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'filled', 'cancelled', 'completed')),
    urgent BOOLEAN DEFAULT FALSE,
    
    -- Assignment
    caregiver_id UUID REFERENCES users_unified(id),
    
    -- Metadata
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create unified applications table
CREATE TABLE applications_unified (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs_unified(id) ON DELETE CASCADE,
    caregiver_id UUID NOT NULL REFERENCES users_unified(id) ON DELETE CASCADE,
    
    -- Application details
    message TEXT,
    proposed_rate DECIMAL(10,2),
    availability TEXT[],
    
    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'shortlisted', 'accepted', 'rejected', 'withdrawn')),
    viewed_at TIMESTAMP,
    shortlisted_at TIMESTAMP,
    responded_at TIMESTAMP,
    
    -- Parent feedback
    parent_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_job_application UNIQUE (job_id, caregiver_id)
);

-- Create unified bookings table (enhanced)
CREATE TABLE bookings_unified (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs_unified(id),
    application_id UUID REFERENCES applications_unified(id),
    parent_id UUID NOT NULL REFERENCES users_unified(id) ON DELETE CASCADE,
    caregiver_id UUID NOT NULL REFERENCES users_unified(id) ON DELETE CASCADE,
    
    -- Booking details
    title TEXT,
    description TEXT,
    
    -- Schedule
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    duration_hours INTEGER, -- Computed
    
    -- Location
    location TEXT,
    is_remote BOOLEAN DEFAULT FALSE,
    
    -- Financial
    total_amount DECIMAL(10,2),
    hourly_rate DECIMAL(10,2),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'disputed')),
    payment_method TEXT,
    
    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed')),
    confirmed_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES users_unified(id),
    
    -- Additional information
    notes TEXT,
    special_instructions TEXT,
    
    -- Check-in/Check-out
    caregiver_checkin TIMESTAMP,
    caregiver_checkout TIMESTAMP,
    parent_checkin TIMESTAMP,
    parent_checkout TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create computed duration trigger
CREATE OR REPLACE FUNCTION compute_booking_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
        NEW.duration_hours = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER compute_booking_duration_trigger
BEFORE INSERT OR UPDATE ON bookings_unified
FOR EACH ROW EXECUTE FUNCTION compute_booking_duration();

-- ============================================
-- PHASE 3: MIGRATE DATA FROM OLD TABLES
-- ============================================

-- Migrate users data (unified approach)
INSERT INTO users_unified (
    id, email, password_hash, auth_provider, email_verified,
    first_name, last_name, name, phone, avatar_url, bio,
    address, location, role, status, status_reason, status_updated_at, status_updated_by,
    experience, skills, certifications, hourly_rate, rating, review_count,
    deleted_at, deleted_by, availability, created_at, updated_at
)
SELECT 
    COALESCE(u.id, gen_random_uuid()),
    u.email,
    u.password_hash,
    COALESCE(u.auth_provider, 'supabase'),
    COALESCE(u.email_verified, FALSE),
    u.first_name,
    u.last_name,
    COALESCE(u.name, u.first_name || ' ' || u.last_name, u.email),
    u.phone,
    COALESCE(u.avatar_url, u.profile_image),
    u.bio,
    u.address,
    u.location,
    u.role,
    COALESCE(u.status, 'active'),
    u.status_reason,
    u.status_updated_at,
    u.status_updated_by,
    u.experience,
    u.skills,
    u.certifications,
    u.hourly_rate,
    COALESCE(u.rating, 0),
    COALESCE(u.review_count, 0),
    u.deleted_at,
    u.deleted_by,
    u.availability,
    u.created_at,
    u.updated_at
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM users_unified uu WHERE uu.email = u.email
);

-- Migrate caregiver profiles data
INSERT INTO caregiver_profiles_unified (
    id, user_id, caregiver_id, profile_image, bio, experience, hourly_rate,
    education, languages, age_care_ranges, certifications, availability,
    portfolio, emergency_contacts, verification, rating, review_count,
    trust_score, verified, background_check_status, completed_jobs,
    last_active, created_at, updated_at
)
SELECT 
    gen_random_uuid(),
    cp.user_id,
    cp.caregiver_id,
    cp.profile_image,
    cp.bio,
    cp.experience,
    cp.hourly_rate,
    cp.education,
    cp.languages,
    cp.age_care_ranges,
    cp.certifications,
    cp.availability,
    cp.portfolio,
    cp.emergency_contacts,
    cp.verification,
    COALESCE(cp.rating, 0),
    COALESCE(cp.review_count, 0),
    COALESCE(cp.trust_score, 0),
    COALESCE(cp.verified, FALSE),
    COALESCE(cp.background_check_status, 'not_started'),
    COALESCE(cp.completed_jobs, 0),
    cp.last_active,
    cp.created_at,
    cp.updated_at
FROM caregiver_profiles cp
WHERE EXISTS (
    SELECT 1 FROM users_unified uu WHERE uu.id = cp.user_id
);

-- Migrate children data
INSERT INTO children_unified (
    id, parent_id, first_name, last_name, name, birth_date, age, gender,
    special_needs, allergies, medical_conditions, emergency_contact,
    created_at, updated_at
)
SELECT 
    gen_random_uuid(),
    c.parent_id,
    -- Split name if available
    CASE 
        WHEN position(' ' in c.name) > 0 
        THEN split_part(c.name, ' ', 1)
        ELSE c.name
    END,
    CASE 
        WHEN position(' ' in c.name) > 0 
        THEN substring(c.name from position(' ' in c.name) + 1)
        ELSE NULL
    END,
    c.name,
    c.birth_date,
    CASE 
        WHEN c.birth_date IS NOT NULL 
        THEN EXTRACT(YEAR FROM AGE(c.birth_date))
        ELSE NULL
    END,
    c.gender,
    c.special_needs,
    c.allergies,
    c.medical_conditions,
    c.emergency_contact,
    c.created_at,
    c.updated_at
FROM children c
WHERE EXISTS (
    SELECT 1 FROM users_unified uu WHERE uu.id = c.parent_id
);

-- Migrate jobs data
INSERT INTO jobs_unified (
    id, parent_id, title, description, requirements, location, is_remote,
    start_date, end_date, start_time, end_time, hourly_rate, budget,
    payment_type, number_of_children, children_ages, special_instructions,
    status, urgent, caregiver_id, created_at, updated_at
)
SELECT 
    j.id,
    j.parent_id,
    j.title,
    j.description,
    COALESCE(j.requirements, ARRAY[]::TEXT[]),
    j.location,
    COALESCE(j.is_remote, FALSE),
    j.date,
    j.date,
    j.start_time,
    j.end_time,
    j.hourly_rate,
    j.budget,
    CASE 
        WHEN j.hourly_rate IS NOT NULL THEN 'hourly'
        WHEN j.budget IS NOT NULL THEN 'fixed'
        ELSE 'negotiable'
    END,
    COALESCE(j.number_of_children, 1),
    COALESCE(j.children_ages, ARRAY[]::TEXT[]),
    j.special_instructions,
    j.status,
    COALESCE(j.urgent, FALSE),
    j.caregiver_id,
    j.created_at,
    j.updated_at
FROM jobs j
WHERE EXISTS (
    SELECT 1 FROM users_unified uu WHERE uu.id = j.parent_id
);

-- Migrate applications data
INSERT INTO applications_unified (
    id, job_id, caregiver_id, message, proposed_rate, status,
    created_at, updated_at
)
SELECT 
    a.id,
    a.job_id,
    a.caregiver_id,
    a.message,
    a.proposed_rate,
    a.status,
    a.created_at,
    a.updated_at
FROM applications a
WHERE EXISTS (
    SELECT 1 FROM users_unified uu WHERE uu.id = a.caregiver_id
) AND EXISTS (
    SELECT 1 FROM jobs_unified ju WHERE ju.id = a.job_id
);

-- Migrate bookings data
INSERT INTO bookings_unified (
    id, job_id, application_id, parent_id, caregiver_id,
    title, description, start_time, end_time, location, is_remote,
    total_amount, hourly_rate, payment_status, status, notes,
    created_at, updated_at
)
SELECT 
    b.id,
    b.job_id,
    NULL, -- Will be populated later
    b.parent_id,
    b.caregiver_id,
    'Booking for ' || COALESCE(j.title, 'Service'),
    COALESCE(j.description, b.notes),
    b.start_time,
    b.end_time,
    COALESCE(j.location, 'TBD'),
    COALESCE(j.is_remote, FALSE),
    b.total_amount,
    b.hourly_rate,
    b.payment_status,
    b.status,
    b.notes,
    b.created_at,
    b.updated_at
FROM bookings b
LEFT JOIN jobs_unified j ON b.job_id = j.id
WHERE EXISTS (
    SELECT 1 FROM users_unified uu WHERE uu.id = b.parent_id
) AND EXISTS (
    SELECT 1 FROM users_unified uu WHERE uu.id = b.caregiver_id
);

-- ============================================
-- PHASE 4: CREATE INDEXES AND CONSTRAINTS
-- ============================================

-- Performance indexes for unified tables
CREATE INDEX idx_users_unified_email ON users_unified(email);
CREATE INDEX idx_users_unified_role ON users_unified(role);
CREATE INDEX idx_users_unified_status ON users_unified(status);
CREATE INDEX idx_users_unified_rating ON users_unified(rating);

CREATE INDEX idx_caregiver_profiles_unified_user_id ON caregiver_profiles_unified(user_id);
CREATE INDEX idx_caregiver_profiles_unified_rating ON caregiver_profiles_unified(rating);
CREATE INDEX idx_caregiver_profiles_unified_verified ON caregiver_profiles_unified(verified);
CREATE INDEX idx_caregiver_profiles_unified_trust_score ON caregiver_profiles_unified(trust_score);

CREATE INDEX idx_children_unified_parent_id ON children_unified(parent_id);
CREATE INDEX idx_children_unified_age ON children_unified(age);

CREATE INDEX idx_jobs_unified_parent_id ON jobs_unified(parent_id);
CREATE INDEX idx_jobs_unified_status ON jobs_unified(status);
CREATE INDEX idx_jobs_unified_caregiver_id ON jobs_unified(caregiver_id);
CREATE INDEX idx_jobs_unified_urgent ON jobs_unified(urgent);

CREATE INDEX idx_applications_unified_job_id ON applications_unified(job_id);
CREATE INDEX idx_applications_unified_caregiver_id ON applications_unified(caregiver_id);
CREATE INDEX idx_applications_unified_status ON applications_unified(status);

CREATE INDEX idx_bookings_unified_parent_id ON bookings_unified(parent_id);
CREATE INDEX idx_bookings_unified_caregiver_id ON bookings_unified(caregiver_id);
CREATE INDEX idx_bookings_unified_status ON bookings_unified(status);
CREATE INDEX idx_bookings_unified_start_time ON bookings_unified(start_time);

-- ============================================
-- PHASE 5: CREATE VIEWS FOR BACKWARD COMPATIBILITY
-- ============================================

-- Create views that mimic old table structures for app compatibility
CREATE OR REPLACE VIEW users_legacy AS
SELECT 
    id, email, password_hash, auth_provider, email_verified,
    first_name, last_name, name, phone, address, location,
    role, status, status_reason, status_updated_at, status_updated_by,
    deleted_at, deleted_by, profile_image as avatar, bio, experience,
    skills, certifications, hourly_rate, rating, review_count,
    availability, created_at, updated_at
FROM users_unified;

CREATE OR REPLACE VIEW caregiver_profiles_legacy AS
SELECT 
    id, user_id, caregiver_id, profile_image, bio, experience,
    hourly_rate, education, languages, age_care_ranges, certifications,
    availability, portfolio, emergency_contacts, verification,
    rating, review_count, trust_score, verified, background_check_status,
    completed_jobs, last_active, created_at, updated_at
FROM caregiver_profiles_unified;

CREATE OR REPLACE VIEW children_legacy AS
SELECT 
    id, parent_id, name as name, birth_date, gender, special_needs,
    allergies, medical_conditions, emergency_contact, created_at, updated_at
FROM children_unified;

-- ============================================
-- PHASE 6: CREATE TRIGGERS FOR UPDATED_AT
-- ============================================

-- Updated_at triggers for all tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all unified tables
CREATE TRIGGER users_unified_updated_at BEFORE UPDATE ON users_unified FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER caregiver_profiles_unified_updated_at BEFORE UPDATE ON caregiver_profiles_unified FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER children_unified_updated_at BEFORE UPDATE ON children_unified FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER jobs_unified_updated_at BEFORE UPDATE ON jobs_unified FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER applications_unified_updated_at BEFORE UPDATE ON applications_unified FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER bookings_unified_updated_at BEFORE UPDATE ON bookings_unified FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PHASE 7: ENABLE RLS AND CREATE POLICIES
-- ============================================

-- Enable Row Level Security
ALTER TABLE users_unified ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_profiles_unified ENABLE ROW LEVEL SECURITY;
ALTER TABLE children_unified ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs_unified ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications_unified ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings_unified ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users_unified FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users_unified FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON users_unified FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can view public profiles" ON users_unified FOR SELECT USING (true);
CREATE POLICY "Admins can manage users" ON users_unified FOR ALL USING (
    auth.role() = 'service_role' OR (auth.jwt() ->> 'role') IN ('admin', 'superadmin')
);

-- Caregiver profiles policies
CREATE POLICY "Caregivers can manage their profile" ON caregiver_profiles_unified FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage caregiver profiles" ON caregiver_profiles_unified FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Anyone can view caregiver profiles" ON caregiver_profiles_unified FOR SELECT USING (true);

-- Children policies
CREATE POLICY "Parents can manage their children" ON children_unified FOR ALL USING (auth.uid() = parent_id);
CREATE POLICY "Admins can view all children" ON children_unified FOR SELECT USING (
    auth.role() = 'service_role' OR (auth.jwt() ->> 'role') IN ('admin', 'superadmin')
);

-- Jobs policies
CREATE POLICY "Anyone can view jobs" ON jobs_unified FOR SELECT USING (true);
CREATE POLICY "Job owners can manage their jobs" ON jobs_unified FOR ALL USING (auth.uid() = parent_id);
CREATE POLICY "Admins can manage jobs" ON jobs_unified FOR ALL USING (
    auth.role() = 'service_role' OR (auth.jwt() ->> 'role') IN ('admin', 'superadmin')
);

-- Applications policies
CREATE POLICY "Job owners can view applications" ON applications_unified FOR SELECT USING (
    auth.uid() IN (SELECT parent_id FROM jobs_unified WHERE id = job_id)
);
CREATE POLICY "Caregivers can manage their applications" ON applications_unified FOR ALL USING (auth.uid() = caregiver_id);
CREATE POLICY "Admins can manage applications" ON applications_unified FOR ALL USING (
    auth.role() = 'service_role' OR (auth.jwt() ->> 'role') IN ('admin', 'superadmin')
);

-- Bookings policies
CREATE POLICY "Booking participants can view bookings" ON bookings_unified FOR SELECT USING (
    auth.uid() = parent_id OR auth.uid() = caregiver_id
);
CREATE POLICY "Booking participants can update bookings" ON bookings_unified FOR UPDATE USING (
    auth.uid() = parent_id OR auth.uid() = caregiver_id
);
CREATE POLICY "Parents can create bookings" ON bookings_unified FOR INSERT WITH CHECK (auth.uid() = parent_id);
CREATE POLICY "Admins can manage bookings" ON bookings_unified FOR ALL USING (
    auth.role() = 'service_role' OR (auth.jwt() ->> 'role') IN ('admin', 'superadmin')
);

-- ============================================
-- PHASE 8: VERIFICATION AND VALIDATION
-- ============================================

-- Verify data migration
DO $$
DECLARE
    migration_count RECORD;
BEGIN
    -- Check users migration
    SELECT COUNT(*) as old_count, (SELECT COUNT(*) FROM users_unified) as new_count INTO migration_count
    FROM users;
    
    IF migration_count.old_count != migration_count.new_count THEN
        RAISE EXCEPTION 'Users migration failed: old=%, new=%', migration_count.old_count, migration_count.new_count;
    END IF;
    
    -- Check caregiver profiles migration
    SELECT COUNT(*) as old_count, (SELECT COUNT(*) FROM caregiver_profiles_unified) as new_count INTO migration_count
    FROM caregiver_profiles;
    
    IF migration_count.old_count != migration_count.new_count THEN
        RAISE EXCEPTION 'Caregiver profiles migration failed: old=%, new=%', migration_count.old_count, migration_count.new_count;
    END IF;
    
    -- Check children migration
    SELECT COUNT(*) as old_count, (SELECT COUNT(*) FROM children_unified) as new_count INTO migration_count
    FROM children;
    
    IF migration_count.old_count != migration_count.new_count THEN
        RAISE EXCEPTION 'Children migration failed: old=%, new=%', migration_count.old_count, migration_count.new_count;
    END IF;
    
    RAISE NOTICE 'Data migration verification passed';
END $$;

-- Update migration log
UPDATE schema_migration_log 
SET status = 'completed', completed_at = NOW()
WHERE migration_name = '007_unified_schema_migration';

-- ============================================
-- ROLLBACK SCRIPT (save for emergencies)
-- ============================================

/*
-- To rollback this migration, run:
DROP TABLE IF EXISTS users_unified;
DROP TABLE IF EXISTS caregiver_profiles_unified;
DROP TABLE IF EXISTS children_unified;
DROP TABLE IF EXISTS jobs_unified;
DROP TABLE IF EXISTS applications_unified;
DROP TABLE IF EXISTS bookings_unified;

-- Restore from backups
CREATE TABLE users AS SELECT * FROM users_migration_backup;
CREATE TABLE caregiver_profiles AS SELECT * FROM caregiver_profiles_migration_backup;
CREATE TABLE children AS SELECT * FROM children_migration_backup;
CREATE TABLE jobs AS SELECT * FROM jobs_migration_backup;
CREATE TABLE applications AS SELECT * FROM applications_migration_backup;
CREATE TABLE bookings AS SELECT * FROM bookings_migration_backup;

-- Recreate indexes and policies from original schema
*/

-- ============================================
-- POST-MIGRATION CLEANUP (Run after verification)
-- ============================================

/*
-- After successful migration and app testing, clean up:
DROP TABLE users_migration_backup;
DROP TABLE caregiver_profiles_migration_backup;
DROP TABLE children_migration_backup;
DROP TABLE jobs_migration_backup;
DROP TABLE applications_migration_backup;
DROP TABLE bookings_migration_backup;

-- Drop old tables (after extensive testing)
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS caregiver_profiles;
DROP TABLE IF EXISTS children;
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS bookings;

-- Rename unified tables to final names
ALTER TABLE users_unified RENAME TO users;
ALTER TABLE caregiver_profiles_unified RENAME TO caregiver_profiles;
ALTER TABLE children_unified RENAME TO children;
ALTER TABLE jobs_unified RENAME TO jobs;
ALTER TABLE applications_unified RENAME TO applications;
ALTER TABLE bookings_unified RENAME TO bookings;

-- Drop legacy views
DROP VIEW IF EXISTS users_legacy;
DROP VIEW IF EXISTS caregiver_profiles_legacy;
DROP VIEW IF EXISTS children_legacy;
*/

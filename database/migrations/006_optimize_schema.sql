-- Database Schema Optimization Migration
-- This migration eliminates redundancy and follows best practices

-- ============================================
-- STEP 1: BACKUP CRITICAL DATA
-- ============================================

-- Create backup tables
CREATE TABLE users_backup AS SELECT * FROM users;
CREATE TABLE caregiver_profiles_backup AS SELECT * FROM caregiver_profiles;
CREATE TABLE bookings_backup AS SELECT * FROM bookings;
CREATE TABLE jobs_backup AS SELECT * FROM jobs;
CREATE TABLE children_backup AS SELECT * FROM children;

-- ============================================
-- STEP 2: CREATE OPTIMIZED CORE TABLES
-- ============================================

-- Simplified users table (authentication only)
CREATE TABLE users_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL CHECK (role IN ('parent', 'caregiver')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User profiles (extended information)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_new(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    bio TEXT,
    date_of_birth DATE,
    location TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced caregiver profiles
CREATE TABLE caregiver_profiles_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_new(id) ON DELETE CASCADE,
    bio TEXT,
    experience_years INTEGER DEFAULT 0,
    skills TEXT[], -- Array of skills
    hourly_rate DECIMAL(10,2),
    availability JSONB, -- Schedule data
    verified BOOLEAN DEFAULT FALSE,
    rating DECIMAL(3,2) DEFAULT 0.0,
    completed_jobs INTEGER DEFAULT 0,
    background_check_status TEXT DEFAULT 'pending',
    last_active TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Simplified children table
CREATE TABLE children_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES users_new(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT,
    special_needs TEXT,
    allergies TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Clean jobs table
CREATE TABLE jobs_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES users_new(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    requirements TEXT[],
    care_type TEXT, -- 'babysitting', 'tutoring', 'elder_care', etc.
    location TEXT,
    pay_rate DECIMAL(10,2),
    pay_type TEXT, -- 'hourly', 'daily', 'fixed'
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Simplified applications table
CREATE TABLE applications_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs_new(id) ON DELETE CASCADE,
    caregiver_id UUID REFERENCES users_new(id) ON DELETE CASCADE,
    message TEXT,
    proposed_rate DECIMAL(10,2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Clean bookings table
CREATE TABLE bookings_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs_new(id),
    parent_id UUID REFERENCES users_new(id) ON DELETE CASCADE,
    caregiver_id UUID REFERENCES users_new(id) ON DELETE CASCADE,
    application_id UUID REFERENCES applications_new(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    total_amount DECIMAL(10,2),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Simplified conversations table
CREATE TABLE conversations_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES users_new(id) ON DELETE CASCADE,
    caregiver_id UUID REFERENCES users_new(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs_new(id),
    last_message TEXT,
    last_message_at TIMESTAMP,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Clean messages table
CREATE TABLE messages_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations_new(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users_new(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Reviews table (enhanced)
CREATE TABLE reviews_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings_new(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES users_new(id) ON DELETE CASCADE,
    reviewee_id UUID REFERENCES users_new(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    response TEXT, -- Caregiver's response to review
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'hidden')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Unified payments table
CREATE TABLE payments_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings_new(id),
    payer_id UUID REFERENCES users_new(id) ON DELETE CASCADE,
    payee_id UUID REFERENCES users_new(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    fee DECIMAL(10,2) DEFAULT 0, -- Platform fee
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    payment_method TEXT, -- 'card', 'bank', 'crypto'
    transaction_id TEXT, -- External payment ID
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Simplified notifications table
CREATE TABLE notifications_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_new(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'booking', 'message', 'payment', 'review', etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional notification data
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Unified privacy settings
CREATE TABLE privacy_settings_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_new(id) ON DELETE CASCADE,
    profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'connections_only')),
    contact_visibility TEXT DEFAULT 'public' CHECK (contact_visibility IN ('public', 'private', 'connections_only')),
    booking_visibility TEXT DEFAULT 'public' CHECK (booking_visibility IN ('public', 'private')),
    data_sharing BOOLEAN DEFAULT FALSE,
    marketing_emails BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- STEP 3: MIGRATE DATA
-- ============================================

-- Migrate users data
INSERT INTO users_new (id, email, password_hash, role, status, email_verified, created_at, updated_at)
SELECT id, email, password_hash, role, status, email_verified, created_at, updated_at
FROM users;

-- Migrate user profiles
INSERT INTO user_profiles (user_id, first_name, last_name, phone, avatar_url, bio, created_at, updated_at)
SELECT 
    u.id,
    u.first_name,
    u.last_name, 
    u.phone,
    u.avatar_url,
    u.bio,
    u.created_at,
    u.updated_at
FROM users u
JOIN users_new un ON u.id = un.id;

-- Migrate caregiver profiles
INSERT INTO caregiver_profiles_new (user_id, bio, experience_years, skills, hourly_rate, verified, rating, completed_jobs, created_at, updated_at)
SELECT 
    user_id,
    bio,
    COALESCE(EXTRACT(YEAR FROM AGE(created_at)), 0)::INTEGER as experience_years,
    skills,
    hourly_rate,
    COALESCE(verified, FALSE),
    COALESCE(rating, 0.0),
    COALESCE(completed_jobs, 0),
    created_at,
    updated_at
FROM caregiver_profiles;

-- Continue with other tables...
-- (Similar migration patterns for children, jobs, applications, etc.)

-- ============================================
-- STEP 4: CREATE INDEXES
-- ============================================

-- Performance indexes
CREATE INDEX idx_users_new_email ON users_new(email);
CREATE INDEX idx_users_new_role ON users_new(role);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_caregiver_profiles_new_user_id ON caregiver_profiles_new(user_id);
CREATE INDEX idx_caregiver_profiles_new_rating ON caregiver_profiles_new(rating);
CREATE INDEX idx_children_new_parent_id ON children_new(parent_id);
CREATE INDEX idx_jobs_new_parent_id ON jobs_new(parent_id);
CREATE INDEX idx_jobs_new_status ON jobs_new(status);
CREATE INDEX idx_applications_new_job_id ON applications_new(job_id);
CREATE INDEX idx_applications_new_caregiver_id ON applications_new(caregiver_id);
CREATE INDEX idx_bookings_new_parent_id ON bookings_new(parent_id);
CREATE INDEX idx_bookings_new_caregiver_id ON bookings_new(caregiver_id);
CREATE INDEX idx_bookings_new_status ON bookings_new(status);
CREATE INDEX idx_conversations_new_parent_id ON conversations_new(parent_id);
CREATE INDEX idx_conversations_new_caregiver_id ON conversations_new(caregiver_id);
CREATE INDEX idx_messages_new_conversation_id ON messages_new(conversation_id);
CREATE INDEX idx_messages_new_sender_id ON messages_new(sender_id);
CREATE INDEX idx_reviews_new_booking_id ON reviews_new(booking_id);
CREATE INDEX idx_reviews_new_reviewee_id ON reviews_new(reviewee_id);
CREATE INDEX idx_payments_new_booking_id ON payments_new(booking_id);
CREATE INDEX idx_payments_new_status ON payments_new(status);
CREATE INDEX idx_notifications_new_user_id ON notifications_new(user_id);
CREATE INDEX idx_notifications_new_read_at ON notifications_new(read_at);

-- ============================================
-- STEP 5: RENAME TABLES (Atomic Operation)
-- ============================================

-- Drop old tables (after verification)
-- DROP TABLE users;
-- DROP TABLE caregiver_profiles;
-- DROP TABLE children;
-- DROP TABLE jobs;
-- DROP TABLE applications;
-- DROP TABLE bookings;
-- DROP TABLE conversations;
-- DROP TABLE messages;
-- DROP TABLE reviews;
-- DROP TABLE payments;
-- DROP TABLE notifications;
-- DROP TABLE privacy_settings;

-- Rename new tables to final names
-- ALTER TABLE users_new RENAME TO users;
-- ALTER TABLE user_profiles RENAME TO user_profiles;
-- ALTER TABLE caregiver_profiles_new RENAME TO caregiver_profiles;
-- ALTER TABLE children_new RENAME TO children;
-- ALTER TABLE jobs_new RENAME TO jobs;
-- ALTER TABLE applications_new RENAME TO applications;
-- ALTER TABLE bookings_new RENAME TO bookings;
-- ALTER TABLE conversations_new RENAME TO conversations;
-- ALTER TABLE messages_new RENAME TO messages;
-- ALTER TABLE reviews_new RENAME TO reviews;
-- ALTER TABLE payments_new RENAME TO payments;
-- ALTER TABLE notifications_new RENAME TO notifications;
-- ALTER TABLE privacy_settings_new RENAME TO privacy_settings;

-- ============================================
-- STEP 6: CLEANUP REDUNDANT TABLES
-- ============================================

-- Drop redundant tables
-- DROP TABLE IF EXISTS booking;        -- Duplicate of bookings
-- DROP TABLE IF EXISTS parents;        -- Redundant with users.role='parent'
-- DROP TABLE IF EXISTS caregiver;      -- Redundant with caregiver_profiles
-- DROP TABLE IF EXISTS caregiver_background_checks;
-- DROP TABLE IF EXISTS caregiver_documents;
-- DROP TABLE IF EXISTS caregiver_wallets;
-- DROP TABLE IF EXISTS caregiver_points_ledger;
-- DROP TABLE IF EXISTS caregiver_points_summary;
-- DROP TABLE IF EXISTS payment_intents;
-- DROP TABLE IF EXISTS payment_proofs;
-- DROP TABLE IF EXISTS transaction_ledger;
-- DROP TABLE IF EXISTS privacy_permissions;
-- DROP TABLE IF EXISTS privacy_permissions_enriched;
-- DROP TABLE IF EXISTS privacy_notifications;

-- ============================================
-- STEP 7: ADD CONSTRAINTS AND TRIGGERS
-- ============================================

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users_new FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_caregiver_profiles_updated_at BEFORE UPDATE ON caregiver_profiles_new FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ... continue for other tables

-- Add check constraints
ALTER TABLE caregiver_profiles_new ADD CONSTRAINT check_rating_range CHECK (rating >= 0 AND rating <= 5);
ALTER TABLE caregiver_profiles_new ADD CONSTRAINT check_experience_years CHECK (experience_years >= 0);
ALTER TABLE jobs_new ADD CONSTRAINT check_pay_rate_positive CHECK (pay_rate > 0);
ALTER TABLE payments_new ADD CONSTRAINT check_amount_positive CHECK (amount > 0);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify data migration
SELECT 'users' as table_name, COUNT(*) as count FROM users_new
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL
SELECT 'caregiver_profiles', COUNT(*) FROM caregiver_profiles_new
UNION ALL
SELECT 'children', COUNT(*) FROM children_new
UNION ALL
SELECT 'jobs', COUNT(*) FROM jobs_new
UNION ALL
SELECT 'applications', COUNT(*) FROM applications_new
UNION ALL
SELECT 'bookings', COUNT(*) FROM bookings_new;

-- Verify relationships
SELECT 
    u.role,
    COUNT(up.id) as has_profile,
    COUNT(cp.id) as has_caregiver_profile
FROM users_new u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN caregiver_profiles_new cp ON u.id = cp.user_id
GROUP BY u.role;

-- ============================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================

/*
-- To rollback, run these commands:
DROP TABLE IF EXISTS users_new;
DROP TABLE IF EXISTS user_profiles;
DROP TABLE IF EXISTS caregiver_profiles_new;
DROP TABLE IF EXISTS children_new;
DROP TABLE IF EXISTS jobs_new;
DROP TABLE IF EXISTS applications_new;
DROP TABLE IF EXISTS bookings_new;
DROP TABLE IF EXISTS conversations_new;
DROP TABLE IF EXISTS messages_new;
DROP TABLE IF EXISTS reviews_new;
DROP TABLE IF EXISTS payments_new;
DROP TABLE IF EXISTS notifications_new;
DROP TABLE IF EXISTS privacy_settings_new;

-- Restore from backups if needed
-- CREATE TABLE users AS SELECT * FROM users_backup;
-- Repeat for other tables...
*/

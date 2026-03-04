-- Complete Database Backup Script
-- Run this in Supabase SQL Editor to create a full backup
-- This exports all table structures and data

-- ============================================
-- BACKUP ALL TABLES WITH DATA
-- ============================================

-- Export users table
COPY (SELECT * FROM users) TO STDOUT WITH CSV HEADER;

-- Export caregiver_profiles table
COPY (SELECT * FROM caregiver_profiles) TO STDOUT WITH CSV HEADER;

-- Export caregiver table
COPY (SELECT * FROM caregiver) TO STDOUT WITH CSV HEADER;

-- Export children table
COPY (SELECT * FROM children) TO STDOUT WITH CSV HEADER;

-- Export jobs table
COPY (SELECT * FROM jobs) TO STDOUT WITH CSV HEADER;

-- Export bookings table
COPY (SELECT * FROM bookings) TO STDOUT WITH CSV HEADER;

-- Export applications table
COPY (SELECT * FROM applications) TO STDOUT WITH CSV HEADER;

-- Export reviews table
COPY (SELECT * FROM reviews) TO STDOUT WITH CSV HEADER;

-- Export messages table
COPY (SELECT * FROM messages) TO STDOUT WITH CSV HEADER;

-- Export conversations table
COPY (SELECT * FROM conversations) TO STDOUT WITH CSV HEADER;

-- Export notifications table
COPY (SELECT * FROM notifications) TO STDOUT WITH CSV HEADER;

-- Export payments table
COPY (SELECT * FROM payments) TO STDOUT WITH CSV HEADER;

-- Export solana_transactions table
COPY (SELECT * FROM solana_transactions) TO STDOUT WITH CSV HEADER;

-- Export privacy_settings table
COPY (SELECT * FROM privacy_settings) TO STDOUT WITH CSV HEADER;

-- Export privacy_permissions table
COPY (SELECT * FROM privacy_permissions) TO STDOUT WITH CSV HEADER;

-- Export privacy_notifications table
COPY (SELECT * FROM privacy_notifications) TO STDOUT WITH CSV HEADER;

-- ============================================
-- QUICK BACKUP QUERIES (Copy results manually)
-- ============================================

-- Backup critical user data
SELECT 
  id, email, role, name, first_name, last_name, phone, 
  solana_wallet_address, preferred_token, created_at, status
FROM users
ORDER BY created_at DESC;

-- Backup caregiver profiles
SELECT * FROM caregiver_profiles ORDER BY created_at DESC;

-- Backup children data
SELECT * FROM children WHERE deleted_at IS NULL ORDER BY created_at DESC;

-- Backup active bookings
SELECT * FROM bookings WHERE status != 'cancelled' ORDER BY created_at DESC;

-- Backup active jobs
SELECT * FROM jobs WHERE status = 'active' ORDER BY created_at DESC;

-- ============================================
-- TABLE COUNTS (Verify backup completeness)
-- ============================================

SELECT 
  'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'caregiver_profiles', COUNT(*) FROM caregiver_profiles
UNION ALL
SELECT 'caregiver', COUNT(*) FROM caregiver
UNION ALL
SELECT 'children', COUNT(*) FROM children
UNION ALL
SELECT 'jobs', COUNT(*) FROM jobs
UNION ALL
SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'applications', COUNT(*) FROM applications
UNION ALL
SELECT 'reviews', COUNT(*) FROM reviews
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'conversations', COUNT(*) FROM conversations
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'solana_transactions', COUNT(*) FROM solana_transactions
UNION ALL
SELECT 'privacy_settings', COUNT(*) FROM privacy_settings
UNION ALL
SELECT 'privacy_permissions', COUNT(*) FROM privacy_permissions
UNION ALL
SELECT 'privacy_notifications', COUNT(*) FROM privacy_notifications
ORDER BY table_name;

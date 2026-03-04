# Database Backup Guide

## Method 1: Supabase Dashboard (Recommended)

### Automatic Backup
1. Go to Supabase Dashboard
2. Navigate to **Settings** → **Database**
3. Scroll to **Database Backups** section
4. Click **Create Backup** or enable **Daily Backups**

### Manual Export
1. Go to **Table Editor**
2. Select table → Click **⋮** (three dots) → **Download as CSV**
3. Repeat for all critical tables

## Method 2: SQL Backup Script

Run `backup-database.sql` in Supabase SQL Editor to get table counts and verify data.

## Method 3: pg_dump (Advanced)

```bash
# Get connection string from Supabase Dashboard → Settings → Database
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" > backup.sql
```

## Critical Tables to Backup (Priority Order)

1. **users** - All user accounts
2. **caregiver_profiles** - Caregiver information
3. **children** - Children data
4. **bookings** - Booking history
5. **jobs** - Job postings
6. **payments** - Payment records
7. **solana_transactions** - Blockchain transactions
8. **messages** - Chat history
9. **reviews** - User reviews
10. **privacy_settings** - Privacy preferences

## Quick Backup Queries

### Export Users
```sql
SELECT id, email, role, name, phone, solana_wallet_address, created_at
FROM users
ORDER BY created_at DESC;
```

### Export Caregiver Profiles
```sql
SELECT * FROM caregiver_profiles ORDER BY created_at DESC;
```

### Export Active Bookings
```sql
SELECT * FROM bookings 
WHERE status IN ('pending', 'confirmed', 'in_progress')
ORDER BY created_at DESC;
```

### Export Children
```sql
SELECT * FROM children 
WHERE deleted_at IS NULL
ORDER BY created_at DESC;
```

## Restore from Backup

### Using SQL File
```sql
-- In Supabase SQL Editor
-- Copy and paste the backup SQL content
```

### Using CSV Import
1. Go to Table Editor
2. Select table
3. Click **Insert** → **Import from CSV**
4. Upload your CSV backup file

## Automated Backup Schedule

### Enable in Supabase
1. Dashboard → Settings → Database
2. Enable **Daily Backups**
3. Set retention period (7 days recommended)

### Point-in-Time Recovery
- Available on Pro plan and above
- Allows restore to any point in last 7 days

## Backup Verification

Run this query to verify backup completeness:

```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_schema = schemaname AND table_name = tablename) as column_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Emergency Backup (Before Major Changes)

```sql
-- Create snapshot of critical data
CREATE TABLE users_backup AS SELECT * FROM users;
CREATE TABLE bookings_backup AS SELECT * FROM bookings;
CREATE TABLE caregiver_profiles_backup AS SELECT * FROM caregiver_profiles;

-- Verify backup
SELECT COUNT(*) FROM users_backup;
SELECT COUNT(*) FROM bookings_backup;
SELECT COUNT(*) FROM caregiver_profiles_backup;

-- Restore if needed
-- TRUNCATE users;
-- INSERT INTO users SELECT * FROM users_backup;
```

## Best Practices

1. **Daily Backups**: Enable automatic daily backups
2. **Before Migrations**: Always backup before running migrations
3. **Test Restores**: Periodically test backup restoration
4. **Multiple Locations**: Store backups in multiple locations
5. **Version Control**: Keep migration scripts in git
6. **Document Changes**: Log all schema changes

## Backup Storage Locations

- ✅ Supabase automatic backups (7-day retention)
- ✅ Local CSV exports (manual)
- ✅ Git repository (migration scripts only)
- ✅ External storage (S3, Google Drive, etc.)

## Recovery Time Objectives (RTO)

- **Critical data** (users, bookings): < 1 hour
- **Non-critical data** (messages, notifications): < 24 hours
- **Full database restore**: < 4 hours

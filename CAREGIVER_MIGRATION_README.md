# Caregiver Profiles Migration

## Problem
During the migration from MongoDB to Supabase, the original `Caregiver` collection was not properly migrated. The app was trying to store detailed caregiver profile data in the basic `users` table, which only contains basic fields like `name`, `phone`, `profile_image`, and `role`.

## Solution
Created a dedicated `caregiver_profiles` table that matches the original MongoDB `Caregiver` schema with all the detailed fields needed for caregiver profiles.

## Files Created

### 1. `supabase-caregiver-profiles-table.sql`
- Creates the `caregiver_profiles` table with all fields from the original MongoDB schema
- Includes proper indexes, RLS policies, and helper functions
- Supports JSONB fields for complex data like certifications, availability, portfolio, etc.

### 2. `src/services/caregiverProfileService.js`
- Service layer for caregiver profile operations
- Handles create, update, get, and search operations
- Manages both `users` table (basic info) and `caregiver_profiles` table (detailed info)

### 3. `run-caregiver-migration.js`
- Script to run the SQL migration
- Can be executed to create the table in your Supabase database

## How to Run the Migration

### Option 1: Manual SQL Execution (Recommended)
1. Open your Supabase dashboard
2. Go to SQL Editor
3. Copy the contents of `supabase-caregiver-profiles-table.sql`
4. Execute the SQL

### Option 2: Using the Migration Script
1. Add your Supabase service role key to `.env`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
2. Run the migration script:
   ```bash
   node run-caregiver-migration.js
   ```

## Database Schema

### caregiver_profiles Table Structure
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key to users.id)
- caregiver_id (VARCHAR, Unique identifier)
- name (VARCHAR)
- bio (TEXT)
- profile_image (TEXT)
- address (JSONB)
- location (VARCHAR)
- skills (TEXT[])
- experience (JSONB)
- hourly_rate (DECIMAL)
- education (TEXT)
- languages (TEXT[])
- certifications (JSONB)
- age_care_ranges (TEXT[])
- availability (JSONB)
- rating (DECIMAL)
- reviews (JSONB)
- background_check (JSONB)
- verification (JSONB)
- portfolio (JSONB)
- emergency_contacts (JSONB)
- documents (JSONB)
- has_completed_jobs (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## Code Changes Made

### 1. Updated EnhancedCaregiverProfileWizard.js
- Now uses `caregiverProfileService` instead of direct Supabase calls
- Properly handles both user profile and caregiver profile creation/updates

### 2. Created caregiverProfileService.js
- Centralized service for all caregiver profile operations
- Handles the relationship between `users` and `caregiver_profiles` tables

## Benefits

1. **Proper Data Structure**: Caregiver profiles now have all the fields they need
2. **Data Integrity**: Proper foreign key relationships and constraints
3. **Performance**: Optimized indexes for common queries
4. **Security**: Row Level Security (RLS) policies for data protection
5. **Scalability**: JSONB fields for flexible data storage
6. **Maintainability**: Clean service layer for profile operations

## Next Steps

1. Run the migration to create the `caregiver_profiles` table
2. Test caregiver profile creation and updates
3. Update any other parts of the app that query caregiver data
4. Consider migrating existing caregiver data if any exists in the `users` table

## Verification

After running the migration, you should be able to:
1. Create new caregiver profiles with all detailed information
2. Update existing caregiver profiles
3. Browse caregiver profiles with proper filtering
4. View caregiver profiles with all their details

The error "Could not find the 'bio' column" should be resolved as the `bio` field now exists in the `caregiver_profiles` table.
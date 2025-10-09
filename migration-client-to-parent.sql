-- Migration script to rename client_id to parent_id in jobs table
-- Run this in your Supabase SQL Editor AFTER running the main schema

-- Step 1: Rename the column
ALTER TABLE jobs RENAME COLUMN client_id TO parent_id;

-- Step 2: Update the index name
DROP INDEX IF EXISTS idx_jobs_client_id;
CREATE INDEX idx_jobs_parent_id ON jobs(parent_id);

-- Step 3: Update RLS policies
DROP POLICY IF EXISTS "Job owners can manage their jobs" ON jobs;
CREATE POLICY "Job owners can manage their jobs" ON jobs FOR ALL USING (auth.uid() = parent_id);

DROP POLICY IF EXISTS "Job owners can view applications" ON applications;
CREATE POLICY "Job owners can view applications" ON applications FOR SELECT USING (
  auth.uid() IN (SELECT parent_id FROM jobs WHERE id = job_id)
);
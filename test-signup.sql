-- Test signup by temporarily allowing inserts
-- Run this in Supabase SQL Editor if signup fails

-- Temporarily allow anyone to insert into users table for testing
DROP POLICY IF EXISTS users_insert_own ON public.users;
CREATE POLICY users_insert_test ON public.users
  FOR INSERT TO authenticated WITH CHECK (true);

-- Test insert (replace with actual user ID from auth.users)
-- INSERT INTO public.users (id, email, name, role) 
-- VALUES ('test-uuid', 'test@example.com', 'Test User', 'parent');
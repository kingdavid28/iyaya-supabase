-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(20) CHECK (role IN ('parent', 'caregiver')) DEFAULT 'parent',
  name VARCHAR(100) NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  middle_initial VARCHAR(1),
  birth_date DATE,
  phone VARCHAR(20),
  profile_image TEXT,
  auth_provider VARCHAR(20) DEFAULT 'supabase',
  facebook_id VARCHAR(255),
  google_id VARCHAR(255),
  address JSONB,
  status VARCHAR(20) DEFAULT 'active',
  email_verified BOOLEAN DEFAULT false,
  background_check_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Children table
CREATE TABLE IF NOT EXISTS public.children (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  parent_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  birthdate DATE,
  age INTEGER,
  allergies TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  client_name VARCHAR(100) NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  number_of_children INTEGER DEFAULT 1,
  children_ages VARCHAR(255),
  requirements TEXT[],
  urgent BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Applications table
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  caregiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  message TEXT,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id, caregiver_id)
);

-- Bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  caregiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending',
  payment_proof TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  participant_1 UUID REFERENCES public.users(id) ON DELETE CASCADE,
  participant_2 UUID REFERENCES public.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(participant_1, participant_2)
);

-- Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  caregiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_users_email') THEN
    CREATE INDEX idx_users_email ON public.users(email);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_users_role') THEN
    CREATE INDEX idx_users_role ON public.users(role);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_jobs_client_id') THEN
    CREATE INDEX idx_jobs_client_id ON public.jobs(client_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_jobs_date') THEN
    CREATE INDEX idx_jobs_date ON public.jobs(date);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_applications_job_id') THEN
    CREATE INDEX idx_applications_job_id ON public.applications(job_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_applications_caregiver_id') THEN
    CREATE INDEX idx_applications_caregiver_id ON public.applications(caregiver_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_messages_conversation_id') THEN
    CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
  END IF;
END
$$;

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS users_select_own ON public.users;
CREATE POLICY users_select_own ON public.users
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS users_select_caregivers ON public.users;
CREATE POLICY users_select_caregivers ON public.users
  FOR SELECT TO authenticated USING (role = 'caregiver');

DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own ON public.users
  FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS users_insert_own ON public.users;
CREATE POLICY users_insert_own ON public.users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Children policies
DROP POLICY IF EXISTS children_all_operations ON public.children;
CREATE POLICY children_all_operations ON public.children
  FOR ALL TO authenticated USING (auth.uid() = parent_id);

-- Jobs policies
DROP POLICY IF EXISTS jobs_select_all ON public.jobs;
CREATE POLICY jobs_select_all ON public.jobs
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS jobs_modify_own ON public.jobs;
CREATE POLICY jobs_modify_own ON public.jobs
  FOR ALL TO authenticated USING (auth.uid() = client_id);

-- Applications policies
DROP POLICY IF EXISTS applications_select_related ON public.applications;
CREATE POLICY applications_select_related ON public.applications
  FOR SELECT TO authenticated USING (
    auth.uid() = caregiver_id OR 
    auth.uid() IN (SELECT client_id FROM public.jobs WHERE id = job_id)
  );

DROP POLICY IF EXISTS applications_insert_caregiver ON public.applications;
CREATE POLICY applications_insert_caregiver ON public.applications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = caregiver_id);

DROP POLICY IF EXISTS applications_update_related ON public.applications;
CREATE POLICY applications_update_related ON public.applications
  FOR UPDATE TO authenticated USING (
    auth.uid() = caregiver_id OR 
    auth.uid() IN (SELECT client_id FROM public.jobs WHERE id = job_id)
  );

DROP POLICY IF EXISTS applications_delete_caregiver ON public.applications;
CREATE POLICY applications_delete_caregiver ON public.applications
  FOR DELETE TO authenticated USING (auth.uid() = caregiver_id);

-- Bookings policies
DROP POLICY IF EXISTS bookings_all_operations ON public.bookings;
CREATE POLICY bookings_all_operations ON public.bookings
  FOR ALL TO authenticated USING (
    auth.uid() = parent_id OR auth.uid() = caregiver_id
  );

-- Messages policies
DROP POLICY IF EXISTS messages_all_operations ON public.messages;
CREATE POLICY messages_all_operations ON public.messages
  FOR ALL TO authenticated USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

-- Conversations policies
DROP POLICY IF EXISTS conversations_all_operations ON public.conversations;
CREATE POLICY conversations_all_operations ON public.conversations
  FOR ALL TO authenticated USING (
    auth.uid() = participant_1 OR auth.uid() = participant_2
  );

-- Reviews policies
DROP POLICY IF EXISTS reviews_all_operations ON public.reviews;
CREATE POLICY reviews_all_operations ON public.reviews
  FOR ALL TO authenticated USING (
    auth.uid() = caregiver_id OR auth.uid() = parent_id
  );rations ON public.conversations;
CREATE POLICY conversations_all_operations ON public.conversations
  FOR ALL TO authenticated USING (
    auth.uid()::text = participant_1::text OR auth.uid()::text = participant_2::text
  );

-- Reviews policies
DROP POLICY IF EXISTS reviews_all_operations ON public.reviews;
CREATE POLICY reviews_all_operations ON public.reviews
  FOR ALL TO authenticated USING (
    auth.uid()::text = caregiver_id::text OR auth.uid()::text = parent_id::text
  );ATE POLICY conversations_all_operations ON public.conversations
  FOR ALL TO authenticated USING (
    auth.uid() = participant_1 OR auth.uid() = participant_2
  );

-- Reviews policies
DROP POLICY IF EXISTS reviews_select_all ON public.reviews;
CREATE POLICY reviews_select_all ON public.reviews
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS reviews_modify_parent ON public.reviews;
CREATE POLICY reviews_modify_parent ON public.reviews
  FOR ALL TO authenticated USING (auth.uid() = parent_id);ATE POLICY conversations_all_operations ON public.conversations
  FOR ALL TO authenticated USING (
    auth.uid() = participant_1 OR auth.uid() = participant_2
  );

-- Reviews policies
DROP POLICY IF EXISTS reviews_select_all ON public.reviews;
CREATE POLICY reviews_select_all ON public.reviews
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS reviews_modify_parent ON public.reviews;
CREATE POLICY reviews_modify_parent ON public.reviews
  FOR ALL TO authenticated USING (auth.uid() = parent_id);ATE POLICY conversations_all_operations ON public.conversations
  FOR ALL TO authenticated USING (
    auth.uid() = participant_1 OR auth.uid() = participant_2
  );

-- Reviews policies
DROP POLICY IF EXISTS reviews_select_all ON public.reviews;
CREATE POLICY reviews_select_all ON public.reviews
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS reviews_modify_parent ON public.reviews;
CREATE POLICY reviews_modify_parent ON public.reviews
  FOR ALL TO authenticated USING (auth.uid() = parent_id);
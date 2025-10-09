-- Create parents table for better data organization
CREATE TABLE IF NOT EXISTS public.parents (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    profile_image TEXT,
    emergency_contact JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update children table to reference parents table
ALTER TABLE public.children 
DROP CONSTRAINT IF EXISTS children_parent_id_fkey,
ADD CONSTRAINT children_parent_id_fkey 
FOREIGN KEY (parent_id) REFERENCES public.parents(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parents_email ON public.parents(email);
CREATE INDEX IF NOT EXISTS idx_parents_status ON public.parents(status);
CREATE INDEX IF NOT EXISTS idx_children_parent_id ON public.children(parent_id);

-- Enable RLS
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Parents can view own profile" ON public.parents
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Parents can update own profile" ON public.parents
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Parents can insert own profile" ON public.parents
    FOR INSERT WITH CHECK (auth.uid() = id);
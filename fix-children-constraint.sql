-- Fix children table foreign key constraint to reference users table
ALTER TABLE public.children 
DROP CONSTRAINT IF EXISTS children_parent_id_fkey;

ALTER TABLE public.children 
ADD CONSTRAINT children_parent_id_fkey 
FOREIGN KEY (parent_id) REFERENCES public.users(id) ON DELETE CASCADE;
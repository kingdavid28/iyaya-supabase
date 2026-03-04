// src/config/supabase.d.ts
declare module '@/config/supabase' {
  import { SupabaseClient } from '@supabase/supabase-js';
  export const supabase: SupabaseClient;
}
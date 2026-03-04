const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
console.log('url', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { 'Accept': 'application/json' } } });

(async () => {
  const { data, error } = await supabase.from('caregiver_profiles').select('*').limit(1);
  console.log('error', error);
  console.log('data', data);
})();

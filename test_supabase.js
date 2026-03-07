const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://myiyrmiiywwgismcpith.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15aXlybWlpeXl3Z2lzbWNwaXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3MzE3NzYsImV4cCI6MjA1MDMwNzc3Nn0.7J0kQ1J7Q5Q3Q8Q9Q0Q1J7Q5Q3Q8Q9Q0Q1J7Q5Q3Q8Q9Q';

console.log('url', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { 'Accept': 'application/json' } } });

(async () => {
  console.log('\n🔍 Testing USERS table:');
  const { data: usersData, error: usersError } = await supabase.from('users').select('*').limit(1);
  console.log('users error:', usersError);
  console.log('users data:', usersData);

  console.log('\n🔍 Testing CAREGIVER_PROFILES table:');
  const { data: profilesData, error: profilesError } = await supabase.from('caregiver_profiles').select('*').limit(1);
  console.log('caregiver_profiles error:', profilesError);
  console.log('caregiver_profiles data:', profilesData);

  console.log('\n🔍 Testing PROFILES table (should not exist):');
  const { data: profilesData2, error: profilesError2 } = await supabase.from('profiles').select('*').limit(1);
  console.log('profiles error:', profilesError2);
  console.log('profiles data:', profilesData2);
})();

import { supabase } from './src/config/supabase.js';

async function checkMigration() {
  try {
    console.log('🔍 Checking if caregiver_profiles table exists...');
    
    const { data, error } = await supabase
      .from('caregiver_profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.log('❌ caregiver_profiles table does not exist');
        console.log('📋 Please run the SQL migration in your Supabase dashboard:');
        console.log('   1. Go to Supabase Dashboard > SQL Editor');
        console.log('   2. Copy contents of supabase-caregiver-profiles-table.sql');
        console.log('   3. Execute the SQL');
        return false;
      } else {
        console.error('❌ Error checking table:', error);
        return false;
      }
    }
    
    console.log('✅ caregiver_profiles table exists');
    return true;
  } catch (error) {
    console.error('❌ Migration check failed:', error);
    return false;
  }
}

checkMigration();
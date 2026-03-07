const { createClient } = require('@supabase/supabase-js');

// Hardcoded credentials for PowerShell compatibility
const supabaseUrl = 'https://myiyrmiiywwgismcpith.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15aXlybWlpeXd3Z2lzbWNwaXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MDgzNDYsImV4cCI6MjA3NTM4NDM0Nn0.DGRKcZmPvatheWOlukc7sjGU8ufYlSiW03L47Q_YWyI';

console.log('🔑 Using Supabase URL:', supabaseUrl);
console.log('🔑 API Key found:', supabaseKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function getDatabaseSchema() {
  console.log('🔍 Querying complete database schema...\n');
  
  try {
    // Query information_schema to get all tables and their columns
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_database_schema');
    
    if (tablesError) {
      console.error('❌ Error querying schema:', tablesError);
      
      // Fallback: Try to get table list first
      const { data: tableList, error: listError } = await supabase
        .from('information_schema.tables')
        .select('table_name, table_schema')
        .eq('table_schema', 'public')
        .order('table_name');
        
      if (listError) {
        console.error('❌ Error getting table list:', listError);
        return;
      }
      
      console.log('📋 Tables found:', tableList.map(t => t.table_name));
      
      // Get columns for each table
      for (const table of tableList) {
        console.log(`\n🏗️  Table: ${table.table_name}`);
        
        const { data: columns, error: columnError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable, column_default')
          .eq('table_schema', 'public')
          .eq('table_name', table.table_name)
          .order('ordinal_position');
          
        if (columnError) {
          console.error(`❌ Error getting columns for ${table.table_name}:`, columnError);
        } else {
          columns.forEach(col => {
            console.log(`  ├─ ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'} ${col.column_default ? `[default: ${col.column_default}]` : ''}`);
          });
        }
      }
    } else {
      console.log('✅ Schema data:', tables);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Alternative approach: Try to query each table we know about
async function testTables() {
  console.log('🧪 Testing known tables...\n');
  
  const knownTables = [
    'users',
    'caregiver_profiles', 
    'profiles',
    'children',
    'jobs',
    'bookings',
    'applications',
    'reviews',
    'messages',
    'conversations',
    'notifications',
    'payments'
  ];
  
  for (const tableName of knownTables) {
    try {
      console.log(`📋 Testing table: ${tableName}`);
      
      // Try to get table structure
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
        
      if (error) {
        console.log(`  ❌ Error: ${error.message}`);
        if (error.code === 'PGRST116') {
          console.log(`  ℹ️  This table exists but has no data`);
        } else if (error.code === '42P01') {
          console.log(`  ⚠️  This table does not exist`);
        }
      } else {
        console.log(`  ✅ Table exists and has data`);
        if (data && data.length > 0) {
          const columns = Object.keys(data[0]);
          console.log(`  📝 Columns: ${columns.join(', ')}`);
        }
      }
      console.log('');
    } catch (err) {
      console.log(`  ❌ Unexpected error: ${err.message}\n`);
    }
  }
}

// Run both approaches
async function main() {
  await getDatabaseSchema();
  console.log('\n' + '='.repeat(60) + '\n');
  await testTables();
}

main();

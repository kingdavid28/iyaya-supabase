const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://myiyrmiiywwgismcpith.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15aXlybWlpeXd3Z2lzbWNwaXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MDgzNDYsImV4cCI6MjA3NTM4NDM0Nn0.DGRKcZmPvatheWOlukc7sjGU8ufYlSiW03L47Q_YWyI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getTableStructure(tableName) {
  console.log(`\n🏗️  Table: ${tableName}`);
  console.log('─'.repeat(50));
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
      
    if (error) {
      console.log(`❌ Error: ${error.message}`);
      return;
    }
    
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      const sample = data[0];
      
      columns.forEach(col => {
        const value = sample[col];
        const type = value === null ? 'null' : typeof value;
        const isArray = Array.isArray(value);
        const actualType = isArray ? 'array' : type;
        
        console.log(`├─ ${col}: ${actualType}${value !== null ? ` = ${JSON.stringify(value).substring(0, 50)}${JSON.stringify(value).length > 50 ? '...' : ''}` : ' = null'}`);
      });
    } else {
      console.log('ℹ️  Table exists but has no data');
    }
  } catch (err) {
    console.log(`❌ Unexpected error: ${err.message}`);
  }
}

async function main() {
  console.log('🔍 Getting complete database table structure...\n');
  
  const keyTables = [
    'users',
    'caregiver_profiles',
    'children',
    'jobs',
    'bookings',
    'applications',
    'reviews'
  ];
  
  for (const table of keyTables) {
    await getTableStructure(table);
  }
  
  console.log('\n✅ Database structure analysis complete!');
}

main();

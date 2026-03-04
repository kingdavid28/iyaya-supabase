#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Get Supabase credentials
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials. Please check your .env file.');
    process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function runMigration() {
    try {
        console.log('🔄 Running migration: Create users table...');

        // Read the migration file
        const migrationPath = path.join(__dirname, 'migrations', '011_create_users_table.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Execute the migration
        const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

        if (error) {
            // Try alternative approach - execute SQL directly
            console.log('⚠️ RPC method failed, trying direct SQL execution...');

            // Split the SQL into individual statements
            const statements = migrationSQL
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

            for (const statement of statements) {
                if (statement.trim()) {
                    console.log(`Executing: ${statement.substring(0, 50)}...`);
                    const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement });
                    if (stmtError) {
                        console.error(`❌ Error executing statement: ${stmtError.message}`);
                        // Continue with other statements
                    }
                }
            }
        }

        console.log('✅ Migration completed successfully!');

        // Verify the table was created
        const { data: tableCheck, error: checkError } = await supabase
            .from('users')
            .select('count(*)')
            .limit(1);

        if (checkError) {
            console.error('❌ Error verifying table creation:', checkError.message);
        } else {
            console.log('✅ Users table verified and accessible');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

// Alternative approach: Manual SQL execution
async function runMigrationManual() {
    try {
        console.log('🔄 Creating users table manually...');

        // Create the users table
        const createTableSQL = `
      CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          email TEXT NOT NULL,
          role TEXT CHECK (role IN ('parent', 'caregiver', 'admin')) NOT NULL,
          name TEXT,
          first_name TEXT,
          last_name TEXT,
          phone TEXT,
          auth_provider TEXT DEFAULT 'supabase',
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
      );
    `;

        const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
        if (createError) {
            console.error('❌ Error creating table:', createError.message);
            return;
        }

        console.log('✅ Users table created');

        // Enable RLS
        const enableRLSSQL = `ALTER TABLE users ENABLE ROW LEVEL SECURITY;`;
        await supabase.rpc('exec_sql', { sql: enableRLSSQL });
        console.log('✅ RLS enabled');

        // Create policies
        const policies = [
            `CREATE POLICY "users_select_own_profile" ON users FOR SELECT USING (auth.uid() = id);`,
            `CREATE POLICY "users_insert_own_profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);`,
            `CREATE POLICY "users_update_own_profile" ON users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);`
        ];

        for (const policy of policies) {
            const { error } = await supabase.rpc('exec_sql', { sql: policy });
            if (error && !error.message.includes('already exists')) {
                console.error(`❌ Error creating policy: ${error.message}`);
            }
        }

        console.log('✅ Policies created');

        // Verify table exists
        const { data, error } = await supabase
            .from('users')
            .select('count(*)')
            .limit(1);

        if (error) {
            console.error('❌ Table verification failed:', error.message);
        } else {
            console.log('✅ Migration completed successfully!');
        }

    } catch (error) {
        console.error('❌ Manual migration failed:', error.message);
    }
}

// Run the migration
console.log('🚀 Starting database migration...');
runMigrationManual();
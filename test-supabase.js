// Test Supabase connection and database schema
import { supabase } from './src/config/supabase.js'

async function testSupabase() {
  console.log('🧪 Testing Supabase connection...')
  
  try {
    // Test 1: Check if we can connect to Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('✅ Supabase connection successful')
    console.log('Current session:', session ? 'Active' : 'None')
    
    // Test 2: Check if users table exists
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (usersError) {
      console.error('❌ Users table error:', usersError.message)
      console.log('💡 You need to run the SQL schema in Supabase Dashboard')
      console.log('📋 Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql')
      console.log('📋 Copy and paste the contents of supabase-schema.sql')
    } else {
      console.log('✅ Users table exists')
    }
    
    // Test 3: Check if conversations table exists
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('count')
      .limit(1)
    
    if (conversationsError) {
      console.error('❌ Conversations table error:', conversationsError.message)
    } else {
      console.log('✅ Conversations table exists')
    }
    
    // Test 4: Check if messages table exists
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('count')
      .limit(1)
    
    if (messagesError) {
      console.error('❌ Messages table error:', messagesError.message)
    } else {
      console.log('✅ Messages table exists')
    }
    
    console.log('🎉 Supabase test completed')
    
  } catch (error) {
    console.error('❌ Supabase test failed:', error.message)
  }
}

testSupabase()
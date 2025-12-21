// Utility to check Supabase client health
import supabase from '../config/supabase'

export const checkSupabaseHealth = () => {
  try {
    if (!supabase) {
      console.error('❌ Supabase client is null/undefined')
      return false
    }

    if (!supabase.auth) {
      console.error('❌ Supabase auth is not available')
      return false
    }

    if (!supabase.from) {
      console.error('❌ Supabase from method is not available')
      return false
    }

    console.log('✅ Supabase client is healthy')
    return true
  } catch (error) {
    console.error('❌ Supabase health check failed:', error)
    return false
  }
}

export const waitForSupabase = async (maxWait = 5000) => {
  const startTime = Date.now()
  
  while (Date.now() - startTime < maxWait) {
    if (checkSupabaseHealth()) {
      return true
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.error('❌ Supabase client not ready after waiting')
  return false
}
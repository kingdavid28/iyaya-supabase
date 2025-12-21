// Test utility to check if reports table exists and create test data
import supabase from '../config/supabase'

export const testReportsTable = async () => {
  try {
    // Test if table exists by trying to select from it
    const { data, error } = await supabase
      .from('user_reports')
      .select('id')
      .limit(1)
    
    if (error) {
      console.error('Reports table not found:', error.message)
      return false
    }
    
    console.log('Reports table exists and accessible')
    return true
  } catch (error) {
    console.error('Error testing reports table:', error)
    return false
  }
}

export const createTestReport = async (userId) => {
  try {
    const testReport = {
      reported_user_id: userId, // Report self for testing
      report_type: 'other',
      title: 'Test Report',
      description: 'This is a test report to verify the system is working',
      severity: 'low'
    }
    
    const { data, error } = await supabase
      .from('user_reports')
      .insert([testReport])
      .select()
      .single()
    
    if (error) throw error
    
    console.log('Test report created:', data)
    return data
  } catch (error) {
    console.error('Error creating test report:', error)
    throw error
  }
}
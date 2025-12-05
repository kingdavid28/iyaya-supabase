// Development utilities for testing user status management
// DO NOT USE IN PRODUCTION

import { supabase } from '../config/supabase'

export const StatusTestUtils = {
  // Simulate admin suspension (for testing only)
  async simulateSuspension(userId, reason = 'testing', durationDays = 7) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Status test utils cannot be used in production')
    }

    const startDate = new Date().toISOString()
    const endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()

    const suspensionData = {
      reason,
      startDate,
      endDate,
      duration: `${durationDays} days`,
      isPermanent: false,
      adminNotes: 'Test suspension for development',
      appealable: true
    }

    const { error } = await supabase
      .from('users')
      .update({
        status: 'suspended',
        profile_data: {
          suspension: suspensionData
        }
      })
      .eq('id', userId)

    if (error) throw error
    return suspensionData
  },

  // Simulate admin ban (for testing only)
  async simulateBan(userId, reason = 'testing') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Status test utils cannot be used in production')
    }

    const suspensionData = {
      reason,
      startDate: new Date().toISOString(),
      isPermanent: true,
      adminNotes: 'Test ban for development',
      appealable: false
    }

    const { error } = await supabase
      .from('users')
      .update({
        status: 'inactive',
        profile_data: {
          suspension: suspensionData
        }
      })
      .eq('id', userId)

    if (error) throw error
    return suspensionData
  },

  // Reactivate user (for testing only)
  async simulateReactivation(userId) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Status test utils cannot be used in production')
    }

    const { error } = await supabase
      .from('users')
      .update({
        status: 'active',
        profile_data: {}
      })
      .eq('id', userId)

    if (error) throw error
    return { status: 'active' }
  },

  // Get current user status (for testing)
  async getCurrentStatus(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('status, profile_data')
      .eq('id', userId)
      .single()

    if (error) throw error
    return {
      status: data.status,
      suspensionData: data.profile_data?.suspension
    }
  }
}

// Console helpers for development
if (__DEV__) {
  global.statusTestUtils = StatusTestUtils
  console.log('🔧 Status test utilities available as global.statusTestUtils')
  console.log('Available methods:')
  console.log('- simulateSuspension(userId, reason, durationDays)')
  console.log('- simulateBan(userId, reason)')
  console.log('- simulateReactivation(userId)')
  console.log('- getCurrentStatus(userId)')
}
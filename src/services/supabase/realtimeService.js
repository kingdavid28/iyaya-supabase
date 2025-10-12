import { SupabaseBase, supabase } from './base'

export class RealtimeService extends SupabaseBase {
  subscribeToApplications(jobId, callback) {
    this._validateId(jobId, 'Job ID')
    
    return supabase
      .channel(`applications:${jobId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'applications',
        filter: `job_id=eq.${jobId}`
      }, callback)
      .subscribe()
  }

  subscribeToBookings(userId, callback) {
    this._validateId(userId, 'User ID')
    
    return supabase
      .channel(`bookings:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `or(parent_id.eq.${userId},caregiver_id.eq.${userId})`
      }, callback)
      .subscribe()
  }

  subscribeToChildren(parentId, callback) {
    this._validateId(parentId, 'Parent ID')
    
    return supabase
      .channel(`children:${parentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'children',
        filter: `parent_id=eq.${parentId}`
      }, callback)
      .subscribe()
  }
}

export const realtimeService = new RealtimeService()
import { supabaseService } from './supabaseService'

class RealtimeService {
  subscribeToMessages(conversationId, callback) {
    return supabaseService.subscribeToMessages(conversationId, callback)
  }

  subscribeToApplications(jobId, callback) {
    return supabaseService.subscribeToApplications(jobId, callback)
  }

  subscribeToBookings(userId, callback) {
    return supabaseService.subscribeToBookings(userId, callback)
  }
}

export default new RealtimeService()
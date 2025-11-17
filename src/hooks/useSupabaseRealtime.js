import { useEffect, useState } from 'react'
import { realtimeService } from '../services'

// Hook for real-time messages
export const useRealtimeMessages = (conversationId, onMessage) => {
  useEffect(() => {
    if (!conversationId) return

    const subscription = realtimeService.subscribeToMessages(conversationId, (payload) => {
      if (payload.eventType === 'INSERT' && onMessage) {
        onMessage(payload.new)
      }
    })

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [conversationId, onMessage])
}

// Hook for real-time job applications
export const useRealtimeApplications = (jobId, onApplication) => {
  useEffect(() => {
    if (!jobId) return

    const subscription = realtimeService.subscribeToApplications(jobId, (payload) => {
      if (onApplication) {
        onApplication(payload)
      }
    })

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [jobId, onApplication])
}

// Hook for real-time bookings
export const useRealtimeBookings = (userId, onBooking) => {
  useEffect(() => {
    if (!userId) return

    const subscription = realtimeService.subscribeToBookings(userId, (payload) => {
      if (onBooking) {
        onBooking(payload)
      }
    })

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [userId, onBooking])
}

// Generic real-time hook
export const useSupabaseRealtime = (table, filter, callback) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!table || !callback) return

    const subscription = supabase
      .channel(`${table}:${filter || '*'}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter
      }, callback)
      .subscribe()

    setLoading(false)

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [table, filter, callback])

  return { data, loading }
}

export default {
  useRealtimeMessages,
  useRealtimeApplications,
  useRealtimeBookings,
  useSupabaseRealtime
}
import { SupabaseBase, supabase } from './base'
import { getCachedOrFetch, invalidateCache } from './cache'

export class NotificationService extends SupabaseBase {
  async createNotification(notificationData) {
    try {
      this._validateRequiredFields(notificationData, ['user_id', 'type', 'title', 'message'], 'createNotification')
      
      // Ensure user is authenticated before creating notification
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.warn('No authenticated user for notification creation')
        return null
      }
      
      const resolvedUserId = await this._ensureUserId(notificationData.user_id, 'Notification user ID')

      const dbNotificationData = {
        user_id: resolvedUserId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data || {},
        read: false,
        created_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('notifications')
        .insert([dbNotificationData])
        .select()
        .single()
      
      if (error) {
        // Handle RLS policy violations gracefully
        if (error.code === '42501') {
          console.warn('RLS policy violation for notifications - user may not have permission')
          return null
        }
        throw error
      }
      
      console.log('✅ Notification created:', data)
      invalidateCache(`notification-counts:${resolvedUserId}`)
      return data
    } catch (error) {
      return this._handleError('createNotification', error)
    }
  }

  async getNotifications(userId, limit = 50) {
    try {
      const resolvedUserId = await this._ensureUserId(userId, 'User ID')

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resolvedUserId)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) throw error
      return data || []
    } catch (error) {
      return this._handleError('getNotifications', error)
    }
  }

  async getUnreadNotificationCount(userId) {
    try {
      const resolvedUserId = await this._ensureUserId(userId, 'User ID')

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', resolvedUserId)
        .eq('read', false)
      
      if (error) throw error
      return count || 0
    } catch (error) {
      console.warn('Error getting unread count:', error)
      return 0
    }
  }

  async getNotificationCountsByType(userId) {
    try {
      const resolvedUserId = await this._ensureUserId(userId, 'User ID')

      const cacheKey = `notification-counts:${resolvedUserId}`
      return await getCachedOrFetch(cacheKey, async () => {
        try {
          const { data, error } = await supabase
            .rpc('notification_counts_by_type', { user_id_input: resolvedUserId })

          if (!error && data) {
            return {
              messages: data.messages ?? 0,
              bookings: data.bookings ?? 0,
              jobs: data.jobs ?? 0,
              reviews: data.reviews ?? 0,
              notifications: data.notifications ?? 0,
              total: data.total ?? 0
            }
          }
        } catch (rpcError) {
          console.info('Notification counts RPC unavailable, falling back to client aggregation.', rpcError?.message)
        }

        const { data, error } = await supabase
          .from('notifications')
          .select('type')
          .eq('user_id', resolvedUserId)
          .eq('read', false)

        if (error) throw error

        const counts = {
          messages: 0,
          bookings: 0,
          jobs: 0,
          reviews: 0,
          notifications: 0,
          total: 0
        }

        data?.forEach(notification => {
          const type = notification.type
          if (type === 'message') {
            counts.messages++
          } else if (['booking_request', 'booking_confirmed', 'booking_cancelled'].includes(type)) {
            counts.bookings++
          } else if (type === 'job_application') {
            counts.jobs++
          } else if (type === 'review') {
            counts.reviews++
          } else {
            counts.notifications++
          }
          counts.total++
        })

        return counts
      }, 30 * 1000)
    } catch (error) {
      console.warn('Error getting notification counts by type:', error)
      return {
        messages: 0,
        bookings: 0,
        jobs: 0,
        reviews: 0,
        notifications: 0,
        total: 0
      }
    }
  }

  async markNotificationAsRead(notificationId) {
    try {
      this._validateId(notificationId, 'Notification ID')

      const { data, error } = await supabase
        .from('notifications')
        .update({ 
          read: true
        })
        .eq('id', notificationId)
        .select()
        .single()
      
      if (error) throw error
      if (data?.user_id) {
        invalidateCache(`notification-counts:${data.user_id}`)
      }
      return data
    } catch (error) {
      return this._handleError('markNotificationAsRead', error)
    }
  }

  async markAllNotificationsAsRead(userId) {
    try {
      const resolvedUserId = await this._ensureUserId(userId, 'User ID')

      const { data, error } = await supabase
        .from('notifications')
        .update({ 
          read: true
        })
        .eq('user_id', resolvedUserId)
        .eq('read', false)
        .select()
      
      if (error) throw error
      invalidateCache(`notification-counts:${resolvedUserId}`)
      return data || []
    } catch (error) {
      return this._handleError('markAllNotificationsAsRead', error)
    }
  }

  subscribeToNotifications(userId, callback) {
    const resolvedUserId = String(userId).trim()
    this._validateId(resolvedUserId, 'User ID')
    return supabase
      .channel(`notifications:${resolvedUserId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${resolvedUserId}`
      }, callback)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${resolvedUserId}`
      }, callback)
      .subscribe()
  }

  // Notification helpers with improved error handling
  async notifyNewMessage(senderId, recipientId, messageContent) {
    try {
      // Validate inputs with detailed logging
      if (!senderId || senderId === 'undefined' || senderId === 'null') {
        console.warn('Invalid senderId for message notification:', { senderId, recipientId, messageContent })
        return null
      }
      
      if (!recipientId || recipientId === 'undefined' || recipientId === 'null') {
        console.warn('Invalid recipientId for message notification:', { senderId, recipientId, messageContent })
        return null
      }
      
      if (!messageContent || typeof messageContent !== 'string') {
        console.warn('Invalid messageContent for message notification:', { senderId, recipientId, messageContent })
        return null
      }
      
      if (senderId === recipientId) {
        console.warn('Cannot send notification to self')
        return null
      }
      
      const { userService } = await import('./userService')
      const senderProfile = await userService.getProfile(senderId)
      const senderName = senderProfile?.name || 'Someone'
      
      const result = await this.createNotification({
        user_id: recipientId,
        type: 'message',
        title: 'New Message',
        message: `${senderName}: ${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}`,
        data: {
          senderId,
          senderName,
          messageContent
        }
      })
      invalidateCache(`notification-counts:${recipientId}`)
      return result
    } catch (error) {
      console.error('Error creating message notification:', error)
      return null
    }
  }

  async notifyJobApplication(jobId, caregiverId, parentId) {
    try {
      // Validate inputs
      if (!jobId || !caregiverId || !parentId) {
        console.warn('Invalid parameters for job application notification')
        return null
      }
      
      const { userService } = await import('./userService')
      const caregiverProfile = await userService.getProfile(caregiverId)
      const caregiverName = caregiverProfile?.name || 'A caregiver'
      
      const { data: job } = await supabase
        .from('jobs')
        .select('title')
        .eq('id', jobId)
        .single()
      
      const jobTitle = job?.title || 'your job'
      
      const result = await this.createNotification({
        user_id: parentId,
        type: 'job_application',
        title: 'New Job Application',
        message: `${caregiverName} applied to ${jobTitle}`,
        data: {
          jobId,
          caregiverId,
          caregiverName,
          jobTitle
        }
      })
      invalidateCache(`notification-counts:${parentId}`)
      return result
    } catch (error) {
      console.error('Error creating job application notification:', error)
      return null
    }
  }

  async notifyBookingRequest(bookingId, parentId, caregiverId) {
    try {
      // Validate inputs
      if (!bookingId || !parentId || !caregiverId) {
        console.warn('Invalid parameters for booking request notification')
        return null
      }
      
      const { userService } = await import('./userService')
      const parentProfile = await userService.getProfile(parentId)
      const parentName = parentProfile?.name || 'A parent'
      
      const result = await this.createNotification({
        user_id: caregiverId,
        type: 'booking_request',
        title: 'New Booking Request',
        message: `${parentName} sent you a booking request`,
        data: {
          bookingId,
          parentId,
          parentName
        }
      })
      invalidateCache(`notification-counts:${caregiverId}`)
      return result
    } catch (error) {
      console.error('Error creating booking request notification:', error)
      return null
    }
  }

  async notifyBookingConfirmed(bookingId, caregiverId, parentId) {
    try {
      const { userService } = await import('./userService')
      const caregiverProfile = await userService.getProfile(caregiverId)
      const caregiverName = caregiverProfile?.name || 'Your caregiver'
      
      const result = await this.createNotification({
        user_id: parentId,
        type: 'booking_confirmed',
        title: 'Booking Confirmed',
        message: `${caregiverName} confirmed your booking`,
        data: {
          bookingId,
          caregiverId,
          caregiverName
        }
      })
      invalidateCache(`notification-counts:${parentId}`)
      return result
    } catch (error) {
      console.error('Error creating booking confirmation notification:', error)
      return null
    }
  }

  async notifyBookingCancelled(bookingId, caregiverId, parentId) {
    try {
      const { userService } = await import('./userService')
      const caregiverProfile = await userService.getProfile(caregiverId)
      const caregiverName = caregiverProfile?.name || 'Your caregiver'
      
      const result = await this.createNotification({
        user_id: parentId,
        type: 'booking_cancelled',
        title: 'Booking Cancelled',
        message: `${caregiverName} cancelled your booking`,
        data: {
          bookingId,
          caregiverId,
          caregiverName
        }
      })
      invalidateCache(`notification-counts:${parentId}`)
      return result
    } catch (error) {
      console.error('Error creating booking cancellation notification:', error)
      return null
    }
  }

  async notifyReview(reviewId, caregiverId, parentId, rating) {
    try {
      const { userService } = await import('./userService')
      const parentProfile = await userService.getProfile(parentId)
      const parentName = parentProfile?.name || 'A parent'
      
      const result = await this.createNotification({
        user_id: caregiverId,
        type: 'review',
        title: 'New Review',
        message: `${parentName} left you a ${rating}-star review`,
        data: {
          reviewId,
          parentId,
          parentName,
          rating
        }
      })
      invalidateCache(`notification-counts:${caregiverId}`)
      return result
    } catch (error) {
      console.error('Error creating review notification:', error)
      return null
    }
  }

  async notifySystemAlert(userId, title, message, data = {}) {
    try {
      const result = await this.createNotification({
        user_id: userId,
        type: 'system',
        title,
        message,
        data
      })
      invalidateCache(`notification-counts:${userId}`)
      return result
    } catch (error) {
      console.error('Error creating system alert:', error)
      return null
    }
  }

  async notifyPaymentReminder(userId, amount, dueDate) {
    try {
      const result = await this.createNotification({
        user_id: userId,
        type: 'payment',
        title: 'Payment Reminder',
        message: `Payment of ₱${amount} is due on ${dueDate}`,
        data: {
          amount,
          dueDate
        }
      })
      invalidateCache(`notification-counts:${userId}`)
      return result
    } catch (error) {
      console.error('Error creating payment reminder:', error)
      return null
    }
  }
}

export const notificationService = new NotificationService()
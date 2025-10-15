import { SupabaseBase, supabase } from './base'

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
      
      const dbNotificationData = {
        user_id: notificationData.user_id,
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
      return data
    } catch (error) {
      return this._handleError('createNotification', error)
    }
  }

  async getNotifications(userId, limit = 50) {
    try {
      this._validateId(userId, 'User ID')
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
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
      this._validateId(userId, 'User ID')
      
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)
      
      if (error) throw error
      return count || 0
    } catch (error) {
      console.warn('Error getting unread count:', error)
      return 0
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
      return data
    } catch (error) {
      return this._handleError('markNotificationAsRead', error)
    }
  }

  async markAllNotificationsAsRead(userId) {
    try {
      this._validateId(userId, 'User ID')
      
      const { data, error } = await supabase
        .from('notifications')
        .update({ 
          read: true
        })
        .eq('user_id', userId)
        .eq('read', false)
        .select()
      
      if (error) throw error
      return data || []
    } catch (error) {
      return this._handleError('markAllNotificationsAsRead', error)
    }
  }

  subscribeToNotifications(userId, callback) {
    this._validateId(userId, 'User ID')
    
    return supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
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
      
      return await this.createNotification({
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
      
      return await this.createNotification({
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
      
      return await this.createNotification({
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
      
      return await this.createNotification({
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
      
      return await this.createNotification({
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
      
      return await this.createNotification({
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
    } catch (error) {
      console.error('Error creating review notification:', error)
      return null
    }
  }

  async notifySystemAlert(userId, title, message, data = {}) {
    try {
      return await this.createNotification({
        user_id: userId,
        type: 'system',
        title,
        message,
        data
      })
    } catch (error) {
      console.error('Error creating system alert:', error)
      return null
    }
  }

  async notifyPaymentReminder(userId, amount, dueDate) {
    try {
      return await this.createNotification({
        user_id: userId,
        type: 'payment',
        title: 'Payment Reminder',
        message: `Payment of ₱${amount} is due on ${dueDate}`,
        data: {
          amount,
          dueDate
        }
      })
    } catch (error) {
      console.error('Error creating payment reminder:', error)
      return null
    }
  }
}

export const notificationService = new NotificationService()
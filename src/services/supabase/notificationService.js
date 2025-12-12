import { SupabaseBase } from './base'
import supabase from './base'
import { getCachedOrFetch, invalidateCache } from './cache'
import { userService } from './userService'

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

      const shouldReturnRecord = resolvedUserId === user.id

      const response = shouldReturnRecord
        ? await supabase
          .from('notifications')
          .insert([dbNotificationData])
          .select()
          .single()
        : await supabase
          .from('notifications')
          .insert([dbNotificationData])

      const { data, error } = response

      if (error) {
        // Handle RLS policy violations gracefully
        if (error.code === '42501') {
          console.warn('RLS policy violation for notifications - user may not have permission')
          return null
        }
        throw error
      }

      if (data) {
        console.log('✅ Notification created:', data)
      }
      invalidateCache(`notification-counts:${resolvedUserId}`)
      return data ?? null
    } catch (error) {
      return this._handleError('createNotification', error)
    }
  }

  async notifyContractCreated(contract) {
    try {
      if (!contract) return null

      await Promise.all([
        this.createNotification({
          user_id: contract.parentId,
          type: 'system',
          title: 'Contract Created',
          message: 'A new contract is ready for your review.',
          data: {
            contractId: contract.id,
            bookingId: contract.bookingId,
            jobId: contract.metadata?.jobId || contract.metadata?.job_id || null,
            applicationId: contract.metadata?.applicationId || contract.metadata?.application_id || null,
            notificationType: 'contract_created'
          }
        }),
        this.createNotification({
          user_id: contract.caregiverId,
          type: 'system',
          title: 'New Contract',
          message: 'A parent sent you a contract to review.',
          data: {
            contractId: contract.id,
            bookingId: contract.bookingId,
            jobId: contract.metadata?.jobId || contract.metadata?.job_id || null,
            applicationId: contract.metadata?.applicationId || contract.metadata?.application_id || null,
            notificationType: 'contract_created'
          }
        })
      ])

      invalidateCache(`notification-counts:${contract.parentId}`)
      invalidateCache(`notification-counts:${contract.caregiverId}`)
      return true
    } catch (error) {
      console.warn('Error notifying contract creation:', error)
      return null
    }
  }

  async notifyContractStatusChange(contract, status) {
    try {
      if (!contract) return null
      const targets = [contract.parentId, contract.caregiverId].filter(Boolean)

      await Promise.all(targets.map(userId => this.createNotification({
        user_id: userId,
        type: 'system',
        title: 'Contract Updated',
        message: `Contract status changed to ${status}.`,
        data: {
          contractId: contract.id,
          bookingId: contract.bookingId,
          jobId: contract.metadata?.jobId || contract.metadata?.job_id || null,
          applicationId: contract.metadata?.applicationId || contract.metadata?.application_id || null,
          status,
          notificationType: 'contract_status'
        }
      })))

      targets.forEach(userId => invalidateCache(`notification-counts:${userId}`))
      return true
    } catch (error) {
      console.warn('Error notifying contract status change:', error)
      return null
    }
  }

  async notifyContractSigned(contract, signer) {
    try {
      if (!contract) return null
      const recipient = signer === 'parent' ? contract.caregiverId : contract.parentId
      if (!recipient) return null

      await this.createNotification({
        user_id: recipient,
        type: 'system',
        title: `${signer === 'parent' ? 'Parent' : 'Caregiver'} Signed`,
        message: `The ${signer} signed the contract for your booking.`,
        data: {
          contractId: contract.id,
          bookingId: contract.bookingId,
          jobId: contract.metadata?.jobId || contract.metadata?.job_id || null,
          applicationId: contract.metadata?.applicationId || contract.metadata?.application_id || null,
          signer,
          notificationType: 'contract_signed'
        }
      })

      invalidateCache(`notification-counts:${recipient}`)
      return true
    } catch (error) {
      console.warn('Error notifying contract signed:', error)
      return null
    }
  }

  async notifyContractActivated(contract) {
    try {
      if (!contract) return null
      const targets = [contract.parentId, contract.caregiverId].filter(Boolean)

      await Promise.all(targets.map(userId => this.createNotification({
        user_id: userId,
        type: 'system',
        title: 'Contract Activated',
        message: 'A contract you are part of is now active.',
        data: {
          contractId: contract.id,
          bookingId: contract.bookingId,
          jobId: contract.metadata?.jobId || contract.metadata?.job_id || null,
          applicationId: contract.metadata?.applicationId || contract.metadata?.application_id || null,
          notificationType: 'contract_activated'
        }
      })))

      targets.forEach(userId => invalidateCache(`notification-counts:${userId}`))
      return true
    } catch (error) {
      console.warn('Error notifying contract activation:', error)
      return null
    }
  }

  async notifyContractUpdated(contract, context = {}) {
    try {
      if (!contract) return null
      const targets = [contract.parentId, contract.caregiverId].filter(Boolean)

      await Promise.all(targets.map(userId => this.createNotification({
        user_id: userId,
        type: 'system',
        title: 'Contract Updated',
        message: 'Contract terms were updated.',
        data: {
          contractId: contract.id,
          bookingId: contract.bookingId,
          jobId: contract.metadata?.jobId || contract.metadata?.job_id || null,
          applicationId: contract.metadata?.applicationId || contract.metadata?.application_id || null,
          actorId: context.actorId || null,
          actorRole: context.actorRole || null,
          notificationType: 'contract_updated'
        }
      })))

      targets.forEach(userId => invalidateCache(`notification-counts:${userId}`))
      return true
    } catch (error) {
      console.warn('Error notifying contract update:', error)
      return null
    }
  }

  async notifyContractResent(contract, actorId) {
    try {
      if (!contract) return null
      const targets = [contract.parentId, contract.caregiverId].filter(id => id && id !== actorId)

      if (!targets.length) return null

      await Promise.all(targets.map(userId => this.createNotification({
        user_id: userId,
        type: 'system',
        title: 'Contract Resent',
        message: 'A contract was resent for your attention.',
        data: {
          contractId: contract.id,
          bookingId: contract.bookingId,
          jobId: contract.metadata?.jobId || contract.metadata?.job_id || null,
          applicationId: contract.metadata?.applicationId || contract.metadata?.application_id || null,
          actorId,
          notificationType: 'contract_resent'
        }
      })))

      targets.forEach(userId => invalidateCache(`notification-counts:${userId}`))
      return true
    } catch (error) {
      console.warn('Error notifying contract resend:', error)
      return null
    }
  }

  async getNotifications(userId, options = {}) {
    const normalizedOptions = (typeof options === 'object' && options !== null)
      ? options
      : { limit: Number(options) || 50 }

    const {
      limit = 50,
      offset = 0
    } = normalizedOptions

    try {
      const resolvedUserId = await this._ensureUserId(userId, 'User ID')

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resolvedUserId)
        .order('created_at', { ascending: false })

      if (Number.isFinite(limit)) {
        const safeLimit = Math.max(0, Number(limit) || 0)
        query = query.limit(safeLimit)

        const safeOffset = Math.max(0, Number(offset) || 0)
        if (safeOffset > 0) {
          query = query.offset(safeOffset)
        }
      }

      const { data, error } = await query
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
        // Use client-side aggregation instead of RPC call
        console.log('🔄 Getting notification counts by type for user:', resolvedUserId)

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

        console.log('✅ Notification counts calculated:', counts)
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

  async deleteNotification(notificationId) {
    try {
      this._validateId(notificationId, 'Notification ID')

      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .select('id, user_id')
        .maybeSingle()

      if (error) throw error
      if (data?.user_id) {
        invalidateCache(`notification-counts:${data.user_id}`)
      }
      return data
    } catch (error) {
      return this._handleError('deleteNotification', error)
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

  async notifyPaymentProofReceived(caregiverId, bookingId, {
    parentId,
    parentName,
    paymentType = 'deposit',
    totalAmount,
    paymentProofUrl,
    paymentProofId,
    paymentProofStoragePath,
    bookingDeepLink
  } = {}) {
    try {
      if (!caregiverId || !bookingId) {
        console.warn('Invalid parameters for payment proof notification:', { caregiverId, bookingId })
        return null
      }

      const resolvedCaregiverId = await this._ensureUserId(caregiverId, 'Caregiver ID')

      let parentDisplayName = parentName
      if (!parentDisplayName && parentId) {
        try {
          const parentProfile = await userService.getProfile(parentId)
          parentDisplayName = parentProfile?.name || 'A parent'
        } catch (profileError) {
          console.warn('Unable to resolve parent profile for payment proof notification:', profileError)
        }
      }

      const paymentLabel = paymentType === 'final_payment' ? 'final' : 'deposit'
      const title = paymentType === 'final_payment'
        ? 'Final Payment Proof Submitted'
        : 'Payment Proof Submitted'

      const amountText = typeof totalAmount === 'number'
        ? ` Amount: ₱${Number(totalAmount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
        : ''

      const message = `${parentDisplayName || 'A parent'} uploaded a ${paymentLabel} payment proof for booking #${bookingId}.${amountText}`

      console.log('🧾 notifyPaymentProofReceived payload:', {
        caregiverId,
        bookingId,
        parentId,
        parentDisplayName,
        paymentType,
        totalAmount,
        paymentProofUrl,
        paymentProofId,
        paymentProofStoragePath,
        bookingDeepLink
      })

      const metadata = {
        parentId: parentId || null,
        parentName: parentDisplayName || null,
        paymentType,
        totalAmount: totalAmount ?? null,
        paymentProofUrl: paymentProofUrl || null,
        paymentProofId: paymentProofId || null,
        paymentProofStoragePath: paymentProofStoragePath || null,
        bookingDeepLink: bookingDeepLink || null
      }

      try {
        const { data: functionData, error: functionError } = await supabase.functions.invoke('payment-proof-notification', {
          body: {
            caregiverId: resolvedCaregiverId,
            bookingId,
            metadata
          }
        })

        if (functionError) {
          console.warn('Edge function payment-proof-notification returned error, falling back to client insert', functionError)
        } else if (functionData?.success) {
          invalidateCache(`notification-counts:${resolvedCaregiverId}`)
          console.log('✅ Payment proof notification created via edge function:', {
            notificationId: functionData?.notificationId || null,
            caregiverId: resolvedCaregiverId,
            bookingId
          })
          return {
            id: functionData?.notificationId || null
          }
        }
      } catch (functionInvokeError) {
        console.warn('Edge function invocation failed, using client-side fallback', functionInvokeError)
      }

      const result = await this.createNotification({
        user_id: resolvedCaregiverId,
        type: 'payment',
        title,
        message,
        data: { ...metadata, notificationType: 'payment_proof', bookingId }
      })

      invalidateCache(`notification-counts:${resolvedCaregiverId}`)
      console.log('✅ Payment proof notification created:', result?.id, {
        caregiverId: resolvedCaregiverId,
        bookingId,
        paymentProofId: paymentProofId || null
      })
      return result
    } catch (error) {
      console.error('Error creating payment proof notification:', error)
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
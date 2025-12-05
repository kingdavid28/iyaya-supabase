import { SupabaseBase, supabase } from './base'
import { getCachedOrFetch, invalidateCache } from './cache'

export class UserStatusService extends SupabaseBase {
  async checkUserStatus(userId) {
    try {
      const resolvedUserId = await this._ensureUserId(userId, 'User ID')
      
      const { data, error } = await supabase
        .from('users')
        .select('status, profile_data')
        .eq('id', resolvedUserId)
        .single()

      if (error) throw error

      const status = data?.status || 'active'
      const suspensionData = data?.profile_data?.suspension || null

      return {
        status,
        isSuspended: status === 'suspended',
        isBanned: status === 'inactive',
        suspensionData,
        canAccess: status === 'active'
      }
    } catch (error) {
      return this._handleError('checkUserStatus', error, false)
    }
  }

  async getUserSuspensionDetails(userId) {
    try {
      const resolvedUserId = await this._ensureUserId(userId, 'User ID')
      
      const { data, error } = await supabase
        .from('users')
        .select('status, profile_data')
        .eq('id', resolvedUserId)
        .single()

      if (error) throw error

      const suspensionData = data?.profile_data?.suspension
      if (!suspensionData || data?.status !== 'suspended') {
        return null
      }

      return {
        reason: suspensionData.reason,
        startDate: suspensionData.startDate,
        endDate: suspensionData.endDate,
        duration: suspensionData.duration,
        isPermanent: suspensionData.isPermanent || false,
        adminNotes: suspensionData.adminNotes,
        appealable: suspensionData.appealable !== false
      }
    } catch (error) {
      return this._handleError('getUserSuspensionDetails', error, false)
    }
  }

  async subscribeToStatusChanges(userId, callback) {
    try {
      const resolvedUserId = await this._ensureUserId(userId, 'User ID')
      
      const subscription = supabase
        .channel(`user_status_${resolvedUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${resolvedUserId}`
          },
          (payload) => {
            const newData = payload.new
            const oldData = payload.old
            
            if (newData.status !== oldData.status) {
              callback({
                userId: resolvedUserId,
                oldStatus: oldData.status,
                newStatus: newData.status,
                suspensionData: newData.profile_data?.suspension,
                timestamp: new Date().toISOString()
              })
            }
          }
        )
        .subscribe()

      return subscription
    } catch (error) {
      console.error('Error subscribing to status changes:', error)
      return null
    }
  }

  async handleStatusChange(statusData) {
    const { newStatus, suspensionData } = statusData
    
    switch (newStatus) {
      case 'suspended':
        return this._handleSuspension(suspensionData)
      case 'inactive':
        return this._handleBan(suspensionData)
      case 'active':
        return this._handleReactivation()
      default:
        return { action: 'none' }
    }
  }

  _handleSuspension(suspensionData) {
    return {
      action: 'suspend',
      shouldLogout: true,
      message: suspensionData?.reason || 'Your account has been suspended.',
      details: suspensionData,
      showAppeal: suspensionData?.appealable !== false
    }
  }

  _handleBan(suspensionData) {
    return {
      action: 'ban',
      shouldLogout: true,
      message: suspensionData?.reason || 'Your account has been permanently banned.',
      details: suspensionData,
      showAppeal: false
    }
  }

  _handleReactivation() {
    return {
      action: 'reactivate',
      shouldLogout: false,
      message: 'Your account has been reactivated.',
      showWelcomeBack: true
    }
  }
}

export const userStatusService = new UserStatusService()
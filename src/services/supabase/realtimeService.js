import { SupabaseBase } from './base'
import supabase from './base'

const TYPING_IDLE_PAYLOAD = {
  isTyping: false,
  updatedAt: new Date().toISOString(),
}

export class RealtimeService extends SupabaseBase {
  constructor() {
    super()
    this._typingChannels = new Map()
  }

  _normalizeConversationId(conversationId) {
    if (conversationId && typeof conversationId === 'object') {
      if (conversationId.id) return conversationId.id
      if (conversationId.conversationId) return conversationId.conversationId
    }

    this._validateId(conversationId, 'Conversation ID')
    return conversationId
  }

  subscribeToApplications(jobId, callback) {
    this._validateId(jobId, 'Job ID')

    return supabase
      .channel(`applications:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
          filter: `job_id=eq.${jobId}`,
        },
        callback,
      )
      .subscribe()
  }

  subscribeToBookings(userId, callback) {
    this._validateId(userId, 'User ID')

    return supabase
      .channel(`bookings:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `or(parent_id.eq.${userId},caregiver_id.eq.${userId})`,
        },
        callback,
      )
      .subscribe()
  }

  subscribeToChildren(parentId, callback) {
    this._validateId(parentId, 'Parent ID')

    return supabase
      .channel(`children:${parentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'children',
          filter: `parent_id=eq.${parentId}`,
        },
        callback,
      )
      .subscribe()
  }

  subscribeToMessages(conversationId, callback) {
    if (conversationId === '*' || conversationId === 'all' || conversationId == null) {
      return supabase
        .channel('messages:all')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
          },
          callback,
        )
        .subscribe()
    }

    const normalizedId = this._normalizeConversationId(conversationId)

    return supabase
      .channel(`messages:${normalizedId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${normalizedId}`,
        },
        callback,
      )
      .subscribe()
  }

  joinTypingChannel(conversationId, userId, onTypingUsers) {
    const normalizedId = this._normalizeConversationId(conversationId)
    this._validateId(userId, 'User ID')

    let entry = this._typingChannels.get(normalizedId)

    if (!entry) {
      const listeners = new Set()
      const channel = supabase.channel(`typing:${normalizedId}`, {
        config: {
          presence: {
            key: userId,
          },
        },
      })

      const emitState = () => {
        const presenceState = channel.presenceState()
        const activeTypers = Object.entries(presenceState)
          .flatMap(([key, presences]) =>
            presences.some((presence) => presence.isTyping) ? [key] : [],
          )
          .filter(Boolean)

        listeners.forEach((listener) => listener(activeTypers))
      }

      channel.on('presence', { event: 'sync' }, emitState)
      channel.on('presence', { event: 'join' }, emitState)
      channel.on('presence', { event: 'leave' }, emitState)

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ ...TYPING_IDLE_PAYLOAD })
        }
      })

      entry = { channel, listeners, userId }
      this._typingChannels.set(normalizedId, entry)
    }

    if (onTypingUsers) {
      entry.listeners.add(onTypingUsers)
    }

    return () => {
      const current = this._typingChannels.get(normalizedId)
      if (!current) return

      if (onTypingUsers) {
        current.listeners.delete(onTypingUsers)
      }

      if (current.listeners.size === 0) {
        current.channel.unsubscribe()
        this._typingChannels.delete(normalizedId)
      }
    }
  }

  async setTypingStatus(conversationId, userId, isTyping) {
    const normalizedId = this._normalizeConversationId(conversationId)

    if (!this._typingChannels.has(normalizedId)) {
      this.joinTypingChannel(normalizedId, userId)
    }

    const entry = this._typingChannels.get(normalizedId)
    if (!entry) return

    try {
      await entry.channel.track({
        isTyping: Boolean(isTyping),
        updatedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.warn('⚠️ Failed to update typing presence:', error?.message || error)
    }
  }
}

export const realtimeService = new RealtimeService()
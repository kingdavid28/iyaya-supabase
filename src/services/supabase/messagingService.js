import { SupabaseBase, supabase } from './base'

export class MessagingService extends SupabaseBase {
  async getOrCreateConversation(participant1, participant2) {
    try {
      if (!participant1) {
        throw new Error('Participant 1 ID is required')
      }
      if (!participant2) {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user && user.id !== participant1) {
            participant2 = user.id
          } else {
            throw new Error('Participant 2 ID is required')
          }
        } catch (authError) {
          throw new Error('Participant 2 ID is required')
        }
      }
      
      this._validateId(participant1, 'Participant 1 ID')
      this._validateId(participant2, 'Participant 2 ID')
      
      if (participant1 === participant2) {
        throw new Error('Cannot create conversation with yourself')
      }
      
      let { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(participant_1.eq.${participant1},participant_2.eq.${participant2}),and(participant_1.eq.${participant2},participant_2.eq.${participant1})`)

      if (error) throw error
      
      if (data && data.length > 0) {
        return data[0]
      }

      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert([{
          participant_1: participant1,
          participant_2: participant2,
          created_at: new Date().toISOString(),
          last_message_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (createError) throw createError
      return newConversation
    } catch (error) {
      return this._handleError('getOrCreateConversation', error)
    }
  }

  async getConversations(userId) {
    try {
      this._validateId(userId, 'User ID')
      
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participant1:users!conversations_participant_1_fkey(id, name, profile_image),
          participant2:users!conversations_participant_2_fkey(id, name, profile_image)
        `)
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .order('last_message_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      return this._handleError('getConversations', error)
    }
  }

  async sendMessage(conversationId, senderId, content) {
    try {
      if (typeof conversationId === 'object' && conversationId !== null) {
        if (conversationId.id) {
          conversationId = conversationId.id
        } else if (conversationId.conversationId) {
          conversationId = conversationId.conversationId
        } else {
          throw new Error('Invalid conversation object - missing id property')
        }
      } else if (typeof conversationId === 'string' && conversationId.includes('_')) {
        const [participant1, participant2] = conversationId.split('_')
        const conversation = await this.getOrCreateConversation(participant1, participant2)
        conversationId = conversation.id
      }
      
      this._validateId(conversationId, 'Conversation ID')
      this._validateId(senderId, 'Sender ID')
      
      if (!content?.trim()) {
        throw new Error('Message content is required')
      }

      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single()

      if (conversationError) throw conversationError

      const recipientId = conversation.participant_1 === senderId 
        ? conversation.participant_2 
        : conversation.participant_1

      const { data, error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          sender_id: senderId,
          recipient_id: recipientId,
          content: content.trim(),
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)

      return data
    } catch (error) {
      return this._handleError('sendMessage', error)
    }
  }

  async getMessages(conversationId, limit = 50) {
    try {
      if (typeof conversationId === 'object' && conversationId !== null) {
        if (conversationId.id) {
          conversationId = conversationId.id
        } else if (conversationId.conversationId) {
          conversationId = conversationId.conversationId
        } else {
          throw new Error('Invalid conversation object - missing id property')
        }
      } else if (typeof conversationId === 'string' && conversationId.includes('_')) {
        const [participant1, participant2] = conversationId.split('_')
        const conversation = await this.getOrCreateConversation(participant1, participant2)
        conversationId = conversation.id
      }
      
      this._validateId(conversationId, 'Conversation ID')
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(name, profile_image)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      return this._handleError('getMessages', error)
    }
  }

  async markMessagesAsRead(conversationId, userId) {
    try {
      if (typeof conversationId === 'object' && conversationId !== null) {
        if (conversationId.id) {
          conversationId = conversationId.id
        } else if (conversationId.conversationId) {
          conversationId = conversationId.conversationId
        } else {
          throw new Error('Invalid conversation object - missing id property')
        }
      }
      
      this._validateId(conversationId, 'Conversation ID')
      this._validateId(userId, 'User ID')
      
      supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('recipient_id', userId)
        .is('read_at', null)
        .then(({ error }) => {
          if (error) console.warn('Error marking messages as read:', error)
        })

      return { success: true }
    } catch (error) {
      console.warn('markMessagesAsRead error:', error.message)
      return { success: false }
    }
  }

  async startConversation(participant1, participant2) {
    return await this.getOrCreateConversation(participant1, participant2)
  }

  subscribeToMessages(conversationId, callback) {
    if (typeof conversationId === 'object' && conversationId !== null) {
      if (conversationId.id) {
        conversationId = conversationId.id
      } else if (conversationId.conversationId) {
        conversationId = conversationId.conversationId
      } else {
        throw new Error('Invalid conversation object - missing id property')
      }
    }
    
    this._validateId(conversationId, 'Conversation ID')
    
    return supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, callback)
      .subscribe()
  }
}

export const messagingService = new MessagingService()
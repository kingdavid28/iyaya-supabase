// src/services/supabase/messagingService.js
import { SupabaseBase, supabase } from './base'
import { getCachedOrFetch, invalidateCache } from './cache'
import { ATTACHMENT_VALIDATION_DEFAULTS, validateUpload } from '../../utils/uploadValidation'

export class MessagingService extends SupabaseBase {
  async getOrCreateConversation(participant1, participant2) {
    try {
      // If participant1 is missing, try to get current user from auth
      if (!participant1 || participant1 === 'undefined' || participant1 === 'null') {
        const currentUser = await this._getCurrentUser();
        if (currentUser?.id) {
          participant1 = currentUser.id;
          console.log('🔄 Using current auth user as participant1:', participant1);
        }
      }
      
      console.log('🔍 getOrCreateConversation called with:', { 
        participant1, 
        participant2
      });
      
      if (!participant1 || participant1 === 'undefined' || participant1 === 'null' || String(participant1) === 'undefined') {
        console.error('❌ Invalid participant1:', participant1);
        throw new Error(`Participant 1 ID is required. Received: ${participant1}`)
      }
      
      if (!participant2 || participant2 === 'undefined' || participant2 === 'null') {
        const currentUser = await this._getCurrentUser()
        if (!currentUser) {
          throw new Error('User must be authenticated to create conversation')
        }
        if (currentUser.id === participant1) {
          throw new Error('Cannot create conversation with yourself')
        }
        participant2 = currentUser.id
      }
      
      this._validateId(participant1, 'Participant 1 ID')
      this._validateId(participant2, 'Participant 2 ID')
      
      if (participant1 === participant2) {
        console.error('❌ Attempted to create conversation with same user ID:', { participant1, participant2 })
        throw new Error('Invalid conversation participants - cannot message yourself')
      }
      
      const cacheKey = `conversations:${[participant1, participant2].sort().join('-')}`
      const conversation = await getCachedOrFetch(cacheKey, async () => {
        const { data, error } = await supabase
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
        invalidateCache('conversations:')
        invalidateCache('messages:')
        return newConversation
      }, 30 * 1000)
      return conversation
    } catch (error) {
      return this._handleError('getOrCreateConversation', error)
    }
  }

  async getConversations(userId) {
    try {
      // Check authentication first
      const currentUser = await this._getCurrentUser()
      if (!currentUser) {
        console.warn('⚠️ getConversations: No authenticated user')
        return []
      }

      this._validateId(userId, 'User ID')
      const cacheKey = `conversations:${userId}`
      return await getCachedOrFetch(cacheKey, async () => {
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
          .order('last_message_at', { ascending: false })

        if (error) {
          // Handle authentication errors gracefully
          if (error.message?.includes('JWT') || error.code === '401') {
            console.warn('⚠️ getConversations: Authentication required')
            return []
          }
          throw error
        }
        
        const conversations = await Promise.all((data || []).map(async (conv) => {
          const otherParticipantId = conv.participant_1 === userId ? conv.participant_2 : conv.participant_1
          const { data: otherUser } = await supabase
            .from('users')
            .select('id, name, profile_image')
            .eq('id', otherParticipantId)
            .single()
          
          return {
            ...conv,
            otherParticipant: otherUser || { id: otherParticipantId, name: 'User', profile_image: null }
          }
        }))
        
        return conversations
      }, 30 * 1000)
    } catch (error) {
      console.warn('getConversations error:', error.message)
      return []
    }
  }

  async uploadAttachment({ conversationId, fileName, mimeType, size, base64 }) {
    try {
      await this._ensureAuthenticated()
      this._validateId(conversationId, 'Conversation ID')

      validateUpload({
        size,
        mimeType,
        fileName,
        ...ATTACHMENT_VALIDATION_DEFAULTS,
      })

      const { data, error } = await supabase.functions.invoke('upload-message-attachment', {
        body: {
          conversationId,
          fileName,
          mimeType,
          size,
          base64,
        },
      })

      if (error) throw error
      if (!data?.success) {
        throw new Error(data?.error || 'Attachment upload failed.')
      }

      return data.attachment
    } catch (error) {
      return this._handleError('uploadAttachment', error)
    }
  }

  async sendMessage(conversationId, senderId, content, attachment = null) {
    try {
      // Check authentication first
      const currentUser = await this._getCurrentUser()
      if (!currentUser) {
        console.warn('⚠️ sendMessage: No authenticated user')
        throw new Error('Authentication required to send messages')
      }

      // Get current user if senderId is missing
      if (!senderId || senderId === 'undefined' || senderId === 'null') {
        senderId = currentUser.id
        console.log('🔄 Using current auth user as sender:', senderId)
      }
      
      // Handle different conversation ID formats
      if (typeof conversationId === 'object' && conversationId !== null) {
        if (conversationId.id) {
          conversationId = conversationId.id
        } else {
          throw new Error('Invalid conversation object - missing id property')
        }
      } else if (typeof conversationId === 'string' && conversationId.includes('_')) {
        const [participant1, participant2] = conversationId.split('_')
        const conversation = await this.getOrCreateConversation(participant1, participant2)
        conversationId = conversation.id
      } else if (!conversationId) {
        throw new Error('Conversation ID is required')
      }
      
      this._validateId(conversationId, 'Conversation ID')
      this._validateId(senderId, 'Sender ID')
      
      if (!attachment && !content?.trim()) {
        throw new Error('Message content or attachment is required')
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

      const insertPayload = {
        conversation_id: conversationId,
        sender_id: senderId,
        recipient_id: recipientId,
        content: content?.trim() || '',
        created_at: new Date().toISOString(),
      }

      // Add attachment data if provided
      if (attachment) {
        insertPayload.attachment_url = attachment.signedUrl || null
        insertPayload.attachment_storage_path = attachment.storagePath || null
        insertPayload.attachment_name = attachment.fileName || null
        insertPayload.attachment_type = attachment.mimeType || null
        insertPayload.attachment_size = attachment.size || null
      }

      const { data, error } = await supabase
        .from('messages')
        .insert([insertPayload])
        .select()
        .single()

      if (error) throw error

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)

      invalidateCache('conversations:')
      invalidateCache(`messages:${conversationId}`)
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
      
      const cacheKey = `messages:${conversationId}:${limit}`
      return await getCachedOrFetch(cacheKey, async () => {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(limit)

        if (error) throw error
        return data || []
      }, 15 * 1000)
    } catch (error) {
      return this._handleError('getMessages', error)
    }
  }

  async markMessagesAsRead(conversationId, userId) {
    try {
      // Get current user if userId is missing
      if (!userId || userId === 'undefined' || userId === 'null') {
        const currentUser = await this._getCurrentUser()
        if (!currentUser?.id) {
          console.warn('No authenticated user for markMessagesAsRead')
          return { success: false }
        }
        userId = currentUser.id
      }
      
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

      invalidateCache(`messages:${conversationId}`)
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

  getAttachmentUrl(message) {
    if (!message?.attachment_storage_path) return null
    return message.attachment_url ?? null
  }
}

export const messagingService = new MessagingService()
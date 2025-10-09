import { supabaseService } from './supabaseService'

class MessagingService {
  async startConversation(participant1, participant2) {
    return await supabaseService.startConversation(participant1, participant2)
  }

  async getOrCreateConversation(participant1, participant2) {
    return await supabaseService.getOrCreateConversation(participant1, participant2)
  }

  async getConversations(userId) {
    return await supabaseService.getConversations(userId)
  }

  async sendMessage(conversationId, senderId, content) {
    return await supabaseService.sendMessage(conversationId, senderId, content)
  }

  async getMessages(conversationId, limit = 50) {
    return await supabaseService.getMessages(conversationId, limit)
  }

  async markMessagesAsRead(conversationId, userId) {
    return await supabaseService.markMessagesAsRead(conversationId, userId)
  }

  subscribeToMessages(conversationId, callback) {
    return supabaseService.subscribeToMessages(conversationId, callback)
  }
}

export default new MessagingService()
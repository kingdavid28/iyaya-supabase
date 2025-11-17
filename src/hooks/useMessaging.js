import { useState, useEffect } from 'react';
import supabaseService from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

export const useMessaging = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    loadConversations();
  }, [user?.id]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const conversationsData = await supabaseService.getConversations(user.id);
      
      // Transform conversations for display
      const transformedConversations = conversationsData.map(conv => {
        const otherParticipant = conv.participant_1 === user.id ? conv.participant2 : conv.participant1;
        return {
          id: conv.id,
          participantId: otherParticipant?.id,
          participantName: otherParticipant?.name || 'User',
          participantAvatar: otherParticipant?.profile_image,
          lastMessageTime: conv.last_message_at,
          // Will be populated with actual last message
          lastMessage: 'Tap to view messages'
        };
      });
      
      setConversations(transformedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const getOrCreateConversation = async (targetUserId) => {
    try {
      const conversation = await supabaseService.getOrCreateConversation(user.id, targetUserId);
      return conversation;
    } catch (error) {
      console.error('Error getting/creating conversation:', error);
      return null;
    }
  };

  const sendMessage = async (conversationId, content) => {
    try {
      const message = await supabaseService.sendMessage(conversationId, user.id, content);
      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  };

  const getMessages = async (conversationId, limit = 50) => {
    try {
      const messages = await supabaseService.getMessages(conversationId, limit);
      return messages;
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  };

  const markMessagesAsRead = async (conversationId) => {
    try {
      await supabaseService.markMessagesAsRead(conversationId, user.id);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const subscribeToMessages = (conversationId, callback) => {
    return supabaseService.subscribeToMessages(conversationId, callback);
  };

  return {
    conversations,
    loading,
    loadConversations,
    getOrCreateConversation,
    sendMessage,
    getMessages,
    markMessagesAsRead,
    subscribeToMessages
  };
};

export default useMessaging;
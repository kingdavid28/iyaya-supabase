import { supabase } from '../config/supabase';
import { Platform } from 'react-native';

const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
  QUEUED: 'queued'
};

// Helper function to get user-friendly status text
function getStatusText(status) {
  switch (status) {
    case MESSAGE_STATUS.SENDING:
      return 'Sending...';
    case MESSAGE_STATUS.SENT:
      return 'Sent';
    case MESSAGE_STATUS.DELIVERED:
      return 'Delivered';
    case MESSAGE_STATUS.READ:
      return 'Read';
    case MESSAGE_STATUS.FAILED:
      return 'Failed to send';
    case MESSAGE_STATUS.QUEUED:
      return 'Sending...';
    default:
      return 'Unknown';
  }
}

class SupabaseMessagingService {
  // Create connection using Supabase
  async createConnection(userId, caregiverId) {
    try {
      console.log('🔗 Creating Supabase connection between:', { userId, caregiverId });

      // Check if conversation already exists
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_1.eq.${userId},participant_2.eq.${caregiverId}),and(participant_1.eq.${caregiverId},participant_2.eq.${userId})`)
        .single();

      if (existingConversation) {
        console.log('✅ Connection already exists');
        return true;
      }

      // Create new conversation
      const { error } = await supabase
        .from('conversations')
        .insert({
          participant_1: userId,
          participant_2: caregiverId
        });

      if (error) throw error;

      console.log('✅ Supabase connection created successfully');
      return true;
    } catch (error) {
      console.error('❌ Error creating Supabase connection:', error);
      return false;
    }
  }

  // Send message using Supabase
  async sendMessage(userId, caregiverId, messageText, messageType = 'text', fileData = null, conversationId = null) {
    if ((!messageText?.trim() && !fileData) || !userId || !caregiverId) {
      throw new Error('Invalid message data');
    }

    try {
      console.log('📨 Sending Supabase message:', { userId, caregiverId, messageText });

      // Ensure connection exists
      await this.createConnection(userId, caregiverId);

      // Get or create conversation
      let { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_1.eq.${userId},participant_2.eq.${caregiverId}),and(participant_1.eq.${caregiverId},participant_2.eq.${userId})`)
        .single();

      if (!conversation) {
        const { data: newConversation, error } = await supabase
          .from('conversations')
          .insert({ participant_1: userId, participant_2: caregiverId })
          .select('id')
          .single();
        
        if (error) throw error;
        conversation = newConversation;
      }

      // Insert message
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: userId,
          recipient_id: caregiverId,
          content: messageText?.trim() || '',
          message_type: messageType
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation last message time
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation.id);

      console.log('✅ Supabase message sent successfully');
      return message;
    } catch (error) {
      console.error('❌ Error sending Supabase message:', error);
      throw error;
    }
  }

  // Get conversations using Supabase
  getConversations(userId, callback, userType = 'parent') {
    if (!userId) return () => {};

    console.log('📨 Setting up Supabase conversations listener for user:', userId, 'userType:', userType);

    const fetchConversations = async () => {
      try {
        const { data: conversations, error } = await supabase
          .from('conversations')
          .select(`
            id,
            participant_1,
            participant_2,
            last_message_at,
            messages!inner(
              content,
              created_at,
              sender_id
            )
          `)
          .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
          .order('last_message_at', { ascending: false });

        if (error) throw error;

        const formattedConversations = conversations.map(conv => {
          const otherParticipant = conv.participant_1 === userId ? conv.participant_2 : conv.participant_1;
          const lastMessage = conv.messages?.[0];
          
          if (userType === 'caregiver') {
            return {
              id: otherParticipant,
              parentId: otherParticipant,
              parentName: 'Parent',
              parentAvatar: null,
              lastMessage: lastMessage?.content || 'No messages yet',
              lastMessageTime: new Date(conv.last_message_at).getTime(),
              isRead: lastMessage?.sender_id === userId,
              conversationId: conv.id
            };
          } else {
            return {
              id: otherParticipant,
              caregiverId: otherParticipant,
              caregiverName: 'Caregiver',
              caregiverAvatar: null,
              lastMessage: lastMessage?.content || 'No messages yet',
              lastMessageTime: new Date(conv.last_message_at).getTime(),
              isRead: lastMessage?.sender_id === userId,
              conversationId: conv.id
            };
          }
        });

        callback(formattedConversations);
      } catch (error) {
        console.error('❌ Error fetching Supabase conversations:', error);
        callback([]);
      }
    };

    // Initial fetch
    fetchConversations();

    // Set up real-time subscription
    const subscription = supabase
      .channel('conversations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `participant_1=eq.${userId},participant_2=eq.${userId}`
      }, fetchConversations)
      .subscribe();

    return () => {
      console.log('📨 Cleaning up Supabase conversations subscription');
      subscription.unsubscribe();
    };
  }

  // Get conversation data using Supabase
  async getConversationData(userId, connectionId, userType = 'parent') {
    try {
      console.log('📨 Getting Supabase conversation data for:', { userId, connectionId, userType });

      // Get conversation and latest message
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select(`
          id,
          participant_1,
          participant_2,
          last_message_at,
          messages(
            content,
            created_at,
            sender_id
          )
        `)
        .or(`and(participant_1.eq.${userId},participant_2.eq.${connectionId}),and(participant_1.eq.${connectionId},participant_2.eq.${userId})`)
        .order('messages(created_at)', { ascending: false })
        .limit(1, { foreignTable: 'messages' })
        .single();

      if (error) throw error;

      const lastMessage = conversation.messages?.[0];

      // Get user info
      const { data: userData } = await supabase
        .from('users')
        .select('name, profile_image')
        .eq('id', connectionId)
        .single();

      if (userType === 'caregiver') {
        return {
          id: connectionId,
          parentId: connectionId,
          parentName: userData?.name || 'Parent',
          parentAvatar: userData?.profile_image || null,
          lastMessage: lastMessage?.content || 'No messages yet',
          lastMessageTime: new Date(conversation.last_message_at).getTime(),
          isRead: lastMessage?.sender_id === userId,
          conversationId: conversation.id
        };
      } else {
        return {
          id: connectionId,
          caregiverId: connectionId,
          caregiverName: userData?.name || 'Caregiver',
          caregiverAvatar: userData?.profile_image || null,
          lastMessage: lastMessage?.content || 'No messages yet',
          lastMessageTime: new Date(conversation.last_message_at).getTime(),
          isRead: lastMessage?.sender_id === userId,
          conversationId: conversation.id
        };
      }
    } catch (error) {
      console.error('Error getting Supabase conversation data:', error);
      return null;
    }
  }

  // Get messages using Supabase
  getMessages(userId, caregiverId, callback, conversationId = null) {
    if (!userId || !caregiverId) return () => {};

    console.log('📨 Getting Supabase messages for:', { userId, caregiverId });

    const fetchMessages = async () => {
      try {
        // Get conversation ID
        let convId = conversationId;
        if (!convId) {
          const { data: conversation } = await supabase
            .from('conversations')
            .select('id')
            .or(`and(participant_1.eq.${userId},participant_2.eq.${caregiverId}),and(participant_1.eq.${caregiverId},participant_2.eq.${userId})`)
            .single();
          
          if (!conversation) {
            callback([]);
            return;
          }
          convId = conversation.id;
        }

        // Get messages
        const { data: messages, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const formattedMessages = messages.map(message => ({
          id: message.id,
          text: message.content,
          senderId: message.sender_id,
          timestamp: new Date(message.created_at).getTime(),
          status: MESSAGE_STATUS.SENT,
          type: message.message_type || 'text',
          read: !!message.read_at,
          isCurrentUser: message.sender_id === userId,
          statusText: getStatusText(MESSAGE_STATUS.SENT)
        }));

        callback(formattedMessages);
      } catch (error) {
        console.error('❌ Error fetching Supabase messages:', error);
        callback([]);
      }
    };

    // Initial fetch
    fetchMessages();

    // Set up real-time subscription
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages'
      }, fetchMessages)
      .subscribe();

    return () => {
      console.log('📨 Cleaning up Supabase messages subscription');
      subscription.unsubscribe();
    };
  }

  // Mark messages as read using Supabase
  async markMessagesAsRead(userId, caregiverId, conversationId = null) {
    if (!userId || !caregiverId) return;

    try {
      console.log('👁️ Marking Supabase messages as read');

      // Get conversation ID if not provided
      let convId = conversationId;
      if (!convId) {
        const { data: conversation } = await supabase
          .from('conversations')
          .select('id')
          .or(`and(participant_1.eq.${userId},participant_2.eq.${caregiverId}),and(participant_1.eq.${caregiverId},participant_2.eq.${userId})`)
          .single();
        
        if (!conversation) return;
        convId = conversation.id;
      }

      // Mark unread messages as read
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', convId)
        .neq('sender_id', userId)
        .is('read_at', null);

      if (error) throw error;

      console.log('✅ Messages marked as read successfully');
    } catch (error) {
      console.error('❌ Error marking Supabase messages as read:', error);
    }
  }
}

export default new SupabaseMessagingService();
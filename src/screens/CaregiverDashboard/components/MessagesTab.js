import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'react-native-paper';
import { useAuth } from '../../../contexts/AuthContext';
import supabaseService from '../../../services/supabaseService';
import { styles } from '../../styles/CaregiverDashboard.styles';

const MessagesTab = ({ navigation, refreshing, onRefresh }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userIdToUse = user?.id || user?.uid;
    if (!userIdToUse) {
      console.log('❌ MessagesTab: No user ID available:', { user });
      return;
    }

    console.log('🔍 MessagesTab: Fetching conversations for caregiver:', userIdToUse);

    const loadConversations = async () => {
      try {
        setLoading(true);
        const conversations = await supabaseService.getConversations(userIdToUse);
        console.log('📨 MessagesTab: Received conversations:', conversations);
        
        // Transform conversations for display
        const transformedConversations = conversations.map(conv => {
          const otherParticipant = conv.participant_1 === userIdToUse ? conv.participant2 : conv.participant1;
          return {
            id: conv.id,
            parentId: otherParticipant?.id,
            parentName: otherParticipant?.name || 'Parent',
            parentAvatar: otherParticipant?.profile_image,
            lastMessage: 'Tap to view messages',
            lastMessageTime: conv.last_message_at,
            isRead: true // Will be updated with actual read status
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

    loadConversations();
    
    // Setup real-time subscription
    const subscription = supabaseService.subscribeToMessages('*', () => {
      loadConversations();
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [user?.id, user?.uid]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const handleConversationPress = async (conversation) => {
    console.log(' MessagesTab: handleConversationPress called with:', {
      user: user,
      userId: user?.id || user?.uid,
      conversation: conversation
    });

    // Mark messages as read when opening conversation
    const userIdToUse = user?.id || user?.uid;
    if (userIdToUse && conversation.id) {
      console.log('👁️ Marking messages as read for conversation:', conversation.id);
      await supabaseService.markMessagesAsRead(conversation.id, userIdToUse);
    }

    navigation.navigate('Chat', {
      userId: userIdToUse,
      userType: 'caregiver',
      targetUserId: conversation.parentId,
      targetUserName: conversation.parentName,
      targetUserType: 'parent'
    });
  };

  const renderConversationItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleConversationPress(item)}>
      <View style={messageStyles.conversationItem}>
        <View style={messageStyles.conversationContent}>
          <View style={messageStyles.avatarContainer}>
            {item.parentAvatar ? (
              <Image
                source={{ uri: item.parentAvatar }}
                style={messageStyles.avatar}
              />
            ) : (
              <View style={messageStyles.defaultAvatar}>
                <Ionicons name="person" size={24} color="#5bbafa" />
              </View>
            )}
            {!item.isRead && <View style={messageStyles.unreadDot} />}
          </View>

          <View style={messageStyles.messageInfo}>
            <View style={messageStyles.messageHeader}>
              <Text style={messageStyles.parentName}>{item.parentName || 'Parent'}</Text>
              <Text style={messageStyles.messageTime}>
                {formatTime(item.lastMessageTime)}
              </Text>
            </View>
            <Text
              style={[
                messageStyles.lastMessage,
                !item.isRead && messageStyles.unreadMessage
              ]}
              numberOfLines={1}
            >
              {item.lastMessage}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color="#9CA3AF"
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Card style={messageStyles.conversationsCard}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        </Card>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Card style={messageStyles.conversationsCard}>
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#5bbafa']}
              tintColor="#5bbafa"
            />
          }
          ListEmptyComponent={
            <View style={messageStyles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
              <Text style={messageStyles.emptyTitle}>No conversations yet</Text>
              <Text style={messageStyles.emptySubtitle}>
                Start messaging parents to see conversations here
              </Text>
            </View>
          }
          contentContainerStyle={conversations.length === 0 ? { flex: 1 } : null}
          showsVerticalScrollIndicator={false}
        />
      </Card>
    </KeyboardAvoidingView>
  );
};

const messageStyles = {
  conversationsCard: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
  },
  conversationItem: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  defaultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#5bbafa',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  messageInfo: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  parentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  messageTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6B7280',
  },
  unreadMessage: {
    fontWeight: '500',
    color: '#374151',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
};

export default MessagesTab;

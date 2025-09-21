import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'react-native-paper';
import { useAuth } from '../../../contexts/AuthContext';
import firebaseMessagingService from '../../../services/firebaseMessagingService';
import { styles } from '../../styles/ParentDashboard.styles';

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

    console.log('🔍 MessagesTab: Fetching conversations for user:', userIdToUse);

    setLoading(true);
    const unsubscribe = firebaseMessagingService.getConversations(userIdToUse, (conversations) => {
      console.log('📨 MessagesTab: Received conversations:', conversations);
      setConversations(conversations);
      setLoading(false);
    });

    return () => unsubscribe();
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

    // Mark messages as read when opening conversation using consistent conversation ID
    const userIdToUse = user?.id || user?.uid;
    if (userIdToUse && conversation.caregiverId) {
      // Create consistent conversation ID
      const [id1, id2] = [userIdToUse, conversation.caregiverId].sort();
      const conversationId = `${id1}_${id2}`;

      console.log('👁️ Marking messages as read with conversation ID:', conversationId);
      await firebaseMessagingService.markMessagesAsRead(userIdToUse, conversation.caregiverId, conversationId);
    }

    navigation.navigate('Chat', {
      userId: userIdToUse,
      userType: 'parent',
      targetUserId: conversation.caregiverId,
      targetUserName: conversation.caregiverName,
      targetUserType: 'caregiver'
    });
  };

  const renderConversationItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleConversationPress(item)}>
      <View style={messageStyles.conversationItem}>
        <View style={messageStyles.conversationContent}>
          <View style={messageStyles.avatarContainer}>
            {item.caregiverAvatar ? (
              <Image 
                source={{ uri: item.caregiverAvatar }} 
                style={messageStyles.avatar}
              />
            ) : (
              <View style={messageStyles.defaultAvatar}>
                <Ionicons name="person" size={24} color="#db2777" />
              </View>
            )}
            {!item.isRead && <View style={messageStyles.unreadDot} />}
          </View>
          
          <View style={messageStyles.messageInfo}>
            <View style={messageStyles.messageHeader}>
              <Text style={messageStyles.caregiverName}>{item.caregiverName}</Text>
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
            <Text style={styles.loadingText}>Loading messages...</Text>
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
              colors={['#db2777']}
              tintColor="#db2777"
            />
          }
          ListEmptyComponent={
            <View style={messageStyles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
              <Text style={messageStyles.emptyTitle}>No conversations yet</Text>
              <Text style={messageStyles.emptySubtitle}>
                Start messaging caregivers to see conversations here
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
    backgroundColor: '#db2777',
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
  caregiverName: {
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
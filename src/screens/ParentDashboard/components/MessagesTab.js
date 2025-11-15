import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useAuth } from '../../../contexts/AuthContext';
import { supabaseService } from '../../../services/supabase';

const MessagesTab = ({ navigation, refreshing, onRefresh }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    loadConversations();

    // Setup real-time subscription for new conversations
    const subscription = supabaseService.messaging.subscribeToMessages('*', (payload) => {
      if (payload.eventType === 'INSERT') {
        loadConversations();
      }
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user?.id]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const userId = user?.id;
      if (!userId) return;

      const conversations = await supabaseService.messaging.getConversations(userId);

      // Transform conversations for display
      const transformedConversations = conversations.map(conv => {
        const otherUser = conv.otherParticipant;
        return {
          id: conv.id,
          name: otherUser?.name || 'User',
          lastMessage: 'Tap to view messages',
          timestamp: conv.last_message_at,
          avatar: otherUser?.profile_image,
          participantId: otherUser?.id
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

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    }
    await loadConversations();
  };

  const handleDeleteConversation = async (conversationId) => {
    try {
      await supabaseService.messaging.deleteConversation(conversationId);
      setConversations((prev) => prev.filter((conv) => conv.id !== conversationId));
    } catch (error) {
      console.error('Error deleting conversation:', error);
      Alert.alert('Error', 'Failed to delete conversation. Please try again.');
    }
  };

  const confirmDeleteConversation = (item) => {
    Alert.alert(
      'Delete conversation',
      'This will remove this conversation from your inbox. Messages may still be visible to the other user.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteConversation(item.id)
        }
      ]
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubble-ellipses-outline" size={64} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptySubtitle}>
        Messages from families and caregivers will appear here
      </Text>
    </View>
  );

  const handleConversationPress = (item) => {
    navigation.navigate('Chat', {
      userId: user?.id,
      userType: 'parent',
      targetUserId: item.participantId,
      targetUserName: item.name,
      targetUserType: 'caregiver',
      targetUserAvatar: item.avatar,
      recipientAvatar: item.avatar,
      conversationId: item.id,
    });
  };

  const ConversationItem = ({ item }) => {
    const renderRightActions = () => (
      <View style={styles.swipeActionsContainer}>
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={() => confirmDeleteConversation(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
          <Text style={styles.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );

    return (
      <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
        <TouchableOpacity style={styles.conversationItem} onPress={() => handleConversationPress(item)}>
          <View style={styles.avatar}>
            {item.avatar ? (
              <Image source={{ uri: item.avatar }} style={{ width: 40, height: 40, borderRadius: 20 }} />
            ) : (
              <Ionicons name="person-circle" size={40} color="#3B82F6" />
            )}
          </View>
          <View style={styles.conversationInfo}>
            <Text style={styles.conversationName}>{item.name || 'User'}</Text>
            <Text style={styles.lastMessage}>
              {item.lastMessage || 'No messages yet'}
            </Text>
          </View>
          <Text style={styles.timestamp}>
            {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : ''}
          </Text>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={({ item }) => <ConversationItem item={item} />}
        keyExtractor={(item, index) => index.toString()}
        refreshing={refreshing || loading}
        onRefresh={handleRefresh}
        ListEmptyComponent={EmptyState}
        contentContainerStyle={conversations.length === 0 ? styles.emptyList : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  swipeActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 16,
  },
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
  },
  deleteActionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  avatar: {
    marginRight: 12,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

export default MessagesTab;

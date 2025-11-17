// ConversationList.jsx - React Native Paper conversation list component
import { Clock, MessageCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    FlatList,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    Avatar,
    Chip,
    Surface,
    Text
} from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { messagingService } from '../../services';
import { ConversationListSkeleton } from './MessagingSkeletons';

const ConversationList = ({ onSelectConversation, selectedConversation, navigation }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConversations = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const data = await messagingService.getConversations(user.id);
        
        // Transform Supabase conversations to match expected format
        const transformedConversations = data.map(conv => {
          const otherParticipant = conv.participant_1 === user.id 
            ? conv.participant2 
            : conv.participant1;
          
          return {
            id: conv.id,
            otherUserId: otherParticipant?.id,
            recipientName: otherParticipant?.name || 'Unknown User',
            recipientAvatar: otherParticipant?.profile_image,
            recipientRole: otherParticipant?.role || 'user',
            lastMessage: 'Start a conversation',
            lastActivity: conv.last_message_at || conv.created_at,
            unreadCount: 0 // Can be implemented later
          };
        });

        setConversations(transformedConversations);
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [user?.id]);

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const now = new Date();
    const diff = now - new Date(timestamp);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}m ago`;
    }
  };

  const handleConversationPress = (conversation) => {
    if (onSelectConversation) {
      onSelectConversation(conversation);
    } else if (navigation) {
      navigation.navigate('Chat', {
        conversationId: conversation.id,
        recipientId: conversation.otherUserId,
        recipientName: conversation.recipientName,
        recipientAvatar: conversation.recipientAvatar,
        targetUserId: conversation.otherUserId,
        targetUserName: conversation.recipientName,
        targetUserAvatar: conversation.recipientAvatar,
      });
    }
  };

  const renderConversation = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleConversationPress(item)}
      style={[
        styles.conversationItem,
        selectedConversation?.id === item.id && styles.selectedConversation
      ]}
    >
      <Surface style={styles.conversationCard} elevation={selectedConversation?.id === item.id ? 4 : 1}>
        <View style={styles.conversationContent}>
          <Avatar.Image
            size={50}
            source={item.recipientAvatar ? { uri: item.recipientAvatar } : null}
            style={styles.avatar}
          />
          <View style={styles.conversationInfo}>
            <View style={styles.conversationHeader}>
              <Text variant="titleMedium" style={styles.recipientName}>
                {item.recipientName}
              </Text>
              <Text variant="caption" style={styles.timestamp}>
                {formatTime(item.lastActivity)}
              </Text>
            </View>

            <View style={styles.conversationMeta}>
              <Text variant="bodySmall" style={styles.lastMessage}>
                {item.lastMessage || 'No messages yet'}
              </Text>

              <View style={styles.conversationActions}>
                {item.unreadCount > 0 && (
                  <Chip
                    compact
                    style={styles.unreadBadge}
                    textStyle={styles.unreadText}
                  >
                    {item.unreadCount}
                  </Chip>
                )}

                <View style={styles.statusContainer}>
                  <Clock size={12} color="#666" />
                  <Text variant="caption" style={styles.statusText}>
                    {item.recipientRole === 'caregiver' ? 'Caregiver' : 'Parent'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Surface>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MessageCircle size={64} color="#ccc" />
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        No conversations yet
      </Text>
      <Text variant="bodyMedium" style={styles.emptySubtitle}>
        Start a conversation with a {user?.role === 'parent' ? 'caregiver' : 'parent'}
      </Text>
    </View>
  );

  if (loading) {
    return <ConversationListSkeleton />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.title}>
          Conversations
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
        </Text>
      </View>

      {conversations.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    color: '#666',
  },
  listContainer: {
    padding: 8,
  },
  conversationItem: {
    marginVertical: 4,
  },
  conversationCard: {
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  selectedConversation: {
    backgroundColor: '#e3f2fd',
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    marginRight: 16,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recipientName: {
    fontWeight: '600',
    flex: 1,
  },
  timestamp: {
    color: '#666',
    fontSize: 12,
  },
  conversationMeta: {
    flexDirection: 'column',
  },
  lastMessage: {
    color: '#666',
    marginBottom: 8,
    flex: 1,
  },
  conversationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    minWidth: 24,
    height: 24,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    color: '#666',
    marginLeft: 4,
    fontSize: 11,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    color: '#666',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default ConversationList;

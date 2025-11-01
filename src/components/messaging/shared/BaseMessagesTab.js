import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { supabaseService } from '../../../services/supabase';
import { sanitizeImageUri } from '../../../utils';

const getValidImageUri = (uri) => {
  if (typeof uri !== 'string') return null;
  const trimmed = uri.trim();
  if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
    return null;
  }
  return trimmed;
};

// Base MessagesTab component with common functionality
const BaseMessagesTab = ({
  navigation,
  refreshing,
  onRefresh,
  userRole,
  emptyStateIcon = 'chatbubble-ellipses-outline',
  emptyStateTitle = 'No conversations yet',
  emptyStateSubtitle = 'Messages will appear here',
  showUnreadBadge = true,
  maxAvatarSize = 40,
  customStyles = {},
}) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Set current user in messaging service
  useEffect(() => {
    if (user?.id) {
      console.log('Setting current user for messaging:', user.id);
    }
  }, [user]);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      if (!user?.id) {
        setConversations([]);
        return;
      }
      const data = await supabaseService.getConversations(user.id);

      const transformedData = data.map((conv) => {
        const otherParticipantId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
        const otherUser = conv.otherParticipant || {};
        const participantAvatar = sanitizeImageUri(otherUser.profile_image);

        return {
          id: conv.id,
          participantId: otherParticipantId,
          participantName: otherUser.name || 'User',
          participantAvatar,
          lastMessage: conv.last_message_preview || 'Start a conversation',
          lastMessageTime: conv.last_message_at,
          unreadCount: conv.unread_count || 0,
        };
      });

      setConversations(transformedData);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadConversations();

    // Set up real-time listener for conversations
    let subscription;
    if (user?.id) {
      subscription = supabaseService.subscribeToMessages(user.id, () => {
        loadConversations();
      });
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [loadConversations, user?.id]);

  const handleRefresh = useCallback(async () => {
    await loadConversations();
    if (onRefresh) onRefresh();
  }, [loadConversations, onRefresh]);

  const formatTime = (timestamp) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diff = now - messageTime;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else {
      return 'Just now';
    }
  };

  // Role-specific conversation opening logic
  const openConversation = (conversation) => {
    if (!conversation) return;

    navigation.navigate('Chat', {
      conversationId: conversation.id,
      recipientId: conversation.participantId,
      recipientName: conversation.participantName,
      recipientAvatar: conversation.participantAvatar,
      targetUserId: conversation.participantId,
      targetUserName: conversation.participantName,
      targetUserAvatar: conversation.participantAvatar,
      userRole,
    });
  };

  // Role-specific avatar rendering
  const renderAvatar = (item) => {
    if (item.participantAvatar) {
      return (
        <Image
          source={{ uri: item.participantAvatar }}
          style={[styles.avatarImage, { width: maxAvatarSize, height: maxAvatarSize }]}
        />
      );
    }

    // Role-specific default avatars
    if (userRole === 'parent') {
      return <Ionicons name="person-circle" size={maxAvatarSize} color="#DB2777" />;
    } else if (userRole === 'caregiver') {
      return <Ionicons name="person-circle" size={maxAvatarSize} color="#3B82F6" />;
    }

    return <Ionicons name="person-circle" size={maxAvatarSize} color="#6B7280" />;
  };

  // Role-specific conversation rendering
  const renderConversation = ({ item }) => (
    <TouchableOpacity
      style={[styles.conversationItem, customStyles.conversationItem]}
      onPress={() => openConversation(item)}
    >
      <View style={[styles.avatar, customStyles.avatar]}>
        {renderAvatar(item)}
      </View>

      <View style={[styles.conversationContent, customStyles.conversationContent]}>
        <View style={[styles.conversationHeader, customStyles.conversationHeader]}>
          <Text style={[styles.recipientName, customStyles.recipientName]}>
            {item.participantName}
          </Text>
          <Text style={[styles.timestamp, customStyles.timestamp]}>
            {formatTime(item.lastMessageTime)}
          </Text>
        </View>

        <View style={[styles.messageRow, customStyles.messageRow]}>
          <Text style={[styles.lastMessage, customStyles.lastMessage]} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {showUnreadBadge && item.unreadCount > 0 && (
            <View style={[styles.unreadBadge, customStyles.unreadBadge]}>
              <Text style={[styles.unreadCount, customStyles.unreadCount]}>
                {item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Role-specific empty state
  const renderEmptyState = () => (
    <View style={[styles.emptyContainer, customStyles.emptyContainer]}>
      <Ionicons name={emptyStateIcon} size={64} color="#9CA3AF" />
      <Text style={[styles.emptyTitle, customStyles.emptyTitle]}>
        {emptyStateTitle}
      </Text>
      <Text style={[styles.emptySubtitle, customStyles.emptySubtitle]}>
        {emptyStateSubtitle}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, customStyles.container]}>
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        refreshing={refreshing || loading}
        onRefresh={handleRefresh}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          conversations.length === 0 ? styles.emptyList : undefined,
          customStyles.listContent
        ]}
      />
    </View>
  );
};

// Parent-specific MessagesTab component
export const ParentMessagesTab = ({ navigation, refreshing, onRefresh }) => {
  const parentCustomStyles = {
    container: {
      backgroundColor: '#FEF7F0', // Warm background for parents
    },
    conversationItem: {
      backgroundColor: '#FFFFFF',
      borderLeftWidth: 4,
      borderLeftColor: '#DB2777', // Pink accent for parents
    },
    recipientName: {
      color: '#7C2D12', // Darker text for better readability
    },
    avatar: {
      backgroundColor: '#FCE7F3', // Light pink background
    },
    unreadBadge: {
      backgroundColor: '#DB2777', // Pink for unread badges
    },
  };

  return (
    <BaseMessagesTab
      navigation={navigation}
      refreshing={refreshing}
      onRefresh={onRefresh}
      userRole="parent"
      emptyStateIcon="people-outline"
      emptyStateTitle="No conversations yet"
      emptyStateSubtitle="Reach out to caregivers to start conversations"
      showUnreadBadge={true}
      maxAvatarSize={40}
      customStyles={parentCustomStyles}
    />
  );
};

// Caregiver-specific MessagesTab component
export const CaregiverMessagesTab = ({ navigation, refreshing, onRefresh }) => {
  const caregiverCustomStyles = {
    container: {
      backgroundColor: '#EFF6FF', // Light blue background for caregivers
    },
    conversationItem: {
      backgroundColor: '#FFFFFF',
      borderLeftWidth: 4,
      borderLeftColor: '#3B82F6', // Blue accent for caregivers
    },
    recipientName: {
      color: '#1E3A8A', // Darker blue text
    },
    avatar: {
      backgroundColor: '#DBEAFE', // Light blue background
    },
    unreadBadge: {
      backgroundColor: '#3B82F6', // Blue for unread badges
    },
  };

  return (
    <BaseMessagesTab
      navigation={navigation}
      refreshing={refreshing}
      onRefresh={onRefresh}
      userRole="caregiver"
      emptyStateIcon="chatbubble-ellipses-outline"
      emptyStateTitle="No conversations yet"
      emptyStateSubtitle="Parents will reach out to you here"
      showUnreadBadge={true}
      maxAvatarSize={40}
      customStyles={caregiverCustomStyles}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    marginRight: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    borderRadius: 20,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    flex: 1,
  },
  unreadBadge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default BaseMessagesTab;

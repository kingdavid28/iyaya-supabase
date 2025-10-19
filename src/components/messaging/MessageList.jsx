// MessageList.jsx - React Native Paper message list component
import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { messagingService, realtimeService } from '../../services';
import MessageCard from './MessageCard';
import { MessageThreadSkeleton } from './MessagingSkeletons';

const MessageList = ({ conversation }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversation?.id) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      setLoading(true);
      try {
        const { data } = await messagingService.getMessages(conversation.id);
        setMessages(data.messages || []);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();

    // Subscribe to real-time message updates
    const subscription = realtimeService.subscribeToMessages(conversation.id, (payload) => {
      if (payload.eventType === 'INSERT') {
        setMessages(prev => [...prev, payload.new]);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [conversation?.id]);

  const renderMessage = ({ item }) => (
    <MessageCard
      message={item}
      isOwn={item.sender_id === user?.id}
      showAvatar={true}
      senderName={item.sender_id === user?.id ? 'You' : conversation?.recipientName}
      senderAvatar={item.sender_id === user?.id ? null : conversation?.recipientAvatar}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text variant="bodyLarge" style={styles.emptyText}>
        No messages yet. Start the conversation!
      </Text>
    </View>
  );

  const renderLoading = () => <MessageThreadSkeleton />;

  if (loading) {
    return renderLoading();
  }

  if (!conversation) {
    return (
      <View style={styles.noConversationContainer}>
        <Text variant="bodyLarge" style={styles.noConversationText}>
          Select a conversation to view messages
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={messages}
      keyExtractor={(item) => item.id || item.created_at}
      renderItem={renderMessage}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={renderEmpty}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  noConversationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noConversationText: {
    color: '#666',
    textAlign: 'center',
  },
});

export default MessageList;

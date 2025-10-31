import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { Avatar, Text } from 'react-native-paper';
import MessageCard from '../components/messaging/MessageCard';
import MessageInput from '../components/messaging/MessageInput';
import { useAuth } from '../contexts/AuthContext';
import { messagingService, realtimeService } from '../services';

const mapMessageRecord = (record) => ({
  id: record.id,
  senderId: record.sender_id,
  recipientId: record.recipient_id,
  text: record.content,
  timestamp: record.created_at,
  status: record.read_at ? 'read' : 'sent',
  type: record.attachment_url ? 'attachment' : 'text',
  attachmentUrl: record.attachment_url || null,
  attachmentName: record.attachment_name || null,
  attachmentType: record.attachment_type || null,
  attachmentSize: record.attachment_size || null,
});

const Chat = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params || {};

  const {
    conversationId: initialConversationId,
    recipientId,
    recipientName,
    recipientAvatar,
    targetUserId,
    targetUserName,
    targetUserAvatar,
    caregiverId,
    caregiverName,
    parentId,
    parentName,
    userId: routeUserId,
    otherUserId: routeOtherUserId,
    otherUserAvatar: routeOtherUserAvatar,
  } = params;

  const derivedOtherUserId = useMemo(
    () =>
      recipientId ??
      targetUserId ??
      routeOtherUserId ??
      caregiverId ??
      parentId ??
      null,
    [recipientId, targetUserId, routeOtherUserId, caregiverId, parentId],
  );

  const otherUserName =
    recipientName || targetUserName || caregiverName || parentName || 'User';
  const otherUserAvatar =
    recipientAvatar || targetUserAvatar || routeOtherUserAvatar || null;

  const currentUserId = user?.id || routeUserId || null;

  const [conversation, setConversation] = useState(() =>
    initialConversationId
      ? {
          id: initialConversationId,
          otherUserId: derivedOtherUserId,
          recipientName: otherUserName,
          recipientAvatar: otherUserAvatar,
        }
      : null,
  );
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const typingStateRef = useRef(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (initialConversationId || derivedOtherUserId) return;
    Alert.alert('Error', 'Conversation details were not provided.');
    navigation.goBack();
  }, [derivedOtherUserId, initialConversationId, navigation]);

  useEffect(() => {
    let isMounted = true;

    const ensureConversation = async () => {
      if (!currentUserId) {
        Alert.alert('Error', 'Authentication required to open chat.');
        navigation.goBack();
        return;
      }

      if (conversation?.id) {
        setConversation((prev) =>
          prev
            ? {
                ...prev,
                otherUserId: derivedOtherUserId ?? prev.otherUserId,
                recipientName: otherUserName || prev.recipientName,
                recipientAvatar: otherUserAvatar ?? prev.recipientAvatar,
              }
            : prev,
        );
        setLoading(false);
        return;
      }

      if (!initialConversationId && !derivedOtherUserId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let resolvedId = initialConversationId;
        if (!resolvedId) {
          const conversationRecord = await messagingService.getOrCreateConversation(
            currentUserId,
            derivedOtherUserId,
          );
          resolvedId = conversationRecord?.id;
        }

        if (!resolvedId) {
          throw new Error('Failed to open conversation.');
        }

        if (!isMounted) return;

        setConversation({
          id: resolvedId,
          otherUserId: derivedOtherUserId,
          recipientName: otherUserName,
          recipientAvatar: otherUserAvatar,
        });
      } catch (error) {
        console.error('Failed to initialize chat conversation:', error);
        if (isMounted) {
          Alert.alert('Error', error?.message || 'Failed to open chat.');
          navigation.goBack();
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    ensureConversation();
    return () => {
      isMounted = false;
    };
  }, [
    conversation?.id,
    currentUserId,
    derivedOtherUserId,
    initialConversationId,
    navigation,
    otherUserAvatar,
    otherUserName,
  ]);

  useEffect(() => {
    if (!conversation?.id) return;

    let isMounted = true;
    setLoading(true);

    const loadMessages = async () => {
      try {
        const records = await messagingService.getMessages(conversation.id);
        if (!isMounted) return;
        const mapped = (records || [])
          .map(mapMessageRecord)
          .sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
          );
        setMessages(mapped);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } catch (error) {
        console.error('Failed to load messages:', error);
        if (isMounted) Alert.alert('Error', 'Unable to load messages right now.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadMessages();

    const messageChannel = realtimeService.subscribeToMessages(
      conversation.id,
      (payload) => {
        if (payload.eventType !== 'INSERT') return;
        const nextMessage = mapMessageRecord(payload.new);
        setMessages((prev) => {
          if (prev.some((message) => message.id === nextMessage.id)) return prev;
          return [...prev, nextMessage].sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
          );
        });
      },
    );

    let detachTyping;
    if (currentUserId) {
      detachTyping = realtimeService.joinTypingChannel(
        conversation.id,
        currentUserId,
        (activeTypers) => {
          if (!isMounted) return;
          setTypingUsers(activeTypers.filter((id) => id !== currentUserId));
        },
      );
    }

    return () => {
      isMounted = false;
      messageChannel?.unsubscribe?.();
      detachTyping?.();
      if (currentUserId) {
        realtimeService.setTypingStatus(conversation.id, currentUserId, false);
      }
    };
  }, [conversation?.id, currentUserId]);

  const handleSendMessage = useCallback(
    async (messageText, attachment) => {
      if (sending || !conversation?.id) return;
      if (!currentUserId) {
        Alert.alert('Error', 'Authentication required to send messages.');
        return;
      }

      const content = messageText?.trim?.() || '';
      if (!content && !attachment) {
        return;
      }

      setSending(true);
      try {
        await messagingService.sendMessage(
          conversation.id,
          currentUserId,
          content,
          attachment,
        );
        typingStateRef.current = false;
        await realtimeService.setTypingStatus(
          conversation.id,
          currentUserId,
          false,
        );
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } catch (error) {
        console.error('Send message error:', error);
        Alert.alert('Error', error?.message || 'Failed to send message. Please try again.');
      } finally {
        setSending(false);
      }
    },
    [conversation?.id, currentUserId, sending],
  );

  const handleUploadAttachment = useCallback(
    async (payload) => {
      if (!conversation?.id) {
        Alert.alert('Error', 'Select a conversation before uploading attachments.');
        return null;
      }

      try {
        return await messagingService.uploadAttachment(payload);
      } catch (error) {
        console.error('Attachment upload error:', error);
        Alert.alert('Error', error?.message || 'Failed to upload attachment.');
        return null;
      }
    },
    [conversation?.id],
  );

  const handleTyping = useCallback(
    async (text) => {
      if (!conversation?.id || !currentUserId) return;

      const nextState = Boolean(text.trim());
      if (typingStateRef.current === nextState) return;

      typingStateRef.current = nextState;
      try {
        await realtimeService.setTypingStatus(
          conversation.id,
          currentUserId,
          nextState,
        );
      } catch (error) {
        console.warn('Typing status update failed:', error);
      }
    },
    [conversation?.id, currentUserId],
  );

  const typingMessage = useMemo(() => {
    if (!typingUsers.length) return null;
    const includesRecipient =
      derivedOtherUserId && typingUsers.includes(String(derivedOtherUserId));
    if (includesRecipient && otherUserName) {
      return `${otherUserName} is typing...`;
    }
    return 'Someone is typing...';
  }, [derivedOtherUserId, otherUserName, typingUsers]);

  if (loading && !messages.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  if (!conversation?.id) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No conversation selected.</Text>
      </View>
    );
  }

  const renderMessage = ({ item }) => (
    <MessageCard
      message={item}
      isOwn={item.senderId === currentUserId}
      showAvatar
      senderName={item.senderId === currentUserId ? 'You' : otherUserName}
      senderAvatar={item.senderId === currentUserId ? null : otherUserAvatar}
    />
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          {otherUserAvatar ? (
            <Avatar.Image size={40} source={{ uri: otherUserAvatar }} />
          ) : (
            <Avatar.Icon size={40} icon="account" />
          )}
          <View style={styles.headerText}>
            <Text variant="titleMedium" style={styles.recipientName} numberOfLines={1}>
              {otherUserName}
            </Text>
            <Text variant="bodySmall" style={styles.recipientStatus}>
              {typingMessage || 'Online'}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => item.id?.toString() || `message-${index}`}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {!!typingMessage && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>{typingMessage}</Text>
        </View>
      )}

      <MessageInput
        conversation={conversation}
        disabled={loading || sending}
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        onUploadAttachment={handleUploadAttachment}
        placeholder={`Message ${otherUserName}...`}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 26,
    marginBottom: 26,
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  recipientName: {
    fontWeight: '600',
  },
  recipientStatus: {
    color: '#4CAF50',
    marginTop: 2,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  typingText: {
    color: '#666',
    fontStyle: 'italic',
  },
});

export default Chat;
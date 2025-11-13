import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
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
import { sanitizeImageUri } from '../utils';

const getValidImageUri = (uri) => {
  if (typeof uri !== 'string') return null;
  const trimmed = uri.trim();
  if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
    return null;
  }
  return trimmed;
};

const mapMessageRecord = (record, currentUserId) => ({
  id: record.id,
  senderId: record.sender_id,
  recipientId: record.recipient_id,
  text: record.content,
  timestamp: record.created_at,
  status: record.read_at ? 'read' : 'sent',
  type: record.attachment_url ? 'attachment' : 'text',
  attachmentUrl: record.attachment_url ?? null,
  attachmentStoragePath: record.attachment_storage_path ?? null,
  attachmentName: record.attachment_name ?? null,
  attachmentType: record.attachment_type ?? null,
  attachmentSize: record.attachment_size ?? null,
  messageType: record.message_type ?? null,
  edited: !!record.edited_at,
  deleted: !!record.deleted_at,
  isMine: record.sender_id === (currentUserId || ''),
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
    otherUser, // Added for compatibility
  } = params;

  const derivedOtherUserId = useMemo(
    () =>
      recipientId ??
      targetUserId ??
      routeOtherUserId ??
      caregiverId ??
      parentId ??
      otherUser?.id ??
      null,
    [recipientId, targetUserId, routeOtherUserId, caregiverId, parentId, otherUser?.id],
  );

  const fallbackOtherUserName = useMemo(
    () =>
      recipientName ||
      targetUserName ||
      caregiverName ||
      parentName ||
      otherUser?.name ||
      'User',
    [recipientName, targetUserName, caregiverName, parentName, otherUser?.name]
  );

  const initialOtherUserAvatar = useMemo(
    () =>
      sanitizeImageUri(
        recipientAvatar ||
        targetUserAvatar ||
        routeOtherUserAvatar ||
        otherUser?.avatar ||
        otherUser?.profile_image,
      ),
    [recipientAvatar, targetUserAvatar, routeOtherUserAvatar, otherUser?.avatar, otherUser?.profile_image],
  );

  const currentUserId = user?.id || routeUserId || null;

  const [conversation, setConversation] = useState(() =>
    initialConversationId
      ? {
        id: initialConversationId,
        otherUserId: derivedOtherUserId,
        recipientName: fallbackOtherUserName,
        recipientAvatar: initialOtherUserAvatar,
      }
      : null,
  );
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [editingMessage, setEditingMessage] = useState(null);
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
              recipientName: fallbackOtherUserName || prev.recipientName,
              recipientAvatar: initialOtherUserAvatar ?? prev.recipientAvatar,
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
          recipientName: fallbackOtherUserName,
          recipientAvatar: initialOtherUserAvatar,
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
    fallbackOtherUserName,
    initialOtherUserAvatar,
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
          .map((record) => mapMessageRecord(record, currentUserId))
          .sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
          );
        setMessages(mapped);

        // Mark messages as read
        if (currentUserId) {
          await messagingService.markMessagesAsRead(conversation.id, currentUserId);
        }

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
        if (payload.eventType === 'INSERT') {
          const nextMessage = mapMessageRecord(payload.new, currentUserId);
          setMessages((prev) => {
            if (prev.some((message) => message.id === nextMessage.id)) return prev;
            const updated = [...prev, nextMessage].sort(
              (a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
            );
            return updated;
          });
        } else if (payload.eventType === 'UPDATE') {
          setMessages((prev) => {
            const updated = prev.map((msg) =>
              msg.id === payload.new.id
                ? mapMessageRecord(payload.new, currentUserId)
                : msg
            );
            return updated;
          });
        } else if (payload.eventType === 'DELETE') {
          setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
        }
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

  const confirmDelete = useCallback(
    (message) => {
      Alert.alert(
        'Delete message?',
        'This will remove the message for everyone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await messagingService.deleteMessage(message.id, currentUserId);
                setEditingMessage((current) => (current?.id === message.id ? null : current));
              } catch (error) {
                Alert.alert('Error', 'Failed to delete message');
              }
            },
          },
        ],
      );
    },
    [currentUserId],
  );

  const handleSendMessage = useCallback(
    async (messageText, attachment) => {
      if (!conversation?.id || sending) return;
      if (!currentUserId) {
        Alert.alert('Error', 'Authentication required to send messages.');
        return;
      }

      const content = messageText?.trim?.() || '';

      if (editingMessage) {
        if (!content) {
          Alert.alert('Empty message', 'Enter some text before saving.');
          return;
        }
        setSending(true);
        try {
          await messagingService.updateMessage(editingMessage.id, currentUserId, { content });
          setEditingMessage(null);
        } catch (error) {
          Alert.alert('Error', error?.message || 'Failed to update message.');
        } finally {
          setSending(false);
        }
        return;
      }

      if (!content && !attachment) {
        return;
      }

      setSending(true);
      try {
        const sentRecord = await messagingService.sendMessage(
          conversation.id,
          currentUserId,
          content,
          attachment,
        );

        if (sentRecord) {
          const mappedMessage = mapMessageRecord(sentRecord, currentUserId);
          setMessages((prev) => {
            if (prev.some((message) => message.id === mappedMessage.id)) {
              return prev;
            }
            const next = [...prev, mappedMessage].sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
            );
            return next;
          });
        }

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
    [conversation?.id, currentUserId, editingMessage, sending],
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

  const handleCancelEdit = useCallback(() => setEditingMessage(null), []);

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

  const handleLongPressMessage = useCallback(
    (message) => {
      if (message.senderId !== currentUserId || message.deleted) return;

      Alert.alert('Message Options', 'Choose an action', [
        { text: 'Edit', onPress: () => setEditingMessage(message) },
        { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(message) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [confirmDelete, currentUserId],
  );

  const handleRefreshAttachmentUrl = useCallback(
    async (targetMessage) => {
      if (!targetMessage?.attachmentStoragePath) {
        return targetMessage?.attachmentUrl ?? null;
      }

      try {
        const refreshedUrl = await messagingService.getAttachmentSignedUrl(
          targetMessage.attachmentStoragePath,
        );

        if (refreshedUrl) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === targetMessage.id ? { ...msg, attachmentUrl: refreshedUrl } : msg,
            ),
          );
          return refreshedUrl;
        }

        return targetMessage.attachmentUrl ?? null;
      } catch (error) {
        console.error('Failed to refresh attachment URL:', error);
        Alert.alert('Error', 'Unable to load attachment right now.');
        return null;
      }
    },
    [],
  );

  const typingMessage = useMemo(() => {
    if (!typingUsers.length) return null;
    const includesRecipient =
      derivedOtherUserId && typingUsers.includes(String(derivedOtherUserId));
    if (includesRecipient && fallbackOtherUserName) {
      return `${fallbackOtherUserName} is typing...`;
    }
    return 'Someone is typing...';
  }, [derivedOtherUserId, fallbackOtherUserName, typingUsers]);

  const renderMessage = ({ item }) => (
    <MessageCard
      message={item}
      isOwn={item.senderId === currentUserId}
      showAvatar={item.senderId !== currentUserId}
      senderName={item.senderId === currentUserId ? 'You' : fallbackOtherUserName}
      senderAvatar={item.senderId === currentUserId ? null : initialOtherUserAvatar}
      onLongPress={item.deleted ? undefined : () => handleLongPressMessage(item)}
      isEditing={editingMessage?.id === item.id}
      onRefreshAttachmentUrl={handleRefreshAttachmentUrl}
    />
  );

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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          {initialOtherUserAvatar ? (
            <Avatar.Image size={40} source={{ uri: initialOtherUserAvatar }} />
          ) : (
            <Avatar.Icon size={40} icon="account" style={styles.avatarIcon} />
          )}
          <View style={styles.headerText}>
            <Text variant="titleMedium" style={styles.recipientName} numberOfLines={1}>
              {fallbackOtherUserName}
            </Text>
            <Text variant="bodySmall" style={styles.recipientStatus}>
              {typingMessage || 'Online'}
            </Text>
          </View>
        </View>
      </LinearGradient>

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
        editingMessage={editingMessage}
        onCancelEdit={handleCancelEdit}
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        onUploadAttachment={handleUploadAttachment}
        placeholder={`Message ${fallbackOtherUserName}...`}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 38,
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
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
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
    color: 'white',
  },
  recipientStatus: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  avatarIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
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
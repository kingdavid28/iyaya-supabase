import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'react-native-paper';
import { messagingAPI, realtimeService } from '../services';
import { useAuth } from '../contexts/AuthContext';

// MessageItem component with simplified features
const MessageItem = ({ message, isCurrentUser, onEdit, onDelete, onLongPress }) => {
  const handleLongPress = () => {
    if (isCurrentUser && !message.deleted) {
      onLongPress && onLongPress(message);
    }
  };

  const renderFileContent = () => {
    // Simplified file content rendering
    if (!message.file) return null;

    if (message.file.type?.startsWith('image/')) {
      return (
        <Image
          source={{ uri: message.file.url || `data:${message.file.type};base64,${message.file.base64}` }}
          style={styles.messageImage}
          resizeMode="cover"
        />
      );
    }

    return (
      <View style={styles.fileContainer}>
        <Ionicons name="document" size={20} color="#666" />
        <Text style={styles.fileName}>{message.file.name}</Text>
      </View>
    );
  };

  const getStatusIcon = () => {
    if (!isCurrentUser) return null;

    switch (message.status) {
      case 'sent':
        return <Ionicons name="checkmark" size={12} color="#9CA3AF" />;
      case 'delivered':
        return <Ionicons name="checkmark-done" size={12} color="#9CA3AF" />;
      case 'read':
        return <Ionicons name="checkmark-done" size={12} color="#4CAF50" />;
      case 'queued':
        return <Ionicons name="time" size={12} color="#f59e0b" />;
      case 'failed':
        return <Ionicons name="alert-circle" size={12} color="#ef4444" />;
      default:
        return null;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.messageBubble,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
        message.deleted && styles.deletedMessage,
        message.status === 'queued' && styles.queuedMessage,
        message.status === 'failed' && styles.failedMessage
      ]}
      onLongPress={handleLongPress}
      delayLongPress={500}
    >
      {renderFileContent()}
      <Text style={[
        styles.messageText,
        isCurrentUser ? styles.currentUserMessageText : styles.otherUserMessageText,
        message.deleted && styles.deletedMessageText,
        message.status === 'queued' && styles.queuedMessageText,
        message.status === 'failed' && styles.failedMessageText
      ]}>
        {message.deleted ? 'This message was deleted' : message.text}
        {message.edited && !message.deleted && (
          <Text style={styles.editedIndicator}> (edited)</Text>
        )}
        {message.status === 'queued' && (
          <Text style={styles.statusText}> (sending...)</Text>
        )}
        {message.status === 'failed' && (
          <Text style={styles.statusText}> (failed to send)</Text>
        )}
      </Text>
      <View style={styles.messageFooter}>
        <Text style={styles.messageTime}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </Text>
        {getStatusIcon()}
      </View>
    </TouchableOpacity>
  );
};

// Unified ChatScreen component
const ChatScreen = ({ route }) => {
  const { userId: routeUserId, userType, targetUserId, targetUserName, targetUserType } = route.params;
  const { user } = useAuth();

  // Use route parameter first, then fallback to auth user ID
  const currentUserId = routeUserId || user?.id || user?.uid;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  // Create consistent conversation ID
  useEffect(() => {
    if (!currentUserId || !targetUserId) return;

    const [id1, id2] = [currentUserId, targetUserId].sort();
    const convId = `${id1}_${id2}`;
    setConversationId(convId);
  }, [currentUserId, targetUserId]);

  // Fetch messages and setup real-time subscription
  useEffect(() => {
    if (!currentUserId || !targetUserId || !conversationId) return;

    let subscription;

    const setupMessaging = async () => {
      try {
        // Get or create conversation
        const conversation = await messagingAPI.startConversation(targetUserId);
        const realConversationId = conversation.data?.id || conversationId;

        // Load existing messages
        const response = await messagingAPI.getMessages(realConversationId);
        setMessages(response.data?.messages || []);

        // Setup real-time subscription
        subscription = realtimeService.subscribeToMessages(realConversationId, (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages(prev => [payload.new, ...prev]);
          }
        });

        // Mark messages as read
        await messagingAPI.markAsRead(realConversationId);
      } catch (error) {
        console.error('Error setting up messaging:', error);
      }
    };

    setupMessaging();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [currentUserId, targetUserId, conversationId]);

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || !targetUserId) {
      return;
    }

    const messageText = newMessage.trim();
    setIsSending(true);

    try {
      await messagingAPI.sendMessage({
        recipientId: targetUserId,
        content: messageText
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Get theme colors based on user type
  const getThemeColors = () => {
    if (userType === 'parent') {
      return {
        primary: '#db2777', // Pink for parents
        secondary: '#5bbafa', // Blue accent
      };
    } else if (userType === 'caregiver') {
      return {
        primary: '#5bbafa', // Blue for caregivers
        secondary: '#db2777', // Pink accent
      };
    }
    return {
      primary: '#3b82f6', // Default blue
      secondary: '#6b7280', // Gray accent
    };
  };

  const themeColors = getThemeColors();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 120}
      enabled={true}
    >
      <Card style={styles.messagesCard}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatTitle}>{targetUserName}</Text>
        </View>

        <FlatList
          data={messages}
          renderItem={({ item }) => (
            <MessageItem
              message={item}
              isCurrentUser={item.senderId === currentUserId}
              onLongPress={() => {}}
            />
          )}
          keyExtractor={(item) => item.id}
          style={styles.list}
          inverted={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'flex-end',
            padding: 16,
          }}
        />
      </Card>

      <Card style={styles.inputCard}>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, { borderColor: isSending ? themeColors.primary : '#E5E7EB' }]}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type your message..."
            multiline
            maxLength={500}
            editable={!isSending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: themeColors.primary,
                opacity: (newMessage.trim() && !isSending) ? 1 : 0.5
              }
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || isSending}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Card>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  messagesCard: {
    flex: 1,
    margin: 8,
    marginBottom: 4,
    borderRadius: 12,
  },
  list: {
    flex: 1,
    padding: 16,
  },
  inputCard: {
    margin: 8,
    marginTop: 4,
    borderRadius: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  sendButton: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
    marginBottom: 8,
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  queuedMessage: {
    opacity: 0.7,
  },
  failedMessage: {
    borderColor: '#ef4444',
    borderWidth: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  currentUserMessageText: {
    color: '#FFFFFF',
  },
  otherUserMessageText: {
    color: '#374151',
  },
  queuedMessageText: {
    opacity: 0.8,
  },
  failedMessageText: {
    color: '#ef4444',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  statusIcon: {
    marginLeft: 4,
  },
  statusText: {
    fontSize: 10,
    fontStyle: 'italic',
    opacity: 0.6,
  },
  editedIndicator: {
    fontSize: 10,
    fontStyle: 'italic',
    opacity: 0.6,
  },
  deletedMessage: {
    opacity: 0.6,
  },
  deletedMessageText: {
    fontStyle: 'italic',
    color: '#9CA3AF',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 8,
  },
  fileName: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
  },
  searchCard: {
    margin: 8,
    marginBottom: 4,
    borderRadius: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
  },
  searchButton: {
    marginLeft: 8,
    padding: 8,
  },
  closeSearchButton: {
    marginLeft: 4,
    padding: 8,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  editingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  editingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  connectionStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  searchResultsHeader: {
    padding: 16,
    alignItems: 'center',
  },
  searchResultsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default ChatScreen;

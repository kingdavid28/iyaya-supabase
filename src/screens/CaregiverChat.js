import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Alert,
  FlatList,
  TextInput,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { messagingAPI, realtimeService } from '../services';

export default function CaregiverChat({ route }) {
  const { user } = useAuth();
  const navigation = useNavigation();
  // Use the useRoute hook to get params if route is not passed as prop
  const routeHook = useRoute();
  const { caregiverId, caregiverName } = route?.params || routeHook?.params || {};

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const flatListRef = useRef();

  // Initialize conversation when component mounts
  useEffect(() => {
    if (!user?.id || !caregiverId) {
      Alert.alert('Error', 'Missing user information');
      navigation.goBack();
      return;
    }

    const init = async () => {
      try {
        setIsLoading(true);

        // Create consistent conversation ID: always use smaller ID first
        const [id1, id2] = [user.id, caregiverId].sort();
        const convId = `${id1}_${id2}`;
        setConversationId(convId);

        // Get or create conversation and fetch messages
        const conversation = await messagingAPI.startConversation(caregiverId);
        const response = await messagingAPI.getMessages(conversation.data?.id || convId);
        setMessages(response.data?.messages || []);
        
        // Setup real-time subscription
        const subscription = realtimeService.subscribeToMessages(conversation.data?.id || convId, (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages(prev => [...prev, payload.new]);
          }
        });

        return () => {
          if (subscription) subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error initializing chat:', error);
        Alert.alert('Error', 'Failed to load chat');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [user?.id, caregiverId, navigation]);

  // Handle sending a new message
  const sendMessage = async () => {
    if (!newMessage?.trim() || !user?.id || !caregiverId) return;

    try {
      // Create consistent conversation ID: always use smaller ID first
      const [id1, id2] = [user.id, caregiverId].sort();
      const convId = `${id1}_${id2}`;

      await messagingAPI.sendMessage({
        recipientId: caregiverId,
        content: newMessage.trim()
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  // Message item component
  const MessageItem = ({ message, isCurrentUser }) => {
    const formatTime = (timestamp) => {
      if (!timestamp) return '';
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    };

    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
        ]}>
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText
          ]}>
            {message.text || message.content || message.message || 'No message content'}
          </Text>

          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isCurrentUser ? styles.currentUserTime : styles.otherUserTime
            ]}>
              {formatTime(message.timestamp || message.createdAt)}
            </Text>

            {isCurrentUser && (
              <View style={styles.messageStatus}>
                {message.status === 'sent' && (
                  <Ionicons name="checkmark" size={12} color="#10B981" />
                )}
                {message.status === 'delivered' && (
                  <Ionicons name="checkmark-done" size={12} color="#10B981" />
                )}
                {message.status === 'read' && (
                  <Ionicons name="checkmark-done" size={12} color="#3B82F6" />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {caregiverName || 'Chat'}
          </Text>
          <Text style={styles.subtitle}>Caregiver</Text>
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({ item }) => (
          <MessageItem
            message={item}
            isCurrentUser={item.senderId === user?.id}
          />
        )}
        keyExtractor={(item, index) => item.id || `message-${index}`}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        inverted={false}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (messages.length > 0 && flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }}
      />

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.messageInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type your message..."
          multiline
          maxLength={500}
        />
        <Pressable
          style={[
            styles.sendButton,
            { opacity: newMessage?.trim() ? 1 : 0.5 }
          ]}
          onPress={sendMessage}
          disabled={!newMessage?.trim()}
        >
          <Ionicons
            name="send"
            size={20}
            color="#FFFFFF"
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginVertical: 4,
  },
  currentUserMessage: {
    alignItems: 'flex-end',
  },
  otherUserMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  currentUserBubble: {
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  currentUserText: {
    color: '#FFFFFF',
  },
  otherUserText: {
    color: '#374151',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  currentUserTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherUserTime: {
    color: '#9CA3AF',
  },
  messageStatus: {
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  messageInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
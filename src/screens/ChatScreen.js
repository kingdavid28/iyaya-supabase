import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { messagingService, notificationService } from '../services/supabase';

const CHAT_THEMES = {
  parent: {
    headerGradient: ['#3B82F6', '#2563EB', '#1D4ED8'],
    primary: '#2563EB',
    primaryLight: '#60A5FA',
    primaryDark: '#1D4ED8',
    surface: '#FFFFFF',
    surfaceTint: '#F0F7FF',
    accent: '#EFF6FF',
    textPrimary: '#1E3A8A',
    textSecondary: '#374151',
  },
  caregiver: {
    headerGradient: ['#EC4899', '#DB2777', '#BE185D'],
    primary: '#DB2777',
    primaryLight: '#F472B6',
    primaryDark: '#BE185D',
    surface: '#FFFFFF',
    surfaceTint: '#FDF2F8',
    accent: '#FCE7F3',
    textPrimary: '#831843',
    textSecondary: '#374151',
  },
};

const ChatScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const {
    userId,
    userType,
    targetUserId,
    targetUserName,
    targetUserType,
    conversationId: initialConversationId
  } = route.params;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const flatListRef = useRef(null);

  const chatTheme = useMemo(() => {
    return CHAT_THEMES[userType] || CHAT_THEMES.caregiver;
  }, [userType]);

  const targetTheme = useMemo(() => {
    return CHAT_THEMES[targetUserType] || CHAT_THEMES.parent;
  }, [targetUserType]);

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    if (conversationId) {
      loadMessages();
      
      const subscription = messagingService.subscribeToMessages(conversationId, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newMessage = payload.new;
          setMessages(prev => [...prev, transformMessage(newMessage)]);
          scrollToBottom();
        }
      });

      return () => {
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    }
  }, [conversationId]);

  const initializeChat = async () => {
    try {
      let convId = conversationId;
      
      if (!convId) {
        const conversation = await messagingService.getOrCreateConversation(userId, targetUserId);
        convId = conversation.id;
        setConversationId(convId);
      }
      
      await loadMessages(convId);
    } catch (error) {
      console.error('Error initializing chat:', error);
      Alert.alert('Error', 'Failed to load conversation');
    }
  };

  const loadMessages = async (convId = conversationId) => {
    try {
      setLoading(true);
      const messagesData = await messagingService.getMessages(convId);
      const transformedMessages = messagesData.map(transformMessage);
      setMessages(transformedMessages);
      
      await messagingService.markMessagesAsRead(convId, userId);
      
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const transformMessage = (message) => ({
    id: message.id,
    text: message.content,
    createdAt: new Date(message.created_at),
    user: {
      _id: message.sender_id,
      name: message.sender?.name || 'User',
      avatar: message.sender?.profile_image
    },
    isOwn: message.sender_id === userId
  });

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;

    try {
      const messageText = newMessage.trim();
      setNewMessage('');

      await messagingService.sendMessage(conversationId, userId, messageText);
      await notificationService.notifyNewMessage(userId, targetUserId, messageText);
      
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const renderMessage = React.useCallback(({ item }) => (
    <View style={[styles.messageContainer, item.isOwn ? styles.ownMessage : styles.otherMessage]}>
      <View
        style={[
          styles.messageBubble,
          item.isOwn
            ? [styles.ownMessageBubble, { 
                backgroundColor: chatTheme.primary,
                shadowColor: chatTheme.primaryDark,
              }]
            : [styles.otherMessageBubble, { 
                backgroundColor: targetTheme.surfaceTint,
                borderColor: targetTheme.primaryLight,
              }],
        ]}
      >
        <Text style={[
          styles.messageText,
          item.isOwn ? styles.ownMessageText : [styles.otherMessageText, { color: targetTheme.textPrimary }]
        ]}>
          {item.text}
        </Text>
        <Text
          style={[
            styles.messageTime,
            item.isOwn ? styles.ownMessageTime : [styles.otherMessageTime, { color: targetTheme.textSecondary }],
          ]}
        >
          {item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  ), [chatTheme, targetTheme]);

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View
        style={[styles.emptyIconWrapper, { backgroundColor: chatTheme.accent }]}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={48} color={chatTheme.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: chatTheme.textPrimary }]}>
        Start the conversation
      </Text>
      <Text style={[styles.emptySubtitle, { color: chatTheme.textSecondary }]}>
        Send a message to {targetUserName}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: chatTheme.surfaceTint }]}>
      <StatusBar barStyle="light-content" backgroundColor={chatTheme.primaryDark} />
      
      {/* Header */}
      <LinearGradient
        colors={chatTheme.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <View style={styles.avatarBadge}>
              <View style={[styles.avatarPlaceholder, { backgroundColor: targetTheme.primaryLight + '40' }]}>
                <Ionicons 
                  name={targetUserType === 'parent' ? 'person' : 'heart'} 
                  size={20} 
                  color="#FFFFFF" 
                />
              </View>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerName} numberOfLines={1}>
                {targetUserName}
              </Text>
              <View style={styles.roleBadge}>
                <Ionicons
                  name={targetUserType === 'parent' ? 'home' : 'medical'}
                  size={12}
                  color="#FFFFFF"
                  style={styles.roleIcon}
                />
                <Text style={styles.headerRoleText}>
                  {targetUserType === 'parent' ? 'Parent' : 'Caregiver'}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      {/* Chat Area */}
      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.chatSurface, { 
          backgroundColor: chatTheme.surface,
          shadowColor: chatTheme.primaryDark + '33'
        }]}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={!loading ? <EmptyState /> : null}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
          />
        </View>

        {/* Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: chatTheme.surface }]}>
          <View style={[styles.inputDivider, { backgroundColor: chatTheme.primaryLight + '40' }]} />
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: chatTheme.accent,
                  borderColor: chatTheme.primaryLight,
                  color: chatTheme.textPrimary,
                }
              ]}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder={`Message ${targetUserName}...`}
              placeholderTextColor={chatTheme.textSecondary + '80'}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { 
                  backgroundColor: newMessage.trim() ? chatTheme.primary : chatTheme.primaryLight,
                  shadowColor: chatTheme.primaryDark,
                },
                !newMessage.trim() && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={!newMessage.trim()}
            >
              <Ionicons
                name="send"
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 8,
    marginTop: 30,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  avatarBadge: {
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleIcon: {
    marginRight: 4,
  },
  headerRoleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 40,
  },
  chatContainer: {
    flex: 1,
  },
  chatSurface: {
    flex: 1,
    margin: 16,
    marginBottom: 8,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  messagesList: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  messageContainer: {
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ownMessageBubble: {
    borderBottomRightRadius: 6,
  },
  otherMessageBubble: {
    borderBottomLeftRadius: 6,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 4,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#1F2937',
  },
  messageTime: {
    fontSize: 11,
    opacity: 0.8,
  },
  ownMessageTime: {
    color: '#FFFFFF',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrapper: {
    padding: 24,
    borderRadius: 32,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.7,
  },
  inputContainer: {
    borderTopLeftRadius: 20,
    marginBottom: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 16 : 8,
  },
  inputDivider: {
    height: 1,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 120,
    fontSize: 16,
    lineHeight: 20,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  sendButtonDisabled: {
    shadowOpacity: 0.1,
  },
});

export default ChatScreen;
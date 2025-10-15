import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  FlatList,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { messagingAPI } from '../services';
import { supabase } from '../config/supabase';

export default function Chat() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  
  // Extract parameters - works for both parent->caregiver and caregiver->parent
  const { 
    targetUserId, 
    targetUserName, 
    targetUserType,
    caregiverId, 
    caregiverName,
    parentId,
    parentName 
  } = route.params || {};

  // Determine the other participant
  const otherUserId = targetUserId || caregiverId || parentId;
  const otherUserName = targetUserName || caregiverName || parentName || 'User';
  const otherUserType = targetUserType || (caregiverName ? 'Caregiver' : 'Parent');

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const flatListRef = useRef();

  useEffect(() => {
    const initChat = async () => {
      // Extract user ID from different possible formats with more debugging
      let currentUserId = user?.id || user?.uid || user?.user_id || route.params?.userId;
      
      // If no user ID from context, try to get it directly from Supabase
      if (!currentUserId) {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          currentUserId = authUser?.id;
          console.log('🔍 Chat - Got user ID from Supabase auth:', currentUserId);
        } catch (error) {
          console.error('❌ Chat - Failed to get user from Supabase:', error);
        }
      }
      
      console.log('🔍 Chat useEffect - Full debug info:', {
        user: user,
        userKeys: user ? Object.keys(user) : 'no user',
        userId: currentUserId,
        otherUserId,
        routeParams: route.params,
        routeParamsKeys: route.params ? Object.keys(route.params) : 'no params'
      });
      
      if (!currentUserId) {
        console.error('❌ Missing current user ID:', { 
          user,
          userType: typeof user,
          userKeys: user ? Object.keys(user) : 'no user',
          routeUserId: route.params?.userId
        });
        Alert.alert('Error', 'Current user information not available. Please try logging out and back in.');
        navigation.goBack();
        return;
      }
      
      if (!otherUserId) {
        console.error('❌ Missing other user ID:', { 
          otherUserId,
          routeParams: route.params
        });
        Alert.alert('Error', 'Target user information not available');
        navigation.goBack();
        return;
      }

      try {
        setIsLoading(true);
        console.log('🚀 Creating conversation between:', currentUserId, 'and', otherUserId);
        // Pass null as first parameter to let the service get current user from auth
        const conversation = await messagingAPI.getOrCreateConversation(null, otherUserId);
        setConversationId(conversation.id);
        
        const existingMessages = await messagingAPI.getMessages(conversation.id);
        setMessages(existingMessages || []);
      } catch (error) {
        console.error('Error initializing chat:', error);
        Alert.alert('Error', 'Failed to load chat');
      } finally {
        setIsLoading(false);
      }
    };

    initChat();
  }, [user, otherUserId, navigation, route.params]);

  const sendMessage = async () => {
    let currentUserId = user?.id || user?.uid || user?.user_id || route.params?.userId;
    
    // If no user ID, try to get it directly from Supabase
    if (!currentUserId) {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        currentUserId = authUser?.id;
      } catch (error) {
        console.error('Failed to get user for sending message:', error);
      }
    }
    
    if (!newMessage?.trim() || !conversationId || !currentUserId) return;

    try {
      await messagingAPI.sendMessage(conversationId, currentUserId, newMessage.trim());
      setNewMessage('');
      
      // Refresh messages
      const updatedMessages = await messagingAPI.getMessages(conversationId);
      setMessages(updatedMessages || []);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const MessageItem = ({ message, isCurrentUser }) => {
    const formatTime = (timestamp) => {
      if (!timestamp) return '';
      const date = new Date(timestamp);
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
            {message.content || message.text || 'No message content'}
          </Text>
          <Text style={[
            styles.messageTime,
            isCurrentUser ? styles.currentUserTime : styles.otherUserTime
          ]}>
            {formatTime(message.created_at || message.timestamp)}
          </Text>
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {otherUserName}
          </Text>
          <Text style={styles.subtitle}>{otherUserType}</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={({ item }) => {
          const currentUserId = user?.id || user?.uid || user?.user_id || route.params?.userId;
          return (
            <MessageItem
              message={item}
              isCurrentUser={item.sender_id === currentUserId}
            />
          );
        }}
        keyExtractor={(item, index) => item.id || `message-${index}`}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (messages.length > 0 && flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }}
      />

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
          <Ionicons name="send" size={20} color="#FFFFFF" />
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
    marginBottom: 4,
  },
  currentUserText: {
    color: '#FFFFFF',
  },
  otherUserText: {
    color: '#374151',
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
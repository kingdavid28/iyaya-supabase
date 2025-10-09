// ChatScreen.jsx - Enhanced chat screen with Firebase messaging
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, Card, Button, Chip, Avatar, FAB } from 'react-native-paper';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  MoreVertical,
  Phone,
  Video,
  Search,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../core/contexts/AuthContext';
import { messagingService } from '../../services/MessagingService';
import MessageInput from './MessageInput';

const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const flatListRef = useRef(null);

  const { conversationId, recipientId, recipientName, recipientAvatar } = route.params || {};

  // Create conversation object for MessageInput
  const conversation = conversationId ? {
    id: conversationId,
    otherUserId: recipientId,
    recipientName,
    recipientAvatar,
  } : null;

  // State
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);

  // Load messages
  useEffect(() => {
    if (!conversationId) return;

    setLoading(true);
    const unsubscribe = messagingService.listenToMessages(conversationId, (newMessages) => {
      setMessages(newMessages);
      setLoading(false);
    });

    // Listen to typing indicators
    const typingUnsubscribe = messagingService.listenToTypingStatus(conversationId, (users) => {
      setTypingUsers(users);
    });

    return () => {
      unsubscribe();
      typingUnsubscribe();
    };
  }, [conversationId]);

  // Handle sending message
  const handleSendMessage = async (messageText) => {
    if (sending) return;

    setSending(true);
    try {
      const messageId = await messagingService.sendMessage(recipientId, messageText);
      setIsTyping(false);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
      console.error('Send message error:', error);
    } finally {
      setSending(false);
    }
  };

  // Handle typing
  const handleTyping = useCallback((text) => {
    if (text.trim()) {
      if (!isTyping) {
        setIsTyping(true);
        messagingService.setTypingStatus(conversationId, true);
      }
    } else {
      if (isTyping) {
        setIsTyping(false);
        messagingService.setTypingStatus(conversationId, false);
      }
    }
  }, [conversationId, isTyping]);

  // Handle image selection
  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        // TODO: Upload image and send as message
        Alert.alert('Info', 'Image sharing feature coming soon!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Render message
  const renderMessage = ({ item }) => (
    <MessageCard
      message={item}
      isOwn={item.senderId === user?.id}
      showAvatar={true}
      senderName={item.senderId === user?.id ? 'You' : recipientName}
      senderAvatar={item.senderId === user?.id ? null : recipientAvatar}
    />
  );

  // Render typing indicator
  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;

    return (
      <View style={styles.typingContainer}>
        <Text variant="caption" style={styles.typingText}>
          {typingUsers.includes(recipientId) ? `${recipientName} is typing...` : 'Someone is typing...'}
        </Text>
      </View>
    );
  };

  // Render header
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Text>←</Text>
      </TouchableOpacity>

      <View style={styles.headerInfo}>
        <Avatar.Image
          size={40}
          source={recipientAvatar ? { uri: recipientAvatar } : null}
        />
        <View style={styles.headerText}>
          <Text variant="titleMedium" style={styles.recipientName}>
            {recipientName}
          </Text>
          <Text variant="caption" style={styles.recipientStatus}>
            {typingUsers.includes(recipientId) ? 'Typing...' : 'Online'}
          </Text>
        </View>
      </View>

      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Phone size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Video size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <MoreVertical size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Loading messages...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {renderHeader()}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id || item.timestamp.toString()}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {renderTypingIndicator()}

      <MessageInput
        conversation={conversation}
        disabled={loading || sending}
        onSendMessage={handleSendMessage}
        onImagePick={handleImagePick}
        onTyping={handleTyping}
        placeholder="Type a message..."
      />
    </KeyboardAvoidingView>
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
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingVertical: 8,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  attachButton: {
    padding: 12,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    backgroundColor: '#f5f5f5',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    padding: 12,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    height: 44,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
});

export default ChatScreen;

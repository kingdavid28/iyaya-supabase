// MessagingInterface.jsx - React Native Paper messaging interface component
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Surface, ActivityIndicator, Snackbar } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../contexts/AuthContext';
import ConversationList from './ConversationList';
import MessageInput from './MessageInput';
import MessageList from './MessageList';
import { messagingService } from '../../../services/firebaseMessagingService';
import { firebaseRealtimeService } from '../../../services/firebaseRealtimeService';

const MessagingInterface = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();

  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Get user type from route params or user context
  const userType = route.params?.userType || (user?.role === 'parent' ? 'parent' : 'caregiver');
  const currentUserId = user?.id;

  useEffect(() => {
    const initialize = async () => {
      try {
        setAuthError(null);
        await firebaseRealtimeService.initializeRealtimeAuth();
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setAuthError('Failed to initialize messaging. Please check your connection.');
        setSnackbarMessage('Failed to initialize messaging. Please check your connection.');
        setSnackbarVisible(true);
      }
    };

    initialize();

    // Listen for auth state changes
    const unsubscribe = firebaseRealtimeService.addAuthStateListener((authenticated) => {
      setIsAuthenticated(authenticated);
      if (!authenticated) {
        setAuthError('Authentication lost. Please restart the app.');
        setSnackbarMessage('Authentication lost. Please restart the app.');
        setSnackbarVisible(true);
      }
    });

    return () => {
      unsubscribe?.();
      if (selectedConversation) {
        messagingService.stopListening(selectedConversation.id);
      }
    };
  }, []);

  // Load messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation?.id) {
      return;
    }

    // MessageList handles its own message loading
    return () => {
      // Cleanup handled by MessageList
    };
  }, [selectedConversation]);

  const handleSendMessage = async (messageText) => {
    if (!selectedConversation) return;

    try {
      await messagingService.sendMessage(selectedConversation.otherUserId, messageText);
    } catch (error) {
      console.error('Send message error:', error);
      setSnackbarMessage('Failed to send message. Please try again.');
      setSnackbarVisible(true);
    }
  };

  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSnackbarMessage('Image sharing feature coming soon!');
        setSnackbarVisible(true);
      }
    } catch (error) {
      setSnackbarMessage('Failed to pick image');
      setSnackbarVisible(true);
    }
  };

  const handleTyping = (text) => {
    if (selectedConversation?.id) {
      if (text.trim()) {
        messagingService.setTypingStatus(selectedConversation.id, true);
      } else {
        messagingService.setTypingStatus(selectedConversation.id, false);
      }
    }
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    // Navigate to ChatScreen with conversation details
    navigation.navigate('ChatScreen', {
      conversationId: conversation.id,
      recipientId: conversation.otherUserId,
      recipientName: conversation.recipientName,
      recipientAvatar: conversation.recipientAvatar,
    });
  };

  const showError = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  if (authError) {
    return (
      <View style={styles.errorContainer}>
        <Surface style={styles.errorSurface} elevation={2}>
          <Text variant="bodyLarge" style={styles.errorText}>
            {authError}
          </Text>
        </Surface>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Initializing messaging...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Messages - {userType === 'parent' ? 'Parent' : 'Caregiver'}
        </Text>
      </View>

      <View style={styles.content}>
        {/* Conversation List */}
        <View style={styles.sidebar}>
          <ConversationList
            onSelectConversation={handleSelectConversation}
            selectedConversation={selectedConversation}
            navigation={navigation}
          />
        </View>

        {/* Message Area */}
        <View style={styles.mainArea}>
          {selectedConversation ? (
            <>
              {/* Messages List */}
              <View style={styles.messagesArea}>
                <MessageList conversation={selectedConversation} />
              </View>

              {/* Message Input */}
              <View style={styles.inputArea}>
                <MessageInput
                  conversation={selectedConversation}
                  disabled={loading}
                  onSendMessage={handleSendMessage}
                  onImagePick={handleImagePick}
                  onTyping={handleTyping}
                  placeholder="Type a message..."
                />
              </View>
            </>
          ) : (
            <View style={styles.noConversation}>
              <Text variant="headlineSmall" style={styles.noConversationTitle}>
                Select a conversation
              </Text>
              <Text variant="bodyLarge" style={styles.noConversationText}>
                Choose a conversation from the list to start messaging
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Snackbar for notifications */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorSurface: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#ffebee',
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
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
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: '35%',
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  mainArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messagesArea: {
    flex: 1,
  },
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  noConversation: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noConversationTitle: {
    marginBottom: 8,
    color: '#333',
  },
  noConversationText: {
    color: '#666',
    textAlign: 'center',
  },
});

export default MessagingInterface;

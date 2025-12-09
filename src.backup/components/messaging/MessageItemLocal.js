import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MessageItemLocal = ({ message, isCurrentUser }) => {
  if (!message) {
    return null;
  }

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

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 4,
    paddingHorizontal: 16,
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
});

export default MessageItemLocal;

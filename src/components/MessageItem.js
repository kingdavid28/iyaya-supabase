import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MessageItem = ({ message, isCurrentUser }) => {
  return (
    <View style={[
      styles.messageContainer, 
      isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
    ]}>
      <Text style={styles.messageText}>{message.text}</Text>
      <Text style={styles.timestamp}>
        {new Date(message.timestamp).toLocaleTimeString()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
    maxWidth: '80%',
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
  },
  messageText: {
    fontSize: 16,
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
});

export default MessageItem;
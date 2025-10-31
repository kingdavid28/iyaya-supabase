// MessageCard.jsx - React Native Paper implementation
import { format } from 'date-fns';
import React from 'react';
import { Image, Linking, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Card, Text } from 'react-native-paper';

const MessageCard = ({ message, isOwn, showAvatar = false, senderName, senderAvatar }) => {
  const formatTime = (timestamp) => {
    try {
      return format(new Date(timestamp), 'HH:mm');
    } catch (error) {
      return '';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return '#4CAF50'; // Green
      case 'sent':
        return '#2196F3'; // Blue
      case 'read':
        return '#9C27B0'; // Purple
      default:
        return '#757575'; // Grey
    }
  };

  const renderAttachment = () => {
    if (!message.attachmentUrl) return null;

    const isImage = message.attachmentType?.startsWith('image/');
    
    return (
      <View style={styles.attachmentContainer}>
        {isImage ? (
          <Image
            source={{ uri: message.attachmentUrl }}
            style={styles.attachmentImage}
            resizeMode="cover"
          />
        ) : (
          <TouchableOpacity 
            onPress={() => Linking.openURL(message.attachmentUrl)}
            style={styles.attachmentButton}
          >
            <View style={[
              styles.attachmentChip,
              isOwn ? styles.ownAttachmentChip : styles.otherAttachmentChip
            ]}>
              <Text style={[styles.attachmentIcon, isOwn ? styles.ownText : styles.otherText]}>
                📎
              </Text>
              <Text style={[
                styles.attachmentText, 
                isOwn ? styles.ownText : styles.otherText
              ]}>
                {message.attachmentName || 'Attachment'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderStatusIndicator = () => {
    if (!isOwn || !message.status) return null;

    return (
      <View style={styles.statusContainer}>
        <Text
          variant="bodySmall"
          style={[
            styles.statusText,
            { color: getStatusColor(message.status) }
          ]}
        >
          {message.status}
        </Text>
        {(message.status === 'delivered' || message.status === 'read') && (
          <Text style={[styles.checkIcon, { color: getStatusColor(message.status) }]}>
            ✓✓
          </Text>
        )}
        {message.status === 'sent' && (
          <Text style={[styles.checkIcon, { color: getStatusColor(message.status) }]}>
            ✓
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={[
      styles.container,
      isOwn ? styles.ownContainer : styles.otherContainer
    ]}>
      {showAvatar && !isOwn && (
        <Avatar.Image
          size={40}
          source={senderAvatar ? { uri: senderAvatar } : require('../../../assets/default-avatar.png')}
          style={styles.avatar}
        />
      )}

      <View style={[
        styles.bubbleContainer,
        isOwn ? styles.ownBubble : styles.otherBubble
      ]}>
        {showAvatar && !isOwn && senderName && (
          <Text variant="labelSmall" style={styles.senderName}>
            {senderName}
          </Text>
        )}

        <Card style={[
          styles.messageCard,
          isOwn ? styles.ownMessage : styles.otherMessage
        ]}>
          <Card.Content style={styles.cardContent}>
            {/* Message Text */}
            {message.text && (
              <Text
                variant="bodyMedium"
                style={[
                  styles.messageText,
                  isOwn ? styles.ownText : styles.otherText
                ]}
              >
                {message.text}
              </Text>
            )}

            {/* Attachment */}
            {renderAttachment()}

            {/* Footer with timestamp and status */}
            <View style={styles.footer}>
              <Text
                variant="bodySmall"
                style={[
                  styles.timestamp,
                  isOwn ? styles.ownTimestamp : styles.otherTimestamp
                ]}
              >
                {formatTime(message.timestamp)}
              </Text>

              {renderStatusIndicator()}
            </View>

            {/* Edited indicator */}
            {message.edited && (
              <Text variant="bodySmall" style={styles.editedText}>
                (edited)
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Message type indicator for non-text messages */}
        {message.type !== 'text' && message.type && (
          <Text variant="bodySmall" style={styles.messageType}>
            {message.type}
          </Text>
        )}
      </View>

      {/* Spacer for alignment when showing avatar on other side */}
      {showAvatar && isOwn && (
        <View style={styles.avatarSpacer} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
    paddingHorizontal: 10,
    flex: 1,
  },
  ownContainer: {
    justifyContent: 'flex-end',
  },
  otherContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    marginRight: 8,
    marginBottom: 8,
  },
  avatarSpacer: {
    width: 40,
    marginLeft: 8,
  },
  bubbleContainer: {
    maxWidth: Platform.OS === 'android' ? '90%' : '75%',
    flexDirection: 'column',
  },
  ownBubble: {
    alignItems: 'flex-end',
  },
  otherBubble: {
    alignItems: 'flex-start',
  },
  senderName: {
    marginBottom: 4,
    fontWeight: '600',
    color: '#666',
    marginLeft: 4,
  },
  messageCard: {
    elevation: 1,
    borderRadius: 18,
  },
  ownMessage: {
    backgroundColor: '#007AFF',
  },
  otherMessage: {
    backgroundColor: '#E5E5E5',
  },
  cardContent: {
    padding: 12,
    paddingBottom: 8,
  },
  messageText: {
    lineHeight: 20,
    marginBottom: 4,
  },
  ownText: {
    color: '#FFFFFF',
  },
  otherText: {
    color: '#000000',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
  },
  ownTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTimestamp: {
    color: 'rgba(0, 0, 0, 0.5)',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    marginRight: 2,
  },
  checkIcon: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  editedText: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.4)',
    marginTop: 2,
    fontStyle: 'italic',
  },
  messageType: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.4)',
    marginTop: 2,
    fontStyle: 'italic',
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
  // Attachment styles
  attachmentContainer: {
    marginTop: 8,
  },
  attachmentImage: {
    width: 200,
    height: 160,
    borderRadius: 12,
  },
  attachmentButton: {
    alignSelf: 'flex-start',
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  ownAttachmentChip: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  otherAttachmentChip: {
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  attachmentIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  attachmentText: {
    marginLeft: 6,
    fontSize: 14,
  },
});

export default MessageCard;
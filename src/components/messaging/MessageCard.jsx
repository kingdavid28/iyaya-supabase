// MessageCard.jsx - React Native Paper implementation
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    Linking,
    Modal,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { Avatar, Card, Text } from 'react-native-paper';

const MessageCard = ({
  message,
  isOwn,
  showAvatar = false,
  senderName,
  senderAvatar,
  onLongPress,
  isEditing = false,
  onRefreshAttachmentUrl,
}) => {
  const [attachmentViewerVisible, setAttachmentViewerVisible] = useState(false);

  const isDeleted = message.deleted || message.messageType === 'system';
  const bodyText = isDeleted ? 'This message was deleted' : (message.text || '');
  const showEditedMarker = message.edited && !isDeleted;

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

  const ensureAttachmentUrl = async () => {
    if (typeof onRefreshAttachmentUrl === 'function') {
      const refreshed = await onRefreshAttachmentUrl(message);
      if (refreshed) {
        return refreshed;
      }
    }
    return message.attachmentUrl;
  };

  const handleDownload = async () => {
    try {
      const url = await ensureAttachmentUrl();
      if (!url) {
        Alert.alert('Attachment unavailable', 'Unable to access this attachment right now.');
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Error', 'Failed to download attachment');
    }
  };

  const handleShare = async () => {
    try {
      const url = await ensureAttachmentUrl();
      if (!url) {
        Alert.alert('Attachment unavailable', 'Unable to share this attachment right now.');
        return;
      }
      await Share.share({ url });
    } catch (error) {
      Alert.alert('Error', 'Failed to share attachment');
    }
  };

  const AttachmentViewer = ({ message, onClose }) => {
    return (
      <Modal
        visible={attachmentViewerVisible}
        onRequestClose={onClose}
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.viewerContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <ScrollView
            maximumZoomScale={5}
            minimumZoomScale={1}
            contentContainerStyle={styles.viewerContent}
          >
            {message.attachmentType?.startsWith('image/') ? (
              <Image
                source={{ uri: message.attachmentUrl }}
                style={styles.viewerImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.fileViewer}>
                <Ionicons name="document" size={64} color="#666" />
                <Text style={styles.fileName}>
                  {message.attachmentName || 'Attachment'}
                </Text>
                <Text style={styles.fileSize}>
                  {message.attachmentSize ? `${message.attachmentSize} bytes` : 'Unknown size'}
                </Text>
              </View>
            )}
          </ScrollView>
          <View style={styles.viewerActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleDownload}>
              <Ionicons name="download" size={24} color="white" />
              <Text style={styles.actionText}>Download</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Ionicons name="share" size={24} color="white" />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderAttachment = () => {
    if (!message.attachmentUrl || isDeleted) return null;

    const isImage = message.attachmentType?.startsWith('image/');

    return (
      <View style={styles.attachmentContainer}>
        {isImage ? (
          <TouchableOpacity
            onPress={async () => {
              const url = await ensureAttachmentUrl();
              if (!url) {
                Alert.alert('Attachment unavailable', 'Unable to preview this attachment right now.');
                return;
              }
              setAttachmentViewerVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Image
              source={{ uri: message.attachmentUrl }}
              style={styles.attachmentImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={async () => {
              const url = await ensureAttachmentUrl();
              if (!url) {
                Alert.alert('Attachment unavailable', 'Unable to preview this attachment right now.');
                return;
              }
              setAttachmentViewerVisible(true);
            }}
            style={styles.attachmentButton}
            activeOpacity={0.7}
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
    <TouchableOpacity
      onLongPress={isDeleted ? undefined : onLongPress}
      onPress={
        !isDeleted && message.attachmentUrl
          ? async () => {
              const url = await ensureAttachmentUrl();
              if (!url) {
                Alert.alert('Attachment unavailable', 'Unable to preview this attachment right now.');
                return;
              }
              setAttachmentViewerVisible(true);
            }
          : undefined
      }
      activeOpacity={0.7}
      style={[
        styles.container,
        isOwn ? styles.ownContainer : styles.otherContainer,
        isEditing && styles.editingContainer,
      ]}
    >
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

        <Card
          style={[
            styles.messageCard,
            isOwn ? styles.ownMessage : styles.otherMessage,
            isDeleted && styles.deletedMessageCard,
          ]}
        >
          <Card.Content style={styles.cardContent}>
            <Text
              variant="bodyMedium"
              style={[
                styles.messageText,
                isOwn ? styles.ownText : styles.otherText,
                isDeleted && styles.deletedText,
              ]}
            >
              {bodyText}
            </Text>
            {!isDeleted && renderAttachment()}
            {showEditedMarker && (
              <Text style={styles.editedTag}>(edited)</Text>
            )}

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
          </Card.Content>
        </Card>

        {/* Message type indicator for non-text messages */}
        {!isDeleted && message.type !== 'text' && message.type && (
          <Text variant="bodySmall" style={styles.messageType}>
            {message.type}
          </Text>
        )}
      </View>

      {/* Attachment Viewer Modal */}
      <AttachmentViewer
        message={message}
        onClose={() => setAttachmentViewerVisible(false)}
      />
    </TouchableOpacity>
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
  deletedMessageCard: {
    backgroundColor: '#F5F5F5',
  },
  cardContent: {
    padding: 12,
    paddingBottom: 8,
  },
  messageText: {
    lineHeight: 20,
  },
  deletedText: {
    fontStyle: 'italic',
    color: '#6B7280',
  },
  editedTag: {
    marginTop: 4,
    fontSize: 12,
    color: '#9CA3AF',
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
  },
  checkIcon: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageType: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.4)',
    marginTop: 2,
    fontStyle: 'italic',
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
  // Attachment Viewer styles
  viewerContainer: { 
    flex: 1, 
    backgroundColor: 'black',
    marginBottom: 50,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  closeButton: { 
    position: 'absolute', 
    top: Platform.OS === 'ios' ? 50 : 30, 
    right: 20, 
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 5,
  },
  viewerContent: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  viewerImage: { 
    width: '100%', 
    height: '100%' 
  },
  fileViewer: { 
    alignItems: 'center', 
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    margin: 20,
  },
  fileName: { 
    color: 'white', 
    fontSize: 18, 
    marginTop: 10,
    textAlign: 'center',
  },
  fileSize: { 
    color: '#ccc', 
    fontSize: 14, 
    marginTop: 5 
  },
  viewerActions: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  actionButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#333', 
    padding: 12, 
    borderRadius: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  actionText: { 
    color: 'white', 
    marginLeft: 8,
    fontSize: 16,
  },
  editingContainer: {
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 20,
  },
});

export default MessageCard;
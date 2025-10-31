// MessageInput.jsx - Enhanced React Native message input component
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { Paperclip, Send } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { ATTACHMENT_VALIDATION_DEFAULTS, validateUpload } from '../../utils/uploadValidation';

const MessageInput = ({
  conversation,
  disabled = false,
  onSendMessage,
  onTyping,
  placeholder = "Type a message...",
  onUploadAttachment,
  maxMessageLength = 1000,
  allowImages = true,
  allowDocuments = true
}) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const textInputRef = useRef(null);

  useEffect(() => {
    console.log('MessageInput props', {
      allowImages,
      allowDocuments,
      disabled,
      sending,
      uploading,
    });
  }, [allowImages, allowDocuments, disabled, sending, uploading]);

  const handleTextChange = (text) => {
    if (text.length <= maxMessageLength) {
      setMessage(text);
      onTyping?.(text);
    }
  };

  const handleSend = async () => {
    if (sending || uploading || disabled) return;
    if (!message.trim() && !conversation) return;

    try {
      setSending(true);
      Keyboard.dismiss();
      await onSendMessage?.(message.trim());
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', error?.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const processAndValidateFile = async (fileInfo, fileName, mimeType) => {
    const safeName = fileName || (fileInfo?.uri ? fileInfo.uri.split('/').pop() : 'file');
    const size = fileInfo?.size ?? fileInfo?.length ?? fileInfo?.fileSize ?? null;
    const safeMime = mimeType || fileInfo?.mimeType || fileInfo?.type || null;

    console.log('processAndValidateFile inputs:', {
      uri: fileInfo?.uri,
      safeName,
      safeMime,
      size,
    });

    const validatedFile = validateUpload({
      fileName: safeName,
      mimeType: safeMime,
      size: typeof size === 'number' ? size : null,
      ...ATTACHMENT_VALIDATION_DEFAULTS,
    });

    const base64 = await FileSystem.readAsStringAsync(fileInfo.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return {
      ...validatedFile,
      base64,
      uri: fileInfo.uri,
      name: safeName,
      mimeType: safeMime,
      size,
    };
  };

  const handleImagePick = async () => {
    if (disabled || sending || uploading) return;

    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }

      setUploading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        exif: false, // Remove metadata for privacy
      });

      if (result.canceled) {
        setUploading(false);
        return;
      }

      const image = result.assets[0];
      const fileInfo = await FileSystem.getInfoAsync(image.uri);

      if (!fileInfo.exists) {
        throw new Error('Selected image no longer exists');
      }

      const processedImage = await processAndValidateFile(
        fileInfo,
        `image_${Date.now()}.jpg`,
        'image/jpeg'
      );

      // Upload attachment
      const attachment = await onUploadAttachment?.({
        conversationId: conversation.id,
        ...processedImage,
      });

      // Send message with attachment
      if (attachment) {
        await onSendMessage?.('', attachment);
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      Alert.alert('Upload Failed', error?.message || 'Could not upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentPick = async () => {
    if (disabled || sending || uploading) return;

    console.log('handleDocumentPick triggered');

    try {
      setUploading(true);

      console.log('Opening DocumentPicker');
      const result = await DocumentPicker.getDocumentAsync({
        type: ATTACHMENT_VALIDATION_DEFAULTS.allowedMimeTypes,
        copyToCacheDirectory: true,
        multiple: false,
      });
      console.log('DocumentPicker raw result:', result);
      console.log('Did picker cancel?', result?.type === 'cancel' || result?.canceled);

      if (result.type !== 'success') {
        setUploading(false);
        return;
      }

      let file;
      if (Array.isArray(result.assets) && result.assets.length > 0) {
        file = result.assets[0];
      } else {
        file = {
          uri: result.uri || result.file || result.fileUri,
          name: result.name || result.fileName,
          size: result.size ?? result.fileSize,
          mimeType: result.mimeType || result.type || null,
        };
      }

      console.log('Normalized picked file:', file);

      if (!file || !file.uri) {
        throw new Error('No file returned from picker');
      }

      let fileUri = file.uri;
      if (typeof fileUri === 'string' && fileUri.startsWith('content://')) {
        const safeName = (file.name || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
        const cachePath = `${FileSystem.cacheDirectory}picked-${Date.now()}-${safeName}`;
        try {
          await FileSystem.copyAsync({ from: fileUri, to: cachePath });
          fileUri = cachePath;
          console.log('Copied content URI to cache:', fileUri);
        } catch (copyErr) {
          console.warn('Failed to copy content URI to cache; continuing with original URI', copyErr);
        }
      }

      const fileInfo = await FileSystem.getInfoAsync(fileUri);

      if (!fileInfo.exists) {
        throw new Error('Selected file no longer exists');
      }

      const processedFile = await processAndValidateFile(
        fileInfo,
        file.name,
        file.mimeType
      );

      const attachment = await onUploadAttachment?.({
        conversationId: conversation.id,
        ...processedFile,
      });

      if (attachment) {
        await onSendMessage?.('', attachment);
      }
    } catch (error) {
      console.error('Document upload failed:', error);
      Alert.alert('Upload Failed', error?.message || 'Could not upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleAttachmentPress = () => {
    console.log('handleAttachmentPress triggered', {
      allowImages,
      allowDocuments,
      disabled,
      sending,
      uploading,
    });

    if (!allowImages && !allowDocuments) return;

    if (allowImages && allowDocuments) {
      // Show action sheet for both options
      Alert.alert(
        'Add Attachment',
        'Choose attachment type',
        [
          { text: 'Photo', onPress: () => {
            console.log('Attachment option selected: Photo');
            handleImagePick();
          } },
          { text: 'Document', onPress: () => {
            console.log('Attachment option selected: Document');
            handleDocumentPick();
          } },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else if (allowImages) {
      console.log('Attachment option selected: Photo (images only)');
      handleImagePick();
    } else {
      console.log('Attachment option selected: Document (documents only)');
      handleDocumentPick();
    }
  };

  const handleKeyPress = ({ nativeEvent }) => {
    if (nativeEvent.key === 'Enter' && !nativeEvent.shiftKey) {
      nativeEvent.preventDefault();
      handleSend();
    }
  };

  const isDisabled = disabled || sending || uploading;
  const hasValidMessage = message.trim().length > 0;
  const charactersRemaining = maxMessageLength - message.length;

  if (!conversation) return null;

  return (
    <View style={styles.container}>
      {/* Attachment Button */}
      {(allowImages || allowDocuments) && (
        <TouchableOpacity
          onPress={() => {
            console.log('Attachment button pressed');
            handleAttachmentPress();
          }}
          style={styles.attachButton}
          disabled={isDisabled}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#666" />
          ) : (
            <Paperclip size={20} color={isDisabled ? '#ccc' : '#666'} />
          )}
        </TouchableOpacity>
      )}

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          ref={textInputRef}
          value={message}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          style={[
            styles.textInput,
            isDisabled && styles.textInputDisabled,
          ]}
          multiline
          maxLength={maxMessageLength}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          editable={!isDisabled}
          onKeyPress={handleKeyPress}
          textAlignVertical="center"
        />
        
        {/* Character Counter */}
        {message.length > maxMessageLength * 0.8 && (
          <View style={styles.counterContainer}>
            <Text style={styles.counterText}>
              {charactersRemaining}
            </Text>
          </View>
        )}
      </View>

      {/* Send Button */}
      <TouchableOpacity
        onPress={handleSend}
        disabled={isDisabled || (!hasValidMessage && !uploading)}
        style={[
          styles.sendButton,
          (isDisabled || (!hasValidMessage && !uploading)) && styles.sendButtonDisabled,
        ]}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Send size={20} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    ...Platform.select({
      ios: {
        paddingBottom: 34, // Extra padding for iOS home indicator
      },
    }),
  },
  inputContainer: {
    flex: 1,
    position: 'relative',
  },
  attachButton: {
    padding: 12,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    maxHeight: 100,
    backgroundColor: '#f5f5f5',
    fontSize: 16,
    textAlignVertical: 'center',
    paddingRight: 40, // Space for character counter
  },
  textInputDisabled: {
    backgroundColor: '#f0f0f0',
    color: '#999',
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
  counterContainer: {
    position: 'absolute',
    right: 12,
    bottom: 8,
    backgroundColor: 'transparent',
  },
  counterText: {
    fontSize: 12,
    color: '#999',
  },
});

export default MessageInput;
// ChatScreen.jsx - Supabase-backed chat screen
import { useNavigation, useRoute } from '@react-navigation/native';
import { MoreVertical, Phone, Video } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Avatar, Text } from 'react-native-paper';
import { useAuth } from '../../core/contexts/AuthContext';
import { messagingService, realtimeService } from '../../services';
import MessageCard from './MessageCard';
import MessageInput from './MessageInput';

const mapMessageRecord = (record) => ({
  id: record.id,
  senderId: record.sender_id,
  recipientId: record.recipient_id,
  text: record.content,
  timestamp: record.created_at,
  status: record.read_at ? 'read' : 'sent',
  type: record.attachment_url ? 'attachment' : 'text',
  attachmentUrl: record.attachment_url || null,
  attachmentName: record.attachment_name || null,
})

const ChatScreen = () => {
  const navigation = useNavigation()
  const route = useRoute()
  const { user } = useAuth()

  const { conversationId, recipientId, recipientName, recipientAvatar } = route.params || {}

  const conversation = useMemo(() => {
    if (!conversationId) return null
    return {
      id: conversationId,
      otherUserId: recipientId,
      recipientName,
      recipientAvatar,
    }
  }, [conversationId, recipientAvatar, recipientId, recipientName])

  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])

  const typingStateRef = useRef(false)
  const flatListRef = useRef(null)

  const userId = user?.id
  const normalizedConversationId = conversation?.id

  useEffect(() => {
    if (!normalizedConversationId || !userId) return undefined

    let isMounted = true
    setLoading(true)

    const loadMessages = async () => {
      try {
        const records = await messagingService.getMessages(normalizedConversationId)
        if (!isMounted) return
        const mapped = (records || []).map(mapMessageRecord)
        setMessages(mapped)
      } catch (error) {
        console.error('Failed to load messages:', error)
        if (isMounted) {
          Alert.alert('Error', 'Unable to load messages right now.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadMessages()

    const messageChannel = realtimeService.subscribeToMessages(normalizedConversationId, (payload) => {
      if (payload.eventType !== 'INSERT') return
      const nextMessage = mapMessageRecord(payload.new)

      setMessages((prev) => {
        const alreadyExists = prev.some((message) => message.id === nextMessage.id)
        if (alreadyExists) return prev
        return [...prev, nextMessage].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        )
      })
    })

    const detachTyping = realtimeService.joinTypingChannel(
      normalizedConversationId,
      userId,
      (activeTypers) => {
        if (!isMounted) return
        const otherUsers = activeTypers.filter((id) => id !== userId)
        setTypingUsers(otherUsers)
      },
    )

    return () => {
      isMounted = false
      messageChannel?.unsubscribe?.()
      detachTyping?.()
      realtimeService.setTypingStatus(normalizedConversationId, userId, false)
    }
  }, [normalizedConversationId, userId])

  const handleSendMessage = useCallback(
    async (messageText, attachment) => {
      if (sending || !normalizedConversationId || !userId) return

      setSending(true)
      try {
        await messagingService.sendMessage(normalizedConversationId, userId, messageText, attachment)
        typingStateRef.current = false
        await realtimeService.setTypingStatus(normalizedConversationId, userId, false)

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true })
        }, 100)
      } catch (error) {
        console.error('Send message error:', error)
        Alert.alert('Error', error?.message || 'Failed to send message. Please try again.')
      } finally {
        setSending(false)
      }
    },
    [normalizedConversationId, sending, userId],
  )

  const handleUploadAttachment = useCallback(
    async (payload) => {
      return messagingService.uploadAttachment(payload)
    },
    [],
  )

  const handleTyping = useCallback(
    async (text) => {
      if (!normalizedConversationId || !userId) return
      const nextState = Boolean(text.trim())

      if (typingStateRef.current === nextState) return
      typingStateRef.current = nextState

      await realtimeService.setTypingStatus(normalizedConversationId, userId, nextState)
    },
    [normalizedConversationId, userId],
  )

  const handleImagePick = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled) {
        Alert.alert('Info', 'Image sharing feature coming soon!')
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image')
    }
  }, [])

  const renderMessage = ({ item }) => (
    <MessageCard
      message={item}
      isOwn={item.senderId === userId}
      showAvatar
      senderName={item.senderId === userId ? 'You' : recipientName}
      senderAvatar={item.senderId === userId ? null : recipientAvatar}
    />
  )

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null

    const recipientTyping = typingUsers.includes(String(recipientId))
    const message = recipientTyping ? `${recipientName} is typing...` : 'Someone is typing...'

    return (
      <View style={styles.typingContainer}>
        <Text variant="bodySmall" style={styles.typingText}>
          {message}
        </Text>
      </View>
    )
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text>←</Text>
      </TouchableOpacity>

      <View style={styles.headerInfo}>
        <Avatar.Image 
          size={40} 
          source={recipientAvatar ? { uri: recipientAvatar } : require('../../../assets/default-avatar.png')} 
        />
        <View style={styles.headerText}>
          <Text variant="titleMedium" style={styles.recipientName}>
            {recipientName}
          </Text>
          <Text variant="bodySmall" style={styles.recipientStatus}>
            {typingUsers.includes(String(recipientId)) ? 'Typing…' : 'Online'}
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
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Loading messages…
        </Text>
      </View>
    )
  }

  if (!conversation) {
    return (
      <View style={styles.loadingContainer}>
        <Text variant="bodyMedium">No conversation selected.</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {renderHeader()}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {renderTypingIndicator()}

      <MessageInput
        conversation={conversation}
        disabled={loading || sending}
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        onUploadAttachment={handleUploadAttachment}
        placeholder="Type a message..."
      />
    </KeyboardAvoidingView>
  )
}

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
    paddingHorizontal: 12,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    color: '#666',
    fontStyle: 'italic',
  },
})

export default ChatScreen
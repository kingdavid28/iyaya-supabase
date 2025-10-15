import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'react-native-paper';
import { useAuth } from '../../../contexts/AuthContext';
import { supabaseService } from '../../../services/supabase';
import { styles } from '../../styles/CaregiverDashboard.styles';

const MessagesTab = ({ navigation, refreshing, onRefresh }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const getInitials = (name = '') => {
    if (!name) return 'P';
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  };

  useEffect(() => {
    const userIdToUse = user?.id || user?.uid;
    if (!userIdToUse) {
      console.log('❌ MessagesTab: No user ID available:', { user });
      return;
    }

    console.log('🔍 MessagesTab: Fetching conversations for caregiver:', userIdToUse);

    const loadConversations = async () => {
      try {
        setLoading(true);
        const conversations = await supabaseService.messaging.getConversations(userIdToUse);
        console.log('📨 MessagesTab: Received conversations:', conversations);
        
        // Transform conversations for display
        const transformedConversations = conversations.map(conv => {
          console.log('🔄 Transforming conversation:', conv);
          
          const otherUser = conv.otherParticipant;
          
          console.log('🔍 Other participant info:', {
            otherUser
          });
          
          return {
            id: conv.id,
            parentId: otherUser?.id,
            parentName: otherUser?.name || 'Parent',
            parentAvatar: otherUser?.profile_image,
            lastMessage: conv.last_message_preview || 'Tap to view messages',
            lastMessageTime: conv.last_message_at,
            isRead: true // Will be updated with actual read status
          };
        });
        
        setConversations(transformedConversations);
      } catch (error) {
        console.error('Error loading conversations:', error);
        setConversations([]);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
    
    // Setup real-time subscription
    const subscription = supabaseService.messaging.subscribeToMessages('*', () => {
      loadConversations();
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [user?.id, user?.uid]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const handleConversationPress = async (conversation) => {
    console.log('🔍 MessagesTab: handleConversationPress called with:', {
      user: user,
      userId: user?.id || user?.uid,
      conversation: conversation
    });

    const userIdToUse = user?.id || user?.uid;
    
    if (!userIdToUse) {
      Alert.alert('Error', 'User information not available');
      return;
    }
    
    if (!conversation.parentId) {
      console.error('❌ Missing parentId in conversation:', conversation);
      Alert.alert('Error', 'Conversation data incomplete');
      return;
    }

    // Mark messages as read when opening conversation
    if (conversation.id) {
      console.log('👁️ Marking messages as read for conversation:', conversation.id);
      await supabaseService.messaging.markMessagesAsRead(conversation.id, userIdToUse);
    }

    console.log('🚀 Navigating to CaregiverChat with:', {
      caregiverId: conversation.parentId,
      caregiverName: conversation.parentName || 'Parent'
    });

    // Navigate to unified chat
    navigation.navigate('Chat', {
      userId: userIdToUse,
      userType: 'caregiver',
      targetUserId: conversation.parentId,
      targetUserName: conversation.parentName || 'Parent',
      targetUserType: 'parent'
    });
  };

  const renderConversationItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleConversationPress(item)}>
      <View style={messageStyles.conversationItem}>
        <View style={messageStyles.conversationAccent} />
        <View style={messageStyles.conversationContent}>
          <View style={messageStyles.avatarContainer}>
            {item.parentAvatar ? (
              <Image
                source={{ uri: item.parentAvatar }}
                style={messageStyles.avatar}
              />
            ) : (
              <View style={messageStyles.defaultAvatar}>
                <Text style={messageStyles.avatarInitials}>{getInitials(item.parentName)}</Text>
              </View>
            )}
            {!item.isRead && <View style={messageStyles.unreadDot} />}
          </View>

          <View style={messageStyles.messageInfo}>
            <View style={messageStyles.messageHeader}>
              <Text style={messageStyles.parentName}>{item.parentName || 'Parent'}</Text>
              <View style={messageStyles.metaRight}>
                <Ionicons name="time-outline" size={14} color="#94A3B8" style={messageStyles.timeIcon} />
                <Text style={messageStyles.messageTime}>
                  {formatTime(item.lastMessageTime)}
                </Text>
              </View>
            </View>
            <View style={messageStyles.messagePreviewRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#6B7280" style={messageStyles.previewIcon} />
              <Text
                style={[
                  messageStyles.lastMessage,
                  !item.isRead && messageStyles.unreadMessage
                ]}
                numberOfLines={1}
              >
                {item.lastMessage}
              </Text>
            </View>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color="#9CA3AF"
            style={messageStyles.chevronIcon}
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Card style={messageStyles.conversationsCard}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        </Card>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Card style={messageStyles.conversationsCard}>
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View style={messageStyles.listHeader}>
              <View>
                <Text style={messageStyles.headerTitle}>Recent Conversations</Text>
                <Text style={messageStyles.headerSubtitle}>Stay in touch with families and respond quickly.</Text>
              </View>
              <View style={messageStyles.headerBadge}>
                <Ionicons name="flash-outline" size={14} color="#2563EB" />
                <Text style={messageStyles.headerBadgeText}>{conversations.length}</Text>
              </View>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#5bbafa']}
              tintColor="#5bbafa"
            />
          }
          ListEmptyComponent={
            <View style={messageStyles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
              <Text style={messageStyles.emptyTitle}>No conversations yet</Text>
              <Text style={messageStyles.emptySubtitle}>
                Start messaging parents to see conversations here
              </Text>
            </View>
          }
          contentContainerStyle={conversations.length === 0 ? { flex: 1 } : null}
          showsVerticalScrollIndicator={false}
        />
      </Card>
    </KeyboardAvoidingView>
  );
};

const messageStyles = {
  conversationsCard: {
    flex: 1,
    margin: 8,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 14,
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  conversationAccent: {
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    backgroundColor: '#38BDF8',
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  defaultAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0284C7',
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FB7185',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  messageInfo: {
    flex: 1,
    marginRight: 12,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  parentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  timeIcon: {
    marginRight: 2,
  },
  messageTime: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  messagePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewIcon: {
    marginTop: 1,
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#1F2937',
  },
  listHeader: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  chevronIcon: {
    alignSelf: 'flex-start',
    marginTop: 25,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
};

export default MessagesTab;

import { useState, useEffect, useCallback, useRef } from 'react';
import { firebaseMessagingService } from '../../../services/firebaseMessagingService';
import { getMessageLazyLoadingSystem } from './MessagePerformanceSystem';

// Hook for lazy loading message history
export const useMessageLazyLoading = (conversationId, userId, caregiverId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState(null);

  const lazyLoadingSystem = getMessageLazyLoadingSystem();
  const unsubscribeRef = useRef(null);
  const isInitialized = useRef(false);

  // Initialize message listener
  useEffect(() => {
    if (!conversationId || isInitialized.current) return;

    console.log('📱 Initializing lazy loading for conversation:', conversationId);
    isInitialized.current = true;
    setLoading(true);

    // Set up real-time listener
    const unsubscribe = firebaseMessagingService.getMessages(
      userId,
      caregiverId,
      (newMessages) => {
        setMessages(newMessages);
        setLoading(false);
        setError(null);

        // Update pagination state
        if (newMessages.length > 0) {
          setHasMoreMessages(newMessages.length >= 50); // Assume more if we hit the limit
        }
      },
      conversationId
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [conversationId, userId, caregiverId]);

  // Load more messages (older messages)
  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMoreMessages || messages.length === 0) return;

    setLoadingMore(true);
    setError(null);

    try {
      const lastMessageId = messages[0]?.id;
      if (!lastMessageId) {
        setLoadingMore(false);
        return;
      }

      console.log('📄 Loading more messages before:', lastMessageId);

      // Get previous page using pagination system
      const olderMessages = await firebaseMessagingService.getPreviousMessagePage(
        conversationId,
        lastMessageId
      );

      if (olderMessages.length > 0) {
        setMessages(prevMessages => [...olderMessages, ...prevMessages]);
        setCurrentPage(prev => prev + 1);
        console.log(`✅ Loaded ${olderMessages.length} older messages`);
      } else {
        setHasMoreMessages(false);
        console.log('📄 No more older messages available');
      }
    } catch (err) {
      console.error('❌ Error loading more messages:', err);
      setError('Failed to load more messages. Please try again.');
    } finally {
      setLoadingMore(false);
    }
  }, [messages, hasMoreMessages, loadingMore, conversationId]);

  // Load newer messages (messages after current latest)
  const loadNewerMessages = useCallback(async () => {
    if (loadingMore || messages.length === 0) return;

    setLoadingMore(true);
    setError(null);

    try {
      const lastMessageId = messages[messages.length - 1]?.id;
      if (!lastMessageId) {
        setLoadingMore(false);
        return;
      }

      console.log('📄 Loading newer messages after:', lastMessageId);

      // Get next page using pagination system
      const newerMessages = await firebaseMessagingService.getNextMessagePage(
        conversationId,
        lastMessageId
      );

      if (newerMessages.length > 0) {
        setMessages(prevMessages => [...prevMessages, ...newerMessages]);
        console.log(`✅ Loaded ${newerMessages.length} newer messages`);
      } else {
        console.log('📄 No newer messages available');
      }
    } catch (err) {
      console.error('❌ Error loading newer messages:', err);
      setError('Failed to load newer messages. Please try again.');
    } finally {
      setLoadingMore(false);
    }
  }, [messages, loadingMore, conversationId]);

  // Refresh messages (pull to refresh)
  const refreshMessages = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Refreshing messages for conversation:', conversationId);

      // Clear current messages and reload
      setMessages([]);
      setCurrentPage(0);
      setHasMoreMessages(true);

      // The real-time listener will automatically reload messages
      // This gives a small delay for UI feedback
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error('❌ Error refreshing messages:', err);
      setError('Failed to refresh messages. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [conversationId, loading]);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check if we should load more messages based on scroll position
  const checkLoadMore = useCallback((scrollPosition) => {
    if (!lazyLoadingSystem || !conversationId) return;

    const loadRange = lazyLoadingSystem.calculateLoadRange(conversationId, scrollPosition, 'up');

    if (!lazyLoadingSystem.isRangeLoaded(conversationId, loadRange.startIndex, loadRange.endIndex) &&
        !lazyLoadingSystem.isLoading(conversationId)) {
      console.log('📄 Auto-loading messages for range:', loadRange);
      loadMoreMessages();
    }
  }, [conversationId, lazyLoadingSystem, loadMoreMessages]);

  // Get loading state for UI
  const getLoadingState = () => ({
    loading: loading,
    loadingMore: loadingMore,
    hasMoreMessages: hasMoreMessages,
    error: error,
    currentPage: currentPage,
    totalMessages: messages.length
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return {
    messages,
    loadingState: getLoadingState(),
    loadMoreMessages,
    loadNewerMessages,
    refreshMessages,
    clearError,
    checkLoadMore,
    hasMoreMessages
  };
};

// Hook for message pagination
export const useMessagePagination = (conversationId) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPage = useCallback(async (page) => {
    if (!conversationId) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`📄 Loading page ${page} for conversation:`, conversationId);

      const pageMessages = await firebaseMessagingService.getPaginatedMessages(
        conversationId,
        page,
        50
      );

      setMessages(pageMessages);
      setCurrentPage(page);
    } catch (err) {
      console.error('❌ Error loading page:', err);
      setError('Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const nextPage = useCallback(() => {
    loadPage(currentPage + 1);
  }, [currentPage, loadPage]);

  const previousPage = useCallback(() => {
    if (currentPage > 0) {
      loadPage(currentPage - 1);
    }
  }, [currentPage, loadPage]);

  const refresh = useCallback(() => {
    loadPage(0);
  }, [loadPage]);

  useEffect(() => {
    if (conversationId) {
      loadPage(0);
    }
  }, [conversationId, loadPage]);

  return {
    messages,
    currentPage,
    loading,
    error,
    nextPage,
    previousPage,
    refresh,
    hasNextPage: messages.length >= 50 // Assume more pages if we hit the limit
  };
};

// Hook for connection pool monitoring
export const useConnectionPool = () => {
  const [poolStats, setPoolStats] = useState(null);

  useEffect(() => {
    const updateStats = () => {
      try {
        const stats = firebaseMessagingService.getConnectionPoolStats();
        setPoolStats(stats);
      } catch (error) {
        console.error('❌ Error getting connection pool stats:', error);
      }
    };

    // Update stats every 30 seconds
    const interval = setInterval(updateStats, 30000);
    updateStats(); // Initial update

    return () => clearInterval(interval);
  }, []);

  return poolStats;
};

export default {
  useMessageLazyLoading,
  useMessagePagination,
  useConnectionPool
};

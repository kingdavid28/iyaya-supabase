import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseDatabase, firebaseRef as ref, firebaseOnValue as onValue, firebaseQuery as query, firebaseOrderByChild as orderByChild, firebaseLimitToLast as limitToLast, firebaseStartAfter as startAfter, firebaseEndBefore as endBefore } from '../../config/supabase.js';

// Message pagination constants
const MESSAGES_PER_PAGE = 50;
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes
const MAX_CACHED_CONVERSATIONS = 10;
const MAX_CACHED_MESSAGES = 1000;

// Message pagination system
class MessagePaginationSystem {
  constructor() {
    this.messageCache = new Map();
    this.conversationCache = new Map();
    this.activeListeners = new Map();
    this.paginationState = new Map();
  }

  // Get paginated messages for a conversation
  async getMessagesPaginated(conversationId, page = 0, limit = MESSAGES_PER_PAGE) {
    try {
      console.log(`📄 Getting messages page ${page} for ${conversationId}`);

      // Check cache first
      const cachedMessages = await this.getCachedMessages(conversationId);
      if (cachedMessages && this.isCacheValid(cachedMessages.timestamp)) {
        return this.getPaginatedFromCache(cachedMessages.messages, page, limit);
      }

      // Fetch from Firebase
      const db = await getFirebaseDatabase();
      const messagesRef = ref(db, `messages/${conversationId}`);
      const messagesQuery = query(
        messagesRef,
        orderByChild('timestamp')
      );

      // Calculate pagination offset
      const offset = page * limit;
      let paginatedQuery = query(messagesQuery, limitToLast(limit + offset));

      // If not first page, we need to get messages before the last known message
      if (page > 0) {
        const lastMessageId = this.getLastMessageIdForPage(conversationId, page - 1);
        if (lastMessageId) {
          const db = await getFirebaseDatabase();
          const lastMessageRef = ref(db, `messages/${conversationId}/${lastMessageId}`);
          paginatedQuery = query(
            messagesQuery,
            endBefore(lastMessageRef),
            limitToLast(limit)
          );
        }
      }

      const snapshot = await get(messagesQuery);
      if (!snapshot.exists()) {
        return [];
      }

      const messages = [];
      snapshot.forEach((childSnapshot) => {
        messages.unshift({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });

      // Cache the results
      await this.cacheMessages(conversationId, messages);

      return messages.slice(-limit);
    } catch (error) {
      console.error(`❌ Error getting paginated messages:`, error);
      return [];
    }
  }

  // Get next page of messages
  async getNextPage(conversationId, currentLastMessageId) {
    try {
      console.log(`📄 Getting next page after ${currentLastMessageId}`);

      const db = await getFirebaseDatabase();
      const messagesRef = ref(db, `messages/${conversationId}`);
      const messagesQuery = query(
        messagesRef,
        orderByChild('timestamp'),
        startAfter(currentLastMessageId),
        limitToLast(MESSAGES_PER_PAGE)
      );

      const snapshot = await get(messagesQuery);
      if (!snapshot.exists()) {
        return [];
      }

      const messages = [];
      snapshot.forEach((childSnapshot) => {
        messages.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });

      return messages;
    } catch (error) {
      console.error(`❌ Error getting next page:`, error);
      return [];
    }
  }

  // Get previous page of messages
  async getPreviousPage(conversationId, currentFirstMessageId) {
    try {
      console.log(`📄 Getting previous page before ${currentFirstMessageId}`);

      const db = await getFirebaseDatabase();
      const messagesRef = ref(db, `messages/${conversationId}`);
      const messagesQuery = query(
        messagesRef,
        orderByChild('timestamp'),
        endBefore(currentFirstMessageId),
        limitToLast(MESSAGES_PER_PAGE)
      );

      const snapshot = await get(messagesQuery);
      if (!snapshot.exists()) {
        return [];
      }

      const messages = [];
      snapshot.forEach((childSnapshot) => {
        messages.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });

      return messages;
    } catch (error) {
      console.error(`❌ Error getting previous page:`, error);
      return [];
    }
  }

  // Cache messages for better performance
  async cacheMessages(conversationId, messages) {
    try {
      const cacheData = {
        messages: messages,
        timestamp: Date.now(),
        conversationId: conversationId
      };

      // Store in memory cache
      this.messageCache.set(conversationId, cacheData);

      // Store in AsyncStorage for persistence
      const cacheKey = `@messages_cache_${conversationId}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));

      console.log(`💾 Cached ${messages.length} messages for ${conversationId}`);
    } catch (error) {
      console.error(`❌ Error caching messages:`, error);
    }
  }

  // Get cached messages
  async getCachedMessages(conversationId) {
    try {
      // Check memory cache first
      if (this.messageCache.has(conversationId)) {
        return this.messageCache.get(conversationId);
      }

      // Check AsyncStorage
      const cacheKey = `@messages_cache_${conversationId}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);

      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        this.messageCache.set(conversationId, parsedData);
        return parsedData;
      }

      return null;
    } catch (error) {
      console.error(`❌ Error getting cached messages:`, error);
      return null;
    }
  }

  // Check if cache is valid
  isCacheValid(timestamp) {
    return (Date.now() - timestamp) < CACHE_EXPIRY_TIME;
  }

  // Get paginated messages from cache
  getPaginatedFromCache(messages, page, limit) {
    const startIndex = Math.max(0, messages.length - ((page + 1) * limit));
    const endIndex = messages.length - (page * limit);
    return messages.slice(startIndex, endIndex);
  }

  // Get last message ID for pagination
  getLastMessageIdForPage(conversationId, page) {
    const paginationData = this.paginationState.get(conversationId);
    if (paginationData && paginationData.pages[page]) {
      return paginationData.pages[page].lastMessageId;
    }
    return null;
  }

  // Update pagination state
  updatePaginationState(conversationId, page, messages) {
    if (!this.paginationState.has(conversationId)) {
      this.paginationState.set(conversationId, { pages: {} });
    }

    const paginationData = this.paginationState.get(conversationId);
    paginationData.pages[page] = {
      lastMessageId: messages[messages.length - 1]?.id,
      firstMessageId: messages[0]?.id,
      messageCount: messages.length,
      timestamp: Date.now()
    };

    console.log(`📄 Updated pagination state for ${conversationId}, page ${page}`);
  }

  // Clean up old cache entries
  async cleanupCache() {
    try {
      const cacheKeys = await AsyncStorage.getAllKeys();
      const messageCacheKeys = cacheKeys.filter(key => key.startsWith('@messages_cache_'));

      if (messageCacheKeys.length > MAX_CACHED_CONVERSATIONS) {
        // Remove oldest entries
        const keysToRemove = messageCacheKeys.slice(0, messageCacheKeys.length - MAX_CACHED_CONVERSATIONS);

        await AsyncStorage.multiRemove(keysToRemove);
        console.log(`🧹 Cleaned up ${keysToRemove.length} old cache entries`);
      }
    } catch (error) {
      console.error(`❌ Error cleaning up cache:`, error);
    }
  }

  // Clear all cache
  async clearAllCache() {
    try {
      this.messageCache.clear();
      this.conversationCache.clear();

      const cacheKeys = await AsyncStorage.getAllKeys();
      const messageCacheKeys = cacheKeys.filter(key => key.startsWith('@messages_cache_'));

      await AsyncStorage.multiRemove(messageCacheKeys);
      console.log(`🧹 Cleared all message cache`);
    } catch (error) {
      console.error(`❌ Error clearing cache:`, error);
    }
  }
}

// Connection pooling for Firebase operations
class FirebaseConnectionPool {
  constructor() {
    this.pool = new Map();
    this.maxConnections = 5;
    this.connectionTimeout = 30000; // 30 seconds
    this.activeConnections = 0;
  }

  // Get or create a connection
  async getConnection(conversationId) {
    return new Promise((resolve, reject) => {
      const connectionKey = `messages/${conversationId}`;

      // Check if we already have a connection in the pool
      if (this.pool.has(connectionKey)) {
        const connection = this.pool.get(connectionKey);
        if (this.isConnectionValid(connection)) {
          console.log(`🔗 Reusing existing connection for ${conversationId}`);
          resolve(connection);
          return;
        } else {
          this.pool.delete(connectionKey);
        }
      }

      // Create new connection if under limit
      if (this.activeConnections < this.maxConnections) {
        this.createConnection(conversationId, resolve, reject);
      } else {
        // Wait for an existing connection to become available
        this.waitForAvailableConnection(conversationId, resolve, reject);
      }
    });
  }

  // Create a new connection
  async createConnection(conversationId, resolve, reject) {
    try {
      const connectionKey = `messages/${conversationId}`;
      const db = await getFirebaseDatabase();
      const messagesRef = ref(db, `messages/${conversationId}`);

      const connection = {
        ref: messagesRef,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        conversationId: conversationId,
        listeners: new Map()
      };

      this.pool.set(connectionKey, connection);
      this.activeConnections++;

      console.log(`🔗 Created new connection for ${conversationId} (${this.activeConnections}/${this.maxConnections})`);
      resolve(connection);
    } catch (error) {
      console.error(`❌ Error creating connection for ${conversationId}:`, error);
      reject(error);
    }
  }

  // Wait for an available connection
  waitForAvailableConnection(conversationId, resolve, reject) {
    const checkInterval = setInterval(() => {
      if (this.activeConnections < this.maxConnections) {
        clearInterval(checkInterval);
        this.createConnection(conversationId, resolve, reject);
      }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      reject(new Error(`Timeout waiting for available connection for ${conversationId}`));
    }, 10000);
  }

  // Check if connection is valid
  isConnectionValid(connection) {
    return (
      connection &&
      (Date.now() - connection.createdAt) < this.connectionTimeout
    );
  }

  // Release a connection
  releaseConnection(conversationId) {
    const connectionKey = `messages/${conversationId}`;
    const connection = this.pool.get(connectionKey);

    if (connection) {
      connection.lastUsed = Date.now();
      console.log(`🔗 Released connection for ${conversationId}`);
    }
  }

  // Clean up expired connections
  cleanup() {
    const now = Date.now();
    const toRemove = [];

    this.pool.forEach((connection, key) => {
      if ((now - connection.createdAt) > this.connectionTimeout) {
        toRemove.push(key);
      }
    });

    toRemove.forEach(key => {
      this.pool.delete(key);
      this.activeConnections = Math.max(0, this.activeConnections - 1);
    });

    if (toRemove.length > 0) {
      console.log(`🧹 Cleaned up ${toRemove.length} expired connections`);
    }
  }

  // Get pool statistics
  getPoolStats() {
    return {
      totalConnections: this.pool.size,
      activeConnections: this.activeConnections,
      maxConnections: this.maxConnections,
      utilization: (this.activeConnections / this.maxConnections * 100).toFixed(1) + '%'
    };
  }
}

// Enhanced message loading system with lazy loading
class MessageLazyLoadingSystem {
  constructor() {
    this.loadedRanges = new Map();
    this.loadingStates = new Map();
    this.messageBuffer = 100; // Load extra messages for smooth scrolling
  }

  // Check if messages are loaded for a range
  isRangeLoaded(conversationId, startIndex, endIndex) {
    const ranges = this.loadedRanges.get(conversationId) || [];
    return ranges.some(range =>
      range.start <= startIndex && range.end >= endIndex
    );
  }

  // Mark range as loaded
  markRangeLoaded(conversationId, startIndex, endIndex) {
    if (!this.loadedRanges.has(conversationId)) {
      this.loadedRanges.set(conversationId, []);
    }

    const ranges = this.loadedRanges.get(conversationId);
    ranges.push({ start: startIndex, end: endIndex, timestamp: Date.now() });
  }

  // Get loading state
  isLoading(conversationId) {
    return this.loadingStates.get(conversationId) || false;
  }

  // Set loading state
  setLoading(conversationId, loading) {
    this.loadingStates.set(conversationId, loading);
  }

  // Calculate optimal loading range
  calculateLoadRange(conversationId, currentIndex, direction = 'both') {
    const ranges = this.loadedRanges.get(conversationId) || [];

    if (ranges.length === 0) {
      // First load
      return {
        startIndex: Math.max(0, currentIndex - this.messageBuffer),
        endIndex: currentIndex + this.messageBuffer,
        direction: 'both'
      };
    }

    // Find the closest loaded range
    let closestRange = null;
    let closestDistance = Infinity;

    ranges.forEach(range => {
      const distance = Math.abs(currentIndex - (range.start + range.end) / 2);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestRange = range;
      }
    });

    if (!closestRange) {
      return {
        startIndex: Math.max(0, currentIndex - this.messageBuffer),
        endIndex: currentIndex + this.messageBuffer,
        direction: 'both'
      };
    }

    // Calculate load range based on direction and gaps
    const loadRange = { startIndex: currentIndex, endIndex: currentIndex };

    if (direction === 'up' || direction === 'both') {
      const gapAbove = currentIndex - closestRange.start;
      if (gapAbove > this.messageBuffer) {
        loadRange.startIndex = Math.max(0, currentIndex - this.messageBuffer);
      }
    }

    if (direction === 'down' || direction === 'both') {
      const gapBelow = closestRange.end - currentIndex;
      if (gapBelow > this.messageBuffer) {
        loadRange.endIndex = currentIndex + this.messageBuffer;
      }
    }

    return loadRange;
  }
}

// Singleton instances
let messagePaginationSystem = null;
let firebaseConnectionPool = null;
let messageLazyLoadingSystem = null;

export const getMessagePaginationSystem = () => {
  if (!messagePaginationSystem) {
    messagePaginationSystem = new MessagePaginationSystem();
  }
  return messagePaginationSystem;
};

export const getFirebaseConnectionPool = () => {
  if (!firebaseConnectionPool) {
    firebaseConnectionPool = new FirebaseConnectionPool();
  }
  return firebaseConnectionPool;
};

export const getMessageLazyLoadingSystem = () => {
  if (!messageLazyLoadingSystem) {
    messageLazyLoadingSystem = new MessageLazyLoadingSystem();
  }
  return messageLazyLoadingSystem;
};

export default {
  MessagePaginationSystem,
  FirebaseConnectionPool,
  MessageLazyLoadingSystem,
  getMessagePaginationSystem,
  getFirebaseConnectionPool,
  getMessageLazyLoadingSystem
};

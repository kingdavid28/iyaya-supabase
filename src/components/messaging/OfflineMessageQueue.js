import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const MESSAGE_QUEUE_KEY = '@messaging/pending_messages';
const CONNECTION_STATUS_KEY = '@messaging/connection_status';

class OfflineMessageQueue {
  constructor() {
    this.isOnline = true;
    this.pendingMessages = [];
    this.listeners = [];
    this.syncInProgress = false;
  }

  // Initialize the queue
  async initialize() {
    try {
      await this.loadPendingMessages();
      this.startConnectionMonitoring();
      console.log('📱 Offline message queue initialized');
    } catch (error) {
      console.error('❌ Failed to initialize message queue:', error);
    }
  }

  // Load pending messages from storage
  async loadPendingMessages() {
    try {
      const stored = await AsyncStorage.getItem(MESSAGE_QUEUE_KEY);
      if (stored) {
        this.pendingMessages = JSON.parse(stored);
        console.log(`📱 Loaded ${this.pendingMessages.length} pending messages`);
      }
    } catch (error) {
      console.error('❌ Failed to load pending messages:', error);
      this.pendingMessages = [];
    }
  }

  // Save pending messages to storage
  async savePendingMessages() {
    try {
      await AsyncStorage.setItem(MESSAGE_QUEUE_KEY, JSON.stringify(this.pendingMessages));
    } catch (error) {
      console.error('❌ Failed to save pending messages:', error);
    }
  }

  // Monitor connection status
  startConnectionMonitoring() {
    if (Platform.OS === 'web') {
      // Web: Use navigator.onLine
      this.isOnline = navigator.onLine;
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
    } else {
      // Mobile: Use NetInfo or similar
      this.checkConnectionStatus();
      // Set up periodic connection checks
      setInterval(() => this.checkConnectionStatus(), 30000); // Check every 30 seconds
    }
  }

  // Check connection status (mobile)
  async checkConnectionStatus() {
    try {
      // For now, we'll use a simple timeout-based check
      // In production, you'd use react-native-netinfo
      const previousStatus = this.isOnline;

      // Simple connectivity test - try to fetch a small resource
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          signal: controller.signal,
          cache: 'no-cache',
        });

        this.isOnline = response.ok;
      } catch (error) {
        this.isOnline = false;
      } finally {
        clearTimeout(timeoutId);
      }

      if (previousStatus !== this.isOnline) {
        await AsyncStorage.setItem(CONNECTION_STATUS_KEY, JSON.stringify({
          isOnline: this.isOnline,
          timestamp: Date.now()
        }));

        if (this.isOnline && !previousStatus) {
          console.log('📱 Connection restored - syncing messages');
          this.syncPendingMessages();
        }

        this.notifyListeners();
      }
    } catch (error) {
      console.error('❌ Connection check failed:', error);
      this.isOnline = false;
    }
  }

  // Handle online event
  handleOnline() {
    console.log('📱 Online event detected');
    this.isOnline = true;
    this.syncPendingMessages();
    this.notifyListeners();
  }

  // Handle offline event
  handleOffline() {
    console.log('📱 Offline event detected');
    this.isOnline = false;
    this.notifyListeners();
  }

  // Add message to queue
  async addMessage(message) {
    try {
      const queuedMessage = {
        ...message,
        id: `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        queuedAt: Date.now(),
        retryCount: 0,
        status: 'queued',
      };

      this.pendingMessages.push(queuedMessage);
      await this.savePendingMessages();

      console.log(`📱 Message queued for offline sending:`, queuedMessage.id);
      this.notifyListeners();

      // Try to sync immediately if online
      if (this.isOnline) {
        this.syncPendingMessages();
      }

      return queuedMessage.id;
    } catch (error) {
      console.error('❌ Failed to queue message:', error);
      throw error;
    }
  }

  // Sync pending messages
  async syncPendingMessages() {
    if (this.syncInProgress || !this.isOnline || this.pendingMessages.length === 0) {
      return;
    }

    this.syncInProgress = true;
    console.log(`📱 Starting sync of ${this.pendingMessages.length} pending messages`);

    const messagesToRemove = [];
    const messagesToRetry = [];

    for (const message of this.pendingMessages) {
      try {
        await this.sendQueuedMessage(message);
        messagesToRemove.push(message.id);
        console.log(`✅ Queued message sent successfully: ${message.id}`);
      } catch (error) {
        console.error(`❌ Failed to send queued message ${message.id}:`, error);
        message.retryCount++;

        if (message.retryCount >= 3) {
          // Mark as failed after 3 attempts
          message.status = 'failed';
          message.failedAt = Date.now();
          console.log(`💥 Message marked as failed after ${message.retryCount} attempts: ${message.id}`);
        } else {
          messagesToRetry.push(message);
        }
      }
    }

    // Remove successfully sent messages
    this.pendingMessages = this.pendingMessages.filter(
      msg => !messagesToRemove.includes(msg.id)
    );

    // Keep only retryable messages
    this.pendingMessages = messagesToRetry;

    await this.savePendingMessages();
    this.syncInProgress = false;
    this.notifyListeners();

    console.log(`📱 Sync completed. Remaining messages: ${this.pendingMessages.length}`);
  }

  // Send a queued message
  async sendQueuedMessage(message) {
    // Import the messaging service dynamically to avoid circular dependencies
    const { default: firebaseMessagingService } = await import('../../services/firebaseMessagingService');

    // Reconstruct the original message parameters
    const { conversationId, userId, caregiverId, messageText, messageType, fileData } = message;

    return await firebaseMessagingService.sendMessage(
      userId,
      caregiverId,
      messageText,
      messageType,
      fileData,
      conversationId
    );
  }

  // Get queue status
  getQueueStatus() {
    return {
      isOnline: this.isOnline,
      pendingCount: this.pendingMessages.length,
      failedCount: this.pendingMessages.filter(m => m.status === 'failed').length,
      queuedCount: this.pendingMessages.filter(m => m.status === 'queued').length,
    };
  }

  // Clear failed messages
  async clearFailedMessages() {
    this.pendingMessages = this.pendingMessages.filter(m => m.status !== 'failed');
    await this.savePendingMessages();
    this.notifyListeners();
  }

  // Retry failed messages
  async retryFailedMessages() {
    const failedMessages = this.pendingMessages.filter(m => m.status === 'failed');
    failedMessages.forEach(m => {
      m.status = 'queued';
      m.retryCount = 0;
      delete m.failedAt;
    });

    await this.savePendingMessages();
    this.notifyListeners();

    if (this.isOnline) {
      this.syncPendingMessages();
    }
  }

  // Add listener for queue changes
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify all listeners
  notifyListeners() {
    const status = this.getQueueStatus();
    this.listeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('❌ Error in queue listener:', error);
      }
    });
  }
}

// Singleton instance
let messageQueueInstance = null;

export const getMessageQueue = () => {
  if (!messageQueueInstance) {
    messageQueueInstance = new OfflineMessageQueue();
  }
  return messageQueueInstance;
};

// Hook for using message queue in components
export const useMessageQueue = () => {
  const queue = getMessageQueue();

  React.useEffect(() => {
    queue.initialize();

    const unsubscribe = queue.addListener((status) => {
      console.log('📱 Queue status updated:', status);
    });

    return unsubscribe;
  }, []);

  return {
    addMessage: (message) => queue.addMessage(message),
    getQueueStatus: () => queue.getQueueStatus(),
    clearFailedMessages: () => queue.clearFailedMessages(),
    retryFailedMessages: () => queue.retryFailedMessages(),
    isOnline: queue.isOnline,
  };
};

export default OfflineMessageQueue;

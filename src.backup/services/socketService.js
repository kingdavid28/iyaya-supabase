import io from 'socket.io-client';
import { getAuthToken } from '../utils/auth';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.messageHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  async connect(userId) {
    // Socket connection completely disabled
    return Promise.resolve();
  }

  setupEventHandlers() {
    // Socket event handlers disabled
    return;
  }

  handleReconnect() {
    // Reconnection disabled
    return;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.messageHandlers.clear();
  }

  // Room management
  joinConversation(conversationId) {
    if (this.socket?.connected) {
      this.socket.emit('join_conversation', conversationId);
    }
  }

  leaveConversation(conversationId) {
    if (this.socket?.connected) {
      this.socket.emit('leave_conversation', conversationId);
    }
  }

  // Typing indicators
  startTyping(conversationId) {
    if (this.socket?.connected) {
      this.socket.emit('typing_start', { conversationId });
    }
  }

  stopTyping(conversationId) {
    if (this.socket?.connected) {
      this.socket.emit('typing_stop', { conversationId });
    }
  }

  // Event handlers
  onNewMessage(handler) {
    this.messageHandlers.set('new_message', handler);
  }

  onNewNotification(handler) {
    this.messageHandlers.set('new_notification', handler);
  }

  onUserTyping(handler) {
    this.messageHandlers.set('user_typing', handler);
  }

  onUserStoppedTyping(handler) {
    this.messageHandlers.set('user_stopped_typing', handler);
  }

  // Job and application event handlers
  onNewJob(handler) {
    this.messageHandlers.set('new_job', handler);
  }

  onNewApplication(handler) {
    this.messageHandlers.set('new_application', handler);
  }

  onNewBooking(handler) {
    this.messageHandlers.set('new_booking', handler);
  }

  // Remove listener method
  removeListener(eventType) {
    this.messageHandlers.delete(eventType);
  }

  // Utility methods
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

export default new SocketService();
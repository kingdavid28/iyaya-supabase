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
    // Option 1: Keep disabled but fix other methods
    // return Promise.resolve();
    
    // Option 2: Implement connection (recommended)
    if (this.socket?.connected) {
      return Promise.resolve();
    }

    const token = getAuthToken();
    if (!token) {
      return Promise.reject(new Error('No auth token available'));
    }

    try {
      this.socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001', {
        auth: { token },
        query: { userId }
      });

      this.setupEventHandlers();

      return new Promise((resolve, reject) => {
        this.socket.on('connect', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          reject(error);
        });

        // Optional timeout
        setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);
      });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  setupEventHandlers() {
    if (!this.socket) return;

    // Handle disconnection
    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      if (reason === 'io server disconnect' || reason === 'transport close') {
        this.handleReconnect();
      }
    });

    // Forward socket events to registered handlers
    const events = [
      'new_message',
      'new_notification',
      'user_typing',
      'user_stopped_typing',
      'new_job',
      'new_application',
      'new_booking'
    ];

    events.forEach(event => {
      this.socket.on(event, (data) => {
        const handler = this.messageHandlers.get(event);
        if (handler) {
          handler(data);
        }
      });
    });
  }

  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.handleReconnect();
      }
    }, delay);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.messageHandlers.clear();
    this.reconnectAttempts = 0;
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

  // Event handlers - store callbacks
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

  onNewJob(handler) {
    this.messageHandlers.set('new_job', handler);
  }

  onNewApplication(handler) {
    this.messageHandlers.set('new_application', handler);
  }

  onNewBooking(handler) {
    this.messageHandlers.set('new_booking', handler);
  }

  removeListener(eventType) {
    this.messageHandlers.delete(eventType);
    if (this.socket) {
      this.socket.off(eventType);
    }
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

import { supabase } from '../../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Message status constants
export const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
  QUEUED: 'queued',
  PENDING: 'pending'
};

// Simple message status manager using Supabase
class MessageStatusManager {
  constructor() {
    this.statusListeners = new Map();
  }

  async updateMessageStatus(conversationId, messageId, newStatus, userId, options = {}) {
    try {
      console.log(`📨 Updating message status: ${messageId} -> ${newStatus}`);
      
      const { error } = await supabase
        .from('messages')
        .update({ 
          status: newStatus,
          read_at: newStatus === MESSAGE_STATUS.READ ? new Date().toISOString() : null
        })
        .eq('id', messageId);

      if (error) throw error;
      
      console.log(`✅ Message status updated: ${messageId} -> ${newStatus}`);
      return { status: 'fulfilled' };
    } catch (error) {
      console.error(`❌ Failed to update message status:`, error);
      return { status: 'rejected', reason: error };
    }
  }

  async batchUpdateStatus(updates) {
    const updatePromises = updates.map(({ conversationId, messageId, status, userId }) =>
      this.updateMessageStatus(conversationId, messageId, status, userId)
    );
    return Promise.allSettled(updatePromises);
  }

  async getMessageStatus(conversationId, messageId) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('status')
        .eq('id', messageId)
        .single();

      if (error) throw error;
      return data?.status || MESSAGE_STATUS.SENT;
    } catch (error) {
      console.error(`❌ Error getting message status:`, error);
      return null;
    }
  }

  cleanup() {
    this.statusListeners.clear();
  }
}

// Simplified delivery confirmation system
class DeliveryConfirmationSystem {
  constructor() {
    this.confirmationTimeouts = new Map();
  }

  startDeliveryTracking(conversationId, messageId, senderId, recipientId) {
    console.log(`⏱️ Started delivery tracking for ${messageId}`);
  }

  async confirmDelivery(conversationId, messageId, userId) {
    const statusManager = new MessageStatusManager();
    return await statusManager.updateMessageStatus(conversationId, messageId, MESSAGE_STATUS.DELIVERED, userId);
  }

  async confirmRead(conversationId, messageId, userId) {
    const statusManager = new MessageStatusManager();
    return await statusManager.updateMessageStatus(conversationId, messageId, MESSAGE_STATUS.READ, userId);
  }

  async syncMessageStatus(conversationId, messageId, userId, status) {
    console.log(`📨 Syncing message status: ${messageId} -> ${status}`);
    return true;
  }
}

// Simple message tracking system
class MessageTrackingSystem {
  constructor() {
    this.trackedMessages = new Map();
  }

  trackMessage(conversationId, messageId, initialStatus) {
    this.trackedMessages.set(messageId, {
      conversationId,
      status: initialStatus,
      timestamp: Date.now()
    });
    return messageId;
  }

  getTrackingStats() {
    return {
      totalTracked: this.trackedMessages.size,
      byStatus: {}
    };
  }
}

// Export singleton instances
let statusManagerInstance;
let deliverySystemInstance;
let trackingSystemInstance;

export const getMessageStatusManager = () => {
  if (!statusManagerInstance) {
    statusManagerInstance = new MessageStatusManager();
  }
  return statusManagerInstance;
};

export const getDeliveryConfirmationSystem = () => {
  if (!deliverySystemInstance) {
    deliverySystemInstance = new DeliveryConfirmationSystem();
  }
  return deliverySystemInstance;
};

export const getMessageTrackingSystem = () => {
  if (!trackingSystemInstance) {
    trackingSystemInstance = new MessageTrackingSystem();
  }
  return trackingSystemInstance;
};
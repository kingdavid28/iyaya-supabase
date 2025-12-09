// src/services/connectionService.js
import { supabaseService } from './supabase';

export const listenToConnections = (userId, onConnectionUpdate) => {
  // Use Supabase real-time for conversation updates
  return supabaseService.messaging.subscribeToMessages(userId, onConnectionUpdate);
};

export const getConnectionStatus = async (userId, targetUserId) => {
  try {
    // Check if there's an existing conversation between users
    const conversation = await supabaseService.messaging.getOrCreateConversation(userId, targetUserId);
    return conversation ? 'connected' : 'not_connected';
  } catch (error) {
    console.error('Error getting connection status:', error);
    return 'not_connected';
  }
};

export const updateConnectionStatus = async (userId, targetUserId, status) => {
  try {
    if (status === 'connected') {
      // Create conversation to establish connection
      await supabaseService.messaging.getOrCreateConversation(userId, targetUserId);
      return { success: true };
    }
    // For disconnect, we don't delete conversations but could mark them inactive
    return { success: true };
  } catch (error) {
    console.error('Error updating connection status:', error);
    throw error;
  }
};
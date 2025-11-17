// hooks/useFirebaseMessaging.js
import { useEffect, useState, useCallback } from 'react';
import { useFirebase } from './useFirebase';
import { safeOnValue, safeSet, testFirebaseConnection } from '../config/supabase';

export const useFirebaseMessaging = () => {
  const { isReady, error: firebaseError } = useFirebase();
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  // Test connection when Firebase is ready
  useEffect(() => {
    if (isReady && !firebaseError) {
      testFirebaseConnection().then(connected => {
        setIsConnected(connected);
      });
    }
  }, [isReady, firebaseError]);

  // Safe message listener
  const listenToMessages = useCallback((conversationId, callback) => {
    if (!isReady) {
      console.warn('Firebase not ready yet');
      return () => {};
    }

    return safeOnValue(`messages/${conversationId}`, (snapshot) => {
      const data = snapshot.val();
      callback(data);
    });
  }, [isReady]);

  // Safe send message
  const sendMessage = useCallback(async (conversationId, message) => {
    if (!isReady) {
      throw new Error('Firebase not ready');
    }

    return await safeSet(`messages/${conversationId}/${Date.now()}`, {
      text: message,
      timestamp: Date.now(),
      sender: 'user'
    });
  }, [isReady]);

  return {
    isReady,
    isConnected,
    messages,
    firebaseError,
    listenToMessages,
    sendMessage
  };
};

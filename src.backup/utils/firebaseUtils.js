// src/utils/firebaseUtils.js
import {
    createConnectionsRef,
    safeDatabaseOperation,
    onValue,
    off,
    ref,
    getFirebaseDatabase
  } from '../config/supabase';

/**
 * Safely manages a Firebase connection reference
 * @param {string} path - The path to the connections node
 * @param {Function} callback - Callback function when data changes
 * @returns {Promise<Function>} Unsubscribe function
 */
export const setupConnectionListener = async (path, callback) => {
  try {
    const connectionsRef = await createConnectionsRef();
    // Create child reference using the database instance
    const db = await getFirebaseDatabase();
    const connectionRef = ref(db, `connections/${path}`);

    // Set up the listener
    onValue(connectionRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({
          id: snapshot.key,
          ...snapshot.val()
        });
      } else {
        callback(null);
      }
    });

    // Return cleanup function
    return () => off(connectionRef);
  } catch (error) {
    console.error('Error setting up connection listener:', error);
    throw error;
  }
};

/**
 * Safe operation for connection-related database operations
 */
export const withConnection = safeDatabaseOperation('connection operation');
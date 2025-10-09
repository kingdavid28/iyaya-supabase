// src/services/connectionService.js
import { setupConnectionListener, withConnection } from '../utils/firebaseUtils';
import { ref, get, update } from '../config/supabase';

export const listenToConnections = (userId, onConnectionUpdate) => {
  return setupConnectionListener(`users/${userId}/connections`, onConnectionUpdate);
};

export const getConnectionStatus = async (userId, targetUserId) => {
  return withConnection(async (db) => {
    // Use Firebase v9 syntax: ref(db, path)
    const connectionRef = ref(db, `connections/${userId}/${targetUserId}`);
    const snapshot = await get(connectionRef);
    return snapshot.val();
  });
};

export const updateConnectionStatus = async (userId, targetUserId, status) => {
  return withConnection(async (db) => {
    const updates = {};
    updates[`connections/${userId}/${targetUserId}`] = status;
    updates[`connections/${targetUserId}/${userId}`] = status;
    // Use Firebase v9 syntax: update(ref(db), updates)
    return update(ref(db), updates);
  });
};
// firebase.js - Enhanced with better synchronization
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, off, push, set, query, orderByChild, get, update, limitToLast, startAfter, endBefore, equalTo } from 'firebase/database';
import { getAuth, initializeAuth, getReactNativePersistence, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Validate configuration
const requiredFields = ['apiKey', 'projectId', 'databaseURL'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field] || firebaseConfig[field] === 'undefined');

if (missingFields.length > 0) {
  console.error('❌ Missing required Firebase environment variables:', missingFields);
  throw new Error(`Missing Firebase configuration: ${missingFields.join(', ')}`);
}

console.log('✅ Firebase configuration loaded successfully');

// State management
let app = null;
let database = null;
let auth = null;
let isInitializing = false;
let initializationPromise = null;

// Core initialization function
const initializeFirebaseCore = async () => {
  if (isInitializing) {
    console.log('⏳ Firebase initialization already in progress...');
    return initializationPromise;
  }

  isInitializing = true;
  console.log('🔥 Starting Firebase initialization...');

  initializationPromise = (async () => {
    try {
      // Check for existing apps
      const existingApps = getApps();
      if (existingApps.length > 0) {
        app = existingApps[0];
        console.log('✅ Using existing Firebase app');
      } else {
        app = initializeApp(firebaseConfig);
        console.log('✅ Firebase app initialized successfully');
      }

      // Initialize database
      database = getDatabase(app);
      console.log('✅ Firebase database initialized successfully');

      // Initialize auth
      if (Platform.OS === 'web') {
        auth = getAuth(app);
      } else {
        auth = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage)
        });
      }
      console.log('✅ Firebase Auth initialized successfully');

      isInitializing = false;
      return { app, database, auth };
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      isInitializing = false;
      throw error;
    }
  })();

  return initializationPromise;
};

// Public initialization function
export const initializeFirebase = async () => {
  if (app && database && auth) {
    return { app, database, auth };
  }
  return await initializeFirebaseCore();
};

// Safe database getter
export const getDatabaseSafely = async () => {
  try {
    const isInitialized = await ensureFirebaseInitialized();
    if (!isInitialized) {
      throw new Error('Firebase not initialized');
    }
    return database;
  } catch (error) {
    console.error('❌ Error getting database safely:', error);
    return null;
  }
};

// Test Firebase connection
export const testFirebaseConnection = async () => {
  try {
    const isInitialized = await ensureFirebaseInitialized();
    if (!isInitialized) {
      console.log('❌ Firebase not initialized');
      return false;
    }
    
    const db = await getFirebaseDatabase();
    if (!db) {
      console.log('❌ Database not available');
      return false;
    }
    
    console.log('✅ Firebase connection test passed');
    return true;
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    return false;
  }
};

// Safe getters with initialization
export const getFirebaseApp = async () => {
  if (!app) {
    await initializeFirebase();
  }
  return app;
};

export const getFirebaseDatabase = async () => {
  if (!database) {
    await initializeFirebase();
  }
  return database;
};

export const getFirebaseAuth = async () => {
  if (!auth) {
    await initializeFirebase();
  }
  return auth;
};

// Synchronous getters (use with caution)
export const getDatabaseSync = () => {
  if (!database) {
    throw new Error('Database not initialized. Call initializeFirebase() first.');
  }
  return database;
};

export const getAuthSync = () => {
  if (!auth) {
    throw new Error('Auth not initialized. Call initializeFirebase() first.');
  }
  return auth;
};

// Safe operation wrappers
export const withDatabase = async (operation) => {
  const db = await getFirebaseDatabase();
  return operation(db);
};

export const withAuth = async (operation) => {
  const authInstance = await getFirebaseAuth();
  return operation(authInstance);
};

// Safe reference creation
export const createRef = async (path) => {
  const db = await getFirebaseDatabase();
  return ref(db, path);
};

export const safeUpdate = async (updates) => {
  const db = await getFirebaseDatabase();
  return update(ref(db), updates);
};

// Safe database operation wrapper
export const safeDatabaseOperation = (operationName, operation) => {
  return async (...args) => {
    console.log(`🔄 Executing ${operationName}...`);

    try {
      const result = await operation(...args);
      console.log(`✅ ${operationName} completed successfully`);
      return result;
    } catch (error) {
      console.error(`❌ ${operationName} failed:`, error);
      throw error;
    }
  };
};

// Enhanced safe operations
export const safeOnValue = async (path, callback, options) => {
  const dbRef = await createRef(path);
  return onValue(dbRef, callback, options);
};

export const safeSet = async (path, data) => {
  const dbRef = await createRef(path);
  return set(dbRef, data);
};

export const safePush = async (path, data) => {
  const dbRef = await createRef(path);
  return push(dbRef, data);
};

export const safeGet = async (path) => {
  const dbRef = await createRef(path);
  return get(dbRef);
};

// Initialize Firebase immediately but don't block exports
initializeFirebase().catch(error => {
  console.error('Failed to initialize Firebase:', error);
});

// Export Firebase methods
export {
  ref,
  onValue,
  off,
  push,
  set,
  query,
  orderByChild,
  get,
  update,
  limitToLast,
  startAfter,
  endBefore,
  equalTo,
  onAuthStateChanged,
  signInAnonymously
};

// Export instances with clear naming (use async getters instead)
export {
  app as firebaseApp,
  auth as firebaseAuth
};
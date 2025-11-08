import AsyncStorage from "@react-native-async-storage/async-storage"
import { createContext, useContext, useEffect, useReducer, useRef } from "react"
import { Alert } from "react-native"

import { STORAGE_KEYS } from "../config/constants"
import { bookingsAPI, jobsAPI } from "../services"
import { logger } from "../utils/logger"

// Initial State
const initialState = {
  // Auth State
  user: null,
  userProfile: null,
  isAuthenticated: false,
  authLoading: true,

  // App State
  isOnboardingComplete: false,
  currentRoute: null,
  networkStatus: "online",

  // UI State
  theme: "light",
  language: "en",
  notifications: [],

  // Data State
  jobs: [],
  caregivers: [],
  applications: [],
  messages: [],
  bookings: [],

  // Loading States
  loading: {
    jobs: false,
    caregivers: false,
    applications: false,
    messages: false,
    profile: false,
    auth: false,
  },

  // Error States
  errors: {
    auth: null,
    network: null,
    validation: null,
    general: null,
  },
}

// Normalize backend role naming to what the app expects
const normalizeRole = (role) => (role === 'client' ? 'parent' : role)

// Action Types
export const ACTION_TYPES = {
  // Auth Actions
  SET_AUTH_LOADING: "SET_AUTH_LOADING",
  SET_USER: "SET_USER",
  SET_USER_PROFILE: "SET_USER_PROFILE",
  LOGOUT: "LOGOUT",

  // App Actions
  SET_ONBOARDING_COMPLETE: "SET_ONBOARDING_COMPLETE",
  SET_CURRENT_ROUTE: "SET_CURRENT_ROUTE",
  SET_NETWORK_STATUS: "SET_NETWORK_STATUS",

  // UI Actions
  SET_THEME: "SET_THEME",
  SET_LANGUAGE: "SET_LANGUAGE",
  ADD_NOTIFICATION: "ADD_NOTIFICATION",
  REMOVE_NOTIFICATION: "REMOVE_NOTIFICATION",

  // Data Actions
  SET_JOBS: "SET_JOBS",
  SET_NANNIES: "SET_NANNIES",
  SET_APPLICATIONS: "SET_APPLICATIONS",
  SET_MESSAGES: "SET_MESSAGES",
  SET_BOOKINGS: "SET_BOOKINGS",

  // Loading Actions
  SET_LOADING: "SET_LOADING",

  // Error Actions
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  CLEAR_ALL_ERRORS: "CLEAR_ALL_ERRORS",
}

// Reducer
const appReducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.SET_AUTH_LOADING:
      return { ...state, authLoading: action.payload }

    case ACTION_TYPES.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        authLoading: false,
      }

    case ACTION_TYPES.SET_USER_PROFILE:
      return { ...state, userProfile: action.payload }

    case ACTION_TYPES.LOGOUT:
      console.log('[AppContext] LOGOUT action - clearing all auth state')
      return {
        ...initialState,
        authLoading: false,
        isAuthenticated: false, // Explicitly set to false
        user: null, // Explicitly set to null
        userProfile: null, // Explicitly set to null
        theme: state.theme,
        language: state.language,
        isOnboardingComplete: state.isOnboardingComplete, // Preserve onboarding state
      }

    case ACTION_TYPES.SET_ONBOARDING_COMPLETE:
      return { ...state, isOnboardingComplete: action.payload }

    case ACTION_TYPES.SET_CURRENT_ROUTE:
      return { ...state, currentRoute: action.payload }

    case ACTION_TYPES.SET_NETWORK_STATUS:
      return { ...state, networkStatus: action.payload }

    case ACTION_TYPES.SET_THEME:
      return { ...state, theme: action.payload }

    case ACTION_TYPES.SET_LANGUAGE:
      return { ...state, language: action.payload }

    case ACTION_TYPES.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      }

    case ACTION_TYPES.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.payload),
      }

    case ACTION_TYPES.SET_JOBS:
      return { ...state, jobs: action.payload }

    case ACTION_TYPES.SET_NANNIES:
      return { ...state, caregivers: action.payload }

    case ACTION_TYPES.SET_APPLICATIONS:
      return { ...state, applications: action.payload }

    case ACTION_TYPES.SET_MESSAGES:
      return { ...state, messages: action.payload }

    case ACTION_TYPES.SET_BOOKINGS:
      return { ...state, bookings: action.payload }

    case ACTION_TYPES.SET_LOADING:
      return {
        ...state,
        loading: { ...state.loading, [action.payload.key]: action.payload.value }, // Fixed structure
      }

    case ACTION_TYPES.SET_ERROR:
      return {
        ...state,
        errors: { ...state.errors, [action.payload.key]: action.payload.value }, // Fixed structure
      }

    case ACTION_TYPES.CLEAR_ERROR:
      return {
        ...state,
        errors: { ...state.errors, [action.payload]: null }, // Simplified
      }

    case ACTION_TYPES.CLEAR_ALL_ERRORS:
      return {
        ...state,
        errors: initialState.errors, // Use initial state
      }

    default:
      return state
  }
}

// Context
const AppContext = createContext()

// Provider Component
const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState)
  // Dev-only toggle to allow auto-mock auth in Expo Go / dev
  const ALLOW_UNVERIFIED = (process?.env?.EXPO_PUBLIC_ALLOW_UNVERIFIED === 'true') || (__DEV__ === true)
  // New: explicit flag to enable/disable dev auto-mock login
  const DEV_AUTOMOCK = (process?.env?.EXPO_PUBLIC_DEV_AUTOMOCK === 'true')
  const devMockApplied = useRef(false)
  // Bridge: consume JWT-based auth from AuthContext - removed to prevent circular dependency
  // const { user: authUser, loading: authLoading } = useAuth()
  const authUser = null;
  const authLoading = false;

  // Helper function for error handling
  const handleError = (key, error) => {
    logger.error(`Error in ${key}:`, error)
    dispatch({
      type: ACTION_TYPES.SET_ERROR,
      payload: {
        key,
        value: error.message || "An unknown error occurred",
      },
    })
  }

  // Initialize app
  useEffect(() => {
    const init = async () => {
      try {
        await initializeApp()
      } catch (error) {
        handleError("general", error)
      }
    }
    init()
  }, [])

  // Mirror AuthContext user into AppContext so isAuthenticated aligns with JWT auth
  useEffect(() => {
    if (authLoading) return

    if (authUser) {
      const normalized = authUser?.role ? { ...authUser, role: normalizeRole(authUser.role) } : authUser
      dispatch({ type: ACTION_TYPES.SET_USER, payload: normalized })
      dispatch({ type: ACTION_TYPES.SET_USER_PROFILE, payload: normalized })
    } else {
      // When JWT auth signs out, immediately clear AppContext state
      console.log('[AppContext] AuthUser is null, dispatching LOGOUT')
      dispatch({ type: ACTION_TYPES.LOGOUT })
    }
  }, [authUser, authLoading])

  // Dev-only: Auto-mock user to unblock navigation in Expo Go when allowed
  useEffect(() => {
    if (devMockApplied.current) return
    // Only apply auto-mock when explicitly enabled
    if (!DEV_AUTOMOCK) return
    if (!ALLOW_UNVERIFIED) return
    if (state.isAuthenticated) return

    const mockUser = {
      uid: "dev-mock-uid",
      email: "dev@example.com",
      displayName: "Dev User",
    }
    dispatch({ type: ACTION_TYPES.SET_USER, payload: mockUser })
    dispatch({ type: ACTION_TYPES.SET_USER_PROFILE, payload: { uid: mockUser.uid, role: "parent", name: mockUser.displayName } })
    devMockApplied.current = true
  }, [DEV_AUTOMOCK, ALLOW_UNVERIFIED, state.isAuthenticated])

  const initializeApp = async () => {
    try {
      // Load persisted data
      await loadPersistedData()

      // Initialize auth listener
      return initializeAuthListener()
    } catch (error) {
      handleError("general", error)
      throw error
    }
  }

  const loadPersistedData = async () => {
    try {
      const [onboardingComplete, theme, language] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE),
        AsyncStorage.getItem(STORAGE_KEYS.THEME_PREFERENCE),
        AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE_PREFERENCE),
      ])

      dispatch({
        type: ACTION_TYPES.SET_ONBOARDING_COMPLETE,
        payload: onboardingComplete === "true",
      })

      if (theme) {
        dispatch({ type: ACTION_TYPES.SET_THEME, payload: theme })
      }

      if (language) {
        dispatch({ type: ACTION_TYPES.SET_LANGUAGE, payload: language })
      }
    } catch (error) {
      logger.error("Failed to load persisted data:", error)
    }
  }

  const initializeAuthListener = () => {
    // AuthContext is managing Supabase auth, no need for additional listener
    dispatch({ type: ACTION_TYPES.SET_AUTH_LOADING, payload: false })
    return () => { }
  }

  // Action Creators
  const actions = {
    login: async (email, password) => {
      // Login is handled by AuthContext/Supabase
      throw new Error('Use AuthContext.signIn instead')
    },

    register: async (userData) => {
      // Registration is handled by AuthContext/Supabase
      throw new Error('Use AuthContext.signUp instead')
    },

    logout: async () => {
      // Logout is handled by AuthContext/Supabase
      dispatch({ type: ACTION_TYPES.LOGOUT })
    },

    setMockUser: () => {
      const mockUser = {
        uid: "mock-user-123",
        email: "test@example.com",
        displayName: "Test User",
      }
      dispatch({ type: ACTION_TYPES.SET_USER, payload: mockUser })
    },

    // Booking Actions
    loadBookings: async () => {
      try {
        dispatch({
          type: ACTION_TYPES.SET_LOADING,
          payload: { key: "bookings", value: true },
        });

        // Check if user is authenticated before making API calls
        if (!state.user) {
          console.log('User not authenticated - skipping bookings load');
          dispatch({
            type: ACTION_TYPES.SET_BOOKINGS,
            payload: [],
          });
          return [];
        }

        if (!state.user.role) {
          Alert.alert('Error', 'User is missing role. Please log in again.');
          dispatch({ type: ACTION_TYPES.SET_ERROR, payload: { key: 'general', value: 'User not loaded or missing role' } });
          return;
        }

        // Use Supabase service instead of old API
        const result = await bookingsAPI.getMy();
        const bookings = result.data || [];
        dispatch({
          type: ACTION_TYPES.SET_BOOKINGS,
          payload: bookings,
        });
        return bookings;
      } catch (error) {
        console.warn('Failed to load bookings:', error.message);
        dispatch({
          type: ACTION_TYPES.SET_BOOKINGS,
          payload: [],
        });
      } finally {
        dispatch({
          type: ACTION_TYPES.SET_LOADING,
          payload: { key: "bookings", value: false },
        });
      }
    },

    // Job Actions
    loadJobs: async (filters = {}) => {
      try {
        dispatch({
          type: ACTION_TYPES.SET_LOADING,
          payload: { key: "jobs", value: true },
        });

        // Check if user is authenticated before making API calls
        if (!state.user) {
          console.log('User not authenticated - skipping jobs load');
          dispatch({
            type: ACTION_TYPES.SET_JOBS,
            payload: [],
          });
          return [];
        }

        if (!state.user.role) {
          Alert.alert('Error', 'User is missing role. Please log in again.');
          dispatch({ type: ACTION_TYPES.SET_ERROR, payload: { key: 'general', value: 'User not loaded or missing role' } });
          return;
        }

        // Use Supabase service instead of old API
        const result = await jobsAPI.getAvailable();
        const jobs = result.data || [];
        dispatch({
          type: ACTION_TYPES.SET_JOBS,
          payload: jobs,
        });
        return jobs;
      } catch (error) {
        console.warn('Failed to load jobs:', error.message);
        dispatch({
          type: ACTION_TYPES.SET_JOBS,
          payload: [],
        });
      } finally {
        dispatch({
          type: ACTION_TYPES.SET_LOADING,
          payload: { key: "jobs", value: false },
        });
      }
    },

    updateChildren: async (children) => {
      try {
        dispatch({
          type: ACTION_TYPES.SET_LOADING,
          payload: { key: "profile", value: true },
        });
        // Use Supabase service instead of old API
        const { childrenAPI } = await import('../services');
        const result = await childrenAPI.getMy();
        // Update userProfile in state
        dispatch({
          type: ACTION_TYPES.SET_USER_PROFILE,
          payload: result?.data ? { ...result.data, role: normalizeRole(result.data.role) } : result.data,
        });
        return result.data;
      } catch (error) {
        handleError("general", error);
        throw error;
      } finally {
        dispatch({
          type: ACTION_TYPES.SET_LOADING,
          payload: { key: "profile", value: false },
        });
      }
    },

    updateProfile: async (profileData) => {
      try {
        dispatch({
          type: ACTION_TYPES.SET_LOADING,
          payload: { key: "profile", value: true },
        })

        if (!state.user) {
          throw new Error("No authenticated user")
        }

        // Use Supabase service instead of old API
        const { authAPI } = await import('../services');
        const updatedProfile = await authAPI.updateProfile(profileData)

        dispatch({
          type: ACTION_TYPES.SET_USER_PROFILE,
          payload: updatedProfile ? { ...updatedProfile, role: normalizeRole(updatedProfile.role) } : updatedProfile,
        })
        return updatedProfile
      } catch (error) {
        handleError("general", error)
        throw error
      } finally {
        dispatch({
          type: ACTION_TYPES.SET_LOADING,
          payload: { key: "profile", value: false },
        })
      }
    },
  }

  const value = { state, dispatch, actions }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// Hook
const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within AppProvider")
  }
  return context
}

export { AppProvider, useApp }
export default AppContext

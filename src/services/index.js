// Supabase Services - Replaces Firebase/MongoDB backend
import { supabaseService } from './supabaseService'
import { supabase } from '../config/supabase'

// Helper to get current user with error handling
const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      // AuthSessionMissingError is expected when no user is logged in
      if (error.message.includes('AuthSessionMissingError') || error.message.includes('Auth session missing')) {
        return null
      }
      console.warn('Auth session error:', error.message)
      return null
    }
    return user
  } catch (error) {
    // Handle AuthSessionMissingError silently as it's expected
    if (error.message.includes('AuthSessionMissingError') || error.message.includes('Auth session missing')) {
      return null
    }
    console.warn('Failed to get current user:', error.message)
    return null
  }
}

// Main API service using Supabase
export const apiService = {
  // Auth operations
  auth: {
    login: async (credentials) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      })
      if (error) throw error
      return { data, success: true }
    },

    register: async (userData) => {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: { data: userData }
      })
      if (error) throw error
      return { data, success: true }
    },

    getProfile: async (userId = null) => {
      const user = await getCurrentUser()
      if (!user) {
        console.warn('No authenticated user for getProfile')
        return { data: null }
      }
      try {
        const data = await supabaseService.getProfile(user.id)
        return { data }
      } catch (error) {
        console.warn('Failed to get profile:', error.message)
        return { data: null }
      }
    },

    updateProfile: async (data) => {
      const user = await getCurrentUser()
      if (!user) {
        console.warn('No authenticated user for updateProfile')
        throw new Error('Not authenticated')
      }
      return await supabaseService.updateProfile(user.id, data)
    },

    uploadProfileImage: async (imageUri) => {
      const user = await getCurrentUser()
      if (!user) {
        console.warn('No authenticated user for uploadProfileImage')
        throw new Error('Not authenticated')
      }
      return await supabaseService.uploadProfileImage(user.id, imageUri)
    },

    resetPassword: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
      return { success: true }
    },

    logout: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { success: true }
    }
  },

  // Caregiver operations
  caregivers: {
    getAll: async (filters = {}) => {
      console.log('🔍 API Service - Getting caregivers with filters:', filters)
      const data = await supabaseService.getCaregivers(filters)
      console.log('🔍 API Service - Caregivers data:', data)
      return { data }
    },

    getProfile: async () => {
      const user = await getCurrentUser()
      if (!user) {
        console.warn('No authenticated user for caregiver getProfile')
        return { data: null }
      }
      try {
        const data = await supabaseService.getProfile(user.id)
        return { data }
      } catch (error) {
        console.warn('Failed to get caregiver profile:', error.message)
        return { data: null }
      }
    },

    updateProfile: async (data) => {
      const user = await getCurrentUser()
      if (!user) {
        console.warn('No authenticated user for caregiver updateProfile')
        throw new Error('Not authenticated')
      }
      return await supabaseService.updateProfile(user.id, data)
    }
  },

  // Job operations
  jobs: {
    getAvailable: async (filters = {}) => {
      console.log('📋 API Service - Getting available jobs with filters:', filters)
      const data = await supabaseService.getJobs(filters)
      console.log('📋 API Service - Available jobs data:', data)
      return { data }
    },

    getMy: async () => {
      const user = await getCurrentUser()
      if (!user) {
        console.warn('No authenticated user for getMy jobs')
        return { data: [] }
      }
      try {
        console.log('📋 API Service - Getting jobs for user:', user.id)
        const data = await supabaseService.getMyJobs(user.id)
        console.log('📋 API Service - Jobs data:', data)
        return { data }
      } catch (error) {
        console.warn('Failed to get my jobs:', error.message)
        return { data: [] }
      }
    },

    getById: async (jobId) => {
      const data = await supabaseService.getJobs({ id: jobId })
      return { data: data[0] || null }
    },

    create: async (jobData) => {
      const user = await getCurrentUser()
      if (!user) {
        console.warn('No authenticated user for create job')
        throw new Error('Not authenticated')
      }
      try {
        const profile = await supabaseService.getProfile(user.id)
        const data = await supabaseService.createJob({
          ...jobData,
          client_id: user.id,
          client_name: profile?.name || user.email
        })
        return { data }
      } catch (error) {
        console.error('Failed to create job:', error.message)
        throw error
      }
    },

    update: async (jobId, jobData) => {
      return await supabaseService.updateJob(jobId, jobData)
    },

    delete: async (jobId) => {
      return await supabaseService.deleteJob(jobId)
    }
  },

  // Application operations
  applications: {
    getMy: async () => {
      const user = await getCurrentUser()
      if (!user) {
        console.warn('No authenticated user for getMy applications')
        return { data: [] }
      }
      try {
        console.log('📋 API Service - Getting applications for user:', user.id)
        const data = await supabaseService.getMyApplications(user.id)
        console.log('📋 API Service - Applications data:', data)
        return { data }
      } catch (error) {
        console.warn('Failed to get my applications:', error.message)
        return { data: [] }
      }
    },

    apply: async (applicationData) => {
      const user = await getCurrentUser()
      if (!user) {
        console.warn('No authenticated user for apply')
        throw new Error('Not authenticated')
      }
      return await supabaseService.applyToJob(
        applicationData.jobId,
        user.id,
        applicationData.message
      )
    },

    updateStatus: async (applicationId, status) => {
      return await supabaseService.updateApplicationStatus(applicationId, status)
    },

    getForJob: async (jobId) => {
      const data = await supabaseService.getJobApplications(jobId)
      return { data }
    }
  },

  // Booking operations
  bookings: {
    getMy: async () => {
      const user = await getCurrentUser()
      if (!user) return { data: [] }
      try {
        console.log('📅 API Service - Getting bookings for user:', user.id)
        const profile = await supabaseService.getProfile(user.id)
        const role = profile?.role || 'parent' // Default to parent if no role found
        console.log('📅 API Service - User role:', role)
        const data = await supabaseService.getMyBookings(user.id, role)
        console.log('📅 API Service - Bookings data:', data)
        return { data }
      } catch (error) {
        console.warn('Failed to get bookings:', error.message)
        return { data: [] }
      }
    },

    create: async (bookingData) => {
      const user = await getCurrentUser()
      if (!user) throw new Error('Not authenticated')
      return await supabaseService.createBooking({
        ...bookingData,
        parent_id: user.id
      })
    },

    updateStatus: async (bookingId, status) => {
      return await supabaseService.updateBookingStatus(bookingId, status)
    },

    uploadPaymentProof: async (bookingId, imageUri) => {
      const imageUrl = await supabaseService.uploadPaymentProofImage(bookingId, imageUri)
      return await supabaseService.uploadPaymentProof(bookingId, imageUrl)
    }
  },

  // Children operations
  children: {
    getMy: async () => {
      const user = await getCurrentUser()
      if (!user) return { data: [] }
      console.log('👶 API Service - Getting children for user:', user.id)
      const data = await supabaseService.getChildren(user.id)
      console.log('👶 API Service - Children data:', data)
      return { data }
    },

    create: async (childData) => {
      const user = await getCurrentUser()
      if (!user) throw new Error('Not authenticated')
      return await supabaseService.addChild(user.id, childData)
    },

    update: async (childId, childData) => {
      return await supabaseService.updateChild(childId, childData)
    },

    delete: async (childId) => {
      return await supabaseService.deleteChild(childId)
    }
  },

  // Messaging operations
  messaging: {
    getConversations: async () => {
      const user = await getCurrentUser()
      if (!user) return { data: [] }
      const data = await supabaseService.getConversations(user.id)
      return { data }
    },

    getMessages: async (conversationId) => {
      const data = await supabaseService.getMessages(conversationId)
      return { data: { messages: data } }
    },

    sendMessage: async (messageData) => {
      const user = await getCurrentUser()
      if (!user) throw new Error('Not authenticated')
      
      // Get or create conversation
      const conversation = await supabaseService.getOrCreateConversation(
        user.id,
        messageData.recipientId
      )
      
      return await supabaseService.sendMessage(
        conversation.id,
        user.id,
        messageData.recipientId,
        messageData.content
      )
    },

    startConversation: async (recipientId, initialMessage) => {
      const user = await getCurrentUser()
      if (!user) throw new Error('Not authenticated')
      
      const conversation = await supabaseService.getOrCreateConversation(user.id, recipientId)
      
      if (initialMessage) {
        await supabaseService.sendMessage(
          conversation.id,
          user.id,
          recipientId,
          initialMessage
        )
      }
      
      return { data: conversation }
    },

    markAsRead: async (conversationId) => {
      const user = await getCurrentUser()
      if (!user) return true
      await supabaseService.markMessagesAsRead(conversationId, user.id)
      return true
    }
  }
}

// Export individual services for backward compatibility
export const authAPI = apiService.auth
export const caregiversAPI = apiService.caregivers
export const jobsAPI = apiService.jobs
export const applicationsAPI = apiService.applications
export const bookingsAPI = apiService.bookings
export const childrenAPI = apiService.children
export const messagingAPI = apiService.messaging
export const messagingService = apiService.messaging

// Real-time subscriptions
export const realtimeService = {
  subscribeToMessages: (conversationId, callback) => {
    return supabaseService.subscribeToMessages(conversationId, callback)
  },

  subscribeToApplications: (jobId, callback) => {
    return supabaseService.subscribeToApplications(jobId, callback)
  },

  subscribeToBookings: (userId, callback) => {
    return supabaseService.subscribeToBookings(userId, callback)
  }
}

// API URL configuration - Now using Supabase
export const getCurrentAPIURL = () => {
  return process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
}

export const getCurrentSocketURL = () => {
  return process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
}

export default apiService
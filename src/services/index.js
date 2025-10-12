// Modern Supabase Services - Main export
export { supabaseService } from './supabase';
import { supabaseService } from './supabase';

// Service structure expected by hooks
export const supabaseClient = {
  auth: {
    getProfile: async () => {
      try {
        const user = await supabaseService._getCurrentUser();
        return user ? { data: await supabaseService.getProfile(user.id) } : { data: null };
      } catch (error) {
        console.error('Error getting profile:', error);
        return { data: null, error };
      }
    },
    updateProfile: (userId, data) => supabaseService.updateProfile(userId, data),
    getCurrentUser: () => supabaseService._getCurrentUser()
  },
  jobs: {
    getMy: async () => {
      try {
        const user = await supabaseService._getCurrentUser();
        return user ? supabaseService.getMyJobs(user.id) : [];
      } catch (error) {
        return [];
      }
    },
    getAll: () => supabaseService.getJobs(),
    create: (data) => supabaseService.createJob(data),
    update: (id, data) => supabaseService.updateJob(id, data),
    delete: (id) => supabaseService.deleteJob(id)
  },
  caregivers: {
    getAll: () => supabaseService.getCaregivers(),
    getProfile: (id) => supabaseService.getProfile(id)
  },
  bookings: {
    getMy: (userId, role) => supabaseService.getMyBookings(userId, role),
    create: (data) => supabaseService.createBooking(data),
    update: (id, data) => supabaseService.updateBookingStatus(id, data),
    cancel: (id) => supabaseService.cancelBooking(id)
  },
  children: {
    getAll: (parentId) => supabaseService.getChildren(parentId),
    getChildren: (parentId) => supabaseService.getChildren(parentId),
    create: (parentId, data) => supabaseService.addChild(parentId, data),
    update: (id, data) => supabaseService.updateChild(id, data),
    delete: (id) => supabaseService.deleteChild(id)
  },
  profile: supabaseService,
  applications: {
    getMy: (userId) => supabaseService.getMyApplications(userId),
    getForJob: (jobId) => supabaseService.getJobApplications(jobId),
    create: (jobId, caregiverId, message) => supabaseService.applyToJob(jobId, caregiverId, message),
    updateStatus: (id, status) => supabaseService.updateApplicationStatus(id, status)
  }
};

// Legacy compatibility
export const apiService = supabaseClient;

// Individual exports
export const authAPI = supabaseService;
export const jobsAPI = supabaseClient.jobs;
export const bookingsAPI = supabaseClient.bookings;
export const childrenAPI = supabaseClient.children;
export const profileAPI = supabaseService;
export const applicationsAPI = supabaseClient.applications;
export const caregiversAPI = supabaseClient.caregivers;

// Modern Supabase services
export const messagingService = supabaseService.messaging;
export const realtimeService = supabaseService.realtime;
export const imageUploadService = supabaseService.storage;
export const notificationService = supabaseService.notifications;
export const reviewService = supabaseService.reviews;

// Migrated services
export { childService } from './childService';
export { caregiverProfileService } from './caregiverProfileService';
export { settingsService } from './settingsService';
export { default as ratingService } from './ratingService';
export { default as connectionService } from './connectionService';
export { imageUploadService as imageService } from './imageUploadService';

// Legacy compatibility
export const messagingAPI = supabaseService.messaging;
export const ratingsAPI = supabaseService.reviews;
export const settingsAPI = supabaseService.user;
export const connectionsAPI = supabaseService.messaging;

// Supabase utilities
export const getCurrentAPIURL = () => {
  return process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
}

// Default export for backward compatibility
export default supabaseService;
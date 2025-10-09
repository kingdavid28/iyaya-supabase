// Supabase Services - Main export
export { default as supabaseService } from './supabaseService';
import supabaseService from './supabaseService';

// Service structure expected by hooks
export const supabaseClient = {
  auth: supabaseService,
  jobs: supabaseService,
  caregivers: supabaseService,
  bookings: supabaseService,
  children: supabaseService,
  profile: supabaseService,
  applications: supabaseService
};

// Legacy compatibility
export const apiService = supabaseClient;

// Individual exports
export const authAPI = supabaseService;
export const jobsAPI = supabaseService;
export const bookingsAPI = supabaseService;
export const childrenAPI = supabaseService;
export const profileAPI = supabaseService;
export const applicationsAPI = supabaseService;

// Supabase services
export { default as messagingService } from './MessagingService';
export { default as realtimeService } from './realtimeService';
export { default as imageUploadService } from './imageUploadService';

// Legacy compatibility
export { default as messagingAPI } from './MessagingService';

// Supabase utilities
export const getCurrentAPIURL = () => {
  return process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
}

// Default export for backward compatibility
export { default } from './supabaseService';
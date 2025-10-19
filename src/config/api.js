// Consolidated API - Uses new service layer with enhanced features
// Provides backward compatibility while using improved architecture

import {
  authAPI,
  jobsAPI,
  applicationsAPI,
  bookingsAPI,
  childrenAPI,
  messagingService,
  getCurrentAPIURL,
  getCurrentSocketURL
} from '../services';
import { supabase } from './supabase';
import { tokenManager } from '../utils/tokenManager';

// Export for backward compatibility
export const API_BASE_URL = getCurrentAPIURL();

console.log('✅ Using consolidated API service with enhanced features.');
console.log('🔗 API URL:', API_BASE_URL);

// Export utilities
export { getCurrentAPIURL, getCurrentSocketURL };

// Function to update API URL dynamically
export const setAPIBaseURL = (newURL) => {
  console.log('API URL should be updated to:', newURL);
};

// Export consolidated auth API
export { authAPI };

// Export consolidated caregivers API
export const caregiversAPI = {
  getProfile: () => authAPI.getProfile(),
  updateProfile: (data) => authAPI.updateProfile(data),
  createProfile: (data) => authAPI.updateProfile(data)
};

// Export consolidated jobs API
export { jobsAPI };

// Export consolidated bookings API
export { bookingsAPI };

// Export consolidated applications API
export { applicationsAPI };

// Export consolidated children API
export { childrenAPI };

// Enhanced uploads API with multiple methods and fallbacks
export const uploadsAPI = {
  // Profile image upload with multiple method names for compatibility
  uploadProfileImage: authAPI.uploadProfileImage,
  uploadProfileImageBase64: authAPI.uploadProfileImage, // Alias for backward compatibility
  uploadImage: authAPI.uploadProfileImage, // Generic image upload
  
  // Document upload functionality
  uploadDocument: async (documentData) => {
    try {
      console.log('📄 [UPLOAD] Uploading document:', {
        type: documentData.documentType,
        fileName: documentData.fileName,
        folder: documentData.folder
      });

      // If it's a base64 document
      if (documentData.documentBase64) {
        const response = await authAPI.uploadProfileImage(documentData.documentBase64);
        return {
          url: response?.url || response?.data?.url || response,
          fileName: documentData.fileName,
          type: documentData.documentType
        };
      }
      
      // If it's FormData
      if (documentData instanceof FormData) {
        // For FormData uploads, you might need a different endpoint
        // This is a stub - implement based on your backend
        console.warn('FormData upload not fully implemented');
        return { url: 'temp-url', fileName: 'document' };
      }
      
      throw new Error('Unsupported document format');
    } catch (error) {
      console.error('❌ [UPLOAD] Document upload failed:', error);
      throw error;
    }
  },

  // Portfolio image upload
  uploadPortfolioImage: authAPI.uploadProfileImage,

  // Generic file upload
  uploadFile: async (fileData, options = {}) => {
    try {
      console.log('📁 [UPLOAD] Uploading file:', {
        type: options.type || 'file',
        folder: options.folder || 'uploads'
      });

      if (fileData.base64) {
        return await authAPI.uploadProfileImage(fileData.base64);
      }
      
      if (fileData instanceof FormData) {
        // Handle FormData uploads
        // This would need to be implemented based on your backend
        console.warn('FormData file upload not fully implemented');
        return { url: 'temp-url' };
      }
      
      throw new Error('Unsupported file format');
    } catch (error) {
      console.error('❌ [UPLOAD] File upload failed:', error);
      throw error;
    }
  }
};

// Direct upload function for fallback scenarios
export const directUploadAPI = {
  uploadImage: async (base64Image, options = {}) => {
    try {
      console.log('🔄 [DIRECT UPLOAD] Using direct upload method');
      
      const baseURL = getCurrentAPIURL();
      const endpoint = `${baseURL}/upload/image`;
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const payload = {
        image: base64Image,
        mimeType: options.mimeType || 'image/jpeg',
        folder: options.folder || 'profile',
        fileName: options.fileName || `image-${Date.now()}.jpg`
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ [DIRECT UPLOAD] Success:', result);
      return result;
    } catch (error) {
      console.error('❌ [DIRECT UPLOAD] Failed:', error);
      throw error;
    }
  }
};

// Export messaging service
export { messagingService };

// Export messaging API for backward compatibility
export const messagingAPI = {
  markRead: (conversationId) => messagingService.markAsRead(conversationId),
  getConversations: () => messagingService.getConversations(),
  getMessages: (conversationId) => messagingService.getMessages(conversationId),
  sendMessage: (payload) => messagingService.sendMessage(payload.conversationId, payload.text, payload.recipientId)
};

// Privacy API (stub implementation)
export const privacyAPI = {
  getPrivacySettings: () => ({ data: null }),
  getPendingRequests: () => ({ data: [] }),
  getPrivacyNotifications: () => ({ data: [] }),
  updatePrivacySettings: () => ({ success: true }),
  requestInformation: () => ({ success: true }),
  respondToRequest: () => ({ success: true }),
  grantPermission: () => ({ success: true }),
  revokePermission: () => ({ success: true }),
  markNotificationAsRead: () => ({ success: true })
};

// Enhanced upload utility with multiple fallbacks
export const uploadUtility = {
  // Main upload method with fallbacks
  uploadWithFallbacks: async (data, options = {}) => {
    const fallbacks = [];

    if (typeof uploadsAPI.uploadProfileImage === 'function') {
      fallbacks.push(() => uploadsAPI.uploadProfileImage(data));
    }

    if (typeof uploadsAPI.uploadImage === 'function') {
      fallbacks.push(() => uploadsAPI.uploadImage(data));
    }

    if (typeof directUploadAPI.uploadImage === 'function') {
      fallbacks.push(() => directUploadAPI.uploadImage(data, options));
    }

    if (fallbacks.length === 0) {
      throw new Error('No available upload methods');
    }

    for (let i = 0; i < fallbacks.length; i++) {
      try {
        console.log(`🔄 [UPLOAD] Trying method ${i + 1}/${fallbacks.length}`);
        const result = await fallbacks[i]();
        console.log(`✅ [UPLOAD] Method ${i + 1} succeeded`);
        return result;
      } catch (error) {
        console.warn(`⚠️ [UPLOAD] Method ${i + 1} failed:`, error.message);
        if (i === fallbacks.length - 1) {
          throw error; // Re-throw if all methods fail
        }
      }
    }
  },

  // Check upload function availability
  checkUploadAvailability: () => {
    const availableMethods = {
      uploadProfileImage: typeof uploadsAPI.uploadProfileImage === 'function',
      uploadProfileImageBase64: typeof uploadsAPI.uploadProfileImageBase64 === 'function',
      uploadImage: typeof uploadsAPI.uploadImage === 'function',
      directUpload: typeof directUploadAPI.uploadImage === 'function'
    };
    
    console.log('🔍 [UPLOAD] Available methods:', availableMethods);
    return availableMethods;
  }
};

// Export token manager for advanced usage
export { tokenManager };

// Remove apiService export to prevent circular dependencies
// export { apiService };
// export default apiService;

// Export default for convenience
export default {
  authAPI,
  caregiversAPI,
  jobsAPI,
  bookingsAPI,
  applicationsAPI,
  childrenAPI,
  uploadsAPI,
  directUploadAPI,
  uploadUtility,
  messagingAPI,
  privacyAPI,
  getCurrentAPIURL,
  getCurrentSocketURL,
  tokenManager
};
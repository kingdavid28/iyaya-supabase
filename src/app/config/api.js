// Supabase configuration - no longer using old backend
const API_BASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://myiyrmiiywwgismcpith.supabase.co';

console.log('🔗 Using Supabase instead of old backend API');

// CSRF Token Management
let csrfToken = null;
const getCSRFToken = async () => {
  if (csrfToken) return csrfToken;
  try {
    const response = await fetch(`${API_BASE_URL}/auth/csrf-token`, {
      method: 'GET',
      credentials: 'include'
    });
    const data = await response.json();
    csrfToken = data.token || data.csrfToken;
    return csrfToken;
  } catch (error) {
    console.warn('CSRF token fetch failed, using fallback');
    return null;
  }
};

// Auto-detect API URL based on network
const detectAPIURL = async () => {
  const commonIPs = ['192.168.1.26', '192.168.1.10', '192.168.0.10', '10.0.0.10', '172.16.0.10'];

  for (const ip of commonIPs) {
    try {
      const response = await fetch(`http://${ip}:5000/api/health`, {
        method: 'GET',
        timeout: 2000
      });
      if (response.ok) {
        console.log(`✅ Found backend at ${ip}:5000`);
        return `http://${ip}:5000/api`;
      }
    } catch (error) {
      // Continue to next IP
    }
  }

  // Fallback to default
  return 'http://192.168.1.9:5000/api';
};

export const getCurrentAPIURL = () => API_BASE_URL;
export const getCurrentSocketURL = () => API_BASE_URL;

// Function to update API URL dynamically
export const setAPIBaseURL = (newURL) => {
  // This would require app restart to take effect
  console.log('API URL should be updated to:', newURL);
};

// Auth API
export const authAPI = {
  async login(credentials) {
    const csrf = await getCSRFToken();
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': csrf
      },
      body: JSON.stringify(credentials)
    });
    return response.json();
  },

  async register(userData) {
    const csrf = await getCSRFToken();
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': csrf
      },
      body: JSON.stringify(userData)
    });
    return response.json();
  },

  async getProfile() {
    const { tokenManager } = await import('../utils/tokenManager');
    const token = await tokenManager.getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }
    
    const response = await fetch(`${API_BASE_URL}/auth/firebase-profile`, {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Profile fetch failed: ${response.status}`);
    }
    
    return response.json();
  },

  async updateProfile(updateData) {
    const token = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('@auth_token'));
    if (!token) {
      throw new Error('No auth token found');
    }
    
    const csrf = await getCSRFToken();
    const response = await fetch(`${API_BASE_URL}/auth/firebase-profile`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-CSRF-Token': csrf
      },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      throw new Error(`Profile update failed: ${response.status}`);
    }
    
    return response.json();
  },

  async uploadProfileImageBase64(imageBase64, mimeType) {
    const token = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('@auth_token'));
    if (!token) {
      throw new Error('No auth token found');
    }
    
    const csrf = await getCSRFToken();
    const response = await fetch(`${API_BASE_URL}/auth/upload-profile-image`, {
      method: 'POST',
      credentials: 'include',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-CSRF-Token': csrf
      },
      body: JSON.stringify({ imageBase64, mimeType })
    });
    
    if (!response.ok) {
      throw new Error(`Image upload failed: ${response.status}`);
    }
    
    return response.json();
  },

  async resetPassword(email) {
    const csrf = await getCSRFToken();
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      credentials: 'include',
      headers: { 
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': csrf
      },
      body: JSON.stringify({ email })
    });
    return response.json();
  },

  async setRole(role) {
    const token = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('@auth_token'));
    const csrf = await getCSRFToken();
    const response = await fetch(`${API_BASE_URL}/auth/role`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': csrf
      },
      body: JSON.stringify({ role })
    });
    return response.json();
  },
  async verifyEmail(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-email/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Email verification failed');
      }

      return data;
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }
};

// Caregivers API
export const caregiversAPI = {
  async getCaregivers() {
    const response = await fetch(`${API_BASE_URL}/caregivers`);
    
    if (!response.ok) {
      throw new Error(`Caregivers fetch failed: ${response.status}`);
    }
    
    return response.json();
  },

  async getMyProfile() {
    const { tokenManager } = await import('../utils/tokenManager');
    const token = await tokenManager.getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }
    
    const response = await fetch(`${API_BASE_URL}/caregivers/profile`, {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Caregiver profile fetch failed: ${response.status}`);
    }
    
    return response.json();
  },

  async updateMyProfile(profileData) {
    const { tokenManager } = await import('../utils/tokenManager');
    const token = await tokenManager.getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }
    
    const csrf = await getCSRFToken();
    const response = await fetch(`${API_BASE_URL}/caregivers/profile`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': csrf
      },
      body: JSON.stringify(profileData)
    });
    
    if (!response.ok) {
      throw new Error(`Caregiver profile update failed: ${response.status}`);
    }
    
    return response.json();
  },

  async createProfile(profileData) {
    const token = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('@auth_token'));
    if (!token) {
      throw new Error('No auth token found');
    }
    
    const csrf = await getCSRFToken();
    const response = await fetch(`${API_BASE_URL}/caregivers/profile`, {
      method: 'POST',
      credentials: 'include',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': csrf
      },
      body: JSON.stringify(profileData)
    });
    
    if (!response.ok) {
      throw new Error(`Caregiver profile creation failed: ${response.status}`);
    }
    
    return response.json();
  },

  async getMyChildren() {
    const token = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('@auth_token'));
    if (!token) {
      throw new Error('No auth token found');
    }
    
    const response = await fetch(`${API_BASE_URL}/profile/children`, {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Children fetch failed: ${response.status}`);
    }
    
    return response.json();
  }
};

// Jobs API
export const jobsAPI = {
  async getMyJobs() {
    const token = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('@auth_token'));
    if (!token) throw new Error('No auth token found');
    
    const response = await fetch(`${API_BASE_URL}/jobs/my`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },

  async getAvailableJobs() {
    const token = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('@auth_token'));
    if (!token) throw new Error('No auth token found');
    
    const response = await fetch(`${API_BASE_URL}/jobs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }
};

// Bookings API
export const bookingsAPI = {
  async create(bookingData) {
    const token = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('@auth_token'));
    if (!token) throw new Error('No auth token found');
    
    const csrf = await getCSRFToken();
    const response = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      credentials: 'include',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': csrf
      },
      body: JSON.stringify(bookingData)
    });
    return response.json();
  },

  async getMy() {
    const token = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('@auth_token'));
    if (!token) throw new Error('No auth token found');
    
    const response = await fetch(`${API_BASE_URL}/bookings/my`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },

  async uploadPaymentProof(bookingId, imageBase64, mimeType) {
    const token = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('@auth_token'));
    if (!token) throw new Error('No auth token found');
    
    const csrf = await getCSRFToken();
    const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/payment-proof`, {
      method: 'POST',
      credentials: 'include',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': csrf
      },
      body: JSON.stringify({ imageBase64, mimeType })
    });
    return response.json();
  }
};

// Applications API
export const applicationsAPI = {
  async getMyApplications() {
    const token = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('@auth_token'));
    if (!token) throw new Error('No auth token found');
    
    const response = await fetch(`${API_BASE_URL}/applications/my`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  },

  async apply(jobId, applicationData) {
    const token = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('@auth_token'));
    if (!token) throw new Error('No auth token found');
    
    const csrf = await getCSRFToken();
    const response = await fetch(`${API_BASE_URL}/applications`, {
      method: 'POST',
      credentials: 'include',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': csrf
      },
      body: JSON.stringify({ jobId, ...applicationData })
    });
    return response.json();
  }
};

// Children API
export const childrenAPI = {
  async getMyChildren() {
    const token = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('@auth_token'));
    if (!token) throw new Error('No auth token found');
    
    const response = await fetch(`${API_BASE_URL}/children`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error(`Children fetch failed: ${response.status}`);
    }
    
    return response.json();
  },

  async create(childData) {
    const token = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('@auth_token'));
    if (!token) throw new Error('No auth token found');
    
    const csrf = await getCSRFToken();
    const response = await fetch(`${API_BASE_URL}/children`, {
      method: 'POST',
      credentials: 'include',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': csrf
      },
      body: JSON.stringify(childData)
    });
    
    if (!response.ok) {
      throw new Error(`Child creation failed: ${response.status}`);
    }
    
    return response.json();
  },

  async update(childId, childData) {
    const token = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('@auth_token'));
    if (!token) throw new Error('No auth token found');
    
    const csrf = await getCSRFToken();
    const response = await fetch(`${API_BASE_URL}/children/${childId}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': csrf
      },
      body: JSON.stringify(childData)
    });
    
    if (!response.ok) {
      throw new Error(`Child update failed: ${response.status}`);
    }
    
    return response.json();
  }
};

// Uploads API
export const uploadsAPI = {
  async base64Upload({ imageBase64, mimeType, folder = 'uploads', name }) {
    const token = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('@auth_token'));
    if (!token) {
      throw new Error('No auth token found');
    }
    
    const csrf = await getCSRFToken();
    const response = await fetch(`${API_BASE_URL}/auth/upload-profile-image`, {
      method: 'POST',
      credentials: 'include',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': csrf
      },
      body: JSON.stringify({ imageBase64, mimeType, folder, name })
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    return response.json();
  },

  async uploadDocument({ documentBase64, mimeType, documentType, name }) {
    const token = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('@auth_token'));
    if (!token) {
      throw new Error('No auth token found');
    }
    
    const csrf = await getCSRFToken();
    const response = await fetch(`${API_BASE_URL}/auth/upload-profile-image`, {
      method: 'POST',
      credentials: 'include',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': csrf
      },
      body: JSON.stringify({ 
        imageBase64: documentBase64, 
        mimeType, 
        folder: 'documents',
        name: name || `${documentType}_${Date.now()}`
      })
    });
    
    if (!response.ok) {
      throw new Error(`Document upload failed: ${response.status}`);
    }
    
    return response.json();
  }
};

// Privacy API (stub implementation to prevent errors)
export const privacyAPI = {
  async getPrivacySettings() {
    return { data: null };
  },
  
  async getPendingRequests() {
    return { data: [] };
  },
  
  async getPrivacyNotifications() {
    return { data: [] };
  },
  
  async updatePrivacySettings(settings) {
    return { success: true };
  },
  
  async requestInformation(requestData) {
    return { success: true };
  },
  
  async respondToRequest(responseData) {
    return { success: true };
  },
  
  async grantPermission(targetUserId, viewerUserId, fields, expiresIn) {
    return { success: true };
  },
  
  async revokePermission(targetUserId, viewerUserId, fields) {
    return { success: true };
  },
  
  async markNotificationAsRead(notificationId) {
    return { success: true };
  }
};


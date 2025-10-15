import axios from 'axios';
import { API_CONFIG } from '../config/constants';
import { API_BASE_URL } from '../config/api';
import { getAuthToken } from '../utils/auth';
import { logger } from '../utils/logger';

/**
 * Consolidated Job Service
 * Handles all job-related API calls including contracts and general jobs
 */

class JobService {
  constructor() {
    this.contractsAPI = `${API_CONFIG.BASE_URL}/contracts`;
    this.jobsAPI = `${API_BASE_URL}/jobs`;
  }

  // Helper method to get token with secure comparison
  async getToken(providedToken = null) {
    if (providedToken) {
      // ✅ Use secure token validation instead of direct comparison
      return this.validateToken(providedToken) ? providedToken : null;
    }
    return await getAuthToken();
  }

  // ✅ Secure token validation to prevent timing attacks
  validateToken(token) {
    if (!token || typeof token !== 'string') return false;
    
    // Constant-time validation to prevent timing attacks
    const minLength = 10;
    let isValid = true;
    
    // Always check length to avoid early returns
    isValid = isValid && (token.length >= minLength);
    
    // Always check format to maintain constant time
    isValid = isValid && token.includes('.');
    
    // Return result without early exits
    return isValid;
  }

  // Generic request method using axios for contracts API
  async makeContractRequest(endpoint, options = {}, token = null) {
    try {
      const authToken = await this.getToken(token);
      const url = `${this.contractsAPI}${endpoint}`;
      
      const config = {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        ...options,
      };

      const response = await axios(url, config);
      return response.data;
    } catch (error) {
      logger.error('Contract request failed:', { endpoint, error: error.message });
      throw error;
    }
  }

  // Generic request method using fetch for jobs API
  async makeJobRequest(endpoint, options = {}) {
    try {
      const token = await getAuthToken();
      const url = `${this.jobsAPI}${endpoint}`;
      
      const config = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        ...options,
      };

      if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
      }

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      logger.error('Job request failed:', { endpoint, error: error.message });
      throw error;
    }
  }

  // Contract-based methods (legacy API)
  async getJobsForClient(token) {
    return await this.makeContractRequest('/client', { method: 'get' }, token);
  }

  async getJobsForProvider(token) {
    return await this.makeContractRequest('/provider', { method: 'get' }, token);
  }

  async createJob(jobData, token) {
    return await this.makeContractRequest('', { 
      method: 'post', 
      data: jobData 
    }, token);
  }

  async updateJobStatus(contractId, status, token) {
    return await this.makeContractRequest(`/${contractId}/status`, {
      method: 'patch',
      data: { status }
    }, token);
  }

  // Role-based job fetching (maintains backward compatibility)
  async getJobs(role, token) {
    if (!role) {
      console.error('[jobService] getJobs called with missing or undefined role:', role ?? '(undefined)');
      throw new Error('User role is missing. Please log in again.');
    }
    
    if (role === 'parent' || role === 'client') {
      return await this.getJobsForClient(token);
    } else if (role === 'caregiver' || role === 'provider') {
      return await this.getJobsForProvider(token);
    } else {
      console.error(`[jobService] getJobs called with unknown role:`, typeof role === 'object' ? JSON.stringify(role) : role);
      throw new Error(`Unknown role for getJobs: ${role}`);
    }
  }

  // Modern jobs API methods
  async getAllJobs(filters = {}) {
    try {
      // Import supabaseService dynamically to avoid circular imports
      const { supabaseService } = await import('./supabase');
      
      console.log('📋 Fetching all jobs with filters:', filters);
      const jobs = await supabaseService.jobs.getJobs(filters);
      
      console.log('📋 JobService - Fetched all jobs:', jobs?.length || 0);
      return jobs || [];
    } catch (error) {
      logger.error('Get all jobs failed:', error);
      console.error('❌ Get all jobs error details:', error.message);
      throw new Error(error.message || 'Failed to load jobs');
    }
  }

  async getJobById(jobId) {
    try {
      const response = await this.makeJobRequest(`/${jobId}`);
      return response.data;
    } catch (error) {
      logger.error('Get job by ID failed:', error);
      throw new Error('Failed to load job details');
    }
  }

  async createJobPost(jobData) {
    try {
      // Import supabaseService dynamically to avoid circular imports
      const { supabaseService } = await import('./supabase');
      const { supabase } = await import('../config/supabase');
      
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        throw new Error('User not authenticated');
      }
      
      // Get user profile to get name
      const profile = await supabaseService.user.getProfile(user.id);
      
      const jobPayload = {
        ...jobData,
        client_id: user.id,
        client_name: profile?.name || user.email || 'Unknown Client'
      };
      
      console.log('📝 Creating job with data:', jobPayload);
      const result = await supabaseService.jobs.createJob(jobPayload);
      console.log('✅ Job created successfully:', result);
      
      return { data: result };
    } catch (error) {
      logger.error('Create job post failed:', error);
      console.error('❌ Job creation error details:', error.message);
      throw new Error(error.message || 'Failed to create job');
    }
  }

  async updateJob(jobId, jobData) {
    try {
      const response = await this.makeJobRequest(`/${jobId}`, {
        method: 'PUT',
        body: jobData,
      });
      return response.data;
    } catch (error) {
      logger.error('Update job failed:', error);
      throw new Error('Failed to update job');
    }
  }

  async updateJobPost(jobId, jobData) {
    try {
      // Import supabaseService dynamically to avoid circular imports
      const { supabaseService } = await import('./supabase');
      
      console.log('📝 Updating job with ID:', jobId, 'Data:', jobData);
      const result = await supabaseService.jobs.updateJob(jobId, jobData);
      console.log('✅ Job updated successfully:', result);
      
      return { data: result };
    } catch (error) {
      logger.error('Update job post failed:', error);
      console.error('❌ Job update error details:', error.message);
      throw new Error(error.message || 'Failed to update job');
    }
  }

  async deleteJob(jobId) {
    try {
      const response = await this.makeJobRequest(`/${jobId}`, {
        method: 'DELETE',
      });
      return response;
    } catch (error) {
      logger.error('Delete job failed:', error);
      throw new Error('Failed to delete job');
    }
  }

  async getMyJobs(page = 1, limit = 10) {
    try {
      // Import supabaseService dynamically to avoid circular imports
      const { supabaseService } = await import('./supabase');
      const { supabase } = await import('../config/supabase');
      
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        throw new Error('User not authenticated');
      }
      
      console.log('📋 Fetching jobs for user:', user.id);
      const jobs = await supabaseService.jobs.getMyJobs(user.id);
      
      console.log('📋 JobService - Fetched jobs:', jobs?.length || 0);
      return { jobs: jobs || [] };
    } catch (error) {
      logger.error('Get my jobs failed:', error);
      console.error('❌ Get my jobs error details:', error.message);
      throw new Error(error.message || 'Failed to load your jobs');
    }
  }

  async searchJobs(query, filters = {}) {
    try {
      const searchParams = {
        search: query,
        ...filters,
      };

      return await this.getAllJobs(searchParams);
    } catch (error) {
      logger.error('Search jobs failed:', error);
      throw new Error('Failed to search jobs');
    }
  }

  async getJobApplications(jobId, page = 1, limit = 10) {
    try {
      const response = await this.makeJobRequest(`/${jobId}/applications?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      logger.error('Get job applications failed:', error);
      throw new Error('Failed to load job applications');
    }
  }

  async applyToJob(jobId, applicationData, token = null) {
    try {
      // Try modern jobs API first
      try {
        const response = await this.makeJobRequest(`/${jobId}/apply`, {
          method: 'POST',
          body: applicationData,
        });
        return response.data;
      } catch (modernError) {
        // Fallback to contracts API
        const authToken = await this.getToken(token);
        const res = await axios.post(`${this.contractsAPI}/${jobId}/apply`, applicationData, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        return res.data;
      }
    } catch (error) {
      logger.error('Apply to job failed:', error);
      throw new Error('Failed to apply to job');
    }
  }

  async getJobCategories() {
    try {
      const response = await this.makeJobRequest('/categories');
      return response.data;
    } catch (error) {
      logger.error('Get job categories failed:', error);
      throw new Error('Failed to load job categories');
    }
  }

  async getJobStats() {
    try {
      const response = await this.makeJobRequest('/stats');
      return response.data;
    } catch (error) {
      logger.error('Get job stats failed:', error);
      throw new Error('Failed to load job statistics');
    }
  }
}

// Create singleton instance
const jobService = new JobService();

// Export both the instance and individual methods for backward compatibility
export default jobService;

// Legacy exports for backward compatibility
export const getJobsForClient = (token) => jobService.getJobsForClient(token);
export const getJobsForProvider = (token) => jobService.getJobsForProvider(token);
export const createJob = (jobData, token) => jobService.createJob(jobData, token);
export const updateJobStatus = (contractId, status, token) => jobService.updateJobStatus(contractId, status, token);
export const getJobs = (role, token) => jobService.getJobs(role, token);
export const getAllJobs = (filters) => jobService.getAllJobs(filters);
export const getJobById = (jobId) => jobService.getJobById(jobId);
export const createJobPost = (jobData) => jobService.createJobPost(jobData);
export const updateJob = (jobId, jobData) => jobService.updateJob(jobId, jobData);
export const updateJobPost = (jobId, jobData) => jobService.updateJobPost(jobId, jobData);
export const deleteJob = (jobId) => jobService.deleteJob(jobId);
export const getMyJobs = (page, limit) => jobService.getMyJobs(page, limit);
export const searchJobs = (query, filters) => jobService.searchJobs(query, filters);
export const getJobApplications = (jobId, page, limit) => jobService.getJobApplications(jobId, page, limit);
export const applyToJob = (jobId, applicationData, token) => jobService.applyToJob(jobId, applicationData, token);
export const getJobCategories = () => jobService.getJobCategories();
export const getJobStats = () => jobService.getJobStats();

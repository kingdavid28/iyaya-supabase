// Legacy authService - now redirects to Supabase AuthContext
// This file is kept for backward compatibility but no longer uses old API
import { logger } from "../utils/logger";

class AuthService {
  // Authentication Methods
  async login(email, password) {
    throw new Error('Use AuthContext.signIn instead - old backend is deprecated');
  }

  async register(userData) {
    throw new Error('Use AuthContext.signUp instead - old backend is deprecated');
  }

  async logout() {
    // Legacy method - AuthContext handles logout now
    logger.info("Legacy logout called - use AuthContext.signOut instead");
  }

  async resetPassword(_email) {
    logger.warn("resetPassword is not implemented for JWT backend");
  }

  // Auth State Management
  onAuthStateChanged(callback) {
    // Legacy method - AuthContext handles auth state now
    callback(null);
    return () => {};
  }

  getCurrentUserId() {
    // For now, return null since we don't have user ID tracking
    // This should be implemented based on your user profile structure
    return null;
  }

  async getCurrentToken() {
    // Legacy method - Supabase handles tokens now
    return null;
  }

  async clearAuthData() {
    // Legacy method - no longer needed with Supabase
    logger.info("Legacy clearAuthData called");
  }

  async refreshToken() {
    return null;
  }

  // Error Handling
  handleAuthError(error) {
    const errorMap = {
      "auth/user-not-found": "No account found with this email address",
      "auth/wrong-password": "Incorrect password",
      "auth/email-already-in-use": "An account with this email already exists",
      "auth/weak-password": "Password should be at least 6 characters",
      "auth/invalid-email": "Invalid email address",
    };

    const code = error?.code || error?.response?.status;
    const message =
      errorMap[code] ||
      error?.response?.data?.message ||
      error?.message ||
      "Authentication failed";
    return new Error(message);
  }
}

export const authService = new AuthService();

export const login = async (email, password) => {
  throw new Error('Use AuthContext.signIn instead - old backend is deprecated');
};

export const getProfile = async () => {
  throw new Error('Use AuthContext.getUserProfile instead - old backend is deprecated');
};

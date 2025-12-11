import { logger } from "../utils/logger";
import {
  signInWithEmail,
  signUpWithEmail,
  signOut as supabaseSignOut,
  getCurrentUser,
  handleAuthError,
  resetPassword,
  updatePassword,
  supabase
} from '../config/supabase';

class AuthService {
  // Authentication Methods
  async login(email, password) {
    try {
      const { success, user, message } = await signInWithEmail(email, password);
      if (!success) {
        throw new Error(message || 'Login failed');
      }
      return { user, error: null };
    } catch (error) {
      logger.error('Login error:', error);
      return { user: null, error: this.handleAuthError(error) };
    }
  }

  async register(userData) {
    try {
      const { email, password, ...profileData } = userData;
      const { success, user, message } = await signUpWithEmail(email, password, profileData);
      if (!success) {
        throw new Error(message || 'Registration failed');
      }
      return { user, error: null };
    } catch (error) {
      logger.error('Registration error:', error);
      return { user: null, error: this.handleAuthError(error) };
    }
  }

  async logout() {
    try {
      const { error } = await supabaseSignOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      logger.error('Logout error:', error);
      return { error: this.handleAuthError(error) };
    }
  }

  async resetPassword(email) {
    try {
      const { error } = await resetPassword(email);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      logger.error('Password reset error:', error);
      return { error: this.handleAuthError(error) };
    }
  }

  async updatePassword(newPassword) {
    try {
      const { error } = await updatePassword(newPassword);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      logger.error('Update password error:', error);
      return { error: this.handleAuthError(error) };
    }
  }

  // Auth State Management
  onAuthStateChanged(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        callback(session?.user || null);
      }
    );
    return () => subscription?.unsubscribe();
  }

  async getCurrentUser() {
    try {
      const { user, error } = await getCurrentUser();
      if (error) throw error;
      return { user, error: null };
    } catch (error) {
      logger.error('Get current user error:', error);
      return { user: null, error: this.handleAuthError(error) };
    }
  }

  getCurrentUserId() {
    const { data: { user } } = supabase.auth.getUser();
    return user?.id || null;
  }

  async getCurrentToken() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { token: session?.access_token || null, error: null };
    } catch (error) {
      logger.error('Get token error:', error);
      return { token: null, error: this.handleAuthError(error) };
    }
  }

  async clearAuthData() {
    try {
      await supabaseSignOut();
      return { error: null };
    } catch (error) {
      logger.error('Clear auth data error:', error);
      return { error: this.handleAuthError(error) };
    }
  }

  async refreshToken() {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      return { session: data.session, error: null };
    } catch (error) {
      logger.error('Refresh token error:', error);
      return { session: null, error: this.handleAuthError(error) };
    }
  }

  // User Profile Methods
  async getUserProfile(userId = null) {
    try {
      const { user, error: userError } = await this.getCurrentUser();
      if (userError) throw userError;
      
      const targetUserId = userId || user.id;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();
      
      if (error) throw error;
      return { profile: data, error: null };
    } catch (error) {
      logger.error('Get user profile error:', error);
      return { profile: null, error: this.handleAuthError(error) };
    }
  }

  async updateProfile(updates) {
    try {
      const { user, error: userError } = await this.getCurrentUser();
      if (userError) throw userError;

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return { profile: data, error: null };
    } catch (error) {
      logger.error('Update profile error:', error);
      return { profile: null, error: this.handleAuthError(error) };
    }
  }

  async deleteAccount() {
    try {
      const { user, error: userError } = await this.getCurrentUser();
      if (userError) throw userError;

      // Delete profile first
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Then delete auth user (requires server-side implementation)
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
      if (authError) throw authError;

      await this.logout();
      return { success: true, error: null };
    } catch (error) {
      logger.error('Delete account error:', error);
      return { success: false, error: this.handleAuthError(error) };
    }
  }

  // Email Verification
  async sendEmailVerification() {
    try {
      const { user, error: userError } = await this.getCurrentUser();
      if (userError) throw userError;

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`
        }
      });

      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      logger.error('Send email verification error:', error);
      return { success: false, error: this.handleAuthError(error) };
    }
  }

  async verifyEmail(token) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'signup'
      });

      if (error) throw error;
      return { user: data.user, error: null };
    } catch (error) {
      logger.error('Verify email error:', error);
      return { user: null, error: this.handleAuthError(error) };
    }
  }

  // Error Handling
  handleAuthError(error) {
    const errorMap = {
      // Authentication errors
      "auth/user-not-found": "No account found with this email address",
      "auth/wrong-password": "Incorrect password",
      "auth/email-already-in-use": "An account with this email already exists",
      "auth/weak-password": "Password should be at least 6 characters",
      "auth/invalid-email": "Invalid email address",
      "auth/invalid-credentials": "Invalid login credentials",
      "auth/too-many-requests": "Too many attempts. Please try again later",
      "auth/network-request-failed": "Network error. Please check your connection",
      "auth/email-not-verified": "Please verify your email address",
      "auth/user-disabled": "This account has been disabled",
      "auth/operation-not-allowed": "This operation is not allowed",
      "auth/requires-recent-login": "Please log in again to perform this action",
      // Custom errors
      "auth/session-expired": "Your session has expired. Please log in again",
      "auth/unauthorized": "You don't have permission to perform this action"
    };

    const code = error?.code || error?.status;
    const message = errorMap[code] || 
                   error?.message || 
                   (typeof error === 'string' ? error : 'Authentication failed');
    
    const authError = new Error(message);
    authError.code = code;
    return authError;
  }
}

// Singleton instance
export const authService = new AuthService();

// Legacy export functions (for backward compatibility)
export const login = (email, password) => authService.login(email, password);

export const getProfile = async () => {
  try {
    const { user, error } = await authService.getCurrentUser();
    if (error) throw error;
    return { profile: user, error: null };
  } catch (error) {
    logger.error('Get profile error:', error);
    return { profile: null, error: authService.handleAuthError(error) };
  }
};

// Export the class for testing if needed
export { AuthService };

export default authService;
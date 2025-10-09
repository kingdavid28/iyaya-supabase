// src/services/facebookAuthService.js
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { 
  FacebookAuthProvider, 
  signInWithCredential,
  updateProfile 
} from 'firebase/auth';
import { getAuthSync } from '../config/supabase';

// Complete the auth session when the app comes back into focus
WebBrowser.maybeCompleteAuthSession();

class FacebookAuthService {
  constructor() {
    this.discovery = {
      authorizationEndpoint: 'https://www.facebook.com/v18.0/dialog/oauth',
      tokenEndpoint: 'https://graph.facebook.com/v18.0/oauth/access_token',
    };
  }

  /**
   * Create authentication request with improved configuration
   */
  createAuthRequest() {
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'iyaya-app',
      path: 'auth',
    });

    console.log('🔧 Creating auth request with redirect URI:', redirectUri);

    return new AuthSession.AuthRequest({
      clientId: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID,
      scopes: ['public_profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      extraParams: {
        display: 'popup',
      },
      additionalParameters: {},
      state: AuthSession.AuthSession.makeStateFromParams({
        returnUrl: redirectUri,
      }),
    });
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code, redirectUri) {
    try {
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID,
          clientSecret: process.env.EXPO_PUBLIC_FACEBOOK_APP_SECRET,
          code,
          redirectUri,
        },
        this.discovery
      );

      return tokenResponse.accessToken;
    } catch (error) {
      console.error('Token exchange error:', error);
      throw new Error('Failed to exchange authorization code for access token');
    }
  }

  /**
   * Get user profile from Facebook Graph API
   */
  async getFacebookUserProfile(accessToken) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,first_name,last_name,picture.type(large)&access_token=${accessToken}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch user profile from Facebook');
      }

      return await response.json();
    } catch (error) {
      console.error('Facebook profile fetch error:', error);
      throw error;
    }
  }

  /**
   * Alternative: Use WebBrowser for more reliable authentication
   */
  async signInWithWebBrowser(userRole = 'parent') {
    try {
      console.log('🔵 Starting Facebook WebBrowser authentication...');
      
      // Validate environment variables
      if (!process.env.EXPO_PUBLIC_FACEBOOK_APP_ID) {
        throw new Error('Facebook App ID is not configured. Please check your .env file.');
      }

      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'iyaya-app',
        path: 'auth',
      });

      console.log('🔧 Redirect URI:', redirectUri);

      // Build Facebook OAuth URL manually for better control
      const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
        `client_id=${process.env.EXPO_PUBLIC_FACEBOOK_APP_ID}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=public_profile,email&` +
        `state=${Math.random().toString(36).substring(7)}`;

      console.log('🔧 Auth URL:', authUrl);

      // Open browser for authentication
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUri,
        {
          showInRecents: true,
        }
      );

      console.log('🔧 WebBrowser result:', {
        type: result.type,
        url: result.url
      });

      if (result.type === 'cancel') {
        throw new Error('Facebook sign-in was cancelled by user');
      }

      if (result.type === 'dismiss') {
        throw new Error('Facebook sign-in was dismissed');
      }

      if (result.type !== 'success' || !result.url) {
        throw new Error('Facebook authentication failed');
      }

      // Parse the authorization code from the result URL
      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        throw new Error(`Facebook OAuth error: ${error}`);
      }

      if (!code) {
        throw new Error('No authorization code received from Facebook');
      }

      console.log('✅ Authorization code received, exchanging for token...');

      // Exchange code for access token
      const accessToken = await this.exchangeCodeForToken(code, redirectUri);

      console.log('✅ Access token obtained, fetching user profile...');

      // Get user profile from Facebook
      const facebookUser = await this.getFacebookUserProfile(accessToken);

      console.log('✅ Facebook user profile:', {
        id: facebookUser.id,
        name: facebookUser.name,
        email: facebookUser.email
      });

      // Create Firebase credential and sign in
      const credential = FacebookAuthProvider.credential(accessToken);
      const auth = getAuthSync();
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseUser = userCredential.user;

      console.log('✅ Firebase sign-in successful');

      // Update user profile with Facebook data
      await updateProfile(firebaseUser, {
        displayName: facebookUser.name,
        photoURL: facebookUser.picture?.data?.url,
      });

      // Prepare user data for backend sync
      const userData = {
        firebaseUid: firebaseUser.uid,
        email: facebookUser.email,
        name: facebookUser.name,
        firstName: facebookUser.first_name,
        lastName: facebookUser.last_name,
        profileImage: facebookUser.picture?.data?.url,
        role: userRole,
        emailVerified: true,
        authProvider: 'facebook',
        facebookId: facebookUser.id,
      };

      // Sync with backend
      await this.syncWithBackend(userData, firebaseUser);

      return {
        success: true,
        user: {
          uid: firebaseUser.uid,
          email: facebookUser.email,
          name: facebookUser.name,
          firstName: facebookUser.first_name,
          lastName: facebookUser.last_name,
          profileImage: facebookUser.picture?.data?.url,
          role: userRole,
          emailVerified: true,
          authProvider: 'facebook',
        },
        token: await firebaseUser.getIdToken(),
      };

    } catch (error) {
      console.error('Facebook WebBrowser sign-in error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in with Facebook using AuthSession (original method)
   */
  async signInWithFacebook(userRole = 'parent') {
    try {
      console.log('🔵 Starting Facebook sign-in process...');
      console.log('🔧 Facebook App ID:', process.env.EXPO_PUBLIC_FACEBOOK_APP_ID);
      console.log('🔧 User Role:', userRole);

      // Validate environment variables
      if (!process.env.EXPO_PUBLIC_FACEBOOK_APP_ID) {
        throw new Error('Facebook App ID is not configured. Please check your .env file.');
      }

      if (!process.env.EXPO_PUBLIC_FACEBOOK_APP_SECRET) {
        throw new Error('Facebook App Secret is not configured. Please check your .env file.');
      }

      // Create auth request
      const request = this.createAuthRequest();
      console.log('🔧 Auth request created:', {
        clientId: request.clientId,
        redirectUri: request.redirectUri,
        scopes: request.scopes
      });
      
      // Start the authentication flow
      console.log('🔵 Prompting user for Facebook authentication...');
      const result = await request.promptAsync(this.discovery);

      console.log('🔧 Auth result:', {
        type: result.type,
        params: result.params ? Object.keys(result.params) : 'none',
        error: result.error
      });

      if (result.type === 'cancel') {
        throw new Error('Facebook sign-in was cancelled by user');
      }

      if (result.type === 'dismiss') {
        throw new Error('Facebook sign-in was dismissed');
      }

      if (result.type !== 'success') {
        const errorMsg = result.error ? 
          `Facebook authentication failed: ${result.error}` : 
          'Facebook authentication was cancelled or failed';
        throw new Error(errorMsg);
      }

      if (!result.params?.code) {
        throw new Error('No authorization code received from Facebook');
      }

      console.log('✅ Facebook auth successful, exchanging code for token...');

      // Exchange code for access token
      const accessToken = await this.exchangeCodeForToken(
        result.params.code,
        request.redirectUri
      );

      console.log('✅ Access token obtained, fetching user profile...');

      // Get user profile from Facebook
      const facebookUser = await this.getFacebookUserProfile(accessToken);

      console.log('✅ Facebook user profile:', {
        id: facebookUser.id,
        name: facebookUser.name,
        email: facebookUser.email
      });

      // Create Firebase credential
      const credential = FacebookAuthProvider.credential(accessToken);

      // Sign in with Firebase
      const auth = getAuthSync();
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseUser = userCredential.user;

      console.log('✅ Firebase sign-in successful');

      // Update user profile with Facebook data
      await updateProfile(firebaseUser, {
        displayName: facebookUser.name,
        photoURL: facebookUser.picture?.data?.url,
      });

      // Prepare user data for backend sync
      const userData = {
        firebaseUid: firebaseUser.uid,
        email: facebookUser.email,
        name: facebookUser.name,
        firstName: facebookUser.first_name,
        lastName: facebookUser.last_name,
        profileImage: facebookUser.picture?.data?.url,
        role: userRole,
        emailVerified: true,
        authProvider: 'facebook',
        facebookId: facebookUser.id,
      };

      // Sync with backend
      await this.syncWithBackend(userData, firebaseUser);

      return {
        success: true,
        user: {
          uid: firebaseUser.uid,
          email: facebookUser.email,
          name: facebookUser.name,
          firstName: facebookUser.first_name,
          lastName: facebookUser.last_name,
          profileImage: facebookUser.picture?.data?.url,
          role: userRole,
          emailVerified: true,
          authProvider: 'facebook',
        },
        token: await firebaseUser.getIdToken(),
      };

    } catch (error) {
      console.error('Facebook sign-in error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Link Facebook account to existing user
   */
  async linkFacebookAccount() {
    try {
      const auth = getAuthSync();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error('No user is currently signed in');
      }

      // Create auth request
      const request = this.createAuthRequest();
      
      // Start the authentication flow
      const result = await request.promptAsync(this.discovery);

      if (result.type !== 'success') {
        throw new Error('Facebook authentication was cancelled or failed');
      }

      // Exchange code for access token
      const accessToken = await this.exchangeCodeForToken(
        result.params.code,
        request.redirectUri
      );

      // Create Firebase credential
      const credential = FacebookAuthProvider.credential(accessToken);

      // Link the credential to the current user
      await linkWithCredential(currentUser, credential);

      // Get Facebook user profile for additional data
      const facebookUser = await this.getFacebookUserProfile(accessToken);

      // Update profile with Facebook data if not already set
      const updates = {};
      if (!currentUser.displayName && facebookUser.name) {
        updates.displayName = facebookUser.name;
      }
      if (!currentUser.photoURL && facebookUser.picture?.data?.url) {
        updates.photoURL = facebookUser.picture.data.url;
      }

      if (Object.keys(updates).length > 0) {
        await updateProfile(currentUser, updates);
      }

      return {
        success: true,
        message: 'Facebook account linked successfully',
        facebookData: {
          name: facebookUser.name,
          profileImage: facebookUser.picture?.data?.url,
        }
      };

    } catch (error) {
      console.error('Facebook account linking error:', error);
      
      let errorMessage = 'Failed to link Facebook account. Please try again.';
      
      if (error.code === 'auth/credential-already-in-use') {
        errorMessage = 'This Facebook account is already linked to another user.';
      } else if (error.code === 'auth/provider-already-linked') {
        errorMessage = 'A Facebook account is already linked to this user.';
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Simplified Facebook authentication using Expo's built-in methods
   */
  async signInWithFacebookSimple(userRole = 'parent') {
    try {
      console.log('🔵 Starting simplified Facebook authentication...');
      
      // For now, let's create a mock Facebook user for testing
      // This will help us test the rest of the flow while we debug the OAuth issue
      const mockFacebookUser = {
        id: 'mock_facebook_id_' + Date.now(),
        name: 'Test Facebook User',
        email: 'test.facebook@example.com',
        first_name: 'Test',
        last_name: 'User',
        picture: {
          data: {
            url: 'https://via.placeholder.com/150/1877F2/FFFFFF?text=FB'
          }
        }
      };

      console.log('⚠️ Using mock Facebook data for testing:', mockFacebookUser);

      // Create a mock Firebase user (you would normally get this from Firebase Auth)
      const auth = getAuthSync();
      
      // For testing, we'll create the user data without actual Firebase authentication
      const userData = {
        firebaseUid: 'mock_firebase_uid_' + Date.now(),
        email: mockFacebookUser.email,
        name: mockFacebookUser.name,
        firstName: mockFacebookUser.first_name,
        lastName: mockFacebookUser.last_name,
        profileImage: mockFacebookUser.picture?.data?.url,
        role: userRole,
        emailVerified: true,
        authProvider: 'facebook',
        facebookId: mockFacebookUser.id,
      };

      console.log('🔄 Syncing mock user data with backend...');

      // Try to sync with backend (this should work)
      try {
        await this.syncWithBackend(userData, null);
      } catch (syncError) {
        console.warn('⚠️ Backend sync failed, but continuing with mock auth:', syncError.message);
      }

      return {
        success: true,
        user: {
          uid: userData.firebaseUid,
          email: mockFacebookUser.email,
          name: mockFacebookUser.name,
          firstName: mockFacebookUser.first_name,
          lastName: mockFacebookUser.last_name,
          profileImage: mockFacebookUser.picture?.data?.url,
          role: userRole,
          emailVerified: true,
          authProvider: 'facebook',
        },
        token: 'mock_token_' + Date.now(),
        isMockAuth: true, // Flag to indicate this is mock authentication
      };

    } catch (error) {
      console.error('Simplified Facebook auth error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Handle authentication errors with user-friendly messages
   */
  handleAuthError(error) {
    console.error('Facebook auth error:', error);
    
    // Provide user-friendly error messages
    let errorMessage = 'Facebook sign-in failed. Please try again.';
    
    if (error.message.includes('cancelled')) {
      errorMessage = 'Facebook sign-in was cancelled.';
    } else if (error.message.includes('dismissed')) {
      errorMessage = 'Facebook sign-in was dismissed. Please try again and complete the login process.';
    } else if (error.message.includes('network')) {
      errorMessage = 'Network error. Please check your connection and try again.';
    } else if (error.code === 'auth/account-exists-with-different-credential') {
      errorMessage = 'An account with this email already exists. Please use your original sign-in method.';
    } else if (error.message.includes('App ID')) {
      errorMessage = 'Facebook authentication is not properly configured. Please contact support.';
    }

    return new Error(errorMessage);
  }
}

export const facebookAuthService = new FacebookAuthService();
export default facebookAuthService;

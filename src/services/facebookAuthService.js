// src/services/facebookAuthService.js
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

WebBrowser.maybeCompleteAuthSession();

class FacebookAuthService {
  async signInWithFacebook(userRole = 'parent') {
    try {
      console.log('🔵 Initiating Supabase Facebook OAuth for role:', userRole);

      // Check for test mode - for development only
      console.log('🔍 Checking test mode:', {
        isDev: __DEV__,
        testMode: process.env.EXPO_PUBLIC_FACEBOOK_TEST_MODE,
        shouldUseTest: __DEV__ && process.env.EXPO_PUBLIC_FACEBOOK_TEST_MODE === 'true'
      });

      if (__DEV__ && process.env.EXPO_PUBLIC_FACEBOOK_TEST_MODE === 'true') {
        console.log('🧪 Using test mode for Facebook authentication');
        return this.signInWithFacebookTest(userRole);
      }

      const shouldHandleManually = Platform.OS !== 'web';
      const redirectTo = 'https://myiyrmiiywwgismcpith.supabase.co/auth/v1/callback';

      console.log('🔁 Using Supabase redirect URI:', redirectTo);

      const { data: oauthData, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo,
          scopes: 'public_profile,email',
          skipBrowserRedirect: shouldHandleManually,
          queryParams: {
            auth_type: 'rerequest',
            display: 'popup',
          },
        },
      });

      if (error) {
        console.error('❌ Supabase OAuth error:', error);
        throw error;
      }

      if (shouldHandleManually) {
        const authUrl = oauthData?.url;
        if (!authUrl) {
          throw new Error('Facebook sign-in did not return an authorization URL.');
        }

        console.log('🌐 Opening Facebook auth URL:', authUrl);

        const webResult = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo, {
          showInRecents: true,
          dismissButtonStyle: 'cancel',
          readerMode: false,
          enableDefaultShareMenuItem: false,
          enableBarCollapsing: false,
          controlsColor: '#1877F2',
        });

        console.log('🔄 WebBrowser result:', webResult);
        console.log('🔍 WebBrowser result details:', {
          type: webResult.type,
          url: webResult.url,
          errorCode: webResult.errorCode,
        });

        // Give the OAuth flow more time to complete
        await new Promise(resolve => setTimeout(resolve, 3000));

        if (webResult.type === 'cancel' || webResult.type === 'dismiss') {
          console.log('❌ User cancelled Facebook auth');
          throw new Error('Facebook sign-in was cancelled by user.');
        }

        if (webResult.type !== 'success' || !webResult.url) {
          const code = webResult.errorCode || 'unknown_error';
          console.error('❌ Facebook auth failed with code:', code);
          throw new Error(`Facebook sign-in failed with code: ${code}. Please try again.`);
        }

        const url = new URL(webResult.url);
        const errorParam = url.searchParams.get('error');
        if (errorParam) {
          console.error('❌ Facebook auth error in URL:', errorParam);
          throw new Error(`Facebook sign-in failed: ${errorParam}`);
        }

        const code = url.searchParams.get('code');
        if (!code) {
          console.error('❌ No authorization code returned from Facebook');
          console.error('❌ Returned URL:', webResult.url);
          throw new Error('Facebook sign-in did not return an authorization code.');
        }

        console.log('✅ Got authorization code from Facebook');

        const codeVerifier = oauthData?.codeVerifier || oauthData?.pkce?.codeVerifier || oauthData?.pkce?.code_verifier;

        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession({
          authCode: code,
          codeVerifier,
        });

        if (exchangeError) {
          console.error('❌ Code exchange failed:', exchangeError);
          throw exchangeError;
        }

        if (!exchangeData?.session?.user) {
          console.error('❌ No session returned after code exchange');
          throw new Error('Facebook sign-in completed but no session was returned from Supabase.');
        }

        console.log('✅ Facebook authentication successful');
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw sessionError;
      }

      const session = sessionData?.session || null;
      const user = session?.user;

      if (!user) {
        throw new Error('Facebook sign-in completed but no user session was established.');
      }

      // Log session details after successful authentication
      console.log('🔍 Session after Facebook login:', {
        hasSession: !!session,
        hasUser: !!user,
        userId: user?.id,
        accessToken: session?.access_token ? 'present' : 'missing'
      });

      return {
        success: true,
        user,
        session,
        provider: 'facebook',
        role: userRole,
      };
    } catch (error) {
      console.error('Facebook sign-in error:', error);
      throw this.handleAuthError(error);
    }
  }

  // Test mode for development - simulates successful Facebook login
  async signInWithFacebookTest(userRole = 'parent') {
    console.log('🧪 Simulating Facebook authentication for testing');

    // Generate a proper UUID format for the test user
    const testUserId = '550e8400-e29b-41d4-a716-446655440000'; // Standard UUID format

    // Create a mock user object with proper UUID
    const mockUser = {
      id: testUserId,
      email: 'test@example.com',
      user_metadata: {
        name: 'Test User',
        role: userRole,
        provider: 'facebook'
      },
      email_confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      role: userRole
    };

    const mockSession = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: mockUser
    };

    // Log session details (same as real auth)
    console.log('🔍 Session after Facebook login (TEST MODE):', {
      hasSession: !!mockSession,
      hasUser: !!mockUser,
      userId: mockUser?.id,
      accessToken: mockSession?.access_token ? 'present' : 'missing'
    });

    return {
      success: true,
      user: mockUser,
      session: mockSession,
      provider: 'facebook',
      role: userRole,
      isTestMode: true
    };
  }

  /**
   * Link Facebook account to existing user (not yet supported)
   */
  async linkFacebookAccount() {
    throw new Error('Linking Facebook accounts is not supported in the Supabase flow yet.');
  }

  /**
   * Handle authentication errors with user-friendly messages
   */
  handleAuthError(error) {
    console.error('Facebook auth error:', error);
    let message = 'Facebook sign-in failed. Please try again.';

    if (typeof error?.message === 'string') {
      const msg = error.message.toLowerCase();
      if (msg.includes('cancel')) {
        message = 'Facebook sign-in was cancelled.';
      } else if (msg.includes('dismiss')) {
        message = 'Facebook sign-in was dismissed before completion.';
      } else if (msg.includes('network')) {
        message = 'Network error. Check your connection and try again.';
      } else if (msg.includes('app id') || msg.includes('app secret')) {
        message = 'Facebook app credentials are not configured correctly.';
      }
    }

    if (error?.code === 'oauth_provider_not_supported') {
      message = 'Facebook OAuth provider is not enabled in Supabase.';
    }

    return new Error(message);
  }
}

export const facebookAuthService = new FacebookAuthService();
export default facebookAuthService;

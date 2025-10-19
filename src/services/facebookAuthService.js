// src/services/facebookAuthService.js
import { Platform } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../config/supabase';

WebBrowser.maybeCompleteAuthSession();

class FacebookAuthService {
  async signInWithFacebook(userRole = 'parent') {
    try {
      console.log('🔵 Initiating Supabase Facebook OAuth for role:', userRole);

      const redirectTo = makeRedirectUri({
        scheme: 'iyaya-app',
        path: 'auth',
        useProxy: Platform.select({ web: false, default: true }),
      });

      const shouldHandleManually = Platform.OS !== 'web';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo,
          scopes: 'public_profile,email',
          skipBrowserRedirect: shouldHandleManually,
        },
      });

      if (error) {
        throw error;
      }

      if (shouldHandleManually) {
        const authUrl = data?.url;
        if (!authUrl) {
          throw new Error('Facebook sign-in did not return an authorization URL.');
        }

        const webResult = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo, {
          showInRecents: true,
        });

        if (webResult.type === 'cancel' || webResult.type === 'dismiss') {
          throw new Error('Facebook sign-in was cancelled.');
        }

        if (webResult.type !== 'success' || !webResult.url) {
          const code = webResult.errorCode || 'unknown_error';
          throw new Error(`Facebook sign-in failed (${code}).`);
        }

        const url = new URL(webResult.url);
        const errorParam = url.searchParams.get('error');
        if (errorParam) {
          throw new Error(`Facebook sign-in failed: ${errorParam}`);
        }

        const code = url.searchParams.get('code');
        if (!code) {
          throw new Error('Facebook sign-in did not return an authorization code.');
        }

        const codeVerifier = data?.codeVerifier || data?.pkce?.codeVerifier || data?.pkce?.code_verifier;

        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession({
          authCode: code,
          codeVerifier,
        });

        if (exchangeError) {
          throw exchangeError;
        }

        if (!exchangeData?.session?.user) {
          throw new Error('Facebook sign-in completed but no session was returned from Supabase.');
        }
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

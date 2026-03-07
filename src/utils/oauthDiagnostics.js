/**
 * OAuth Diagnostics Utility
 * Helper functions to diagnose Google OAuth issues
 */

import supabase from '../config/supabase';
import { Platform } from 'react-native';

export const oauthDiagnostics = {
    /**
     * Check if Supabase client is properly initialized
     */
    checkSupabaseClient: () => {
        console.log('🔍 [OAuth Diagnostics] Checking Supabase client...');

        const checks = {
            clientExists: !!supabase,
            hasAuth: !!supabase?.auth,
            hasSignInWithOAuth: typeof supabase?.auth?.signInWithOAuth === 'function',
            supabaseUrl: supabase?.supabaseUrl || 'NOT SET',
        };

        console.log('✅ [OAuth Diagnostics] Supabase client checks:', checks);
        return checks;
    },

    /**
     * Check if session storage is available and working
     */
    checkSessionStorage: () => {
        if (Platform.OS !== 'web') {
            console.log('ℹ️ [OAuth Diagnostics] SessionStorage only available on web');
            return { available: false, reason: 'Not web platform' };
        }

        try {
            const testKey = '__oauth_test__';
            const testValue = 'test';

            sessionStorage.setItem(testKey, testValue);
            const retrieved = sessionStorage.getItem(testKey);
            sessionStorage.removeItem(testKey);

            const works = retrieved === testValue;
            console.log(`${works ? '✅' : '❌'} [OAuth Diagnostics] SessionStorage:`, { works });

            return { available: true, works };
        } catch (error) {
            console.error('❌ [OAuth Diagnostics] SessionStorage error:', error);
            return { available: true, works: false, error: error.message };
        }
    },

    /**
     * Check current session
     */
    checkSession: async () => {
        console.log('🔍 [OAuth Diagnostics] Checking current session...');

        try {
            const { data, error } = await supabase.auth.getSession();

            if (error) {
                console.error('❌ [OAuth Diagnostics] Session error:', error);
                return { hasSession: false, error: error.message };
            }

            const hasSession = !!data?.session;
            const hasUser = !!data?.session?.user;

            console.log(`${hasSession ? '✅' : 'ℹ️'} [OAuth Diagnostics] Session:`, {
                hasSession,
                hasUser,
                userId: data?.session?.user?.id,
                email: data?.session?.user?.email,
            });

            return {
                hasSession,
                hasUser,
                user: data?.session?.user,
            };
        } catch (error) {
            console.error('❌ [OAuth Diagnostics] Session check failed:', error);
            return { hasSession: false, error: error.message };
        }
    },

    /**
     * Test OAuth URL generation
     */
    testOAuthUrl: async (provider = 'google', roleHint = 'caregiver') => {
        console.log('🔍 [OAuth Diagnostics] Testing OAuth URL generation...');

        try {
            const redirectTo = Platform.OS === 'web'
                ? 'https://iyaya-supabase.vercel.app/auth/callback'
                : 'http://localhost:8081/auth/callback';

            console.log('🔗 [OAuth Diagnostics] Redirect URL:', redirectTo);

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });

            if (error) {
                console.error('❌ [OAuth Diagnostics] OAuth URL generation failed:', error);
                return { success: false, error: error.message };
            }

            console.log('✅ [OAuth Diagnostics] OAuth URL generated:', {
                hasUrl: !!data?.url,
                urlPreview: data?.url?.substring(0, 100) + '...',
            });

            return {
                success: true,
                url: data?.url,
                provider: data?.provider,
            };
        } catch (error) {
            console.error('❌ [OAuth Diagnostics] OAuth test failed:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Run all diagnostics
     */
    runAll: async () => {
        console.log('🚀 [OAuth Diagnostics] Running all diagnostics...');
        console.log('═'.repeat(50));

        const results = {
            supabaseClient: oauthDiagnostics.checkSupabaseClient(),
            sessionStorage: oauthDiagnostics.checkSessionStorage(),
            session: await oauthDiagnostics.checkSession(),
            oauthUrl: await oauthDiagnostics.testOAuthUrl(),
        };

        console.log('═'.repeat(50));
        console.log('📊 [OAuth Diagnostics] Results:', results);
        console.log('═'.repeat(50));

        return results;
    },

    /**
     * Check if user has role in database
     */
    checkUserRole: async (userId) => {
        if (!userId) {
            console.warn('⚠️ [OAuth Diagnostics] No userId provided');
            return { hasRole: false, error: 'No userId' };
        }

        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, role, email')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('❌ [OAuth Diagnostics] Role check error:', error);
                return { hasRole: false, error: error.message };
            }

            console.log('✅ [OAuth Diagnostics] User role:', data);
            return {
                hasRole: !!data?.role,
                role: data?.role,
                email: data?.email,
            };
        } catch (error) {
            console.error('❌ [OAuth Diagnostics] Role check failed:', error);
            return { hasRole: false, error: error.message };
        }
    },
};

// Export for use in console
if (typeof window !== 'undefined') {
    window.oauthDiagnostics = oauthDiagnostics;
    console.log('💡 OAuth diagnostics available in console: window.oauthDiagnostics.runAll()');
}

export default oauthDiagnostics;

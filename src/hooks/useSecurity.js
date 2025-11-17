import { useCallback } from 'react';
import { security } from '../utils/security';
import { defaultRateLimiter } from '../utils/securityUtils';
import { useAuth } from '../contexts/AuthContext';

export const useSecurity = () => {
  const { user } = useAuth();

  const storeToken = useCallback(async (token, refreshToken) => {
    return await security.storeToken(token, refreshToken);
  }, []);

  const getToken = useCallback(async () => {
    return await security.getToken();
  }, []);

  const clearTokens = useCallback(async () => {
    return await security.clearTokens();
  }, []);

  const sanitizeInput = useCallback((input) => {
    return security.sanitizeInput(input);
  }, []);

  const validateFileUpload = useCallback((file, allowedTypes) => {
    return security.validateFileUpload(file, allowedTypes);
  }, []);

  const generateSecureId = useCallback((length) => {
    return security.generateSecureId(length);
  }, []);

  const isTokenExpired = useCallback((token) => {
    return security.isTokenExpired(token);
  }, []);

  const checkRateLimit = useCallback((action) => {
    const identifier = user?.uid || 'anonymous';
    return defaultRateLimiter.isAllowed(`${identifier}:${action}`);
  }, [user]);

  const resetRateLimit = useCallback((action) => {
    const identifier = user?.uid || 'anonymous';
    return defaultRateLimiter.reset(`${identifier}:${action}`);
  }, [user]);

  return {
    storeToken,
    getToken,
    clearTokens,
    sanitizeInput,
    validateFileUpload,
    generateSecureId,
    isTokenExpired,
    checkRateLimit,
    resetRateLimit,
  };
};

export default useSecurity;
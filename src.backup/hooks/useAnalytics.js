import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { analytics } from '../utils/analytics';

export const useAnalytics = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.uid) {
      analytics.setUserId(user.uid);
    }
  }, [user]);



  const trackScreen = useCallback((screenName, properties = {}) => {
    analytics.trackScreen(screenName, properties);
  }, []);

  const trackEvent = useCallback((eventName, properties = {}) => {
    analytics.trackEvent(eventName, properties);
  }, []);

  const trackError = useCallback((error, context = {}) => {
    analytics.trackError(error, context);
  }, []);

  // Convenience methods
  const trackLogin = useCallback((method = 'email') => {
    analytics.trackLogin(method);
  }, []);

  const trackSignup = useCallback((userType) => {
    analytics.trackSignup(userType);
  }, []);

  const trackJobPost = useCallback(() => {
    analytics.trackJobPost();
  }, []);

  const trackJobApply = useCallback((jobId) => {
    analytics.trackJobApply(jobId);
  }, []);

  const trackBookingCreated = useCallback((bookingId) => {
    analytics.trackBookingCreated(bookingId);
  }, []);

  const trackMessageSent = useCallback((conversationId) => {
    analytics.trackMessageSent(conversationId);
  }, []);

  return {
    trackScreen,
    trackEvent,
    trackError,
    trackLogin,
    trackSignup,
    trackJobPost,
    trackJobApply,
    trackBookingCreated,
    trackMessageSent,
  };
};

export default useAnalytics;
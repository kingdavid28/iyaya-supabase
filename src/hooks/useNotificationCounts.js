import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/supabase/notificationService';

export const useNotificationCounts = () => {
  const { user } = useAuth();
  const [counts, setCounts] = useState({
    messages: 0,
    bookings: 0,
    jobs: 0,
    reviews: 0,
    notifications: 0,
    total: 0
  });
  const [loading, setLoading] = useState(false);

  const fetchNotificationCounts = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Use the more efficient method to get counts by type
      const newCounts = await notificationService.getNotificationCountsByType(user.id);

      // Ensure we always have a valid counts object
      if (!newCounts || typeof newCounts !== 'object') {
        setCounts({
          messages: 0,
          bookings: 0,
          jobs: 0,
          reviews: 0,
          notifications: 0,
          total: 0
        });
        return {
          messages: 0,
          bookings: 0,
          jobs: 0,
          reviews: 0,
          notifications: 0,
          total: 0
        };
      }

      setCounts(newCounts);
      return newCounts;
    } catch (error) {
      console.warn('Error fetching notification counts:', error);
      const fallbackCounts = {
        messages: 0,
        bookings: 0,
        jobs: 0,
        reviews: 0,
        notifications: 0,
        total: 0
      };
      setCounts(fallbackCounts);
      return fallbackCounts;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await notificationService.markNotificationAsRead(notificationId);
      await fetchNotificationCounts();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [fetchNotificationCounts]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      await notificationService.markAllNotificationsAsRead(user.id);
      setCounts({
        messages: 0,
        bookings: 0,
        jobs: 0,
        reviews: 0,
        notifications: 0,
        total: 0
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [user?.id]);

  // Subscribe to real-time notification updates
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;

    let subscription;

    const setupSubscription = async () => {
      try {
        subscription = notificationService.subscribeToNotifications(user.id, (payload) => {
          console.log('📨 New notification received:', payload);
          fetchNotificationCounts();
        });
      } catch (error) {
        console.error('Error setting up notification subscription:', error);
      }
    };

    const setupInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        fetchNotificationCounts();
      }, 60 * 1000);
    };

    setupSubscription();
    fetchNotificationCounts();
    setupInterval();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user?.id, fetchNotificationCounts]);

  return {
    counts,
    loading,
    fetchNotificationCounts,
    markAsRead,
    markAllAsRead
  };
};
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/supabase/notificationService';
import { supabaseService } from '../services/supabase';

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
      
      setCounts(newCounts);
      return newCounts;
    } catch (error) {
      console.error('Error fetching notification counts:', error);
      return counts;
    } finally {
      setLoading(false);
    }
  }, [user?.id, counts]);

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
  useEffect(() => {
    if (!user?.id) return;

    let subscription;
    
    const setupSubscription = async () => {
      try {
        subscription = notificationService.subscribeToNotifications(user.id, (payload) => {
          console.log('📨 New notification received:', payload);
          // Refresh counts when new notification arrives
          fetchNotificationCounts();
        });
      } catch (error) {
        console.error('Error setting up notification subscription:', error);
      }
    };

    setupSubscription();
    
    // Initial fetch
    fetchNotificationCounts();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
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
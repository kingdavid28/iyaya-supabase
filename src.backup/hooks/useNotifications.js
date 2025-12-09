import { useState, useEffect } from 'react';
import supabaseService from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    loadNotifications();
    loadUnreadCount();
    
    // Setup real-time subscription
    const subscription = supabaseService.subscribeToNotifications(user.id, (payload) => {
      if (payload.eventType === 'INSERT') {
        const newNotification = payload.new;
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user?.id]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const notificationsData = await supabaseService.getNotifications(user.id);
      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await supabaseService.getUnreadNotificationCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await supabaseService.markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabaseService.markAllNotificationsAsRead(user.id);
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const createNotification = async (notificationData) => {
    try {
      const notification = await supabaseService.createNotification(notificationData);
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    createNotification
  };
};

export default useNotifications;
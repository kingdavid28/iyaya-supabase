import { notificationService } from '../services/supabase/notificationService';

export const testNotificationSystem = async (userId, userRole = 'parent') => {
  console.log('🧪 Testing notification system for user:', userId, 'role:', userRole);
  
  try {
    // Test creating different types of notifications
    const testNotifications = [];
    
    if (userRole === 'parent') {
      // Test notifications for parents
      testNotifications.push(
        await notificationService.createNotification({
          user_id: userId,
          type: 'job_application',
          title: 'New Job Application',
          message: 'Sarah applied to your childcare job posting',
          data: { caregiverId: 'test-caregiver-1', jobId: 'test-job-1' }
        }),
        await notificationService.createNotification({
          user_id: userId,
          type: 'booking_confirmed',
          title: 'Booking Confirmed',
          message: 'Your booking with Maria has been confirmed',
          data: { caregiverId: 'test-caregiver-2', bookingId: 'test-booking-1' }
        }),
        await notificationService.createNotification({
          user_id: userId,
          type: 'message',
          title: 'New Message',
          message: 'You have a new message from your caregiver',
          data: { senderId: 'test-caregiver-3' }
        })
      );
    } else {
      // Test notifications for caregivers
      testNotifications.push(
        await notificationService.createNotification({
          user_id: userId,
          type: 'booking_request',
          title: 'New Booking Request',
          message: 'The Johnson family sent you a booking request',
          data: { parentId: 'test-parent-1', bookingId: 'test-booking-2' }
        }),
        await notificationService.createNotification({
          user_id: userId,
          type: 'review',
          title: 'New Review',
          message: 'You received a 5-star review from the Smith family',
          data: { parentId: 'test-parent-2', rating: 5 }
        }),
        await notificationService.createNotification({
          user_id: userId,
          type: 'message',
          title: 'New Message',
          message: 'You have a new message from a parent',
          data: { senderId: 'test-parent-3' }
        })
      );
    }
    
    console.log('✅ Created test notifications:', testNotifications.filter(Boolean).length);
    
    // Test getting notification counts
    const counts = await notificationService.getNotificationCountsByType(userId);
    console.log('📊 Notification counts:', counts);
    
    // Test getting all notifications
    const allNotifications = await notificationService.getNotifications(userId);
    console.log('📋 All notifications:', allNotifications.length);
    
    return {
      success: true,
      created: testNotifications.filter(Boolean).length,
      counts,
      total: allNotifications.length
    };
    
  } catch (error) {
    console.error('❌ Notification test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const clearTestNotifications = async (userId) => {
  console.log('🧹 Clearing test notifications for user:', userId);
  
  try {
    // Mark all notifications as read to clear badges
    await notificationService.markAllNotificationsAsRead(userId);
    console.log('✅ All notifications marked as read');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to clear notifications:', error);
    return { success: false, error: error.message };
  }
};
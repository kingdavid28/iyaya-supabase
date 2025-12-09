import { v4 as uuidv4 } from 'uuid';

export const NOTIFICATION_TYPES = {
  BOOKING: 'booking',
  APPLICATION: 'application', 
  MESSAGE: 'message',
  SYSTEM: 'system'
};

export const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

export const createNotification = (type, title, message, data = {}, priority = NOTIFICATION_PRIORITIES.MEDIUM) => {
  if (!type || !title || !message) {
    throw new Error('Notification requires type, title, and message');
  }

  return {
    id: uuidv4(),
    type,
    title,
    message,
    data: data || {},
    priority,
    read: false,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
  };
};

export const getNotificationIcon = (type) => {
  switch (type) {
    case NOTIFICATION_TYPES.BOOKING:
      return 'calendar';
    case NOTIFICATION_TYPES.APPLICATION:
      return 'document-text';
    case NOTIFICATION_TYPES.MESSAGE:
      return 'chatbubble-ellipses';
    case NOTIFICATION_TYPES.SYSTEM:
      return 'information-circle';
    default:
      return 'notifications';
  }
};

export const getNotificationColor = (priority) => {
  switch (priority) {
    case NOTIFICATION_PRIORITIES.LOW:
      return '#6b7280';
    case NOTIFICATION_PRIORITIES.MEDIUM:
      return '#3b82f6';
    case NOTIFICATION_PRIORITIES.HIGH:
      return '#f59e0b';
    case NOTIFICATION_PRIORITIES.URGENT:
      return '#ef4444';
    default:
      return '#3b82f6';
  }
};
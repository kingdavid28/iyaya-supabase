import { v4 as uuidv4 } from 'uuid';

export const generateMessageId = () => uuidv4();

export const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else {
    return 'Just now';
  }
};

export const getMessageContent = (message) => {
  return message?.content || message?.text || message?.message || '';
};

export const createMessage = (senderId, content, conversationId = null) => {
  if (!senderId || !content) {
    throw new Error('senderId and content are required');
  }
  
  return {
    id: generateMessageId(),
    senderId,
    content,
    conversationId,
    createdAt: new Date().toISOString(),
    read: false,
    type: 'text'
  };
};

export const validateMessage = (message) => {
  if (!message || typeof message !== 'object') return false;
  if (!message.senderId || !message.content) return false;
  return true;
};
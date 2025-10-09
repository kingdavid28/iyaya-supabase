# Supabase Features Implementation

This document outlines the complete implementation of messaging, reviews, and notifications using Supabase.

## 🚀 Features Implemented

### 1. Real-time Messaging System
- **Conversations Management**: Create and manage conversations between parents and caregivers
- **Real-time Messages**: Send and receive messages with real-time updates
- **Message Status**: Track read/unread status
- **Message History**: Persistent message storage with pagination

### 2. Reviews & Ratings System
- **Review Creation**: Users can leave reviews and ratings (1-5 stars)
- **Review Display**: Show reviews with reviewer information and timestamps
- **Rating Calculation**: Automatic calculation of average ratings
- **Review Management**: Update user profiles with rating statistics

### 3. Notifications System
- **Real-time Notifications**: Instant notifications for various events
- **Notification Types**: Support for messages, bookings, applications, reviews, payments
- **Notification Management**: Mark as read, mark all as read
- **Notification Badge**: Visual indicator for unread notifications
- **Auto-notifications**: Automatic notifications for key events

## 📁 File Structure

```
src/
├── services/
│   ├── supabaseService.js          # Main Supabase service with all methods
│   └── index.js                    # Service exports
├── screens/
│   ├── ChatScreen.js               # Real-time chat interface
│   └── NotificationsScreen.js      # Notifications management
├── components/
│   ├── ReviewsSection.js           # Reviews display and creation
│   ├── NotificationBadge.js        # Unread count badge
│   └── MessagesTab.js              # Updated for Supabase
├── hooks/
│   ├── useMessaging.js             # Messaging hook
│   ├── useNotifications.js         # Notifications hook
│   └── useReviews.js               # Reviews hook (if needed)
└── contexts/
    └── AuthContext.js              # Updated for Supabase auth
```

## 🔧 Supabase Service Methods

### Messaging Methods
```javascript
// Conversation management
getOrCreateConversation(participant1, participant2)
getConversations(userId)

// Message management
sendMessage(conversationId, senderId, content)
getMessages(conversationId, limit)
markMessagesAsRead(conversationId, userId)

// Real-time subscriptions
subscribeToMessages(conversationId, callback)
```

### Reviews Methods
```javascript
// Review management
createReview(reviewData)
getReviews(userId, limit)
_updateUserRating(userId)  // Internal method
```

### Notifications Methods
```javascript
// Notification management
createNotification(notificationData)
getNotifications(userId, limit)
markNotificationAsRead(notificationId)
markAllNotificationsAsRead(userId)
getUnreadNotificationCount(userId)

// Notification helpers
notifyJobApplication(jobId, caregiverId)
notifyBookingRequest(bookingId)
notifyBookingConfirmed(bookingId)
notifyNewMessage(conversationId, senderId, recipientId)

// Real-time subscriptions
subscribeToNotifications(userId, callback)
```

## 🗄️ Database Schema

### Conversations Table
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_2 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(participant_1, participant_2)
);
```

### Messages Table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Reviews Table
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('message', 'job_application', 'booking_request', 'booking_confirmed', 'booking_cancelled', 'review', 'payment', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔐 Row Level Security (RLS) Policies

### Conversations Policies
```sql
-- Participants can view conversations
CREATE POLICY "Participants can view conversations" ON conversations FOR SELECT USING (
  auth.uid() = participant_1 OR auth.uid() = participant_2
);

-- Users can create conversations
CREATE POLICY "Users can create conversations" ON conversations FOR INSERT WITH CHECK (
  auth.uid() = participant_1 OR auth.uid() = participant_2
);
```

### Messages Policies
```sql
-- Conversation participants can view messages
CREATE POLICY "Conversation participants can view messages" ON messages FOR SELECT USING (
  auth.uid() IN (
    SELECT participant_1 FROM conversations WHERE id = conversation_id
    UNION
    SELECT participant_2 FROM conversations WHERE id = conversation_id
  )
);

-- Users can send messages
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Recipients can update messages (mark as read)
CREATE POLICY "Recipients can update messages" ON messages FOR UPDATE USING (auth.uid() = recipient_id);
```

### Reviews Policies
```sql
-- Users can view reviews
CREATE POLICY "Users can view reviews" ON reviews FOR SELECT USING (true);

-- Users can create reviews
CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Reviewers can update their reviews
CREATE POLICY "Reviewers can update their reviews" ON reviews FOR UPDATE USING (auth.uid() = reviewer_id);
```

### Notifications Policies
```sql
-- Users can view their notifications
CREATE POLICY "Users can view their notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);

-- Users can update their notifications
CREATE POLICY "Users can update their notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- System can create notifications
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true);
```

## 🎯 Usage Examples

### Sending a Message
```javascript
import supabaseService from '../services/supabaseService';

// Get or create conversation
const conversation = await supabaseService.getOrCreateConversation(userId, targetUserId);

// Send message
const message = await supabaseService.sendMessage(conversation.id, userId, "Hello!");

// Send notification
await supabaseService.notifyNewMessage(conversation.id, userId, targetUserId);
```

### Creating a Review
```javascript
import supabaseService from '../services/supabaseService';

const reviewData = {
  bookingId: 'booking-uuid',
  reviewerId: 'reviewer-uuid',
  revieweeId: 'reviewee-uuid',
  rating: 5,
  comment: 'Excellent caregiver!'
};

const review = await supabaseService.createReview(reviewData);
```

### Managing Notifications
```javascript
import supabaseService from '../services/supabaseService';

// Get notifications
const notifications = await supabaseService.getNotifications(userId);

// Mark as read
await supabaseService.markNotificationAsRead(notificationId);

// Get unread count
const unreadCount = await supabaseService.getUnreadNotificationCount(userId);
```

### Real-time Subscriptions
```javascript
import supabaseService from '../services/supabaseService';

// Subscribe to messages
const messageSubscription = supabaseService.subscribeToMessages(conversationId, (payload) => {
  if (payload.eventType === 'INSERT') {
    const newMessage = payload.new;
    // Handle new message
  }
});

// Subscribe to notifications
const notificationSubscription = supabaseService.subscribeToNotifications(userId, (payload) => {
  if (payload.eventType === 'INSERT') {
    const newNotification = payload.new;
    // Handle new notification
  }
});

// Cleanup
return () => {
  messageSubscription.unsubscribe();
  notificationSubscription.unsubscribe();
};
```

## 🎨 UI Components

### ChatScreen
- Real-time messaging interface
- Message bubbles with timestamps
- Auto-scroll to bottom
- Keyboard handling
- Message status indicators

### ReviewsSection
- Star rating display
- Review creation modal
- Review list with pagination
- Average rating calculation
- Reviewer information

### NotificationsScreen
- Notification list with icons
- Mark as read functionality
- Navigation to relevant screens
- Real-time updates
- Empty state handling

### NotificationBadge
- Unread count display
- Real-time updates
- Customizable styling
- Auto-hide when no unread

## 🔄 Migration from Old API

### Updated Components
1. **MessagesTab.js** - Both Parent and Caregiver versions updated to use Supabase
2. **ChatScreen.js** - New implementation with real-time messaging
3. **Navigation** - Added new screens to AppNavigator

### Key Changes
- Replaced `messagingAPI` with `supabaseService`
- Updated conversation structure
- Added real-time subscriptions
- Improved error handling
- Added notification system

## 🚀 Getting Started

1. **Database Setup**: Run the `supabase-setup.sql` script in your Supabase SQL editor
2. **Environment**: Ensure Supabase credentials are configured
3. **Navigation**: New screens are automatically added to navigation
4. **Usage**: Import and use the new components and hooks

## 🔧 Configuration

### Supabase Configuration
Ensure your Supabase project has:
- Authentication enabled
- Row Level Security enabled
- Real-time subscriptions enabled
- Storage buckets created (profile-images, payment-proofs)

### Environment Variables
```env
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 🎯 Next Steps

1. **Testing**: Test all messaging, review, and notification flows
2. **Push Notifications**: Integrate with Expo push notifications
3. **Performance**: Optimize real-time subscriptions
4. **UI/UX**: Enhance user interface based on feedback
5. **Analytics**: Add tracking for user engagement

## 🐛 Troubleshooting

### Common Issues
1. **RLS Policies**: Ensure proper RLS policies are in place
2. **Real-time**: Check if real-time is enabled in Supabase
3. **Authentication**: Verify user authentication state
4. **Permissions**: Check user permissions for operations

### Debug Tips
- Enable Supabase debug logging
- Check browser/console for errors
- Verify database constraints
- Test with different user roles

This implementation provides a complete, production-ready messaging, reviews, and notifications system using Supabase with real-time capabilities and proper security.
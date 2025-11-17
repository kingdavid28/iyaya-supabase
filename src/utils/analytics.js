export const analytics = {
  trackScreen(screenName, properties = {}) {
    console.log('📊 Screen:', screenName, properties);
  },

  trackEvent(eventName, properties = {}) {
    console.log('📊 Event:', eventName, properties);
  },

  trackError(error, context = {}) {
    console.error('📊 Error:', error, context);
  },

  trackLogin(method = 'email') {
    console.log('📊 Login:', method);
  },

  trackSignup(userType) {
    console.log('📊 Signup:', userType);
  },

  trackJobPost() {
    console.log('📊 Job Posted');
  },

  trackJobApply(jobId) {
    console.log('📊 Job Applied:', jobId);
  },

  trackBookingCreated(bookingId) {
    console.log('📊 Booking Created:', bookingId);
  },

  trackMessageSent(conversationId) {
    console.log('📊 Message Sent:', conversationId);
  },

  setUserId(userId) {
    console.log('📊 User ID set:', userId);
  }
};
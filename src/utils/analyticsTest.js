// Analytics Test - Run this in browser console to verify analytics is working
export const testAnalytics = async () => {
  try {
    const { trackEvent, trackUserLogin, trackBookingCreated, trackSearchPerformed } = await import('./analytics');
    
    console.log('🧪 Testing Vercel Analytics implementation...');
    
    // Test basic event tracking
    trackEvent('test_event', { 
      test_property: 'test_value',
      timestamp: new Date().toISOString()
    });
    
    // Test user login tracking
    trackUserLogin('parent');
    
    // Test booking creation tracking
    trackBookingCreated('childcare', {
      booking_id: 'test_123',
      hourly_rate: 25,
      total_amount: 200,
      duration_hours: 8,
      children_count: 2,
      has_special_instructions: true
    });
    
    // Test search tracking
    trackSearchPerformed('caregivers', {
      query_length: 10,
      results_count: 5,
      active_filters: 2
    });
    
    console.log('✅ Analytics test events sent! Check Vercel Analytics dashboard.');
  } catch (error) {
    console.warn('Analytics test failed:', error.message);
  }
};

// Auto-run test in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  setTimeout(() => {
    console.log('🔍 Analytics available for testing. Run testAnalytics() in console.');
    window.testAnalytics = testAnalytics;
  }, 3000);
}
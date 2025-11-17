const { reviewService } = require('./src/services/supabase/reviewService.js');

async function initializeRatings() {
  try {
    console.log('🔄 Initializing caregiver ratings...');
    await reviewService.initializeCaregiverRatings();
    console.log('✅ Rating initialization complete');
  } catch (error) {
    console.error('❌ Rating initialization failed:', error.message);
  }
}

initializeRatings();

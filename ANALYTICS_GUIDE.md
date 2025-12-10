# Vercel Analytics Implementation Guide

## Overview
Vercel Analytics has been implemented in the Iyaya app to track user interactions and app performance on the web platform.

## Implementation Details

### 1. Package Installation
- `@vercel/analytics` is already installed in package.json
- Version: ^1.6.1

### 2. Core Implementation

#### App.js Integration
```javascript
// Vercel Analytics - only for web
let Analytics = null;
if (Platform.OS === 'web') {
  try {
    const { Analytics: VercelAnalytics } = require('@vercel/analytics/react');
    Analytics = VercelAnalytics;
  } catch (error) {
    console.warn('Vercel Analytics not available:', error.message);
  }
}

// In JSX
{Analytics && <Analytics />}
```

#### Analytics Utility (src/utils/analytics.js)
- Web-only analytics tracking functions
- Automatic platform detection
- Error handling for missing dependencies

### 3. HTML Script Integration
Added to `public/index.html`:
```html
<script defer src="https://cdn.vercel-analytics.com/v1/script.debug.js"></script>
```

### 4. Event Tracking Examples

#### Authentication Events
- User registration: `trackUserRegistration(userType)`
- User login: `trackUserLogin(userType)`
- Google OAuth: Automatically tracked

#### User Interactions
- Welcome screen card clicks
- Profile views
- Search actions
- Booking creation

### 5. Available Tracking Functions

```javascript
import { trackEvent, trackUserRegistration, trackUserLogin } from '../utils/analytics';

// Generic event tracking
trackEvent('custom_event', { property: 'value' });

// Predefined events
trackUserRegistration('parent'); // or 'caregiver'
trackUserLogin('parent');
trackProfileView('caregiver_profile');
trackBookingCreated('babysitting');
trackSearchPerformed('caregivers', { location: 'NYC', age_range: '2-5' });
```

### 6. Platform Compatibility
- **Web**: Full Vercel Analytics support
- **Mobile (iOS/Android)**: Analytics calls are safely ignored
- **Expo Go**: No impact on development workflow

### 7. Deployment Requirements
- Analytics will automatically work when deployed to Vercel
- No additional configuration needed for Vercel deployment
- Events will appear in Vercel Analytics dashboard

### 8. Development Testing
- Use `script.debug.js` for development (already configured)
- Events are logged to console in development
- Switch to production script for live deployment

### 9. Privacy Compliance
- Vercel Analytics is privacy-friendly by default
- No personal data is tracked without explicit event parameters
- GDPR compliant

### 10. Monitoring
- View analytics in Vercel dashboard
- Track user engagement and conversion funnels
- Monitor app performance metrics

## Next Steps
1. Deploy to Vercel to see analytics in action
2. Add more custom events as needed
3. Monitor user behavior patterns
4. Optimize based on analytics insights
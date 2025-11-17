class PerformanceMonitor {
  constructor() {
    this.metrics = {
      apiCalls: 0,
      tokenRefreshes: 0,
      profileLoads: 0,
      renderCycles: 0,
      lastReset: Date.now()
    };
    this.timers = new Map();
  }

  // Track API calls
  trackAPICall(endpoint) {
    this.metrics.apiCalls++;
    console.log(`📊 API Call #${this.metrics.apiCalls}: ${endpoint}`);
  }

  // Track token refreshes
  trackTokenRefresh() {
    this.metrics.tokenRefreshes++;
    console.log(`🔑 Token Refresh #${this.metrics.tokenRefreshes}`);
  }

  // Track profile loads
  trackProfileLoad() {
    this.metrics.profileLoads++;
    console.log(`👤 Profile Load #${this.metrics.profileLoads}`);
  }

  // Start timing an operation
  startTimer(operation) {
    this.timers.set(operation, Date.now());
  }

  // End timing and log result
  endTimer(operation) {
    const startTime = this.timers.get(operation);
    if (startTime) {
      const duration = Date.now() - startTime;
      console.log(`⏱️ ${operation} took ${duration}ms`);
      this.timers.delete(operation);
      return duration;
    }
    return 0;
  }

  // Get current metrics
  getMetrics() {
    const uptime = Date.now() - this.metrics.lastReset;
    return {
      ...this.metrics,
      uptime,
      apiCallsPerMinute: (this.metrics.apiCalls / (uptime / 60000)).toFixed(2),
      tokenRefreshesPerMinute: (this.metrics.tokenRefreshes / (uptime / 60000)).toFixed(2)
    };
  }

  // Log performance summary
  logSummary() {
    const metrics = this.getMetrics();
    console.log('📊 Performance Summary:', {
      'API Calls': metrics.apiCalls,
      'Token Refreshes': metrics.tokenRefreshes,
      'Profile Loads': metrics.profileLoads,
      'API Calls/min': metrics.apiCallsPerMinute,
      'Token Refreshes/min': metrics.tokenRefreshesPerMinute,
      'Uptime (min)': (metrics.uptime / 60000).toFixed(2)
    });
  }

  // Reset metrics
  reset() {
    this.metrics = {
      apiCalls: 0,
      tokenRefreshes: 0,
      profileLoads: 0,
      renderCycles: 0,
      lastReset: Date.now()
    };
    this.timers.clear();
    console.log('📊 Performance metrics reset');
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Auto-log summary every 5 minutes in development
if (__DEV__) {
  setInterval(() => {
    performanceMonitor.logSummary();
  }, 5 * 60 * 1000);
}
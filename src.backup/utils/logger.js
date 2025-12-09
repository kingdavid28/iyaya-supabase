// Enhanced logger for mobile debugging
export const logger = {
  debug: (message, ...args) => {
    // Disabled in production
  },
  info: (message, ...args) => {
    // Disabled - only show errors and warnings
  },
  error: (message, ...args) => {
    // Filter out empty error objects to reduce noise
    const filteredArgs = args.filter(arg => {
      if (typeof arg === 'object' && arg !== null) {
        return Object.keys(arg).length > 0;
      }
      return arg !== undefined && arg !== null;
    });
    
    // Only log if there are actual error details
    if (filteredArgs.length > 0) {
      console.error(message, ...filteredArgs);
    }
  },
  warn: (message, ...args) => {
    console.warn(`🟡 WARN: ${message}`, ...args);
  }
};

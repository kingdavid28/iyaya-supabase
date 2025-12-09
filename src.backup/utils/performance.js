// Performance monitoring utilities
import { InteractionManager } from 'react-native';

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.isEnabled = process.env.NODE_ENV === 'production';
  }

  // Start timing an operation
  startTiming(operationName) {
    if (!this.isEnabled) return;
    
    this.metrics.set(operationName, {
      startTime: performance.now(),
      endTime: null,
      duration: null
    });
  }

  // End timing an operation
  endTiming(operationName) {
    if (!this.isEnabled) return;
    
    const metric = this.metrics.get(operationName);
    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      
      // Log slow operations
      if (metric.duration > 1000) {
        console.warn(`Slow operation detected: ${operationName} took ${metric.duration.toFixed(2)}ms`);
      }
      
      return metric.duration;
    }
    return null;
  }

  // Measure component render time
  measureRender(componentName, renderFunction) {
    if (!this.isEnabled) return renderFunction();
    
    this.startTiming(`render_${componentName}`);
    const result = renderFunction();
    this.endTiming(`render_${componentName}`);
    
    return result;
  }

  // Defer heavy operations until after interactions
  runAfterInteractions(callback) {
    return InteractionManager.runAfterInteractions(callback);
  }

  // Memory usage monitoring
  checkMemoryUsage() {
    if (!this.isEnabled || !performance.memory) return null;
    
    const memory = {
      used: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
      total: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) // MB
    };
    
    // Warn if memory usage is high
    if (memory.used > memory.limit * 0.8) {
      console.warn('High memory usage detected:', memory);
    }
    
    return memory;
  }

  // Get performance report
  getReport() {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: Object.fromEntries(this.metrics),
      memory: this.checkMemoryUsage()
    };
    
    return report;
  }

  // Clear metrics
  clear() {
    this.metrics.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

// HOC for measuring component performance
export const withPerformanceTracking = (WrappedComponent, componentName) => {
  return function PerformanceTrackedComponent(props) {
    return performanceMonitor.measureRender(
      componentName || WrappedComponent.name,
      () => <WrappedComponent {...props} />
    );
  };
};

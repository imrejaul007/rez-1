# Monitoring & Analytics - Quick Reference Guide

## 🚀 Quick Start (5 minutes)

### 1. Add Dev Tools to Your App

```typescript
// app/_layout.tsx
import PerformanceDevTools from '@/components/dev/PerformanceDevTools';

export default function RootLayout() {
  return (
    <>
      {/* Your app content */}
      <PerformanceDevTools />
    </>
  );
}
```

### 2. Initialize Services

```typescript
// app/_layout.tsx or app/index.tsx
import { useEffect } from 'react';
import { webVitalsService } from '@/services/webVitalsService';
import { optimizedAnalyticsService } from '@/services/analyticsService.optimized';

export default function App() {
  useEffect(() => {
    // Web Vitals (web only)
    webVitalsService.init();

    // Analytics
    optimizedAnalyticsService.setEnabled(true);
  }, []);

  return <YourApp />;
}
```

### 3. Track Your First Event

```typescript
import { optimizedAnalyticsService } from '@/services/analyticsService.optimized';

// In your component
const handleButtonClick = () => {
  optimizedAnalyticsService.track('button_click', {
    buttonName: 'purchase'
  });
};
```

**That's it!** Open the app, tap the 📊 button in the bottom-right corner to see the performance dashboard.

---

## 📊 Common Use Cases

### Track Page Views

```typescript
import { optimizedAnalyticsService } from '@/services/analyticsService.optimized';

useEffect(() => {
  optimizedAnalyticsService.trackPageView(route.name);
}, [route]);
```

### Track API Performance

```typescript
import { performanceMetricsService } from '@/services/performanceMetricsService';

const startTime = performance.now();
const response = await fetch(url);
const duration = performance.now() - startTime;

performanceMetricsService.trackAPILatency(url, duration, 'GET', response.status, response.ok);
```

### Track Component Renders

```typescript
import usePerformanceMetrics from '@/hooks/usePerformanceMetrics';

function MyComponent() {
  usePerformanceMetrics({
    componentName: 'MyComponent',
    trackRenders: true,
  });

  return <View>...</View>;
}
```

### Track Errors

```typescript
import { errorTrackingService } from '@/services/errorTrackingService';

try {
  // Your code
} catch (error) {
  errorTrackingService.trackError(error, 'component', 'high', {
    component: 'MyComponent',
  });
}
```

### Track User Actions

```typescript
import { optimizedAnalyticsService } from '@/services/analyticsService.optimized';

const handleAddToCart = (product) => {
  optimizedAnalyticsService.track('add_to_cart', {
    productId: product.id,
    price: product.price,
  }, 'high'); // High priority = sent immediately
};
```

---

## 🔍 Monitoring Cheat Sheet

### Services

| Service | Purpose | Import |
|---------|---------|--------|
| **webVitalsService** | Web performance metrics (LCP, FID, CLS) | `@/services/webVitalsService` |
| **performanceMetricsService** | Custom metrics (API, render times) | `@/services/performanceMetricsService` |
| **errorTrackingService** | Error capture and categorization | `@/services/errorTrackingService` |
| **optimizedAnalyticsService** | Event tracking with batching | `@/services/analyticsService.optimized` |
| **backendMonitoringService** | Backend health monitoring | `@/services/backendMonitoringService` |

### Hooks

| Hook | Purpose | Returns |
|------|---------|---------|
| **usePerformanceDashboard** | Complete performance data | Dashboard object |
| **usePerformanceScore** | Simple performance score | Number (0-100) |
| **usePerformanceMetrics** | Component performance tracking | Tracking methods |

### Components

| Component | Purpose | Location |
|-----------|---------|----------|
| **PerformanceDevTools** | Visual performance dashboard | `@/components/dev/PerformanceDevTools` |

---

## ⚡ Performance Optimization Tips

### DO ✅

```typescript
// Use batched analytics
optimizedAnalyticsService.track('event', data, 'normal');

// Use debounced tracking for frequent events
optimizedAnalyticsService.trackPageView(route); // Auto-debounced

// Track only what matters
if (duration > 1000) {
  performanceMetricsService.trackAPILatency(endpoint, duration);
}

// Use appropriate priority
optimizedAnalyticsService.trackConversion('purchase', amount); // High priority
optimizedAnalyticsService.trackInteraction('scroll', data); // Low priority (debounced)
```

### DON'T ❌

```typescript
// Don't track every render
useEffect(() => {
  performanceMetricsService.trackRenderTime('Component', 0);
}); // No dependency array = tracks every render

// Don't use high priority for everything
optimizedAnalyticsService.track('scroll', data, 'high'); // Will bypass batching

// Don't track PII
optimizedAnalyticsService.track('login', {
  password: '123456' // ❌ Never track sensitive data
});
```

---

## 🎯 Performance Targets

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** | < 2.5s | 2.5s - 4s | > 4s |
| **FID** | < 100ms | 100ms - 300ms | > 300ms |
| **CLS** | < 0.1 | 0.1 - 0.25 | > 0.25 |
| **API Latency** | < 1s | 1s - 2s | > 2s |
| **Render Time** | < 16ms | 16ms - 33ms | > 33ms |
| **Cache Hit Rate** | > 70% | 50% - 70% | < 50% |

---

## 🐛 Error Tracking

### Error Types

```typescript
'network'      // Network failures
'api'          // API errors
'component'    // React component errors
'global'       // Unhandled errors
'timeout'      // Timeout errors
'validation'   // Form validation errors
```

### Severity Levels

```typescript
'low'          // Minor issues (validation errors)
'medium'       // Recoverable errors (network timeouts)
'high'         // Significant errors (API failures)
'critical'     // App-breaking errors (uncaught exceptions)
```

### Usage

```typescript
// Network error
errorTrackingService.trackNetworkError(endpoint, statusCode, error);

// API error
errorTrackingService.trackAPIError(endpoint, response);

// Component error
errorTrackingService.trackComponentError('MyComponent', error, errorInfo);

// Validation error
errorTrackingService.trackValidationError('Invalid email', 'email', value);
```

---

## 📈 Analytics Configuration

### Default Configuration

```typescript
{
  flushInterval: 5000,      // Send batch every 5 seconds
  maxQueueSize: 50,         // Max events before force flush
  maxBatchSize: 20,         // Max events per batch
  debounceTime: 300,        // Debounce time in ms
  enableOfflineQueue: true, // Queue events when offline
  enableBatching: true,     // Enable event batching
}
```

### Custom Configuration

```typescript
optimizedAnalyticsService.updateConfig({
  flushInterval: 10000,     // Change to 10 seconds
  maxBatchSize: 30,         // Increase batch size
});
```

---

## 🔧 Debugging

### View Performance Dashboard

1. Look for 📊 button in bottom-right corner (dev mode only)
2. Tap to open full dashboard
3. View Web Vitals, metrics, errors, and recommendations

### Console Commands

```typescript
// Web Vitals
webVitalsService.printSummary();

// Performance Metrics
const metrics = performanceMetricsService.getAggregatedMetrics('hour');
console.log(metrics);

// Error Stats
errorTrackingService.printReport();

// Analytics Stats
optimizedAnalyticsService.printStats();

// Backend Health
await backendMonitoringService.printReport();
```

### Check Service Status

```typescript
// Check if services are enabled
console.log('Web Vitals:', webVitalsService.isEnabled?.());
console.log('Performance:', performanceMetricsService.isEnabled);
console.log('Errors:', errorTrackingService.isEnabled);
console.log('Analytics:', optimizedAnalyticsService.isEnabled);
```

---

## 🚨 Common Issues

### Issue: Dev tools not showing

**Solution**: Check dev mode
```typescript
console.log('DEV:', __DEV__); // Should be true
```

### Issue: Web Vitals not tracking

**Solution**: Only works on web platform
```typescript
import { Platform } from 'react-native';
console.log('Platform:', Platform.OS); // Should be 'web'
```

### Issue: Events not being sent

**Solution**: Check queue and force flush
```typescript
const stats = optimizedAnalyticsService.getStats();
console.log('Queued:', stats.queuedEvents);
await optimizedAnalyticsService.flush();
```

### Issue: High memory usage

**Solution**: Clear old metrics
```typescript
await performanceMetricsService.clearMetrics();
await errorTrackingService.clearErrors();
```

---

## 📱 Platform Support

| Feature | iOS | Android | Web |
|---------|-----|---------|-----|
| **Performance Metrics** | ✅ | ✅ | ✅ |
| **Error Tracking** | ✅ | ✅ | ✅ |
| **Analytics** | ✅ | ✅ | ✅ |
| **Web Vitals** | ❌ | ❌ | ✅ |
| **Memory Monitoring** | ❌ | ❌ | ✅ (Chrome) |
| **Dev Tools** | ✅ | ✅ | ✅ |

---

## 📚 Further Reading

- **Full Documentation**: `PHASE4_DAY13_MONITORING_ANALYTICS_COMPLETE.md`
- **Integration Guide**: See "Integration Guide" section in full docs
- **Best Practices**: See "Best Practices" section in full docs
- **Testing Guide**: See "Testing Guide" section in full docs

---

## 💡 Pro Tips

1. **Use the dashboard** - The visual dashboard makes it easy to spot performance issues
2. **Track strategically** - Don't track everything, focus on critical user paths
3. **Set up alerts** - Configure thresholds to get notified of issues
4. **Review regularly** - Check the performance report daily
5. **Optimize iteratively** - Use recommendations to guide optimizations

---

## 🎉 You're All Set!

Start the app, click the 📊 button, and explore your performance dashboard!

For more details, see: `PHASE4_DAY13_MONITORING_ANALYTICS_COMPLETE.md`

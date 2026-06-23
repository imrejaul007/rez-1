# Request Deduplication and Retry Logic - Implementation Guide

## 📋 Overview

The REZ app frontend now includes comprehensive request deduplication and retry logic to improve reliability, reduce server load, and enhance user experience.

## 🎯 Features Implemented

### ✅ 1. Request Deduplication
**File:** `utils/requestDeduplicator.ts`

**What it does:**
- Prevents multiple identical API calls from being made simultaneously
- Returns the same Promise for duplicate in-flight requests
- Automatically cleans up after request completion
- Tracks statistics (requests saved, active requests, etc.)

**Key Features:**
- Automatic timeout handling (30 seconds default)
- Request cancellation support via AbortController
- Request aging tracking
- Statistics and monitoring
- Development logging

**Already Integrated:** ✅ Already integrated into `services/apiClient.ts`

### ✅ 2. Request Retry Logic
**File:** `utils/requestRetry.ts` (NEW)

**What it does:**
- Automatically retries failed requests with exponential backoff
- Smart error classification (network, timeout, server errors)
- Configurable retry attempts (default: 3)
- Configurable delays with jitter to prevent thundering herd
- Only retries appropriate errors (5xx, network, timeout)

**Key Features:**
- Exponential backoff with jitter
- Maximum delay cap
- Custom retry predicates
- Multiple retry strategies (exponential, linear, constant)
- Preset configurations (aggressive, conservative, fast)
- Request timeout handling

### ✅ 3. Enhanced API Client
**File:** `utils/enhancedApiClient.ts` (NEW)

**What it does:**
- Wraps the base API client with all enhancements
- Combines deduplication + retry + timeout + caching
- Network state detection
- Request metrics tracking
- Response caching with TTL

**Key Features:**
- Automatic deduplication for GET requests
- Automatic retry for all requests (configurable)
- Request timeout (30 seconds default)
- Response caching with expiration
- Offline detection
- Request cancellation
- Comprehensive logging (development mode)
- Statistics and monitoring

### ✅ 4. Offline Queue Support
**File:** `services/offlineQueueService.ts` (EXISTING)

**What it does:**
- Queues requests when device is offline
- Automatically replays when back online
- Retry failed operations
- Conflict resolution strategies

## 📚 Usage Examples

### Example 1: Basic GET Request (Auto Deduplication + Retry)

```typescript
import enhancedApiClient from '@/utils/enhancedApiClient';

// Simple GET with all defaults
const response = await enhancedApiClient.get('/products/featured', { limit: 10 });

// Automatically gets:
// ✅ Deduplication (prevents duplicate concurrent requests)
// ✅ Retry on failure (3 attempts with exponential backoff)
// ✅ Timeout handling (30 seconds)
```

### Example 2: GET with Caching

```typescript
// Cache successful responses for 5 minutes
const response = await enhancedApiClient.get(
  '/products/featured',
  { limit: 10 },
  {
    cache: true,
    cacheDuration: 300000, // 5 minutes
  }
);
```

### Example 3: POST with Custom Retry

```typescript
import { AGGRESSIVE_RETRY_CONFIG } from '@/utils/requestRetry';

// Critical operation with aggressive retry
const response = await enhancedApiClient.post(
  '/orders/create',
  orderData,
  {
    retry: true,
    retryConfig: AGGRESSIVE_RETRY_CONFIG, // 5 retries instead of 3
    timeout: 60000, // 60 second timeout
  }
);
```

### Example 4: POST without Retry

```typescript
// Analytics/tracking - don't retry
const response = await enhancedApiClient.post(
  '/analytics/track',
  trackingData,
  {
    retry: false,
    logging: false,
  }
);
```

### Example 5: Search with Deduplication

```typescript
// Prevent duplicate searches while user is typing
const response = await enhancedApiClient.get(
  '/products/search',
  { q: searchTerm },
  {
    deduplicate: true,
    cache: true,
    cacheDuration: 60000, // 1 minute
  }
);
```

### Example 6: Cancellable Request

```typescript
const controller = new AbortController();

const promise = enhancedApiClient.get(
  '/products/category/electronics',
  undefined,
  { controller }
);

// Cancel when user navigates away
controller.abort();
```

### Example 7: Custom Retry Logic

```typescript
const response = await enhancedApiClient.get(
  `/products/${productId}`,
  undefined,
  {
    retry: true,
    retryConfig: {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 5000,
      shouldRetry: (error, attempt) => {
        // Don't retry on 404 (product not found)
        if (error?.status === 404) return false;
        // Use default retry logic for other errors
        return true;
      },
    },
  }
);
```

## 🔧 Configuration Options

### EnhancedRequestOptions

```typescript
interface EnhancedRequestOptions {
  // Enable/disable deduplication (default: true for GET, false for others)
  deduplicate?: boolean;

  // Enable/disable retry (default: true)
  retry?: boolean;

  // Custom retry configuration
  retryConfig?: RetryConfig;

  // Request timeout in milliseconds (default: 30000)
  timeout?: number;

  // AbortController for cancellation
  controller?: AbortController;

  // Enable logging (default: __DEV__)
  logging?: boolean;

  // Queue if offline (default: false)
  queueIfOffline?: boolean;

  // Cache successful responses (default: false)
  cache?: boolean;

  // Cache duration in milliseconds (default: 300000)
  cacheDuration?: number;
}
```

### RetryConfig

```typescript
interface RetryConfig {
  // Maximum retry attempts (default: 3)
  maxRetries?: number;

  // Initial delay before first retry (default: 1000ms)
  initialDelay?: number;

  // Maximum delay between retries (default: 8000ms)
  maxDelay?: number;

  // Exponential backoff multiplier (default: 2)
  backoffMultiplier?: number;

  // Add random jitter (default: true)
  jitter?: boolean;

  // Request timeout (default: 30000ms)
  timeout?: number;

  // Custom retry predicate
  shouldRetry?: (error: any, attempt: number) => boolean;

  // Retry callback
  onRetry?: (error: any, attempt: number, delay: number) => void;

  // Enable logging (default: __DEV__)
  enableLogging?: boolean;
}
```

### Preset Retry Configurations

```typescript
import {
  DEFAULT_RETRY_CONFIG,
  AGGRESSIVE_RETRY_CONFIG,
  CONSERVATIVE_RETRY_CONFIG,
  FAST_RETRY_CONFIG,
  NO_RETRY_CONFIG,
} from '@/utils/requestRetry';

// Default: 3 retries, exponential backoff
DEFAULT_RETRY_CONFIG

// Aggressive: 5 retries, faster initial retry
AGGRESSIVE_RETRY_CONFIG

// Conservative: 2 retries, longer delays
CONSERVATIVE_RETRY_CONFIG

// Fast: 2 retries, very short delays
FAST_RETRY_CONFIG

// No retry: for testing
NO_RETRY_CONFIG
```

## 🎛️ Retry Logic Details

### What Gets Retried?

✅ **Always Retried:**
- Network errors (connection refused, network timeout, etc.)
- Server errors (5xx status codes)
- Request timeout errors
- 408 Request Timeout
- 429 Too Many Requests
- 502 Bad Gateway
- 503 Service Unavailable
- 504 Gateway Timeout

❌ **Never Retried:**
- Client errors (4xx except 408 and 429)
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- Validation errors

### Exponential Backoff Example

```
Attempt 1: Immediate
Attempt 2: Wait 1000ms  (1s)
Attempt 3: Wait 2000ms  (2s)
Attempt 4: Wait 4000ms  (4s)
Total: ~7 seconds
```

With jitter (adds randomness ±25%):
```
Attempt 1: Immediate
Attempt 2: Wait 800-1200ms
Attempt 3: Wait 1600-2400ms
Attempt 4: Wait 3200-4800ms
```

## 📊 Monitoring and Statistics

### Get Statistics

```typescript
import enhancedApiClient from '@/utils/enhancedApiClient';

// Get cache statistics
const cacheStats = enhancedApiClient.getCacheStats();
console.log('Cached entries:', cacheStats.size);

// Get request metrics
const metrics = enhancedApiClient.getMetrics();

// Print comprehensive statistics (development only)
enhancedApiClient.printStats();
```

### Statistics Output

```
┌─────────────────────────────────────────┐
│     ENHANCED API CLIENT STATISTICS     │
└─────────────────────────────────────────┘

📊 Deduplication:
   Total Requests:    150
   Deduplicated:      45
   Requests Saved:    45
   Active:            2

💾 Cache:
   Cached Entries:    12

📈 Requests:
   Total:             150
   Successful:        142
   Failed:            8
   Avg Duration:      234ms
─────────────────────────────────────────
```

## 🔄 Migration from Old API Client

### Before (services/apiClient.ts):

```typescript
import apiClient from '@/services/apiClient';

const response = await apiClient.get('/products/featured', { limit: 10 });
```

### After (enhanced):

```typescript
import enhancedApiClient from '@/utils/enhancedApiClient';

const response = await enhancedApiClient.get('/products/featured', { limit: 10 });
// Now has: deduplication + retry + timeout
```

### Gradual Migration

1. **Phase 1:** Critical GET endpoints (products, categories)
   - Add caching for better performance

2. **Phase 2:** Search endpoints
   - Add deduplication to prevent duplicate searches

3. **Phase 3:** Non-critical POST endpoints
   - Add retry for better reliability

4. **Phase 4:** Critical POST endpoints (orders, payments)
   - Add aggressive retry configuration

5. **Phase 5:** Analytics/tracking endpoints
   - Disable retry to avoid duplicate events

## 🧪 Testing

### Test Retry Logic

```typescript
// Simulate network failure
const response = await enhancedApiClient.get(
  '/products/test-endpoint',
  undefined,
  {
    retry: true,
    retryConfig: {
      maxRetries: 3,
      initialDelay: 500,
      onRetry: (error, attempt, delay) => {
        console.log(`Retry attempt ${attempt}, waiting ${delay}ms`);
      },
    },
  }
);
```

### Test Deduplication

```typescript
// Make multiple identical requests
const promises = Array(10).fill(null).map(() =>
  enhancedApiClient.get('/products/featured', { limit: 10 })
);

// Only 1 actual API call is made
const results = await Promise.all(promises);
```

### Test Caching

```typescript
// First call - hits server
const result1 = await enhancedApiClient.get(
  '/products/featured',
  { limit: 10 },
  { cache: true }
);

// Second call - returns cached result
const result2 = await enhancedApiClient.get(
  '/products/featured',
  { limit: 10 },
  { cache: true }
);
```

## 🐛 Debugging

### Enable Detailed Logging

```typescript
const response = await enhancedApiClient.get(
  '/products/featured',
  { limit: 10 },
  {
    logging: true, // Force enable logging
  }
);
```

### Log Output Example

```
📤 [REQUEST] GET /products/featured
   Params: { limit: 10 }

🔄 [RETRY] Attempt 2/4
⏳ [RETRY] Waiting 1000ms before retry...

📥 [RESPONSE] GET /products/featured
   Success: true
   Has Data: true

✅ [SUCCESS] /products/featured (1234ms, 2 attempts)
```

## ⚠️ Important Notes

### Default Behavior

- **GET requests:** Deduplication ON, Retry ON
- **POST/PUT/DELETE:** Deduplication OFF, Retry ON
- **Timeout:** 30 seconds for all requests
- **Max Retries:** 3 attempts (4 total including first try)
- **Logging:** ON in development, OFF in production

### Best Practices

1. **Enable caching for GET requests** that don't change often
2. **Disable retry for analytics/tracking** to avoid duplicates
3. **Use aggressive retry for critical operations** (orders, payments)
4. **Use cancellation for user-initiated navigation** away from screens
5. **Monitor statistics in development** to optimize configuration

### When NOT to Use

- ❌ Don't cache POST/PUT/DELETE responses
- ❌ Don't deduplicate POST/PUT/DELETE requests (mutations)
- ❌ Don't retry analytics/tracking calls
- ❌ Don't retry when user explicitly cancelled

## 📁 File Structure

```
frontend/
├── utils/
│   ├── requestDeduplicator.ts       # Deduplication logic (EXISTING)
│   ├── requestRetry.ts              # Retry logic (NEW)
│   ├── enhancedApiClient.ts         # Enhanced client (NEW)
│   ├── retryStrategy.ts             # Bill upload retry (EXISTING)
│   └── retryLogic.ts                # General retry (EXISTING)
├── services/
│   ├── apiClient.ts                 # Base API client (EXISTING - with deduplication)
│   ├── productsApi.ts               # Products API (EXISTING)
│   └── productsApi.enhanced.example.ts  # Examples (NEW)
└── REQUEST_DEDUPLICATION_AND_RETRY_GUIDE.md  # This file
```

## 🚀 Next Steps

1. **Review the example file:** `services/productsApi.enhanced.example.ts`
2. **Test in development:** Try the enhanced client with your API
3. **Gradually migrate:** Start with GET endpoints
4. **Monitor statistics:** Check `enhancedApiClient.printStats()`
5. **Optimize configuration:** Adjust retry/cache settings based on usage

## 📞 Support

For questions or issues:
1. Check this guide first
2. Review example implementations
3. Check console logs (development mode)
4. Review statistics output

## 🎉 Benefits

- ✅ **Reduced server load** - Deduplication prevents duplicate requests
- ✅ **Better reliability** - Automatic retry on network failures
- ✅ **Faster responses** - Response caching
- ✅ **Better UX** - Users don't see errors for transient failures
- ✅ **Easier debugging** - Comprehensive logging and statistics
- ✅ **Configurable** - Fine-tune behavior per endpoint

---

**Status:** ✅ Implementation Complete
**Date:** 2025-12-01
**Version:** 1.0.0

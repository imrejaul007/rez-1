# API Client Quick Reference Card

## 🚀 Quick Start

```typescript
import enhancedApiClient from '@/utils/enhancedApiClient';

// Simple GET - auto deduplication + retry
const data = await enhancedApiClient.get('/products/featured', { limit: 10 });

// POST without retry
const result = await enhancedApiClient.post('/track', data, { retry: false });
```

## 📋 Common Patterns

### ✅ List/Collection Endpoints (GET)

```typescript
// Products, categories, stores, etc.
const response = await enhancedApiClient.get(
  '/products',
  { page: 1, limit: 20 },
  {
    deduplicate: true,  // ✅ Prevent duplicate concurrent requests
    cache: true,        // ✅ Cache for 5 minutes
    cacheDuration: 300000,
  }
);
```

### 🔍 Search Endpoints

```typescript
// Search as user types
const response = await enhancedApiClient.get(
  '/products/search',
  { q: searchTerm },
  {
    deduplicate: true,  // ✅ Only one search per term
    cache: true,        // ✅ Cache results
    cacheDuration: 60000, // 1 minute
    timeout: 10000,     // Quick timeout
  }
);
```

### 📄 Detail Endpoints (GET by ID)

```typescript
// Product details, store details, etc.
const response = await enhancedApiClient.get(
  `/products/${id}`,
  undefined,
  {
    deduplicate: true,  // ✅ Prevent duplicate requests
    cache: true,        // ✅ Cache for 10 minutes
    cacheDuration: 600000,
    retry: true,        // ✅ Retry on failure
  }
);
```

### 💾 Create/Update Endpoints (POST/PUT)

```typescript
// Orders, cart items, etc.
const response = await enhancedApiClient.post(
  '/orders/create',
  orderData,
  {
    retry: true,        // ✅ Retry important operations
    retryConfig: AGGRESSIVE_RETRY_CONFIG, // 5 retries
    timeout: 60000,     // 60s timeout
  }
);
```

### 📊 Analytics/Tracking (POST)

```typescript
// Page views, events, etc.
const response = await enhancedApiClient.post(
  '/analytics/track',
  eventData,
  {
    retry: false,       // ❌ Don't retry tracking
    logging: false,     // ❌ Don't log
    timeout: 5000,      // Quick timeout
  }
);
```

### 🗑️ Delete Endpoints

```typescript
// Remove items
const response = await enhancedApiClient.delete(
  `/cart/items/${itemId}`,
  undefined,
  {
    retry: true,        // ✅ Retry on network failure
    timeout: 15000,
  }
);
```

## 🎛️ Configuration Presets

```typescript
import {
  DEFAULT_RETRY_CONFIG,      // 3 retries, standard delays
  AGGRESSIVE_RETRY_CONFIG,   // 5 retries, faster
  CONSERVATIVE_RETRY_CONFIG, // 2 retries, longer delays
  FAST_RETRY_CONFIG,         // 2 retries, quick
  NO_RETRY_CONFIG,          // No retries
} from '@/utils/requestRetry';
```

## 🔧 Options at a Glance

```typescript
{
  deduplicate?: boolean;     // Prevent duplicate requests
  retry?: boolean;           // Auto retry on failure
  retryConfig?: RetryConfig; // Custom retry settings
  timeout?: number;          // Request timeout (ms)
  controller?: AbortController; // Cancellation
  logging?: boolean;         // Console logging
  cache?: boolean;           // Cache responses
  cacheDuration?: number;    // Cache TTL (ms)
}
```

## 📊 Default Behaviors

| Method | Deduplicate | Retry | Timeout | Cache |
|--------|-------------|-------|---------|-------|
| GET    | ✅ Yes      | ✅ Yes | 30s     | ❌ No |
| POST   | ❌ No       | ✅ Yes | 30s     | ❌ No |
| PUT    | ❌ No       | ✅ Yes | 30s     | ❌ No |
| DELETE | ❌ No       | ✅ Yes | 30s     | ❌ No |

## 🚦 What Gets Retried?

### ✅ Always Retry:
- Network errors
- Server errors (5xx)
- Timeouts
- 429 Rate Limit
- 502 Bad Gateway
- 503 Service Unavailable

### ❌ Never Retry:
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- Validation errors

## 🎯 Use Cases Cheat Sheet

| Scenario | Dedupe | Retry | Cache | Timeout |
|----------|--------|-------|-------|---------|
| Product list | ✅ | ✅ | ✅ | 30s |
| Search | ✅ | ✅ | ✅ | 10s |
| Product detail | ✅ | ✅ | ✅ | 30s |
| Create order | ❌ | ✅ (aggressive) | ❌ | 60s |
| Update cart | ❌ | ✅ | ❌ | 30s |
| Track event | ❌ | ❌ | ❌ | 5s |
| Delete item | ❌ | ✅ | ❌ | 15s |
| User search | ✅ | ✅ | ✅ | 10s |

## 🔍 Debugging Commands

```typescript
// Print statistics
enhancedApiClient.printStats();

// Get cache stats
const cacheStats = enhancedApiClient.getCacheStats();

// Get request metrics
const metrics = enhancedApiClient.getMetrics();

// Clear cache
enhancedApiClient.clearCache();

// Clear metrics
enhancedApiClient.clearMetrics();
```

## ⚡ Performance Tips

1. **Cache read-heavy endpoints** (products, categories)
2. **Deduplicate user searches** (prevents spam)
3. **Use aggressive retry for critical ops** (orders, payments)
4. **Disable retry for tracking** (analytics, events)
5. **Use cancellation for navigation** (abort on unmount)

## 🐛 Common Issues

### Issue: Too many retries
```typescript
// Solution: Use FAST_RETRY_CONFIG or reduce maxRetries
retryConfig: FAST_RETRY_CONFIG
```

### Issue: Slow responses
```typescript
// Solution: Reduce timeout or disable retry
timeout: 10000,
retry: false
```

### Issue: Stale cached data
```typescript
// Solution: Reduce cache duration or clear cache
cacheDuration: 60000, // 1 minute
enhancedApiClient.clearCache();
```

### Issue: Duplicate requests still happening
```typescript
// Solution: Ensure deduplicate is enabled
deduplicate: true
```

## 📚 Further Reading

- Full Guide: `REQUEST_DEDUPLICATION_AND_RETRY_GUIDE.md`
- Examples: `services/productsApi.enhanced.example.ts`
- Source: `utils/enhancedApiClient.ts`

---

**Last Updated:** 2025-12-01

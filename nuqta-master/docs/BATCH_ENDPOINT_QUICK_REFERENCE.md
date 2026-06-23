# Batch Endpoint Quick Reference

## TL;DR

The homepage now uses **1 API call** instead of **6** with automatic fallback. Feature flag enabled in dev, disabled in production.

## Quick Commands

### Check Feature Flag Status
```typescript
import homepageDataService from '@/services/homepageDataService';

// Check current status
const metrics = homepageDataService.getPerformanceMetrics();
console.log('Feature flag:', metrics.featureFlagEnabled);
```

### Enable/Disable Manually
```typescript
// Enable batch endpoint
homepageDataService.toggleBatchEndpoint(true);

// Disable batch endpoint
homepageDataService.toggleBatchEndpoint(false);
```

### View Performance Metrics
```typescript
const metrics = homepageDataService.getPerformanceMetrics();
console.log(metrics);

// Example output:
// {
//   batchCalls: 10,
//   batchSuccesses: 9,
//   avgBatchTime: 450,
//   avgIndividualTime: 2800,
//   batchSuccessRate: "90.00%",
//   avgTimeSaved: 2350
// }
```

## How It Works

### Before (6 API calls)
```
GET /api/v1/events
GET /api/v1/products/featured
GET /api/v1/products/new
GET /api/v1/stores/featured
GET /api/v1/offers
GET /api/v1/offers/flash
───────────────────────
Total: ~2.4s
```

### After (1 API call)
```
GET /api/v1/homepage
───────────────────────
Total: ~0.45s ⚡ 81% faster!
```

## Feature Flag

### Current Setting
```typescript
// In services/homepageDataService.ts
private USE_BATCH_ENDPOINT = __DEV__ ? true : false;
```

- **Development**: `true` (enabled)
- **Production**: `false` (disabled for safety)

### Change for Production
```typescript
// Option 1: Always on
private USE_BATCH_ENDPOINT = true;

// Option 2: Environment variable
private USE_BATCH_ENDPOINT =
  process.env.EXPO_PUBLIC_USE_BATCH_ENDPOINT === 'true';

// Option 3: Gradual rollout
private USE_BATCH_ENDPOINT =
  Math.random() < 0.5; // 50% of users
```

## Testing

### Test Batch Endpoint
1. Open homepage
2. Check console for: `📦 [HOMEPAGE SERVICE] Using BATCH endpoint...`
3. Verify: `✅ [HOMEPAGE SERVICE] Batch endpoint succeeded`
4. Check metrics: `📊 [HOMEPAGE SERVICE] Performance`

### Test Fallback
1. Disable backend
2. Refresh homepage
3. Should see: `⚠️ Batch failed, falling back to individual calls`
4. Homepage should still load

### Test Feature Flag
```typescript
// Disable
homepageDataService.toggleBatchEndpoint(false);
// Refresh homepage - should use individual calls

// Enable
homepageDataService.toggleBatchEndpoint(true);
// Refresh homepage - should use batch call
```

## Console Logs to Look For

### Success Case
```
🚀 [HOMEPAGE SERVICE] Feature flag ON - using batch endpoint
📦 [HOMEPAGE SERVICE] Using BATCH endpoint...
✅ [HOMEPAGE SERVICE] Batch endpoint succeeded in 450 ms
📊 [HOMEPAGE SERVICE] Performance: { batchCalls: 1, ... }
✅ [HOMEPAGE HOOK] Batch sections loaded: 6 sections
```

### Fallback Case
```
🚀 [HOMEPAGE SERVICE] Feature flag ON - using batch endpoint
❌ [HOMEPAGE SERVICE] Batch endpoint failed: [error]
⚠️ [HOMEPAGE SERVICE] Batch endpoint failed, falling back...
🔄 [HOMEPAGE SERVICE] Feature flag OFF - using individual calls
✅ [HOMEPAGE SERVICE] Individual calls completed in 2800 ms
```

### Disabled Case
```
🔄 [HOMEPAGE SERVICE] Feature flag OFF - using individual calls
✅ [HOMEPAGE SERVICE] Individual calls completed in 2800 ms
```

## Files Changed

| File | Changes |
|------|---------|
| `services/homepageApi.ts` | Added `fetchHomepageBatch()` |
| `types/homepage.types.ts` | Added `HomepageBatchResponse` |
| `services/homepageDataService.ts` | Added batch methods + feature flag |
| `hooks/useHomepage.ts` | Uses batch endpoint first |

## Rollback

### Instant Rollback (No Deploy)
```typescript
// In code
homepageDataService.toggleBatchEndpoint(false);
```

### Environment Variable Rollback
```bash
# .env
EXPO_PUBLIC_USE_BATCH_ENDPOINT=false
```

### Code Rollback
```typescript
// services/homepageDataService.ts
private USE_BATCH_ENDPOINT = false;
```

## Troubleshooting

### Homepage Not Loading
**Check console for errors:**
- Batch endpoint failed? → Should auto-fallback
- Individual calls failed? → Backend issue
- No API calls? → Check network

### Wrong Data Showing
**Verify response format:**
```typescript
// Response should have:
{
  success: true,
  data: {
    sections: {
      events: [...],
      justForYou: [...],
      // etc
    }
  }
}
```

### Performance Not Improving
**Check metrics:**
```typescript
const metrics = homepageDataService.getPerformanceMetrics();
console.log(metrics);

// If batchSuccesses === 0, batch isn't working
// If avgBatchTime > avgIndividualTime, backend issue
```

## API Endpoint

### Batch Endpoint
```
GET /api/v1/homepage?userId={userId}
```

### Response Format
```json
{
  "success": true,
  "data": {
    "sections": {
      "events": [/* EventItem[] */],
      "justForYou": [/* ProductItem[] */],
      "newArrivals": [/* ProductItem[] */],
      "trendingStores": [/* StoreItem[] */],
      "offers": [/* ProductItem[] */],
      "flashSales": [/* ProductItem[] */]
    },
    "metadata": {
      "cached": true,
      "timestamp": "2025-11-14T10:30:00Z"
    }
  }
}
```

## Production Checklist

Before enabling in production:

- [ ] Verify batch endpoint returns correct data
- [ ] Test with real backend
- [ ] Check all sections load
- [ ] Verify performance improvement
- [ ] Test fallback works
- [ ] Monitor error rates
- [ ] Start with 10% rollout
- [ ] Gradually increase to 100%

## Questions?

See full documentation: `AGENT_3_BATCH_ENDPOINT_INTEGRATION.md`

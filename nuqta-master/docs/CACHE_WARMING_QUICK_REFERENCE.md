# Cache Warming & Invalidation - Quick Reference

## Cache Warming Service

### Basic Usage

```typescript
import cacheWarmingService from '@/services/cacheWarmingService';

// Initialize (done automatically in app/_layout.tsx)
await cacheWarmingService.initialize();

// Start warming
await cacheWarmingService.startWarming();

// Get statistics
const stats = cacheWarmingService.getStats();
console.log(stats);
// {
//   isWarming: false,
//   isPaused: false,
//   completed: 6,
//   failed: 0,
//   duration: 1234,
//   failedItems: []
// }

// Refresh stale cache
await cacheWarmingService.refreshStaleCache();
```

### User Interaction Control

```typescript
// Pause warming when user interacts
cacheWarmingService.onUserInteraction(true);

// Resume when idle
cacheWarmingService.onUserInteraction(false);
```

### Auth State Integration

```typescript
import { useAuth } from '@/contexts/AuthContext';

const { state: authState } = useAuth();
cacheWarmingService.setAuthState(authState);
```

## Cache Invalidation Strategies

### 1. Pattern-Based Invalidation

```typescript
import cacheService from '@/services/cacheService';

// Invalidate all products
await cacheService.invalidatePattern('products:*');

// Invalidate all homepage sections
await cacheService.invalidatePattern('homepage:*');

// Invalidate user-specific caches
await cacheService.invalidatePattern(`user:${userId}:*`);
```

### 2. Event-Based Invalidation

```typescript
// Cart events
await cacheService.invalidateByEvent({ type: 'cart:add' });
await cacheService.invalidateByEvent({ type: 'cart:remove' });
await cacheService.invalidateByEvent({ type: 'cart:update' });
await cacheService.invalidateByEvent({ type: 'cart:clear' });

// Order events
await cacheService.invalidateByEvent({ type: 'order:placed' });

// Product events
await cacheService.invalidateByEvent({
  type: 'product:purchased',
  productId: '123'
});

// User events
await cacheService.invalidateByEvent({ type: 'user:login' });
await cacheService.invalidateByEvent({ type: 'user:logout' });
await cacheService.invalidateByEvent({ type: 'profile:updated' });

// Wishlist events
await cacheService.invalidateByEvent({ type: 'wishlist:add' });
await cacheService.invalidateByEvent({ type: 'wishlist:remove' });

// Pull-to-refresh
await cacheService.invalidateByEvent({
  type: 'refresh:pull',
  screen: 'homepage'
});
```

### 3. Dependency-Based Invalidation

```typescript
// Invalidate cart and all dependent caches
await cacheService.invalidateDependencies('cart:123', [
  'checkout:123',
  'homepage:justForYou',
  'recommendations:123'
]);
```

### 4. Time-Based Invalidation

```typescript
// Invalidate all caches before January 1, 2024
const cutoffDate = new Date('2024-01-01');
const invalidatedCount = await cacheService.invalidateBefore(cutoffDate);
console.log(`Invalidated ${invalidatedCount} entries`);
```

### 5. Tag-Based Invalidation

```typescript
// Invalidate all homepage-tagged caches
const count = await cacheService.invalidateByTag('homepage');
console.log(`Invalidated ${count} homepage entries`);
```

## Staleness Detection & Background Refresh

### Check Staleness

```typescript
// Check if a cache entry is stale (>50% of TTL)
const isStale = await cacheService.isStale('homepage:justForYou');

if (isStale) {
  console.log('Cache is stale, refreshing...');
}
```

### Get All Stale Entries

```typescript
const staleKeys = await cacheService.getStaleEntries();
console.log('Stale cache keys:', staleKeys);
// ['homepage:offers', 'cart:123', ...]
```

### Background Refresh

```typescript
// Refresh stale data in background (non-blocking)
await cacheService.backgroundRefresh(
  'homepage:justForYou',
  async () => {
    return await homepageDataService.getJustForYouSection();
  },
  {
    ttl: 10 * 60 * 1000, // 10 minutes
    priority: 'critical'
  }
);
```

## Common Patterns

### On Component Mount

```typescript
useEffect(() => {
  // Load from cache first (instant render)
  const loadData = async () => {
    const cached = await cacheService.get('homepage:events');

    if (cached) {
      setData(cached);
      // Check if stale, refresh in background
      const isStale = await cacheService.isStale('homepage:events');
      if (isStale) {
        cacheService.backgroundRefresh(
          'homepage:events',
          () => homepageDataService.getEventsSection(),
          { ttl: 15 * 60 * 1000 }
        );
      }
    } else {
      // Not in cache, fetch fresh
      const fresh = await homepageDataService.getEventsSection();
      setData(fresh);
      await cacheService.set('homepage:events', fresh, {
        ttl: 15 * 60 * 1000,
        priority: 'medium'
      });
    }
  };

  loadData();
}, []);
```

### On User Action

```typescript
const handleAddToCart = async (item) => {
  // Add to cart
  await cartService.addToCart(item);

  // Invalidate related caches
  await cacheService.invalidateByEvent({ type: 'cart:add' });

  // Show success message
  showToast('Item added to cart');
};
```

### Pull to Refresh

```typescript
const handleRefresh = async () => {
  setRefreshing(true);

  // Invalidate current screen caches
  await cacheService.invalidateByEvent({
    type: 'refresh:pull',
    screen: 'homepage'
  });

  // Reload data
  await loadHomepageData();

  setRefreshing(false);
};
```

## Cache Warming Priorities

```typescript
enum WarmingPriority {
  CRITICAL = 0,   // Immediate load (homepage hero)
  HIGH = 500,     // 500ms delay (cart, user stats)
  MEDIUM = 1000,  // 1s delay (offers, events)
  LOW = 2000,     // 2s delay (other sections)
}
```

## Event → Cache Invalidation Map

| Event | Invalidated Caches |
|-------|-------------------|
| `cart:add` | `cart:*`, `checkout:*`, `homepage:justForYou` |
| `cart:remove` | `cart:*`, `checkout:*`, `homepage:justForYou` |
| `cart:update` | `cart:*`, `checkout:*`, `homepage:justForYou` |
| `cart:clear` | `cart:*`, `checkout:*`, `homepage:justForYou` |
| `order:placed` | `cart:*`, `checkout:*`, `orders:*`, `userStats:*`, `homepage:*` |
| `product:purchased` | `products:*`, `homepage:*` |
| `user:login` | `cart:*`, `wishlist:*`, `orders:*`, `userStats:*`, `profile:*` |
| `user:logout` | `cart:*`, `wishlist:*`, `orders:*`, `userStats:*`, `profile:*` |
| `profile:updated` | `profile:*`, `userStats:*` |
| `wishlist:add` | `wishlist:*` |
| `wishlist:remove` | `wishlist:*` |
| `refresh:pull` | `${screen}:*` |

## Performance Tips

1. **Use Critical Priority for Above-the-Fold Content**
   - Homepage hero section
   - User profile header
   - Navigation data

2. **Batch Invalidations**
   ```typescript
   // Instead of multiple calls:
   await cacheService.remove('cart:123');
   await cacheService.remove('checkout:123');
   await cacheService.remove('homepage:justForYou');

   // Use event-based invalidation:
   await cacheService.invalidateByEvent({ type: 'cart:add' });
   ```

3. **Use Stale-While-Revalidate Pattern**
   ```typescript
   const data = await cacheService.getWithRevalidation(
     'homepage:events',
     () => homepageDataService.getEventsSection(),
     { ttl: 15 * 60 * 1000 }
   );
   ```

4. **Respect Network Conditions**
   - Warming automatically skips on 2G
   - Pauses during user interaction
   - Resumes when idle

5. **Monitor Cache Stats**
   ```typescript
   const stats = await cacheService.getStats();
   console.log('Cache hit rate:', stats.hitRate);
   console.log('Total size:', stats.totalSize);
   ```

## Debugging

### Enable Verbose Logging

All cache operations are logged with emoji prefixes:
- `🔥` Cache warming operations
- `💾` Cache service operations
- `✅` Success
- `❌` Error
- `⚠️` Warning
- `📋` Information

### Check Cache Stats

```typescript
const stats = await cacheService.getStats();
console.log('Cache Statistics:', {
  totalEntries: stats.totalEntries,
  totalSize: stats.totalSize,
  hitRate: stats.hitRate + '%',
  oldestEntry: stats.oldestEntry,
  newestEntry: stats.newestEntry,
  entriesByPriority: stats.entriesByPriority
});
```

### Monitor Warming Progress

```typescript
const warmingStats = cacheWarmingService.getStats();
console.log('Warming Progress:', {
  isWarming: warmingStats.isWarming,
  isPaused: warmingStats.isPaused,
  completed: warmingStats.completed,
  failed: warmingStats.failed,
  duration: warmingStats.duration + 'ms'
});
```

## Troubleshooting

### Cache Not Warming

1. Check network connection (2G disables warming)
2. Verify auth state is set: `cacheWarmingService.setAuthState(authState)`
3. Check warming stats for errors: `cacheWarmingService.getStats()`

### Stale Data Showing

1. Check TTL settings (may be too long)
2. Verify invalidation hooks are firing
3. Force refresh: `await cacheService.invalidatePattern('*')`

### High Memory Usage

1. Clear old caches: `await cacheService.clearExpired()`
2. Reduce cache size limits in `cacheService.ts`
3. Use compression for large data

### Slow App Start

1. Check warming duration: `cacheWarmingService.getStats().duration`
2. Reduce number of CRITICAL priority items
3. Increase delays for MEDIUM/LOW priorities

---

**Last Updated**: 2025-11-14

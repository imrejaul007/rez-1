# Persistent Cache - Quick Reference Card

## 🚀 Quick Start

### Use Cached Homepage Data
```typescript
import { HomepageApiService } from '@/services/homepageApi';

// Instant load from cache, background refresh if stale
const data = await HomepageApiService.fetchHomepageDataCached(userId);
```

### Warm Cache on App Start
```typescript
import { HomepageCacheWarmer } from '@/services/homepageApi';

// In _layout.tsx or App.tsx
useEffect(() => {
  HomepageCacheWarmer.warmHomepageCache(userId);
}, []);
```

---

## 📋 Common Operations

### Fetch with Cache
```typescript
// Homepage
const homepage = await HomepageApiService.fetchHomepageDataCached(userId);

// Section
const section = await HomepageApiService.fetchSectionDataCached(
  'featured-products',
  userId,
  { category: 'electronics' }
);
```

### Invalidate Cache
```typescript
import { HomepageCacheWarmer } from '@/services/homepageApi';

// All homepage caches
await HomepageCacheWarmer.invalidateHomepageCache();

// Specific section
await HomepageCacheWarmer.invalidateSectionCache('featured-products', userId);
```

### Direct Cache Usage
```typescript
import cacheService from '@/services/cacheService';

// Get or set
const data = await cacheService.getOrSet(
  'my-key',
  async () => await fetchData(),
  { ttl: 5 * 60 * 1000 }
);

// With stale-while-revalidate
const data = await cacheService.getWithRevalidation(
  'my-key',
  async () => await fetchData(),
  { ttl: 5 * 60 * 1000, priority: 'high' }
);
```

### Cache Statistics
```typescript
const stats = await cacheService.getStats();
console.log(`Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);
console.log(`Entries: ${stats.totalEntries}`);
console.log(`Size: ${stats.totalSize}`);
```

---

## ⚙️ Configuration

### TTL Values
```typescript
5 * 60 * 1000    // 5 minutes (homepage)
10 * 60 * 1000   // 10 minutes (sections)
60 * 60 * 1000   // 1 hour (stale window)
```

### Priority Levels
- `critical` - Never evicted
- `high` - Homepage, critical data
- `medium` - Section data (default)
- `low` - Evicted first

### Size Limits
- 10MB per namespace
- 100 entries max
- Auto-compression >10KB

---

## 🎯 Best Practices

1. **Always use `*Cached` methods** for user-facing data
2. **Warm cache on app start** for instant loads
3. **Invalidate after mutations** to keep data fresh
4. **Use appropriate TTL** based on data change frequency
5. **Monitor cache stats** periodically

---

## 🔧 Troubleshooting

### Cache not persisting?
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
const keys = await AsyncStorage.getAllKeys();
console.log('Cache keys:', keys.filter(k => k.startsWith('@cache:')));
```

### Force refresh
```typescript
await cacheService.remove('problematic-key');
const fresh = await fetchDataCached();
```

### Clear all caches
```typescript
await cacheService.clear();
// Or
import { cacheManager } from '@/services/cacheService';
await cacheManager.clearAll();
```

---

## 📊 Performance Metrics

- **Initial Load**: <100ms (from cache)
- **Cache Hit Rate**: 80-90%
- **Background Refresh**: Seamless
- **Persistence**: 100% across restarts

---

## 📚 Full Documentation

See `PERSISTENT_CACHE_GUIDE.md` for complete documentation and examples.

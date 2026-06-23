# Offline Cache Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### 1. Install Dependencies

```bash
cd frontend
npm install pako @types/pako
```

### 2. Restart Your Development Server

The caching is already implemented! Just restart:

```bash
# Stop current server (Ctrl+C)
# Then restart
npm start
```

That's it! The homepage now has offline support.

## ✅ What's Already Working

### Automatic Caching
- Homepage sections are automatically cached
- Cache expires after 1 hour
- Background refresh when data is stale
- No configuration needed

### Offline Support
- Shows cached data when offline
- Falls back to sample data if no cache
- Never shows empty screens
- Never crashes due to network issues

### Smart Features
- Stale-while-revalidate (instant response + background refresh)
- Automatic compression for large data
- Priority-based cache eviction
- Cache warming on app launch

## 📱 Testing It Works

### Test 1: First Time Load (Offline)
```bash
1. Turn OFF your network/WiFi
2. Open the app
3. ✅ You should see sample products, stores, and events
4. ✅ No error messages or crashes
```

### Test 2: With Cache (Offline)
```bash
1. Use app with network ON (cache gets populated)
2. Turn OFF network
3. Reopen app
4. ✅ You should see previously loaded data
5. ✅ Data shows "Last updated X mins ago"
```

### Test 3: Network Reconnection
```bash
1. Start with network OFF (viewing cached data)
2. Turn ON network
3. Pull down to refresh
4. ✅ Fresh data loads
5. ✅ Cache updates automatically
```

## 🎛️ Configuration (Optional)

### Adjust Cache Duration

Edit `services/homepageDataService.ts`:

```typescript
// Change these values as needed:
private CACHE_TTL = 60 * 60 * 1000; // 1 hour (default)
private STALE_TTL = 30 * 60 * 1000; // 30 minutes (default)

// Example: Make cache last 2 hours
private CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours
```

### Change Cache Size Limit

Edit `services/cacheService.ts`:

```typescript
// Change this value:
const MAX_CACHE_SIZE = 10 * 1024 * 1024; // 10MB (default)

// Example: Increase to 20MB
const MAX_CACHE_SIZE = 20 * 1024 * 1024; // 20MB
```

### Disable Compression

```typescript
// In your component or service:
await cacheService.set(key, data, {
  compress: false  // Disable compression
});
```

## 🔧 Common Operations

### Clear Cache Manually

```typescript
import homepageDataService from '@/services/homepageDataService';

// Clear only homepage cache
await homepageDataService.clearCache();

// Or clear entire app cache
import cacheService from '@/services/cacheService';
await cacheService.clear();
```

### Force Refresh Data

```typescript
import homepageDataService from '@/services/homepageDataService';

// Bypass cache and fetch fresh data
await homepageDataService.forceRefreshAll();
```

### Check Cache Size

```typescript
import cacheService from '@/services/cacheService';

const stats = await cacheService.getStats();
console.log(`Cache size: ${stats.totalSize}`);
console.log(`Hit rate: ${stats.hitRate}%`);
console.log(`Total entries: ${stats.totalEntries}`);
```

## 🐛 Troubleshooting

### Problem: "pako is not defined" error

**Solution:**
```bash
npm install pako @types/pako
# Then restart your dev server
```

### Problem: Cache not working

**Solution:**
```typescript
// Check if cache service is initialized
import cacheService from '@/services/cacheService';
const stats = await cacheService.getStats();
console.log(stats); // Should show cache info
```

### Problem: Old data showing

**Solution:**
```typescript
// Force refresh to bypass cache
import homepageDataService from '@/services/homepageDataService';
await homepageDataService.forceRefreshAll();
```

### Problem: App slower than before

**Solution:**
```typescript
// Clear cache to start fresh
import cacheService from '@/services/cacheService';
await cacheService.clear();

// Or just clear expired entries
await cacheService.clearExpired();
```

## 📊 Monitoring

### View Cache Statistics

Add this to your settings page or debug menu:

```typescript
import { useState, useEffect } from 'react';
import cacheService from '@/services/cacheService';

function CacheStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const loadStats = async () => {
      const cacheStats = await cacheService.getStats();
      setStats(cacheStats);
    };
    loadStats();
  }, []);

  if (!stats) return <Text>Loading...</Text>;

  return (
    <View>
      <Text>Cache Size: {stats.totalSize}</Text>
      <Text>Hit Rate: {stats.hitRate}%</Text>
      <Text>Total Entries: {stats.totalEntries}</Text>
      <Button title="Clear Cache" onPress={async () => {
        await cacheService.clear();
        loadStats();
      }} />
    </View>
  );
}
```

## 🎯 Best Practices

### ✅ DO:
- Let the cache service handle TTL automatically
- Use fallback data for better offline experience
- Clear cache on app updates
- Monitor cache size periodically

### ❌ DON'T:
- Don't set TTL too low (< 5 minutes) - wastes bandwidth
- Don't set TTL too high (> 24 hours) - stale data
- Don't store sensitive data in cache without encryption
- Don't manually manage AsyncStorage for cached data

## 📚 Advanced Usage

### Custom Cache Keys

```typescript
import cacheService from '@/services/cacheService';

// Store custom data
await cacheService.set('my_custom_key', { foo: 'bar' }, {
  ttl: 60 * 60 * 1000,        // 1 hour
  priority: 'high',            // Keep this in cache
  compress: true              // Compress if > 10KB
});

// Retrieve custom data
const data = await cacheService.get('my_custom_key');
```

### Batch Operations

```typescript
import cacheService from '@/services/cacheService';

// Set multiple items at once
await cacheService.setMany([
  { key: 'key1', data: data1, options: { ttl: 3600000 } },
  { key: 'key2', data: data2, options: { ttl: 3600000 } },
  { key: 'key3', data: data3, options: { ttl: 3600000 } }
]);

// Get multiple items at once
const results = await cacheService.getMany(['key1', 'key2', 'key3']);
console.log(results.key1, results.key2, results.key3);
```

### Stale-While-Revalidate Pattern

```typescript
import cacheService from '@/services/cacheService';

// This returns cached data immediately and refreshes in background
const data = await cacheService.getWithRevalidation(
  'my_key',
  async () => {
    // This fetch function runs in background if cache is stale
    return await api.fetchData();
  },
  { ttl: 60 * 60 * 1000 }
);

// User sees cached data instantly
// Fresh data arrives in background
// Cache updates automatically
```

## 🔄 Cache Warming

Preload cache on app launch for better performance:

```typescript
// In your App.tsx or main component
import { useEffect } from 'react';
import homepageDataService from '@/services/homepageDataService';

function App() {
  useEffect(() => {
    // Warm cache on app launch
    homepageDataService.warmCache();
  }, []);

  // ... rest of app
}
```

## 📖 Full Documentation

For complete details, see: `OFFLINE_CACHING_IMPLEMENTATION.md`

## 🆘 Need Help?

1. Check console logs (search for `[CACHE]` or `[HOMEPAGE SERVICE]`)
2. Review `OFFLINE_CACHING_IMPLEMENTATION.md`
3. Test in airplane mode to verify offline behavior
4. Check `services/cacheService.ts` for implementation details

---

**Quick Reference:**

```typescript
// Import services
import cacheService from '@/services/cacheService';
import homepageDataService from '@/services/homepageDataService';

// Common operations
await homepageDataService.clearCache();      // Clear homepage cache
await homepageDataService.forceRefreshAll(); // Force refresh
await cacheService.getStats();               // Get statistics
await cacheService.clear();                  // Clear all cache
```

That's all you need to know to get started! 🎉

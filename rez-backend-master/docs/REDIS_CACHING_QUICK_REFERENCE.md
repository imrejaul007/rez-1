# Redis Caching - Quick Reference Guide

## Quick Start

### Check Cache Status
```bash
# Check if Redis is connected
curl http://localhost:5001/api/admin/cache/stats
```

### Environment Configuration
```env
# Required
REDIS_URL=redis://default:***@redis-15692.c244.us-east-1-2.ec2.redns.redis-cloud.com:15692

# Optional
CACHE_ENABLED=true              # Enable/disable caching (default: true)
REDIS_KEY_PREFIX=rez:           # Key prefix (default: rez:)
REDIS_MAX_RETRIES=3             # Connection retries (default: 3)
REDIS_RETRY_DELAY=1000          # Retry delay in ms (default: 1000)
REDIS_CONNECT_TIMEOUT=10000     # Connect timeout in ms (default: 10000)
```

## Cached Endpoints

### ✅ Fully Cached Endpoints

| Endpoint | Cache Key Pattern | TTL | Invalidated On |
|----------|-------------------|-----|----------------|
| `GET /products` | `product:list:{filters}` | 30 min | Product update/delete |
| `GET /products/:id` | `product:{id}` | 1 hour | Product update/delete |
| `GET /products/featured` | `product:featured:{limit}` | 1 hour | Product update |
| `GET /products/new-arrivals` | `product:new-arrivals:{limit}` | 30 min | Product update |
| `GET /products/search` | `product:search:{query}:{filters}` | 15 min | Product update |
| `GET /products/suggestions` | `product:suggestions:{query}` | 1 min | Product update |
| `GET /products/popular-searches` | `product:popular-searches:{limit}` | 1 hour | - |
| `GET /products/trending` | `product:trending:{category}:{limit}:...` | 30 min | Product update |
| `GET /products/:id/related` | `product:recommendations:{id}:{limit}` | 1 hour | Product update |
| `GET /products/category/:slug` | `product:category:{slug}:{filters}` | 30 min | Product/Category update |
| `GET /products/store/:id` | `product:store:{id}:{filters}` | 30 min | Product/Store update |

## Cache TTL (Time To Live)

```typescript
PRODUCT_DETAIL: 1 hour          // Individual product pages
PRODUCT_LIST: 30 minutes        // Product listings
PRODUCT_SEARCH: 15 minutes      // Search results
PRODUCT_FEATURED: 1 hour        // Featured products
PRODUCT_NEW_ARRIVALS: 30 min    // New arrivals
PRODUCT_RECOMMENDATIONS: 30 min // Related products
CATEGORY_LIST: 1 hour           // Category list
STORE_PRODUCTS: 30 minutes      // Store products
SHORT_CACHE: 1 minute           // Quick expire items
```

## Manual Cache Operations

### Invalidate Specific Product
```typescript
import { CacheInvalidator } from '../utils/cacheHelper';

// Invalidate all caches for a product
await CacheInvalidator.invalidateProduct(productId);
```

### Invalidate Product Lists
```typescript
// Invalidate all product list caches
await CacheInvalidator.invalidateProductLists();
```

### Invalidate Category
```typescript
// Invalidate category and related products
await CacheInvalidator.invalidateCategory(categoryId, categorySlug);
```

### Invalidate Store
```typescript
// Invalidate store and related products
await CacheInvalidator.invalidateStore(storeId);
```

### Custom Cache Operations
```typescript
import redisService from '../services/redisService';

// Get from cache
const data = await redisService.get<ProductType>('product:123');

// Set in cache (with TTL)
await redisService.set('product:123', productData, 3600); // 1 hour

// Delete from cache
await redisService.del('product:123');

// Delete pattern
await redisService.delPattern('product:*');

// Flush all cache (development only!)
await redisService.flush();
```

## Cache Helper Functions

### Generate Cache Key
```typescript
import { generateQueryCacheKey } from '../utils/cacheHelper';

const filters = { category: 'electronics', minPrice: 100, maxPrice: 500 };
const cacheKey = `products:${generateQueryCacheKey(filters)}`;
```

### Wrap Function with Cache
```typescript
import { withCache } from '../utils/cacheHelper';

const products = await withCache(
  'products:featured',
  3600,
  async () => {
    // This function only runs on cache miss
    return await Product.find({ featured: true });
  }
);
```

## Cache Invalidation Patterns

### On Product Update (Merchant)
Automatically invalidates:
- `product:{id}`
- `product:list:*`
- `product:featured:*`
- `product:new-arrivals:*`
- `product:search:*`
- `product:recommendations:{id}:*`
- `stock:{id}:*`

### On Product Delete (Merchant)
Automatically invalidates:
- Same as update, plus
- `product:category:*`
- `product:store:*`

### On Category Update
Invalidates:
- `category:{id}`
- `category:slug:{slug}`
- `category:list`
- `product:category:*`

### On Store Update
Invalidates:
- `store:{id}`
- `store:list:*`
- `product:store:{id}:*`

## Monitoring Cache Performance

### Check Cache Stats
```typescript
const stats = await redisService.getStats();
console.log('Cache Status:', stats);
```

### Watch Cache Logs
```bash
# Development mode shows cache hits/misses
📦 Cache HIT: product:123           # Served from cache
📦 Cache MISS: product:123          # Fetched from DB
💾 Cache SET: product:123 (TTL: 3600s)  # Cached
🗑️ Cache DEL: product:123           # Deleted
```

## Best Practices

### ✅ DO
- Use appropriate TTLs for different data types
- Invalidate cache on data mutations
- Use cache for frequently accessed, slowly changing data
- Monitor cache hit rates
- Use graceful degradation (app works without cache)

### ❌ DON'T
- Cache user-specific sensitive data
- Set TTL too long for frequently changing data
- Forget to invalidate on updates
- Cache error responses
- Use cache for real-time critical data

## Troubleshooting

### Cache Not Working
```typescript
// Check if Redis is enabled
const isReady = redisService.isReady();
console.log('Redis Ready:', isReady);

// Check environment
console.log('CACHE_ENABLED:', process.env.CACHE_ENABLED);
console.log('REDIS_URL:', process.env.REDIS_URL?.slice(0, 30) + '...');
```

### Clear All Cache (Development)
```typescript
// WARNING: Only use in development!
if (process.env.NODE_ENV === 'development') {
  await redisService.flush();
  console.log('All cache cleared');
}
```

### Connection Issues
```
❌ Redis Client Error: ECONNREFUSED
⚠️ Application will continue without caching
```
This is expected behavior - the app gracefully degrades if Redis is unavailable.

## Testing Cache

### Test Cache Hit/Miss
```bash
# First call - cache miss, slower
curl http://localhost:5001/api/products/PRODUCT_ID

# Second call - cache hit, faster
curl http://localhost:5001/api/products/PRODUCT_ID
```

### Test Cache Invalidation
```bash
# 1. Get product (cache it)
curl http://localhost:5001/api/products/PRODUCT_ID

# 2. Update product (invalidates cache)
curl -X PUT http://localhost:5001/api/merchant/products/PRODUCT_ID \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name": "Updated Product"}'

# 3. Get product again (cache miss, fresh data)
curl http://localhost:5001/api/products/PRODUCT_ID
```

## Performance Expectations

### Response Times (Approximate)

| Operation | Without Cache | With Cache | Improvement |
|-----------|--------------|------------|-------------|
| Product Detail | 20-50ms | 1-2ms | 90-95% |
| Product List | 50-150ms | 5-10ms | 80-90% |
| Search | 30-100ms | 3-5ms | 85-90% |
| Featured Products | 30-100ms | 2-3ms | 90-95% |

### Target Cache Hit Rates
- Product Detail: >90%
- Featured Products: >95%
- Search Results: >80%
- Product Lists: >70%

---

**Last Updated:** December 1, 2025
**Redis Version:** 4.x+
**Node.js Client:** redis@4.7.1

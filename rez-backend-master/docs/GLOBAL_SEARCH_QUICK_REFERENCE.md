# Global Search - Quick Reference

## Endpoint

```
GET /api/search/global
```

## Quick Examples

```bash
# Basic search
curl "http://localhost:5000/api/search/global?q=pizza"

# Search specific types
curl "http://localhost:5000/api/search/global?q=pizza&types=products,stores"

# With custom limit
curl "http://localhost:5000/api/search/global?q=laptop&limit=20"

# Products only
curl "http://localhost:5000/api/search/global?q=nike&types=products"
```

## Parameters

| Parameter | Required | Default | Max | Description |
|-----------|----------|---------|-----|-------------|
| `q` | ✅ Yes | - | - | Search query |
| `types` | ❌ No | all | - | `products`, `stores`, `articles` |
| `limit` | ❌ No | 10 | 50 | Results per type |

## Response Structure

```json
{
  "success": true,
  "data": {
    "query": "pizza",
    "results": {
      "products": {
        "items": [...],
        "total": 45,
        "hasMore": true
      },
      "stores": {
        "items": [...],
        "total": 12,
        "hasMore": false
      },
      "articles": {
        "items": [...],
        "total": 3,
        "hasMore": false
      }
    },
    "totalResults": 60,
    "executionTime": 245,
    "cached": false
  }
}
```

## Files Modified

- ✅ `src/controllers/searchController.ts` (created)
- ✅ `src/routes/searchRoutes.ts` (created)
- ✅ `src/server.ts` (modified - added search routes)

## Search Fields

**Products:** name, description, brand, tags
**Stores:** name, description, tags, address, city
**Articles:** title, excerpt, content, tags

## Performance

- **Target:** < 500ms (uncached), < 50ms (cached)
- **Cache TTL:** 10 minutes
- **Cache Key:** `search:global:{query}:{types}:{limit}`

## Relevance Scoring

- **100:** Exact match
- **75:** Starts with query
- **50:** Contains query

## Testing

```bash
cd user-backend
npm test -- globalSearch.test.ts
```

## Clear Cache

```bash
# Requires authentication
curl -X POST "http://localhost:5000/api/search/cache/clear" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Common Use Cases

**1. Search Everything**
```
GET /api/search/global?q=coffee
```

**2. Product Search Only**
```
GET /api/search/global?q=laptop&types=products&limit=20
```

**3. Local Store Search**
```
GET /api/search/global?q=pizza&types=stores
```

**4. Content Search**
```
GET /api/search/global?q=recipe&types=articles
```

## Integration Code

### JavaScript/TypeScript
```typescript
const searchGlobal = async (query: string, types?: string[], limit = 10) => {
  const params = new URLSearchParams({ q: query, limit: limit.toString() });
  if (types) params.append('types', types.join(','));

  const response = await fetch(`/api/search/global?${params}`);
  return response.json();
};

// Usage
const results = await searchGlobal('pizza', ['products', 'stores']);
console.log(`Found ${results.data.totalResults} results`);
```

### React Hook
```typescript
const useGlobalSearch = () => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const search = async (query: string, types?: string[]) => {
    setLoading(true);
    try {
      const data = await searchGlobal(query, types);
      setResults(data.data);
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, search };
};
```

## Monitoring

Check logs for:
```
✅ [GLOBAL SEARCH] Cache hit for query: "pizza" (45ms)
🔍 [GLOBAL SEARCH] Searching for: "pizza" across types: products, stores
✅ [GLOBAL SEARCH] Completed in 245ms. Total results: 60
```

## Error Handling

```typescript
try {
  const response = await fetch('/api/search/global?q=pizza');
  const data = await response.json();

  if (!data.success) {
    console.error('Search failed:', data.message);
  }
} catch (error) {
  console.error('Network error:', error);
}
```

## Environment Setup

Ensure Redis is configured:
```env
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_password
REDIS_ENABLED=true
```

## Deployment

1. ✅ Create database indexes (see full docs)
2. ✅ Configure Redis
3. ✅ Test endpoint
4. ✅ Deploy backend
5. ✅ Update frontend

---

**Quick Links:**
- Full Documentation: `GLOBAL_SEARCH_IMPLEMENTATION.md`
- Controller: `src/controllers/searchController.ts`
- Routes: `src/routes/searchRoutes.ts`
- Tests: `src/__tests__/globalSearch.test.ts`

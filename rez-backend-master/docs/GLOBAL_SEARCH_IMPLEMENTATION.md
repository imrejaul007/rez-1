# Global Search Implementation - Rez App Backend

## Overview

This document describes the implementation of the unified global search endpoint that searches across products, stores, and articles simultaneously.

## Implementation Summary

### Files Created/Modified

1. **Created:** `src/controllers/searchController.ts`
   - Main controller with global search logic
   - Implements parallel search execution
   - Includes relevance scoring algorithm
   - Redis caching integration

2. **Created:** `src/routes/searchRoutes.ts`
   - Route definitions for search endpoints
   - Public access for global search
   - Protected route for cache clearing

3. **Modified:** `src/server.ts`
   - Added search routes import
   - Registered `/api/search` routes

4. **Created:** `src/__tests__/globalSearch.test.ts`
   - Comprehensive test suite
   - Performance tests
   - Relevance scoring tests

## API Endpoint

### Global Search

**Endpoint:** `GET /api/search/global`

**Access:** Public (no authentication required)

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | Yes | - | Search query string |
| `types` | string | No | all | Comma-separated list: `products,stores,articles` |
| `limit` | number | No | 10 | Results per type (max: 50) |

**Example Requests:**

```bash
# Search all types
GET /api/search/global?q=pizza

# Search specific types
GET /api/search/global?q=pizza&types=products,stores

# Custom limit
GET /api/search/global?q=pizza&limit=20

# Single type with limit
GET /api/search/global?q=laptop&types=products&limit=15
```

**Response Format:**

```json
{
  "success": true,
  "message": "Global search completed successfully",
  "data": {
    "query": "pizza",
    "results": {
      "products": {
        "items": [
          {
            "_id": "507f1f77bcf86cd799439011",
            "id": "507f1f77bcf86cd799439011",
            "name": "Pizza Margherita",
            "slug": "pizza-margherita",
            "images": [...],
            "pricing": {...},
            "ratings": {...},
            "inventory": {...},
            "brand": "Pizza Palace",
            "category": {...},
            "store": {...},
            "type": "product",
            "relevanceScore": 100
          }
        ],
        "total": 45,
        "hasMore": true
      },
      "stores": {
        "items": [
          {
            "_id": "507f1f77bcf86cd799439012",
            "id": "507f1f77bcf86cd799439012",
            "name": "Pizza Palace",
            "slug": "pizza-palace",
            "logo": "...",
            "coverImage": "...",
            "description": "Best pizza in town",
            "tags": ["pizza", "italian", "food"],
            "location": {...},
            "ratings": {...},
            "category": {...},
            "type": "store",
            "relevanceScore": 100
          }
        ],
        "total": 12,
        "hasMore": false
      },
      "articles": {
        "items": [
          {
            "_id": "507f1f77bcf86cd799439013",
            "id": "507f1f77bcf86cd799439013",
            "title": "How to Make Perfect Pizza",
            "slug": "how-to-make-perfect-pizza",
            "excerpt": "Learn the secrets...",
            "coverImage": "...",
            "category": "cooking",
            "tags": ["pizza", "recipe"],
            "author": {
              "id": "...",
              "name": "John Doe",
              "avatar": "..."
            },
            "viewCount": 1234,
            "type": "article",
            "relevanceScore": 75
          }
        ],
        "total": 3,
        "hasMore": false
      }
    },
    "totalResults": 60,
    "requestedTypes": ["products", "stores", "articles"],
    "limit": 10,
    "cached": false,
    "executionTime": 245
  }
}
```

### Cache Clear

**Endpoint:** `POST /api/search/cache/clear`

**Access:** Protected (requires authentication)

**Description:** Clears the search cache. Useful when data is updated.

## Features

### 1. Parallel Search Execution

Uses `Promise.all()` to execute searches across all entity types simultaneously:

```typescript
const [productResults, storeResults, articleResults] = await Promise.all([
  searchProducts(query, limit),
  searchStores(query, limit),
  searchArticles(query, limit)
]);
```

**Benefits:**
- Reduces total execution time
- Target: < 500ms for uncached requests
- Efficiently utilizes server resources

### 2. Relevance Scoring

Each result is scored based on match quality:

- **100 points:** Exact match (e.g., "Pizza" matches "Pizza")
- **75 points:** Starts with query (e.g., "Pizza" matches "Pizza Palace")
- **50 points:** Contains query (e.g., "Pizza" matches "Best Pizza Place")

Results within each type are sorted by relevance score.

### 3. Redis Caching

- **Cache Key Format:** `search:global:{query}:{types}:{limit}`
- **TTL:** 10 minutes (600 seconds)
- **Benefits:**
  - Dramatically faster subsequent searches
  - Reduces database load
  - Typical cached response: < 50ms

### 4. Field Optimization

Only essential fields are returned to minimize payload size:

**Products:**
- name, slug, images, pricing, ratings, inventory, brand, category, store

**Stores:**
- name, slug, logo, coverImage, description, tags, location, ratings, category

**Articles:**
- title, slug, excerpt, coverImage, category, tags, author (populated), viewCount

### 5. Search Capabilities

**Products Search:**
- Name (e.g., "Laptop", "Pizza Margherita")
- Description
- Brand (e.g., "Nike", "Apple")
- Tags

**Stores Search:**
- Name (e.g., "Pizza Palace")
- Description
- Tags (e.g., "italian", "delivery")
- Address
- City

**Articles Search:**
- Title
- Excerpt
- Content
- Tags

## Performance Considerations

### 1. Execution Time

**Target:** < 500ms (uncached), < 50ms (cached)

**Optimization Strategies:**
- Parallel search execution
- Limited field selection
- Indexed database queries
- Redis caching
- Limit enforcement (max 50 per type)

### 2. Database Indexes

Ensure these indexes exist for optimal performance:

**Products:**
```javascript
// Text index for full-text search
{ name: 'text', description: 'text', brand: 'text' }

// Compound indexes
{ isActive: 1, category: 1 }
{ isActive: 1, store: 1 }
```

**Stores:**
```javascript
// Compound indexes
{ isActive: 1, name: 1 }
{ isActive: 1, tags: 1 }
{ 'location.coordinates': '2dsphere' } // For geo queries
```

**Articles:**
```javascript
// Compound indexes
{ isPublished: 1, isApproved: 1 }
{ isPublished: 1, category: 1 }
```

### 3. Memory Usage

- Limited result sets (max 50 per type)
- Lean queries (no Mongoose document overhead)
- Minimal populated fields
- Efficient JSON serialization for cache

### 4. Rate Limiting

Consider adding rate limiting to prevent abuse:

```typescript
// In searchRoutes.ts
import rateLimit from 'express-rate-limit';

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: 'Too many search requests, please try again later'
});

router.get('/global', searchLimiter, globalSearch);
```

## Testing

### Running Tests

```bash
cd user-backend
npm test -- globalSearch.test.ts
```

### Test Coverage

1. **Basic Functionality**
   - Missing query parameter validation
   - Default search all types
   - Specific type search
   - Custom limit parameter
   - Max limit enforcement

2. **Error Handling**
   - Invalid types parameter
   - Malformed queries
   - Database errors

3. **Response Structure**
   - Correct data format
   - Type markers on results
   - Pagination metadata

4. **Performance**
   - Execution time tracking
   - Concurrent request handling
   - Cache effectiveness

5. **Relevance**
   - Score calculation
   - Result ordering

## Integration Examples

### Frontend Integration

```typescript
// React/React Native example
import { searchGlobal } from './api/search';

const SearchComponent = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/search/global?q=${encodeURIComponent(query)}&limit=20`
      );
      const data = await response.json();
      setResults(data.data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
      />

      {loading && <div>Searching...</div>}

      {results && (
        <div>
          <h3>Products ({results.results.products.total})</h3>
          {results.results.products.items.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}

          <h3>Stores ({results.results.stores.total})</h3>
          {results.results.stores.items.map(store => (
            <StoreCard key={store.id} store={store} />
          ))}

          <h3>Articles ({results.results.articles.total})</h3>
          {results.results.articles.items.map(article => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
};
```

### Mobile App Integration

```typescript
// React Native with Axios
import axios from 'axios';

const searchGlobal = async (query: string, types?: string[], limit = 10) => {
  try {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString()
    });

    if (types && types.length > 0) {
      params.append('types', types.join(','));
    }

    const response = await axios.get(
      `${API_BASE_URL}/api/search/global?${params}`
    );

    return response.data.data;
  } catch (error) {
    console.error('Global search error:', error);
    throw error;
  }
};

// Usage
const results = await searchGlobal('pizza', ['products', 'stores'], 15);
console.log(`Found ${results.totalResults} total results`);
console.log(`Execution time: ${results.executionTime}ms`);
```

## Cache Management

### When to Clear Cache

Clear the search cache when:
- Products are added/updated/deleted
- Stores are added/updated/deleted
- Articles are published/updated/deleted
- Bulk data imports occur

### Automatic Cache Invalidation

Consider implementing automatic cache invalidation:

```typescript
// In productController.ts
export const updateProduct = async (req: Request, res: Response) => {
  // Update product logic...

  // Clear search cache
  // Note: Implement a more sophisticated cache invalidation strategy
  // that clears only affected cache keys
  await clearProductSearchCache(product.name);

  // Return response...
};
```

## Monitoring and Analytics

### Metrics to Track

1. **Performance Metrics**
   - Average execution time (cached vs uncached)
   - P95/P99 response times
   - Cache hit rate

2. **Usage Metrics**
   - Total searches per day
   - Most searched queries
   - Search by type distribution
   - Zero-result searches

3. **Error Metrics**
   - Failed searches
   - Database timeouts
   - Cache failures

### Logging

The implementation includes comprehensive logging:

```
✅ [GLOBAL SEARCH] Cache hit for query: "pizza" (45ms)
🔍 [GLOBAL SEARCH] Searching for: "pizza" across types: products, stores, articles
✅ [GLOBAL SEARCH] Completed in 245ms. Total results: 60
❌ [GLOBAL SEARCH] Error after 1200ms: Database timeout
```

## Future Enhancements

### 1. Advanced Filtering

```typescript
// Add price range, rating filters
GET /api/search/global?q=laptop&minPrice=500&maxPrice=1500&rating=4
```

### 2. Fuzzy Search

Implement fuzzy matching for typo tolerance:
- "pizzza" → "pizza"
- "laptopp" → "laptop"

### 3. Search Suggestions

Auto-complete and suggestions based on partial queries:

```typescript
GET /api/search/suggestions?q=piz
// Returns: ["pizza", "pizza hut", "pizza delivery"]
```

### 4. Search History

Track user search history for personalization:

```typescript
GET /api/search/history
// Returns user's recent searches
```

### 5. Trending Searches

```typescript
GET /api/search/trending
// Returns most popular searches
```

### 6. Advanced Analytics

- Click-through rate tracking
- Search result relevance feedback
- A/B testing for ranking algorithms

## Troubleshooting

### Common Issues

**1. Slow Search Performance**
- Check database indexes
- Verify Redis connection
- Monitor database query times
- Consider reducing limit parameter

**2. Cache Not Working**
- Verify Redis is running and connected
- Check Redis connection logs
- Ensure sufficient Redis memory
- Verify cache key generation

**3. No Results Found**
- Check data exists in database
- Verify isActive/isPublished/isApproved flags
- Test regex patterns in MongoDB shell
- Check search query formatting

**4. High Memory Usage**
- Reduce limit parameter
- Limit populated fields
- Implement pagination
- Clear old cache entries

## Security Considerations

1. **Input Validation**
   - Query length limits (max 200 characters)
   - SQL injection prevention (using Mongoose)
   - XSS prevention (sanitize output)

2. **Rate Limiting**
   - Prevent brute force attacks
   - Protect against DoS
   - Fair usage policies

3. **Data Privacy**
   - Don't expose sensitive fields
   - Respect user privacy settings
   - Filter unpublished content

## Deployment Checklist

- [ ] Database indexes created
- [ ] Redis configured and tested
- [ ] Environment variables set
- [ ] Rate limiting configured
- [ ] Monitoring/logging enabled
- [ ] Tests passing
- [ ] Performance benchmarked
- [ ] Documentation updated
- [ ] API documentation generated
- [ ] Frontend integration tested

## Support

For issues or questions:
- Review this documentation
- Check application logs
- Run test suite
- Contact backend team

---

**Implementation Date:** 2025-11-18
**Version:** 1.0.0
**Author:** Backend Development Team

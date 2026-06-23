# Batch Homepage API - Complete Architecture Design

## Executive Summary

This document outlines the design for a **batch homepage endpoint** that consolidates 6+ individual API calls into a single optimized request, reducing frontend load time from ~1500-2000ms to <300ms (80% improvement).

**Current State:**
- Frontend makes 6 separate API calls
- Total response time: 1500-2000ms
- Network overhead: 6 round trips
- Cache management: Complex per-endpoint

**Target State:**
- Single batched API call
- Target response time: <300ms
- Network overhead: 1 round trip
- Unified cache strategy

---

## 1. API Endpoint Specification

### 1.1 Route Definition

```
GET /api/v1/homepage
```

### 1.2 Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `userId` | string | No | null | User ID for personalization |
| `limit` | number | No | 10 | Items per section (max: 20) |
| `sections` | string[] | No | all | Comma-separated section IDs to fetch |
| `location` | string | No | null | "lng,lat" for location-based data |
| `includeAnalytics` | boolean | No | false | Include analytics metadata |
| `fresh` | boolean | No | false | Bypass cache (force refresh) |

**Example Requests:**

```bash
# Get all sections with defaults
GET /api/v1/homepage

# Get specific sections for authenticated user
GET /api/v1/homepage?userId=507f1f77bcf86cd799439011&sections=events,trending_stores&limit=15

# Force fresh data
GET /api/v1/homepage?fresh=true

# Include analytics
GET /api/v1/homepage?includeAnalytics=true
```

### 1.3 Response Structure

```typescript
interface HomepageBatchResponse {
  success: boolean;
  data: {
    sections: {
      justForYou?: ProductSection;
      newArrivals?: ProductSection;
      trendingStores?: StoreSection;
      events?: EventSection;
      offers?: OfferSection;
      flashSales?: OfferSection;
    };
    metadata: {
      timestamp: string;          // ISO 8601 timestamp
      userId?: string;            // User ID if authenticated
      cacheKey: string;           // Cache key used
      ttl: number;                // Cache TTL in seconds
      fromCache: boolean;         // Whether served from cache
      executionTime: number;      // Query execution time (ms)
      partialFailure: boolean;    // True if some sections failed
    };
    analytics?: {
      sectionViews: Record<string, number>;
      recommendationScore?: number;
    };
  };
  errors?: Array<{
    section: string;
    message: string;
    code: string;
  }>;
  message?: string;
}
```

**Section Type Definitions:**

```typescript
interface ProductSection {
  id: string;                    // 'justForYou' | 'newArrivals'
  title: string;
  type: 'products' | 'recommendations';
  items: ProductItem[];
  total: number;                 // Total available items
  hasMore: boolean;              // More items available
  lastUpdated: string;           // ISO 8601 timestamp
}

interface StoreSection {
  id: string;                    // 'trending_stores'
  title: string;
  type: 'stores';
  items: StoreItem[];
  total: number;
  hasMore: boolean;
  lastUpdated: string;
}

interface EventSection {
  id: string;                    // 'events'
  title: string;
  type: 'events';
  items: EventItem[];
  total: number;
  hasMore: boolean;
  lastUpdated: string;
}

interface OfferSection {
  id: string;                    // 'offers' | 'flashSales'
  title: string;
  type: 'offers';
  items: OfferItem[];
  total: number;
  hasMore: boolean;
  lastUpdated: string;
}
```

### 1.4 HTTP Status Codes

| Status Code | Scenario |
|-------------|----------|
| 200 | Success (full or partial) |
| 400 | Invalid query parameters |
| 401 | Authentication required but not provided |
| 429 | Rate limit exceeded |
| 500 | Server error (all sections failed) |
| 503 | Service temporarily unavailable |

### 1.5 Response Examples

**Success Response:**

```json
{
  "success": true,
  "data": {
    "sections": {
      "justForYou": {
        "id": "justForYou",
        "title": "Just for You",
        "type": "recommendations",
        "items": [...],
        "total": 45,
        "hasMore": true,
        "lastUpdated": "2025-11-14T10:30:00Z"
      },
      "events": {
        "id": "events",
        "title": "Events",
        "type": "events",
        "items": [...],
        "total": 12,
        "hasMore": false,
        "lastUpdated": "2025-11-14T10:30:00Z"
      }
    },
    "metadata": {
      "timestamp": "2025-11-14T10:30:00Z",
      "userId": "507f1f77bcf86cd799439011",
      "cacheKey": "homepage:507f1f77bcf86cd799439011:v1",
      "ttl": 300,
      "fromCache": false,
      "executionTime": 245,
      "partialFailure": false
    }
  }
}
```

**Partial Failure Response:**

```json
{
  "success": true,
  "data": {
    "sections": {
      "justForYou": {...},
      "events": {...},
      "offers": null
    },
    "metadata": {
      "timestamp": "2025-11-14T10:30:00Z",
      "partialFailure": true,
      "executionTime": 280
    }
  },
  "errors": [
    {
      "section": "offers",
      "message": "Failed to fetch offers",
      "code": "OFFERS_FETCH_ERROR"
    }
  ]
}
```

---

## 2. Backend Architecture Design

### 2.1 File Structure

```
user-backend/src/
├── routes/
│   └── homepageRoutes.ts           # New file
├── controllers/
│   └── homepageController.ts       # New file
├── services/
│   └── homepageService.ts          # New file
├── middleware/
│   └── cacheMiddleware.ts          # Optional: Enhanced caching
└── utils/
    └── parallelQueryExecutor.ts    # Helper for parallel queries
```

### 2.2 Request Flow

```
┌─────────────────┐
│  Client Request │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Rate Limiter   │ (Optional)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Cache Check     │ (Redis/Memory)
└────────┬────────┘
         │
    ┌────┴────┐
    │  Hit?   │
    └────┬────┘
         │
    No   │   Yes
    ▼    │    ▼
┌───────────┐  └──────────┐
│Controller │             │
└─────┬─────┘             │
      │                   │
      ▼                   │
┌─────────────┐           │
│   Service   │           │
└──────┬──────┘           │
       │                  │
       ▼                  │
┌──────────────────┐      │
│ Parallel Queries │      │
│ (Promise.all)    │      │
│                  │      │
│ ┌──────────┐    │      │
│ │ Products │    │      │
│ ├──────────┤    │      │
│ │  Stores  │    │      │
│ ├──────────┤    │      │
│ │  Events  │    │      │
│ ├──────────┤    │      │
│ │  Offers  │    │      │
│ └──────────┘    │      │
└──────┬──────────┘      │
       │                 │
       ▼                 │
┌─────────────┐          │
│  Aggregate  │          │
│   Results   │          │
└──────┬──────┘          │
       │                 │
       ▼                 │
┌─────────────┐          │
│ Cache Save  │          │
└──────┬──────┘          │
       │                 │
       ├─────────────────┘
       │
       ▼
┌─────────────┐
│   Response  │
└─────────────┘
```

### 2.3 Component Responsibilities

#### Route (homepageRoutes.ts)
- Define endpoint
- Apply middleware (auth, validation, rate limiting)
- Route to controller

#### Controller (homepageController.ts)
- Parse and validate request parameters
- Check cache
- Call service layer
- Format response
- Handle errors gracefully

#### Service (homepageService.ts)
- Execute parallel database queries
- Aggregate results
- Handle partial failures
- Return structured data

---

## 3. Database Query Plan

### 3.1 Parallel Query Execution

```typescript
// All queries execute simultaneously using Promise.allSettled
const queries = {
  justForYou: fetchJustForYou(userId, limit),
  newArrivals: fetchNewArrivals(limit),
  trendingStores: fetchTrendingStores(limit),
  events: fetchEvents(limit),
  offers: fetchOffers({ featured: true, limit }),
  flashSales: fetchFlashSales(limit)
};

const results = await Promise.allSettled(Object.values(queries));
```

### 3.2 Individual Query Specifications

#### Just For You Section
```javascript
// Reuse existing endpoint: /products/featured
db.collection('products')
  .find({
    featured: true,
    isActive: true,
    'inventory.stock': { $gt: 0 }
  })
  .sort({
    recommendationScore: -1,  // If personalization exists
    views: -1,                // Fallback to popularity
    createdAt: -1
  })
  .limit(limit)
  .select('name brand image price category rating cashback inventory')
```

**Estimated Execution Time:** 50-80ms
**Index Requirements:**
- `{ featured: 1, isActive: 1, views: -1 }`
- `{ featured: 1, isActive: 1, recommendationScore: -1 }`

#### New Arrivals Section
```javascript
// Reuse existing endpoint: /products/new-arrivals
db.collection('products')
  .find({
    isActive: true,
    'inventory.stock': { $gt: 0 }
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .select('name brand image price category rating cashback inventory createdAt')
```

**Estimated Execution Time:** 40-60ms
**Index Requirements:**
- `{ isActive: 1, createdAt: -1 }`

#### Trending Stores Section
```javascript
// Reuse existing endpoint: /stores/featured
db.collection('stores')
  .find({
    featured: true,
    isActive: true
  })
  .sort({ rating: -1, views: -1 })
  .limit(limit)
  .select('name logo image rating cashback category location tags')
```

**Estimated Execution Time:** 50-70ms
**Index Requirements:**
- `{ featured: 1, isActive: 1, rating: -1 }`

#### Events Section
```javascript
// Reuse existing endpoint: /events/featured
db.collection('events')
  .find({
    featured: true,
    isActive: true,
    date: { $gte: new Date() }
  })
  .sort({ date: 1, views: -1 })
  .limit(limit)
  .select('title subtitle image price location date time category organizer')
```

**Estimated Execution Time:** 40-60ms
**Index Requirements:**
- `{ featured: 1, isActive: 1, date: 1 }`

#### Offers Section
```javascript
// Reuse existing endpoint: /offers
db.collection('offers')
  .find({
    featured: true,
    isActive: true,
    validity: { $gte: new Date() }
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .select('title subtitle image discountedPrice originalPrice cashbackPercentage validity category store')
```

**Estimated Execution Time:** 50-70ms
**Index Requirements:**
- `{ featured: 1, isActive: 1, validity: 1 }`

#### Flash Sales Section
```javascript
// Reuse existing endpoint: /offers with flash sale filter
db.collection('offers')
  .find({
    'metadata.flashSale.isActive': true,
    isActive: true,
    validity: { $gte: new Date() }
  })
  .sort({ 'metadata.flashSale.salePrice': 1 })
  .limit(limit)
  .select('title subtitle image metadata.flashSale discountedPrice originalPrice validity category store')
```

**Estimated Execution Time:** 50-80ms
**Index Requirements:**
- `{ 'metadata.flashSale.isActive': 1, isActive: 1, validity: 1 }`

### 3.3 Total Estimated Query Time

**Sequential (Current):** 50ms + 40ms + 50ms + 40ms + 50ms + 50ms = **280ms**

**Parallel (Proposed):** Max(80ms) = **80ms** (70% improvement)

**With Network/Parsing:** ~**150-200ms total**

---

## 4. Caching Strategy

### 4.1 Cache Layers

```
┌─────────────────────────────────────────┐
│         CDN Cache (Optional)            │
│         TTL: 60 seconds                 │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Redis Cache                     │
│         TTL: 5 minutes                  │
│         Key: homepage:{userId}:v1       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      In-Memory Cache (Node.js)          │
│      TTL: 1 minute                      │
│      Fallback if Redis unavailable      │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Database Queries                │
└─────────────────────────────────────────┘
```

### 4.2 Cache Key Strategy

**Authenticated Users (Personalized):**
```
homepage:{userId}:v1
Example: homepage:507f1f77bcf86cd799439011:v1
```

**Anonymous Users (Global):**
```
homepage:anonymous:v1
Example: homepage:anonymous:v1
```

**Section-Specific Keys (Granular Caching):**
```
homepage:section:{sectionId}:{params}:v1
Examples:
- homepage:section:justForYou:limit10:v1
- homepage:section:trendingStores:limit15:v1
```

### 4.3 Cache TTL Configuration

| Cache Layer | TTL | Use Case |
|-------------|-----|----------|
| Redis (Full Response) | 5 minutes | Fast repeated requests |
| Redis (Section) | 10 minutes | Individual section refresh |
| In-Memory | 1 minute | Extreme load scenarios |
| CDN (Optional) | 60 seconds | Public/anonymous users |

### 4.4 Cache Invalidation Strategy

**Time-Based Invalidation:**
- Automatic expiration based on TTL
- No manual invalidation needed for most cases

**Event-Based Invalidation:**
- When new products/stores/events are created
- When featured items are updated
- When offers expire

**Invalidation Patterns:**
```typescript
// Invalidate all homepage caches
await redis.del(await redis.keys('homepage:*'));

// Invalidate user-specific cache
await redis.del(`homepage:${userId}:v1`);

// Invalidate specific section across all users
await redis.del(await redis.keys(`homepage:*:section:justForYou:*`));
```

### 4.5 Stale-While-Revalidate

**Strategy:** Serve stale data while refreshing in background

```typescript
async function getHomepageData(userId: string, limit: number) {
  const cacheKey = `homepage:${userId}:v1`;

  // 1. Check cache
  const cached = await redis.get(cacheKey);

  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    // If data is fresh (< 3 minutes), return immediately
    if (age < 180000) {
      return { data, fromCache: true };
    }

    // If data is stale (3-5 minutes), return but refresh in background
    if (age < 300000) {
      // Return stale data immediately
      setImmediate(() => refreshHomepageData(userId, limit, cacheKey));
      return { data, fromCache: true, stale: true };
    }
  }

  // If no cache or expired, fetch fresh data
  const freshData = await fetchHomepageData(userId, limit);
  await redis.set(cacheKey, JSON.stringify({
    data: freshData,
    timestamp: Date.now()
  }), 'EX', 300);

  return { data: freshData, fromCache: false };
}
```

### 4.6 Cache Warming

**On Server Start:**
```typescript
async function warmHomepageCache() {
  // Warm anonymous cache
  await fetchHomepageData('anonymous', 10);

  // Warm common section caches
  await Promise.all([
    fetchJustForYou('anonymous', 10),
    fetchNewArrivals(10),
    fetchTrendingStores(10),
    fetchEvents(10),
    fetchOffers(10),
    fetchFlashSales(10)
  ]);
}
```

**Scheduled Refresh:**
```typescript
// Refresh cache every 4 minutes (before TTL expires)
setInterval(async () => {
  await warmHomepageCache();
}, 240000); // 4 minutes
```

---

## 5. Error Handling Strategy

### 5.1 Partial Failure Handling

**Principle:** Never fail the entire request if one section fails

```typescript
const results = await Promise.allSettled([
  fetchJustForYou(userId, limit),
  fetchNewArrivals(limit),
  fetchTrendingStores(limit),
  fetchEvents(limit),
  fetchOffers(limit),
  fetchFlashSales(limit)
]);

const sections: any = {};
const errors: any[] = [];

results.forEach((result, index) => {
  const sectionName = sectionNames[index];

  if (result.status === 'fulfilled') {
    sections[sectionName] = result.value;
  } else {
    sections[sectionName] = null;
    errors.push({
      section: sectionName,
      message: result.reason.message,
      code: 'SECTION_FETCH_ERROR'
    });
  }
});

return {
  success: true,
  data: {
    sections,
    metadata: {
      partialFailure: errors.length > 0
    }
  },
  errors: errors.length > 0 ? errors : undefined
};
```

### 5.2 Fallback Data

**Strategy:** Return empty arrays instead of null for failed sections

```typescript
function getSectionFallback(sectionId: string) {
  return {
    id: sectionId,
    title: getSectionTitle(sectionId),
    type: getSectionType(sectionId),
    items: [],
    total: 0,
    hasMore: false,
    lastUpdated: new Date().toISOString(),
    error: true
  };
}
```

### 5.3 Error Metadata

```typescript
interface ErrorMetadata {
  section: string;
  message: string;
  code: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
}
```

**Error Codes:**
- `SECTION_FETCH_ERROR` - Database query failed
- `CACHE_ERROR` - Cache read/write failed
- `TIMEOUT_ERROR` - Query exceeded timeout
- `VALIDATION_ERROR` - Invalid parameters
- `DB_CONNECTION_ERROR` - Database unavailable

### 5.4 Timeout Configuration

```typescript
const QUERY_TIMEOUT = 5000; // 5 seconds per query
const TOTAL_REQUEST_TIMEOUT = 10000; // 10 seconds total

async function fetchWithTimeout(promise: Promise<any>, timeout: number) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), timeout)
    )
  ]);
}
```

---

## 6. Performance Targets & Optimization

### 6.1 Performance Targets

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Total Response Time | 1500-2000ms | <300ms | 80% reduction |
| Network Requests | 6 | 1 | 83% reduction |
| Data Transfer | ~150KB | ~100KB | 33% reduction |
| Cache Hit Rate | N/A | >80% | New metric |
| P95 Response Time | 2500ms | <500ms | 80% reduction |
| P99 Response Time | 3000ms | <800ms | 73% reduction |

### 6.2 Database Optimization

**Connection Pooling:**
```typescript
// mongoose configuration
mongoose.connect(MONGODB_URI, {
  maxPoolSize: 50,      // Increased pool size
  minPoolSize: 10,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000
});
```

**Query Optimization:**
- Use `.lean()` for faster queries (no Mongoose document overhead)
- Select only required fields
- Use appropriate indexes
- Batch populate operations

**Example:**
```typescript
const products = await Product.find({ featured: true })
  .select('name image price rating')
  .lean()
  .limit(10);
```

### 6.3 Response Compression

```typescript
// Express middleware
import compression from 'compression';

app.use(compression({
  level: 6,          // Compression level (1-9)
  threshold: 1024,   // Only compress if > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));
```

**Expected Compression:**
- JSON: 60-80% reduction
- 100KB → 20-40KB

### 6.4 Field Selection (Sparse Fieldsets)

**Support selective field inclusion:**

```
GET /api/v1/homepage?fields=justForYou.items.name,justForYou.items.price
```

**Benefits:**
- Reduce payload size
- Faster serialization
- Lower bandwidth usage

---

## 7. Backward Compatibility

### 7.1 Keep Existing Endpoints

**DO NOT REMOVE:**
- `/products/featured`
- `/products/new-arrivals`
- `/stores/featured`
- `/events/featured`
- `/offers?featured=true`

**Reason:** Allow gradual frontend migration

### 7.2 Migration Strategy

**Phase 1: Deploy Batch Endpoint** (Week 1)
- Deploy batch endpoint alongside existing endpoints
- Monitor performance and errors
- No frontend changes yet

**Phase 2: Frontend Testing** (Week 2)
- Update frontend to use batch endpoint
- A/B test: 50% batch, 50% individual calls
- Monitor metrics

**Phase 3: Full Migration** (Week 3)
- Roll out batch endpoint to 100% of users
- Monitor for issues
- Keep individual endpoints for fallback

**Phase 4: Deprecation** (Month 2-3)
- Mark individual endpoints as deprecated
- Remove after 3 months (ensure no usage)

### 7.3 Versioning Strategy

**Current Approach:**
```
GET /api/v1/homepage
```

**Future Versioning:**
```
GET /api/v2/homepage  # If breaking changes needed
```

**Response Versioning:**
```json
{
  "version": "1.0.0",
  "data": {...}
}
```

---

## 8. Implementation Checklist

### Phase 1: Backend Development (1-2 days)

#### Day 1: Core Implementation
- [ ] Create `homepageRoutes.ts`
- [ ] Create `homepageController.ts`
- [ ] Create `homepageService.ts`
- [ ] Implement parallel query execution
- [ ] Add error handling and partial failure support
- [ ] Write unit tests

#### Day 2: Optimization & Testing
- [ ] Implement Redis caching
- [ ] Add cache warming
- [ ] Implement stale-while-revalidate
- [ ] Add request validation
- [ ] Add rate limiting
- [ ] Integration tests

### Phase 2: Frontend Integration (1 day)

#### Day 3: Frontend Updates
- [ ] Update `homepageApi.ts` to use batch endpoint
- [ ] Update `useHomepage.ts` hook
- [ ] Test with real data
- [ ] Monitor performance metrics
- [ ] A/B testing setup

### Phase 3: Monitoring & Optimization (Ongoing)

- [ ] Set up performance monitoring
- [ ] Track cache hit rates
- [ ] Monitor error rates
- [ ] Optimize based on real-world data
- [ ] Document learnings

---

## 9. Testing Strategy

### 9.1 Unit Tests

**Test Files:**
- `homepageService.test.ts`
- `homepageController.test.ts`

**Test Cases:**
1. All sections return successfully
2. Partial failure handling
3. Cache hit scenario
4. Cache miss scenario
5. Invalid parameters
6. Timeout handling
7. Empty results
8. Authenticated vs anonymous users

### 9.2 Integration Tests

**Test Scenarios:**
1. End-to-end request flow
2. Database query performance
3. Cache integration
4. Error handling
5. Concurrent requests

### 9.3 Load Testing

**Tools:** Apache JMeter, Artillery, k6

**Test Cases:**
1. 100 concurrent users
2. 1000 requests/minute
3. Cache hit rate measurement
4. Database connection pooling
5. Memory usage under load

**Load Test Script (k6):**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 100,
  duration: '5m',
};

export default function () {
  const res = http.get('http://localhost:5000/api/v1/homepage');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 300ms': (r) => r.timings.duration < 300,
  });

  sleep(1);
}
```

### 9.4 Performance Testing

**Metrics to Track:**
- Response time (avg, p50, p95, p99)
- Cache hit rate
- Error rate
- Database query time
- Memory usage
- CPU usage

---

## 10. Monitoring & Observability

### 10.1 Key Metrics

**Application Metrics:**
- Request rate (requests/minute)
- Response time (avg, p95, p99)
- Error rate (%)
- Cache hit rate (%)
- Partial failure rate (%)

**Infrastructure Metrics:**
- Database connection pool usage
- Redis memory usage
- Node.js memory usage
- CPU usage

### 10.2 Logging Strategy

**Log Levels:**
- `DEBUG`: Cache operations, query details
- `INFO`: Request received, cache hit/miss
- `WARN`: Partial failures, slow queries
- `ERROR`: Complete failures, exceptions

**Log Format:**
```json
{
  "timestamp": "2025-11-14T10:30:00Z",
  "level": "INFO",
  "message": "Homepage request completed",
  "requestId": "req_xyz123",
  "userId": "507f1f77bcf86cd799439011",
  "duration": 245,
  "cacheHit": false,
  "sections": {
    "justForYou": "success",
    "events": "success",
    "offers": "failed"
  }
}
```

### 10.3 Alerting

**Alert Conditions:**
- Response time > 500ms for 5 minutes
- Error rate > 5% for 5 minutes
- Cache hit rate < 50% for 10 minutes
- Partial failure rate > 10% for 5 minutes

---

## 11. Security Considerations

### 11.1 Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const homepageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 60,                   // 60 requests per minute
  message: 'Too many requests, please try again later'
});

router.get('/homepage', homepageLimiter, getHomepage);
```

### 11.2 Input Validation

**Validate all query parameters:**
- `limit`: 1-20 (prevent abuse)
- `sections`: Valid section IDs only
- `userId`: Valid MongoDB ObjectId format

### 11.3 Authentication

**Optional Authentication:**
- Anonymous users: Get global cached data
- Authenticated users: Get personalized data

```typescript
router.get('/homepage', optionalAuth, validateQuery, getHomepage);
```

### 11.4 Data Sanitization

**Prevent injection attacks:**
- Sanitize all user inputs
- Use parameterized queries
- Validate MongoDB ObjectIds

---

## 12. Success Metrics

### 12.1 Technical Metrics

| Metric | Baseline | Target | Success Criteria |
|--------|----------|--------|------------------|
| Response Time (P50) | 1500ms | 200ms | <250ms |
| Response Time (P95) | 2500ms | 400ms | <500ms |
| Network Requests | 6 | 1 | 1 |
| Cache Hit Rate | 0% | 80% | >70% |
| Error Rate | N/A | <1% | <2% |

### 12.2 Business Metrics

| Metric | Baseline | Target | Impact |
|--------|----------|--------|--------|
| Homepage Load Time | 2.0s | 0.5s | 75% faster |
| User Engagement | TBD | +20% | Faster = More engagement |
| Bounce Rate | TBD | -15% | Less waiting = Less bouncing |
| Session Duration | TBD | +10% | Better UX = Longer sessions |

---

## 13. Risks & Mitigation

### 13.1 Identified Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Cache invalidation issues | High | Medium | Implement proper TTL and event-based invalidation |
| Database overload | High | Low | Connection pooling, query optimization |
| Partial failures | Medium | Medium | Graceful degradation, fallback data |
| Memory leaks | High | Low | Proper cache cleanup, monitoring |
| Breaking frontend | High | Low | Keep old endpoints, gradual migration |

### 13.2 Rollback Plan

**If Issues Occur:**
1. Immediately revert frontend to use individual endpoints
2. Investigate and fix backend issues
3. Re-deploy after thorough testing
4. Monitor closely for 24-48 hours

---

## 14. Next Steps

### Immediate Actions (This Week)

1. **Review & Approve Design** (1 day)
   - Team review
   - Stakeholder approval
   - Final adjustments

2. **Backend Implementation** (2 days)
   - Follow implementation checklist
   - Write tests
   - Code review

3. **Deployment to Staging** (0.5 days)
   - Deploy to staging environment
   - Run integration tests
   - Performance testing

### Short-term Actions (Next Week)

4. **Frontend Integration** (1 day)
   - Update frontend code
   - A/B testing
   - Monitor metrics

5. **Production Deployment** (0.5 days)
   - Gradual rollout (10% → 50% → 100%)
   - Monitor performance
   - Ready to rollback if needed

### Long-term Actions (Next Month)

6. **Optimization** (Ongoing)
   - Fine-tune cache TTLs
   - Optimize database queries
   - Monitor and improve

7. **Documentation** (1 day)
   - API documentation
   - Frontend migration guide
   - Runbook for ops team

---

## 15. Appendix

### A. OpenAPI/Swagger Specification

See: `BATCH_HOMEPAGE_OPENAPI.yaml` (separate file)

### B. Database Index Requirements

```javascript
// Products collection
db.products.createIndex({ featured: 1, isActive: 1, views: -1 });
db.products.createIndex({ isActive: 1, createdAt: -1 });

// Stores collection
db.stores.createIndex({ featured: 1, isActive: 1, rating: -1 });

// Events collection
db.events.createIndex({ featured: 1, isActive: 1, date: 1 });

// Offers collection
db.offers.createIndex({ featured: 1, isActive: 1, validity: 1 });
db.offers.createIndex({ 'metadata.flashSale.isActive': 1, isActive: 1, validity: 1 });
```

### C. Environment Variables

```bash
# Cache Configuration
REDIS_URL=redis://localhost:6379
CACHE_TTL=300                    # 5 minutes
CACHE_WARMING_INTERVAL=240000    # 4 minutes

# Performance
DB_POOL_SIZE=50
QUERY_TIMEOUT=5000
REQUEST_TIMEOUT=10000

# Features
ENABLE_BATCH_ENDPOINT=true
ENABLE_CACHE_WARMING=true
ENABLE_STALE_WHILE_REVALIDATE=true
```

### D. Sample Queries

See existing controller implementations:
- `productController.ts` → `getFeaturedProducts()`
- `storeController.ts` → `getFeaturedStores()`
- `eventController.ts` → `getFeaturedEvents()`
- `offerController.ts` → `getOffers()`

---

## Summary

This batch homepage endpoint will:
- ✅ Reduce response time by 80% (2000ms → 300ms)
- ✅ Reduce network requests by 83% (6 → 1)
- ✅ Improve cache efficiency with unified strategy
- ✅ Maintain backward compatibility
- ✅ Handle failures gracefully
- ✅ Provide better user experience

**Estimated Development Time:** 3-4 days
**Estimated Performance Gain:** 80% faster
**Risk Level:** Low (graceful degradation, rollback plan)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-14
**Author:** Agent 1 - Backend Architecture
**Status:** Design Complete - Ready for Implementation

# Batch Homepage API - Implementation Checklist

## Overview

This checklist provides a step-by-step guide for implementing the batch homepage endpoint. Follow each task in order to ensure a smooth implementation.

**Estimated Time:** 3-4 days
**Priority:** High
**Complexity:** Medium

---

## Phase 1: Backend Development (Days 1-2)

### Day 1: Core Implementation

#### 1.1 Setup & File Structure ✓

- [ ] Create `src/routes/homepageRoutes.ts`
- [ ] Create `src/controllers/homepageController.ts`
- [ ] Create `src/services/homepageService.ts`
- [ ] Create `src/utils/parallelQueryExecutor.ts`
- [ ] Update `src/index.ts` to register new route

**Acceptance Criteria:**
- All files created with proper TypeScript types
- Files follow existing project structure
- Import statements resolve correctly

---

#### 1.2 Route Configuration ✓

**File:** `src/routes/homepageRoutes.ts`

```typescript
import { Router } from 'express';
import { getHomepage } from '../controllers/homepageController';
import { optionalAuth } from '../middleware/auth';
import { validateQuery } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// Batch homepage endpoint
router.get('/',
  optionalAuth,
  validateQuery(Joi.object({
    userId: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    limit: Joi.number().integer().min(1).max(20).default(10),
    sections: Joi.string().pattern(/^[a-zA-Z,]+$/),
    location: Joi.string().pattern(/^-?\d+\.?\d*,-?\d+\.?\d*$/),
    includeAnalytics: Joi.boolean().default(false),
    fresh: Joi.boolean().default(false)
  })),
  getHomepage
);

export default router;
```

**Tasks:**
- [ ] Define route with proper middleware
- [ ] Add validation schema
- [ ] Add optional authentication
- [ ] Export router

**Acceptance Criteria:**
- Route responds to GET /api/v1/homepage
- Validation works correctly
- Auth is optional (allows anonymous)

---

#### 1.3 Controller Implementation ✓

**File:** `src/controllers/homepageController.ts`

```typescript
import { Request, Response } from 'express';
import { homepageService } from '../services/homepageService';
import { asyncHandler } from '../utils/asyncHandler';

export const getHomepage = asyncHandler(async (req: Request, res: Response) => {
  const {
    userId,
    limit = 10,
    sections,
    location,
    includeAnalytics = false,
    fresh = false
  } = req.query;

  // Parse sections parameter
  const requestedSections = sections
    ? (sections as string).split(',').map(s => s.trim())
    : undefined;

  // Call service layer
  const result = await homepageService.getHomepageData({
    userId: userId as string,
    limit: Number(limit),
    sections: requestedSections,
    location: location as string,
    includeAnalytics: Boolean(includeAnalytics),
    bypassCache: Boolean(fresh)
  });

  // Return response
  res.status(200).json(result);
});
```

**Tasks:**
- [ ] Parse and validate query parameters
- [ ] Call service layer
- [ ] Handle errors with asyncHandler
- [ ] Return formatted response

**Acceptance Criteria:**
- Parameters parsed correctly
- Service called with correct arguments
- Errors handled gracefully
- Response matches OpenAPI spec

---

#### 1.4 Service Implementation - Part 1: Parallel Queries ✓

**File:** `src/services/homepageService.ts`

```typescript
import { ProductController } from '../controllers/productController';
import { StoreController } from '../controllers/storeController';
import { EventController } from '../controllers/eventController';
import { OfferController } from '../controllers/offerController';

interface HomepageServiceOptions {
  userId?: string;
  limit: number;
  sections?: string[];
  location?: string;
  includeAnalytics: boolean;
  bypassCache: boolean;
}

class HomepageService {
  // Fetch all sections in parallel
  async getHomepageData(options: HomepageServiceOptions) {
    const { userId, limit, sections, bypassCache } = options;

    // Determine which sections to fetch
    const sectionsToFetch = sections || [
      'justForYou',
      'newArrivals',
      'trendingStores',
      'events',
      'offers',
      'flashSales'
    ];

    // Build parallel queries
    const queries: Record<string, Promise<any>> = {};

    if (sectionsToFetch.includes('justForYou')) {
      queries.justForYou = this.fetchJustForYou(userId, limit);
    }
    if (sectionsToFetch.includes('newArrivals')) {
      queries.newArrivals = this.fetchNewArrivals(limit);
    }
    if (sectionsToFetch.includes('trendingStores')) {
      queries.trendingStores = this.fetchTrendingStores(limit);
    }
    if (sectionsToFetch.includes('events')) {
      queries.events = this.fetchEvents(limit);
    }
    if (sectionsToFetch.includes('offers')) {
      queries.offers = this.fetchOffers(limit);
    }
    if (sectionsToFetch.includes('flashSales')) {
      queries.flashSales = this.fetchFlashSales(limit);
    }

    // Execute all queries in parallel
    const startTime = Date.now();
    const results = await Promise.allSettled(Object.values(queries));
    const executionTime = Date.now() - startTime;

    // Process results
    return this.aggregateResults(
      results,
      Object.keys(queries),
      executionTime,
      options
    );
  }

  // Individual fetch methods (reuse existing logic)
  private async fetchJustForYou(userId: string | undefined, limit: number) {
    // Reuse existing controller logic
    // This would call the existing getFeaturedProducts endpoint
  }

  private async fetchNewArrivals(limit: number) {
    // Reuse existing controller logic
    // This would call the existing getNewArrivals endpoint
  }

  private async fetchTrendingStores(limit: number) {
    // Reuse existing controller logic
    // This would call the existing getFeaturedStores endpoint
  }

  private async fetchEvents(limit: number) {
    // Reuse existing controller logic
    // This would call the existing getFeaturedEvents endpoint
  }

  private async fetchOffers(limit: number) {
    // Reuse existing controller logic
    // This would call the existing getOffers endpoint
  }

  private async fetchFlashSales(limit: number) {
    // Reuse existing controller logic
    // This would call the existing getOffers with flash sale filter
  }
}

export const homepageService = new HomepageService();
```

**Tasks:**
- [ ] Define service interface
- [ ] Implement parallel query execution
- [ ] Add individual fetch methods (reuse existing logic)
- [ ] Handle Promise.allSettled results

**Acceptance Criteria:**
- All queries execute in parallel
- Uses Promise.allSettled (not Promise.all)
- Reuses existing controller/service logic
- No code duplication

---

#### 1.5 Service Implementation - Part 2: Result Aggregation ✓

**File:** `src/services/homepageService.ts` (continued)

```typescript
class HomepageService {
  // ... previous code ...

  private aggregateResults(
    results: PromiseSettledResult<any>[],
    sectionNames: string[],
    executionTime: number,
    options: HomepageServiceOptions
  ) {
    const sections: any = {};
    const errors: any[] = [];
    let partialFailure = false;

    results.forEach((result, index) => {
      const sectionName = sectionNames[index];

      if (result.status === 'fulfilled') {
        sections[sectionName] = {
          id: sectionName,
          title: this.getSectionTitle(sectionName),
          type: this.getSectionType(sectionName),
          items: result.value.items || result.value,
          total: result.value.total || result.value.length,
          hasMore: result.value.hasMore || false,
          lastUpdated: new Date().toISOString()
        };
      } else {
        // Section failed, use fallback
        partialFailure = true;
        sections[sectionName] = null;
        errors.push({
          section: sectionName,
          message: result.reason?.message || 'Unknown error',
          code: 'SECTION_FETCH_ERROR',
          timestamp: new Date().toISOString(),
          severity: 'medium'
        });
      }
    });

    // Build response
    return {
      success: true,
      data: {
        sections,
        metadata: {
          timestamp: new Date().toISOString(),
          userId: options.userId,
          cacheKey: this.getCacheKey(options.userId),
          ttl: 300, // 5 minutes
          fromCache: false, // Will be updated by cache layer
          executionTime,
          partialFailure
        },
        ...(options.includeAnalytics && {
          analytics: {
            sectionViews: {},
            recommendationScore: 0.85
          }
        })
      },
      ...(errors.length > 0 && { errors })
    };
  }

  private getSectionTitle(sectionId: string): string {
    const titles: Record<string, string> = {
      justForYou: 'Just for You',
      newArrivals: 'New Arrivals',
      trendingStores: 'Trending Stores',
      events: 'Events',
      offers: 'Special Offers',
      flashSales: 'Flash Sales'
    };
    return titles[sectionId] || sectionId;
  }

  private getSectionType(sectionId: string): string {
    const types: Record<string, string> = {
      justForYou: 'recommendations',
      newArrivals: 'products',
      trendingStores: 'stores',
      events: 'events',
      offers: 'offers',
      flashSales: 'offers'
    };
    return types[sectionId] || 'unknown';
  }

  private getCacheKey(userId?: string): string {
    return `homepage:${userId || 'anonymous'}:v1`;
  }
}
```

**Tasks:**
- [ ] Implement result aggregation
- [ ] Handle partial failures gracefully
- [ ] Build response matching OpenAPI spec
- [ ] Add helper methods

**Acceptance Criteria:**
- Partial failures don't break entire response
- Response structure matches OpenAPI spec
- Errors are properly tracked
- Metadata is accurate

---

#### 1.6 Error Handling & Timeouts ✓

**File:** `src/services/homepageService.ts` (add timeout wrapper)

```typescript
class HomepageService {
  private QUERY_TIMEOUT = 5000; // 5 seconds per query

  private async fetchWithTimeout<T>(
    promise: Promise<T>,
    timeout: number = this.QUERY_TIMEOUT
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), timeout)
      )
    ]);
  }

  // Update fetch methods to use timeout
  private async fetchJustForYou(userId: string | undefined, limit: number) {
    return this.fetchWithTimeout(
      // ... existing fetch logic ...
    );
  }

  // ... apply to all fetch methods ...
}
```

**Tasks:**
- [ ] Add timeout wrapper function
- [ ] Apply timeout to all fetch methods
- [ ] Handle timeout errors
- [ ] Log timeout occurrences

**Acceptance Criteria:**
- Queries timeout after 5 seconds
- Timeout errors handled gracefully
- Logs show timeout occurrences
- User sees partial data if timeout

---

### Day 2: Caching & Optimization

#### 2.1 Redis Cache Integration ✓

**File:** `src/services/homepageService.ts` (add caching)

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

class HomepageService {
  private CACHE_TTL = 300; // 5 minutes

  async getHomepageData(options: HomepageServiceOptions) {
    const cacheKey = this.getCacheKey(options.userId);

    // Try to get from cache first
    if (!options.bypassCache) {
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return {
          ...cached,
          data: {
            ...cached.data,
            metadata: {
              ...cached.data.metadata,
              fromCache: true
            }
          }
        };
      }
    }

    // Fetch fresh data
    const result = await this.fetchFreshData(options);

    // Cache the result
    await this.saveToCache(cacheKey, result);

    return result;
  }

  private async getFromCache(key: string): Promise<any | null> {
    try {
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }
    return null;
  }

  private async saveToCache(key: string, data: any): Promise<void> {
    try {
      await redis.set(key, JSON.stringify(data), 'EX', this.CACHE_TTL);
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  private async fetchFreshData(options: HomepageServiceOptions) {
    // ... existing parallel query logic ...
  }
}
```

**Tasks:**
- [ ] Set up Redis connection
- [ ] Implement cache read/write
- [ ] Handle cache errors gracefully
- [ ] Add cache bypass option

**Acceptance Criteria:**
- Cache hit returns data <10ms
- Cache miss fetches fresh data
- Cache errors don't break functionality
- TTL is configurable

---

#### 2.2 Stale-While-Revalidate ✓

**File:** `src/services/homepageService.ts` (enhance caching)

```typescript
class HomepageService {
  private STALE_THRESHOLD = 180000; // 3 minutes

  private async getFromCache(key: string): Promise<any | null> {
    try {
      const cached = await redis.get(key);
      if (cached) {
        const data = JSON.parse(cached);
        const age = Date.now() - new Date(data.data.metadata.timestamp).getTime();

        // If stale, trigger background refresh
        if (age > this.STALE_THRESHOLD) {
          setImmediate(() => this.refreshInBackground(key, data));
          data.data.metadata.stale = true;
        }

        return data;
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }
    return null;
  }

  private async refreshInBackground(key: string, oldData: any): Promise<void> {
    try {
      // Extract options from old data
      const options = this.extractOptionsFromCache(oldData);

      // Fetch fresh data
      const freshData = await this.fetchFreshData(options);

      // Update cache
      await this.saveToCache(key, freshData);

      console.log(`Background refresh completed for ${key}`);
    } catch (error) {
      console.error('Background refresh failed:', error);
    }
  }
}
```

**Tasks:**
- [ ] Implement stale detection
- [ ] Add background refresh
- [ ] Track stale data metrics
- [ ] Log refresh events

**Acceptance Criteria:**
- Stale data returned immediately
- Background refresh happens asynchronously
- Fresh data available for next request
- No blocking on refresh

---

#### 2.3 Cache Warming ✓

**File:** `src/services/homepageService.ts` (add warming)

```typescript
class HomepageService {
  async warmCache(): Promise<void> {
    console.log('🔥 Warming homepage cache...');

    try {
      // Warm anonymous cache
      await this.getHomepageData({
        limit: 10,
        includeAnalytics: false,
        bypassCache: false
      });

      console.log('✅ Homepage cache warmed');
    } catch (error) {
      console.error('❌ Cache warming failed:', error);
    }
  }
}

export const homepageService = new HomepageService();

// Warm cache on server start
homepageService.warmCache();

// Refresh cache periodically (every 4 minutes)
setInterval(() => {
  homepageService.warmCache();
}, 240000);
```

**Tasks:**
- [ ] Implement cache warming function
- [ ] Warm on server start
- [ ] Schedule periodic warming
- [ ] Handle warming errors

**Acceptance Criteria:**
- Cache warmed on server start
- Periodic warming every 4 minutes
- Warming failures don't crash server
- Logs show warming status

---

## Phase 2: Testing (Day 2)

#### 2.4 Unit Tests ✓

**File:** `src/__tests__/homepageService.test.ts`

```typescript
import { homepageService } from '../services/homepageService';

describe('HomepageService', () => {
  describe('getHomepageData', () => {
    it('should fetch all sections successfully', async () => {
      const result = await homepageService.getHomepageData({
        limit: 10,
        includeAnalytics: false,
        bypassCache: true
      });

      expect(result.success).toBe(true);
      expect(result.data.sections).toBeDefined();
      expect(result.data.metadata).toBeDefined();
    });

    it('should handle partial failures', async () => {
      // Mock one section to fail
      // ... test logic ...
    });

    it('should respect cache', async () => {
      // ... test logic ...
    });

    it('should handle timeouts', async () => {
      // ... test logic ...
    });
  });
});
```

**Tasks:**
- [ ] Write unit tests for service
- [ ] Write unit tests for controller
- [ ] Test partial failure handling
- [ ] Test cache behavior
- [ ] Test timeout behavior

**Test Coverage Target:** >80%

**Acceptance Criteria:**
- All tests pass
- Coverage >80%
- Edge cases covered
- Mocks used appropriately

---

#### 2.5 Integration Tests ✓

**File:** `src/__tests__/integration/homepage.test.ts`

```typescript
import request from 'supertest';
import app from '../../index';

describe('GET /api/v1/homepage', () => {
  it('should return homepage data', async () => {
    const response = await request(app)
      .get('/api/v1/homepage')
      .query({ limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.sections).toBeDefined();
  });

  it('should handle specific sections', async () => {
    const response = await request(app)
      .get('/api/v1/homepage')
      .query({ sections: 'justForYou,events' });

    expect(response.body.data.sections).toHaveProperty('justForYou');
    expect(response.body.data.sections).toHaveProperty('events');
    expect(response.body.data.sections).not.toHaveProperty('offers');
  });

  it('should validate query parameters', async () => {
    const response = await request(app)
      .get('/api/v1/homepage')
      .query({ limit: 100 }); // Invalid: max is 20

    expect(response.status).toBe(400);
  });
});
```

**Tasks:**
- [ ] Write API integration tests
- [ ] Test different query combinations
- [ ] Test validation errors
- [ ] Test authentication scenarios

**Acceptance Criteria:**
- All integration tests pass
- Real database used (test DB)
- Cleanup after tests
- Tests are isolated

---

## Phase 3: Frontend Integration (Day 3)

#### 3.1 Update Frontend API Client ✓

**File:** `frontend/services/homepageApi.ts`

```typescript
// Update existing fetchHomepageData to use batch endpoint
static async fetchHomepageData(userId?: string): Promise<HomepageApiResponse> {
  try {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    params.append('limit', '10');

    const url = `${ENDPOINTS.HOMEPAGE}?${params.toString()}`;
    const response = await ApiClient.get<HomepageApiResponse>(url);

    return response;
  } catch (error) {
    console.error('Failed to fetch homepage data:', error);
    throw error;
  }
}
```

**Tasks:**
- [ ] Update API client to use batch endpoint
- [ ] Maintain backward compatibility
- [ ] Add error handling
- [ ] Update TypeScript types if needed

**Acceptance Criteria:**
- Frontend uses batch endpoint
- Old endpoint still available as fallback
- Types match backend response
- Errors handled gracefully

---

#### 3.2 Frontend Testing ✓

**Tasks:**
- [ ] Test on development environment
- [ ] Verify all sections load
- [ ] Verify partial failure handling
- [ ] Check performance metrics
- [ ] Test with slow network
- [ ] Test with authentication
- [ ] Test without authentication

**Acceptance Criteria:**
- All sections render correctly
- Performance improved
- No console errors
- Fallbacks work

---

## Phase 4: Deployment (Day 4)

#### 4.1 Staging Deployment ✓

**Tasks:**
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Check logs for errors
- [ ] Monitor performance metrics
- [ ] Test with staging frontend
- [ ] Get QA approval

**Acceptance Criteria:**
- Staging deployment successful
- No errors in logs
- Performance meets targets
- QA sign-off

---

#### 4.2 Production Deployment ✓

**Gradual Rollout Plan:**

**Step 1: 10% Traffic (2 hours)**
- [ ] Deploy to production
- [ ] Route 10% traffic to batch endpoint
- [ ] Monitor error rates
- [ ] Monitor performance
- [ ] Check cache hit rates

**Step 2: 50% Traffic (4 hours)**
- [ ] Increase to 50% traffic
- [ ] Continue monitoring
- [ ] Compare metrics with old endpoint
- [ ] Verify database load

**Step 3: 100% Traffic (24 hours)**
- [ ] Roll out to 100% traffic
- [ ] Monitor for 24 hours
- [ ] Track success metrics
- [ ] Document any issues

**Rollback Criteria:**
- Error rate >5%
- Response time >500ms (P95)
- Database connection issues
- Cache failures

**Acceptance Criteria:**
- Zero-downtime deployment
- No user-facing errors
- Performance targets met
- Rollback plan tested

---

## Phase 5: Monitoring & Optimization (Ongoing)

#### 5.1 Performance Monitoring ✓

**Metrics to Track:**

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Response Time (P50) | <200ms | >300ms |
| Response Time (P95) | <400ms | >500ms |
| Error Rate | <1% | >5% |
| Cache Hit Rate | >80% | <50% |
| Partial Failure Rate | <5% | >10% |

**Tools:**
- [ ] Set up Grafana dashboards
- [ ] Configure alerts
- [ ] Set up log aggregation
- [ ] Track business metrics

**Acceptance Criteria:**
- All metrics tracked
- Alerts configured
- Dashboards accessible
- On-call notified of issues

---

#### 5.2 Documentation ✓

**Documents to Create:**

- [ ] API documentation (OpenAPI)
- [ ] Frontend migration guide
- [ ] Runbook for operations
- [ ] Troubleshooting guide
- [ ] Performance optimization tips

**Acceptance Criteria:**
- All documents created
- Reviewed by team
- Published to wiki
- Accessible to all stakeholders

---

## Completion Criteria

### Definition of Done

- [ ] All code merged to main branch
- [ ] All tests passing (unit + integration)
- [ ] Code reviewed and approved
- [ ] Deployed to production
- [ ] Performance targets met
- [ ] Documentation complete
- [ ] Monitoring in place
- [ ] QA sign-off
- [ ] Product owner approval

### Success Metrics

- [ ] Response time reduced by 80%
- [ ] Network requests reduced from 6 to 1
- [ ] Cache hit rate >80%
- [ ] Zero downtime during deployment
- [ ] No critical bugs in production
- [ ] User satisfaction improved

---

## Appendix

### A. Useful Commands

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run specific test file
npm test homepageService.test.ts

# Check test coverage
npm run test:coverage

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production

# Monitor logs
npm run logs:tail

# Clear cache
redis-cli FLUSHDB
```

### B. Environment Variables

```bash
# .env
REDIS_URL=redis://localhost:6379
CACHE_TTL=300
QUERY_TIMEOUT=5000
ENABLE_CACHE_WARMING=true
CACHE_WARMING_INTERVAL=240000
```

### C. Troubleshooting

**Issue:** High response times
**Solution:** Check cache hit rate, optimize database queries, increase connection pool

**Issue:** Partial failures
**Solution:** Check individual section logs, verify database connectivity, check timeouts

**Issue:** Cache not working
**Solution:** Verify Redis connection, check cache keys, review TTL settings

---

**Document Version:** 1.0
**Last Updated:** 2025-11-14
**Owner:** Backend Team
**Status:** Ready for Implementation

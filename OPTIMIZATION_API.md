# API Optimization Report

## Executive Summary

This report identifies API optimization opportunities in the Rez backend, focusing on REST patterns consistency, pagination, caching, and data over-fetching issues.

---

## 1. Inconsistent REST Patterns

### 1.1 Mixed Naming Conventions (camelCase vs snake_case)

**Issue**: The codebase uses inconsistent field naming across routes and controllers.

**Evidence:**

| Location | Pattern Used |
|----------|--------------|
| `productRoutes.ts` (lines 799-813) | `price.current`, `price.original`, `rating.value` (camelCase nested) |
| `productController.ts` (lines 570-591) | `originalPrice`, `reviewCount` (snake_case) |
| `searchController.ts` (lines 540-568) | `storeId`, `storeName`, `cashbackAmount` (snake_case) |
| `offerController.ts` (lines 1299-1335) | `title`, `subtitle`, `viewCount` (mixed) |

**Recommendation**: Standardize on a single naming convention. Based on the codebase predominantly using camelCase for nested objects and snake_case for flat fields, document an official style guide.

---

### 1.2 Inconsistent Response Formats

**Issue**: Different response structures across similar endpoints.

**Examples:**

| Endpoint | Response Format |
|----------|------------------|
| `GET /products` (line 319) | `{ success, message, data, meta.pagination }` |
| `GET /offers/page-data` (lines 1169-1170) | `{ success, message, data.heroBanner, data.sections }` |
| `GET /search/global` (lines 931-935) | `{ success, message, data.query, data.results, data.totalResults }` |
| `GET /offers/homepage-deals-section` (lines 533-560) | `{ success, true, data, message }` - **different structure** |

**Critical Issue** (offerRoutes.ts lines 461-466):
```typescript
return res.json({
  success: true,
  data: null,
  message: 'Section not configured',
});
```
Returns `success: true` even when data is null - should be `success: false` or handle differently.

---

### 1.3 Different Error Formats

**Issue**: Inconsistent error response structures.

**Standard error format** (response.ts line 49-58):
```typescript
{
  success: false,
  message: string,
  errors?: Array<{ field?: string; message: string }>,
  meta: { timestamp: string }
}
```

**Non-standard error in storeRoutes.ts** (lines 474-478):
```typescript
return res.status(400).json({
  success: false,
  message: error.details[0].message  // Missing meta.timestamp
});
```

---

## 2. Missing Pagination

### 2.1 Endpoints Without Pagination

| Endpoint | Route File | Line | Current Limit | Issue |
|----------|-----------|------|---------------|-------|
| `GET /products/nearby` | productRoutes.ts | 129-143 | Hardcoded limit=20 | No `page` parameter |
| `GET /products/hot-deals` | productRoutes.ts | 145-155 | Hardcoded limit=20 | No `page` parameter |
| `GET /products/similar` | productRoutes.ts | 158-167 | Hardcoded limit=10 | No `page` parameter |
| `GET /products/category-section/:slug` | productRoutes.ts | 170-180 | Hardcoded limit=10 | No `page` parameter |
| `GET /offers/nearby` | offerRoutes.ts | 307-316 | Hardcoded limit=20 | No `page` parameter |
| `GET /offers/mega` | offerRoutes.ts | 280-286 | Hardcoded limit=10 | No `page` parameter |
| `GET /offers/students` | offerRoutes.ts | 289-295 | Hardcoded limit=10 | No `page` parameter |
| `GET /offers/new-arrivals` | offerRoutes.ts | 298-304 | Hardcoded limit=10 | No `page` parameter |

### 2.2 Missing Cursor-Based Pagination

**Issue**: Large collection endpoints should consider cursor-based pagination for better performance.

**Endpoints affected:**
- `GET /products` - Uses offset pagination
- `GET /offers` - Uses offset pagination
- `GET /search/history` - Uses offset pagination

---

## 3. Missing Caching

### 3.1 Endpoints Without Cache Headers

| Endpoint | Route File | Line | Notes |
|----------|-----------|------|-------|
| `GET /offers/featured` | offerRoutes.ts | 85-91 | No caching |
| `GET /offers/trending` | offerRoutes.ts | 94-100 | No caching |
| `GET /offers/mega` | offerRoutes.ts | 280-286 | No caching |
| `GET /offers/students` | offerRoutes.ts | 289-295 | No caching |
| `GET /offers/new-arrivals` | offerRoutes.ts | 298-304 | No caching |
| `GET /offers/bank-offers` | offerRoutes.ts | 429-439 | No caching |
| `GET /offers/exclusive-zones` | offerRoutes.ts | 630-633 | No caching |
| `GET /offers/special-profiles` | offerRoutes.ts | 648-651 | No caching |
| `GET /offers/discount-buckets` | offerRoutes.ts | 361-364 | No caching |

### 3.2 User-Specific Endpoints Without Cache Strategy

| Endpoint | Issue |
|----------|-------|
| `GET /offers/user/recommendations` | Personalized but not cached |
| `GET /search/history` | Could use short-term caching |
| `GET /offers/user/redemptions` | Could benefit from shorter cache TTL |

### 3.3 Inconsistent Cache TTLs

| Endpoint | Current TTL | Recommended TTL |
|----------|-------------|-----------------|
| `GET /products/nearby` | 300s (5min) | 600s (10min) |
| `GET /products/hot-deals` | 300s (5min) | 1800s (30min) |
| `GET /offers/featured` | No cache | 300s (5min) |
| `GET /offers/trending` | No cache | 300s (5min) |

---

## 4. Over-Fetching Issues

### 4.1 Excessive Field Selection

**productController.ts (lines 210-223)**:
```typescript
let productsQuery = Product.find(query)
  .populate('category', 'name slug')
  .populate('store', 'name logo location.city').lean();
```
- No explicit field selection for list views
- Could select fewer fields for better performance

**searchController.ts (lines 1734-1740)**:
```typescript
Product.find(productQuery)
  .select('_id name title price pricing image images brand store')
  .populate('store', 'name')
  .sort({ 'analytics.views': -1, 'analytics.purchases': -1 })
  .limit(5)
  .lean()
```
- Selecting all fields when only subset needed for autocomplete

### 4.2 Nested Population Over-Fetching

**offerController.ts (lines 810-816)**:
```typescript
.populate({
  path: 'item',
  model: 'Offer',
  populate: [
    { path: 'category', select: 'name slug' },
    { path: 'store', select: 'name logo location ratings' },
  ],
})
```
- Double population causes N+1 queries if not optimized
- Consider flattening the response or using aggregation pipeline

### 4.3 Analytics Data Included in List Responses

**productController.ts (line 211)** - Products include:
- `analytics.views`
- `analytics.purchases`
- `analytics.wishlistCount`

These are likely unnecessary for product listing pages.

---

## 5. Performance Recommendations

### 5.1 High Priority

1. **Add pagination to hot-deals and nearby endpoints**:
   ```typescript
   router.get('/hot-deals',
     validateQuery(Joi.object({
       limit: Joi.number().integer().min(1).max(50).default(20),
       page: Joi.number().integer().min(1).default(1)
     })),
     getHotDeals
   );
   ```

2. **Add caching to trending/featured offers**:
   ```typescript
   cacheMiddleware({ ttl: 300, keyPrefix: 'offers:featured', condition: () => true }),
   getFeaturedOffers
   ```

3. **Fix inconsistent response in offerRoutes.ts** (lines 461-466):
   ```typescript
   return res.json({
     success: false,  // Changed from true
     data: null,
     message: 'Section not configured',
   });
   ```

### 5.2 Medium Priority

1. **Standardize response format** - Create a unified response wrapper middleware
2. **Add field selection** to product list endpoints
3. **Document naming conventions** (camelCase vs snake_case)

### 5.3 Low Priority

1. **Consider cursor-based pagination** for high-volume endpoints
2. **Add response compression** middleware
3. **Implement API versioning** strategy

---

## 6. Summary Statistics

| Category | Issues Found |
|----------|--------------|
| Naming inconsistencies | 12+ |
| Response format inconsistencies | 8+ |
| Missing pagination | 9 endpoints |
| Missing cache headers | 12+ endpoints |
| Over-fetching patterns | 5+ |

---

## Appendix: Route Analysis Summary

### Well-Optimized Routes
- `GET /products` - Has pagination, caching, field selection
- `GET /products/search` - Has pagination, caching, field selection
- `GET /stores` - Has pagination, caching, field selection
- `GET /search/autocomplete` - Has caching, reasonable limits

### Routes Needing Optimization
- `GET /offers/*` - Multiple missing cache headers
- `GET /products/nearby` - Missing pagination
- `GET /products/hot-deals` - Missing pagination
- `GET /offers/homepage-deals-section` - Custom handler with inconsistent response

---

*Report generated: 2026-06-25*
*Focus areas: src/routes/, src/controllers/*

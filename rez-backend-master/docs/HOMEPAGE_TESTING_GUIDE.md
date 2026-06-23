# Homepage Endpoint - Testing Guide

## Implementation Status: ✅ COMPLETE

All files have been created and integrated successfully.

## Files Created

### 1. Service Layer
```
✅ src/services/homepageService.ts (14KB)
```
- Aggregates data from 10 different sources
- Parallel execution with Promise.all()
- Error handling for each section
- Performance logging

### 2. Controller Layer
```
✅ src/controllers/homepageController.ts (4.4KB)
```
- Request handling
- Query parameter parsing
- Cache headers
- Error handling

### 3. Route Layer
```
✅ src/routes/homepageRoutes.ts (1.5KB)
```
- Route definitions
- Validation middleware
- Optional authentication

### 4. Server Integration
```
✅ src/server.ts (modified)
```
- Routes registered at /api/homepage
- Added to health check endpoint

## Testing Steps

### Step 1: Start the Backend Server

**IMPORTANT**: You mentioned you will restart the backend yourself. Please restart the backend server now.

```bash
cd user-backend
npm run dev
```

**Expected Output**:
```
...
✅ Homepage routes registered at /api/homepage
...
🚀 REZ App Backend Server Started
```

### Step 2: Test Health Check

```bash
curl http://localhost:5001/health
```

**Expected**: Should include `"homepage": "/api/homepage"` in endpoints

### Step 3: Test Available Sections Endpoint

```bash
curl http://localhost:5001/api/homepage/sections
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Available homepage sections",
  "data": {
    "sections": [
      {
        "name": "featuredProducts",
        "description": "Featured products highlighted on homepage",
        "defaultLimit": 10
      },
      ...
    ]
  }
}
```

### Step 4: Test Main Homepage Endpoint

```bash
curl http://localhost:5001/api/homepage
```

**Expected Response Structure**:
```json
{
  "success": true,
  "message": "Homepage data retrieved successfully",
  "data": {
    "featuredProducts": [...],
    "newArrivals": [...],
    "featuredStores": [...],
    "trendingStores": [...],
    "upcomingEvents": [...],
    "megaOffers": [...],
    "studentOffers": [...],
    "categories": [...],
    "trendingVideos": [...],
    "latestArticles": [...],
    "_metadata": {
      "timestamp": "...",
      "requestedSections": [...],
      "successfulSections": [...],
      "failedSections": []
    }
  }
}
```

### Step 5: Test with Specific Sections

```bash
curl "http://localhost:5001/api/homepage?sections=featuredProducts,categories,trendingStores"
```

**Expected**: Only 3 sections (featuredProducts, categories, trendingStores) in response

### Step 6: Test with Custom Limit

```bash
curl "http://localhost:5001/api/homepage?limit=3"
```

**Expected**: Maximum 3 items in each section

### Step 7: Test with Location

```bash
curl "http://localhost:5001/api/homepage?location=28.7041,77.1025"
```

**Expected**: Same data (location support is for future use)

## Troubleshooting

### Issue: 404 Not Found

**Cause**: Routes not registered or server not restarted

**Solution**:
1. Check server logs for "✅ Homepage routes registered at /api/homepage"
2. Restart the backend server
3. Verify URL: `http://localhost:5001/api/homepage` (not `/homepage`)

### Issue: Empty Arrays in Response

**Cause**: No data in database

**Solution**:
1. Check if database has products, stores, events, offers, etc.
2. Run database seeding scripts if needed
3. Check server logs for specific errors

### Issue: Some Sections Empty

**Cause**: Partial failure (some data missing)

**Solution**:
1. Check `_errors` field in response
2. Review server logs for error details
3. Verify database has data for those sections

### Issue: Slow Response Time

**Cause**: Database not indexed or large dataset

**Solution**:
1. Check response headers for `X-Response-Time`
2. Review database indexes
3. Reduce limit parameter
4. Request fewer sections

## Performance Verification

Check the response headers:
```bash
curl -I http://localhost:5001/api/homepage
```

**Expected Headers**:
```
Cache-Control: public, max-age=300
X-Response-Time: 200-500ms
```

## Server Logs

Watch for these log messages:
```
🏠 [Homepage Service] Starting homepage data fetch...
🔄 [Homepage Service] Executing 10 queries in parallel...
✅ [Homepage Service] Fetched 8 featured products in 45ms
✅ [Homepage Service] Fetched 12 categories in 32ms
✅ [Homepage Service] Homepage data fetched in 234ms
   ✅ Successful sections: 10
   ❌ Failed sections: 0
🏠 [Homepage Controller] Request params: { userId: 'anonymous', ... }
✅ [Homepage Controller] Response sent in 240ms
   Sections returned: 10
   Total items: 67
```

## Database Verification

Ensure your database has:
- [ ] Products with `isFeatured: true`
- [ ] Products created in last 30 days
- [ ] Stores with `isFeatured: true`
- [ ] Stores with analytics data
- [ ] Events with `status: 'upcoming'`
- [ ] Offers with `category: 'mega'` or `'student'`
- [ ] Active categories
- [ ] Videos with views/likes
- [ ] Published articles

## Frontend Integration Test

Once backend is working, test from frontend:

```typescript
// Test in browser console or React Native app
fetch('http://localhost:5001/api/homepage')
  .then(res => res.json())
  .then(data => {
    console.log('Featured Products:', data.data.featuredProducts?.length);
    console.log('Categories:', data.data.categories?.length);
    console.log('All sections:', Object.keys(data.data).filter(k => !k.startsWith('_')));
  });
```

## Production Checklist

Before deploying to production:
- [ ] Backend server restarted successfully
- [ ] All test curl commands pass
- [ ] Response times acceptable (<500ms)
- [ ] Database has sufficient data
- [ ] No errors in server logs
- [ ] Frontend can fetch and display data
- [ ] Cache headers working
- [ ] Error handling tested

## Next Steps

1. ✅ Backend implementation complete
2. ⏳ **RESTART BACKEND SERVER** (you will do this)
3. ⏳ Test endpoints with curl commands above
4. ⏳ Verify data quality and performance
5. ⏳ Integrate with frontend
6. ⏳ Monitor performance in production

## Support

If you encounter any issues:
1. Check server logs for error details
2. Verify database connection and data
3. Review `HOMEPAGE_ENDPOINT_IMPLEMENTATION.md` for full documentation
4. Check `HOMEPAGE_QUICK_START.md` for quick reference

## Implementation Complete ✅

All backend files have been created and integrated. The endpoint is ready for testing once the server is restarted.

**Endpoint**: `GET /api/homepage`
**Status**: ✅ Ready for Testing
**Next Step**: Restart backend server and run curl tests

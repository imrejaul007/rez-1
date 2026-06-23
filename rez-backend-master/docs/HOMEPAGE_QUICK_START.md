# Homepage Endpoint - Quick Start Guide

## TL;DR
New batch endpoint to fetch all homepage data in one request.

**Endpoint**: `GET /api/homepage`

**Example**:
```bash
curl http://localhost:5001/api/homepage
```

## Files Created
1. `src/services/homepageService.ts` - Data aggregation logic
2. `src/controllers/homepageController.ts` - Request handler
3. `src/routes/homepageRoutes.ts` - Route definitions

## Files Modified
1. `src/server.ts` - Registered new route

## Quick Test Commands

### 1. Basic Request (All Data)
```bash
curl http://localhost:5001/api/homepage
```

### 2. Specific Sections Only
```bash
curl "http://localhost:5001/api/homepage?sections=featuredProducts,categories"
```

### 3. Custom Limit
```bash
curl "http://localhost:5001/api/homepage?limit=5"
```

### 4. With Location
```bash
curl "http://localhost:5001/api/homepage?location=28.7041,77.1025"
```

### 5. Get Available Sections
```bash
curl http://localhost:5001/api/homepage/sections
```

## Frontend Integration

### Simple Fetch
```typescript
const response = await fetch('http://localhost:5001/api/homepage');
const data = await response.json();

console.log(data.data.featuredProducts);
console.log(data.data.categories);
```

### With API Client
```typescript
import { apiClient } from '../services/apiClient';

const { data } = await apiClient.get('/homepage');
// Use data.featuredProducts, data.categories, etc.
```

## Available Data Sections

| Section | Items | Description |
|---------|-------|-------------|
| `featuredProducts` | 10 | Featured products |
| `newArrivals` | 10 | New products |
| `featuredStores` | 8 | Top stores |
| `trendingStores` | 8 | Popular stores |
| `upcomingEvents` | 6 | Future events |
| `megaOffers` | 5 | Big deals |
| `studentOffers` | 5 | Student deals |
| `categories` | 12 | All categories |
| `trendingVideos` | 6 | Popular videos |
| `latestArticles` | 4 | Recent articles |

## Response Structure
```json
{
  "success": true,
  "data": {
    "featuredProducts": [/* array of products */],
    "categories": [/* array of categories */],
    "trendingStores": [/* array of stores */],
    // ... other sections
    "_metadata": {
      "timestamp": "2025-11-14T10:30:00Z",
      "successfulSections": ["featuredProducts", "categories", ...],
      "failedSections": []
    }
  }
}
```

## Performance
- ⚡ All queries run in parallel
- 🚀 ~200-500ms response time
- 💾 5-minute cache headers
- 🔄 Partial failure support

## Next Steps
1. ✅ Backend implemented
2. ⏳ Test with curl commands above
3. ⏳ Update frontend to use new endpoint
4. ⏳ Remove individual API calls
5. ⏳ Monitor performance

## Need Help?
See full documentation: `HOMEPAGE_ENDPOINT_IMPLEMENTATION.md`

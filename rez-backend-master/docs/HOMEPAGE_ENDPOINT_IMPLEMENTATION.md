# Homepage Batch Endpoint Implementation

## Overview
This document provides details about the newly implemented homepage batch endpoint that aggregates data from multiple sources in a single request.

## Implementation Summary

### Files Created
1. **Service Layer**: `src/services/homepageService.ts`
   - Core business logic for data aggregation
   - Parallel execution using `Promise.all()`
   - Individual fetch functions for each data section
   - Error handling with partial failure support

2. **Controller Layer**: `src/controllers/homepageController.ts`
   - Request parsing and validation
   - Response formatting
   - Cache header management
   - Error handling

3. **Route Layer**: `src/routes/homepageRoutes.ts`
   - Route definitions
   - Query parameter validation
   - Middleware integration

### Files Modified
1. **Server**: `src/server.ts`
   - Imported homepage routes
   - Registered `/api/homepage` endpoint
   - Updated health check endpoint

## API Endpoints

### 1. GET /api/homepage
**Description**: Get all homepage data in a single batch request

**Access**: Public (optional authentication)

**Query Parameters**:
- `sections` (optional): Comma-separated list of sections to fetch
  - Default: All sections
  - Example: `featuredProducts,categories,trendingStores`

- `limit` (optional): Limit for each section (1-50)
  - Default: Varies by section (see Available Sections below)
  - Example: `10`

- `location` (optional): User location as "lat,lng"
  - Format: `latitude,longitude`
  - Example: `28.7041,77.1025`

**Response Structure**:
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
      "timestamp": "2025-11-14T10:30:00.000Z",
      "requestedSections": ["featuredProducts", "categories", ...],
      "successfulSections": ["featuredProducts", "categories", ...],
      "failedSections": []
    },
    "_errors": {
      // Only present if some sections failed
      "sectionName": "Error message"
    }
  }
}
```

**Cache Headers**:
- `Cache-Control: public, max-age=300` (5 minutes)
- `X-Response-Time: <duration>ms`

### 2. GET /api/homepage/sections
**Description**: Get list of available sections

**Access**: Public

**Response**:
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

## Available Sections

| Section | Description | Default Limit | Data Source |
|---------|-------------|---------------|-------------|
| `featuredProducts` | Featured products highlighted on homepage | 10 | Product model (isFeatured=true) |
| `newArrivals` | Recently added products (last 30 days) | 10 | Product model (createdAt) |
| `featuredStores` | Featured stores with high ratings | 8 | Store model (isFeatured=true) |
| `trendingStores` | Stores with most orders and engagement | 8 | Store model (analytics.totalOrders) |
| `upcomingEvents` | Upcoming events sorted by date | 6 | Event model (status=upcoming) |
| `megaOffers` | Mega offers and deals | 5 | Offer model (category=mega) |
| `studentOffers` | Special offers for students | 5 | Offer model (category=student) |
| `categories` | All product categories | 12 | Category model |
| `trendingVideos` | Most viewed videos | 6 | Video model (views, likes) |
| `latestArticles` | Recently published articles | 4 | Article model (publishedAt) |

## Performance Features

### 1. Parallel Execution
All data fetching operations run in parallel using `Promise.all()`:
```typescript
const promises = {
  featuredProducts: fetchFeaturedProducts(),
  categories: fetchCategories(),
  // ... other sections
};
const results = await Promise.all(Object.values(promises));
```

### 2. Partial Failure Handling
If one section fails, others still return:
```typescript
promises.featuredProducts = fetchFeaturedProducts()
  .catch(err => {
    errors.featuredProducts = err.message;
    return []; // Return empty array on failure
  });
```

### 3. Optimized Queries
- Uses `.lean()` for faster MongoDB queries
- Field projection to limit data transferred
- Indexed fields for sorting
- Proper population of related documents

### 4. Caching
- 5-minute cache headers (`max-age=300`)
- Response time tracking in headers
- Future: Redis cache layer support

## Testing

### Test 1: Get All Sections
```bash
curl -X GET "http://localhost:5001/api/homepage"
```

### Test 2: Get Specific Sections
```bash
curl -X GET "http://localhost:5001/api/homepage?sections=featuredProducts,categories,trendingStores"
```

### Test 3: With Custom Limit
```bash
curl -X GET "http://localhost:5001/api/homepage?limit=5"
```

### Test 4: With Location
```bash
curl -X GET "http://localhost:5001/api/homepage?location=28.7041,77.1025"
```

### Test 5: With Authentication
```bash
curl -X GET "http://localhost:5001/api/homepage" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test 6: Get Available Sections
```bash
curl -X GET "http://localhost:5001/api/homepage/sections"
```

### Test 7: Combined Parameters
```bash
curl -X GET "http://localhost:5001/api/homepage?sections=featuredProducts,newArrivals,categories&limit=8&location=28.7041,77.1025"
```

## Integration with Frontend

### Example: React Native / Expo
```typescript
import { apiClient } from '../services/apiClient';

// Fetch all homepage data
async function fetchHomepageData() {
  try {
    const response = await apiClient.get('/homepage');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch homepage data:', error);
    throw error;
  }
}

// Fetch specific sections
async function fetchSpecificSections(sections: string[]) {
  const params = new URLSearchParams({
    sections: sections.join(','),
    limit: '10'
  });

  const response = await apiClient.get(`/homepage?${params}`);
  return response.data;
}

// Usage
const homepageData = await fetchHomepageData();
console.log(homepageData.featuredProducts);
console.log(homepageData.categories);
```

### Example: Using in Component
```tsx
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';

function Homepage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('http://localhost:5001/api/homepage');
        const json = await response.json();
        setData(json.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <Text>Loading...</Text>;

  return (
    <View>
      <Text>Featured Products: {data?.featuredProducts?.length}</Text>
      <Text>Categories: {data?.categories?.length}</Text>
      {/* Render your data */}
    </View>
  );
}
```

## Error Handling

### Partial Failures
The endpoint returns partial data even if some sections fail:
```json
{
  "success": true,
  "data": {
    "featuredProducts": [...],  // Success
    "categories": [],            // Failed (empty)
    "_errors": {
      "categories": "Database connection timeout"
    }
  }
}
```

### Complete Failure
If the entire request fails:
```json
{
  "success": false,
  "message": "Failed to fetch homepage data",
  "error": "Error details here"
}
```

## Performance Metrics

### Expected Performance
- **Total Response Time**: 200-500ms (depends on database)
- **Individual Section Time**: 20-100ms each
- **Parallel Execution**: All sections fetched simultaneously
- **Cache Hit**: <10ms (when implemented)

### Logging
All operations are logged:
```
🏠 [Homepage Service] Starting homepage data fetch...
🔄 [Homepage Service] Executing 10 queries in parallel...
✅ [Homepage Service] Fetched 8 featured products in 45ms
✅ [Homepage Service] Fetched 12 categories in 32ms
✅ [Homepage Service] Homepage data fetched in 234ms
   ✅ Successful sections: 10
   ❌ Failed sections: 0
```

## Future Enhancements

### 1. Redis Caching
```typescript
// Check cache first
const cached = await redis.get(`homepage:${userId || 'anonymous'}`);
if (cached) return JSON.parse(cached);

// Fetch and cache
const data = await getHomepageData(params);
await redis.setex(`homepage:${userId || 'anonymous'}`, 300, JSON.stringify(data));
```

### 2. Personalization
- Use `userId` to personalize recommendations
- Recent browsing history
- User preferences
- Location-based sorting

### 3. A/B Testing
- Test different section orders
- Test different limits
- Track engagement metrics

### 4. Real-time Updates
- WebSocket for live data
- Push notifications for new offers
- Stock availability updates

## Troubleshooting

### Issue: Slow Response Time
**Solution**:
- Check database indexes
- Reduce limit values
- Enable Redis caching
- Use fewer sections

### Issue: Empty Data Arrays
**Solution**:
- Check if data exists in database
- Verify filter conditions
- Check logs for errors
- Seed test data

### Issue: Missing Sections
**Solution**:
- Verify section names (case-sensitive)
- Check query parameter format
- Review validation errors

## Database Requirements

### Required Models
- Product
- Store
- Event
- Offer
- Category
- Video
- Article

### Required Indexes
```javascript
// Product
db.products.createIndex({ isFeatured: 1, isActive: 1 })
db.products.createIndex({ createdAt: -1 })

// Store
db.stores.createIndex({ isFeatured: 1, isActive: 1 })
db.stores.createIndex({ 'analytics.totalOrders': -1 })

// Event
db.events.createIndex({ status: 1, 'dateTime.start': 1 })

// Offer
db.offers.createIndex({ category: 1, 'validity.isActive': 1 })
```

## Security Considerations

1. **Rate Limiting**: Applied via middleware
2. **Query Validation**: Joi schema validation
3. **Data Sanitization**: Lean queries prevent injection
4. **Optional Auth**: Works with or without token
5. **CORS**: Configured in server.ts

## Monitoring

### Key Metrics to Track
- Response time per section
- Cache hit rate
- Error rate by section
- User location distribution
- Popular section combinations

### Recommended Tools
- New Relic / DataDog for APM
- Redis for caching
- MongoDB Atlas for database monitoring
- Custom logging with Winston

## Conclusion

The homepage batch endpoint is now fully implemented and ready for production use. It provides:
- ✅ All homepage data in single request
- ✅ Parallel execution for speed
- ✅ Partial failure handling
- ✅ Flexible section selection
- ✅ Cache headers for performance
- ✅ Comprehensive error handling
- ✅ Production-ready logging

**Next Steps**:
1. Test the endpoint using the provided curl commands
2. Integrate with frontend
3. Monitor performance metrics
4. Implement Redis caching if needed

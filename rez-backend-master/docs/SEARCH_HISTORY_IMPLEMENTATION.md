# Search History Tracking System - Implementation Summary

## Overview

A comprehensive search history tracking feature has been implemented for the Rez App backend. This system tracks user search queries for personalization, analytics, and autocomplete suggestions.

---

## 📁 Files Created/Modified

### New Files Created

1. **`src/models/SearchHistory.ts`** - MongoDB model for search history
2. **`src/services/searchHistoryService.ts`** - Service layer for async logging
3. **`SEARCH_HISTORY_IMPLEMENTATION.md`** - This documentation file

### Modified Files

1. **`src/controllers/searchController.ts`** - Added history endpoints
2. **`src/routes/searchRoutes.ts`** - Added history routes
3. **`src/controllers/productController.ts`** - Integrated search logging
4. **`src/controllers/storeController.ts`** - Integrated search logging

---

## 🗄️ Database Schema

### SearchHistory Model

```typescript
{
  user: ObjectId,              // Reference to User (indexed)
  query: string,               // Search query (lowercase, indexed)
  type: 'product' | 'store' | 'general',
  resultCount: number,         // Number of results returned
  clicked: boolean,            // Whether user clicked any result
  filters: {                   // Applied filters
    category?: string,
    minPrice?: number,
    maxPrice?: number,
    rating?: number,
    location?: string,
    tags?: string[]
  },
  clickedItem?: {              // Item that was clicked
    id: ObjectId,
    type: 'product' | 'store'
  },
  createdAt: Date              // Auto-indexed, TTL 30 days
}
```

### Indexes

- `{ user: 1, createdAt: -1 }` - Fast user history queries
- `{ user: 1, query: 1, createdAt: -1 }` - Deduplicate searches
- `{ user: 1, type: 1, createdAt: -1 }` - Type-specific queries
- `{ createdAt: 1 }` - TTL index (auto-delete after 30 days)

### Features

- **Auto-cleanup**: Entries older than 30 days are automatically deleted
- **User limit**: Maximum 50 entries per user (oldest deleted)
- **Deduplication**: Identical searches within 5 minutes are skipped

---

## 🔌 API Endpoints

### 1. Save Search History

**POST** `/api/search/history`

**Access**: Protected (requires authentication)

**Request Body**:
```json
{
  "query": "pizza",
  "type": "product",
  "resultCount": 15,
  "filters": {
    "category": "food",
    "minPrice": 10,
    "maxPrice": 50
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "user": "507f191e810c19729de860ea",
    "query": "pizza",
    "type": "product",
    "resultCount": 15,
    "clicked": false,
    "filters": { ... },
    "createdAt": "2025-01-18T10:30:00Z"
  },
  "message": "Search history saved successfully"
}
```

---

### 2. Get Search History

**GET** `/api/search/history`

**Access**: Protected

**Query Parameters**:
- `type` - Filter by type: product, store, general (optional)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20, max: 100)
- `includeClicked` - Include clicked searches (default: true)

**Example**: `GET /api/search/history?type=product&limit=10`

**Response**:
```json
{
  "success": true,
  "data": {
    "searches": [
      {
        "_id": "...",
        "query": "pizza",
        "type": "product",
        "resultCount": 15,
        "clicked": false,
        "createdAt": "2025-01-18T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

---

### 3. Get Popular Searches

**GET** `/api/search/history/popular`

**Access**: Protected

**Query Parameters**:
- `limit` - Maximum results (default: 10, max: 20)
- `type` - Filter by type (optional)

**Example**: `GET /api/search/history/popular?limit=5`

**Response**:
```json
{
  "success": true,
  "data": {
    "searches": [
      {
        "query": "pizza",
        "type": "product",
        "count": 15,
        "lastSearched": "2025-01-18T10:30:00Z",
        "avgResultCount": 12.5,
        "clickRate": 0.67
      }
    ],
    "count": 5
  }
}
```

---

### 4. Get Recent Searches

**GET** `/api/search/history/recent`

**Access**: Protected

**Query Parameters**:
- `limit` - Maximum results (default: 5, max: 10)
- `type` - Filter by type (optional)

**Use Case**: Autocomplete dropdown showing recent searches

**Response**:
```json
{
  "success": true,
  "data": {
    "searches": [
      {
        "query": "pizza",
        "type": "product",
        "lastSearched": "2025-01-18T10:30:00Z",
        "resultCount": 15
      }
    ],
    "count": 5
  }
}
```

---

### 5. Get Search Analytics

**GET** `/api/search/history/analytics`

**Access**: Protected

**Response**:
```json
{
  "success": true,
  "data": {
    "totalSearches": 150,
    "searchesByType": [
      { "type": "product", "count": 100 },
      { "type": "store", "count": 50 }
    ],
    "clickRate": 45.5,
    "avgResultCount": 12.3,
    "topSearches": [
      { "query": "pizza", "count": 25, "avgResults": 15 }
    ]
  }
}
```

---

### 6. Mark Search as Clicked

**PATCH** `/api/search/history/:id/click`

**Access**: Protected

**Request Body**:
```json
{
  "itemId": "507f191e810c19729de860ea",
  "itemType": "product"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "clicked": true,
    "clickedItem": {
      "id": "507f191e810c19729de860ea",
      "type": "product"
    }
  },
  "message": "Search marked as clicked"
}
```

---

### 7. Delete Search History Entry

**DELETE** `/api/search/history/:id`

**Access**: Protected

**Response**:
```json
{
  "success": true,
  "data": null,
  "message": "Search history deleted successfully"
}
```

---

### 8. Clear All Search History

**DELETE** `/api/search/history`

**Access**: Protected

**Query Parameters**:
- `type` - Clear only specific type (optional)

**Example**: `DELETE /api/search/history?type=product`

**Response**:
```json
{
  "success": true,
  "data": {
    "deletedCount": 45
  },
  "message": "Search history cleared successfully"
}
```

---

## 🔧 Service Layer

### searchHistoryService.ts

Provides async logging functions that don't block API responses.

#### Functions

```typescript
// Log product search (async, non-blocking)
logProductSearch(userId, query, resultCount, filters?)

// Log store search (async, non-blocking)
logStoreSearch(userId, query, resultCount, filters?)

// Log general search (async, non-blocking)
logGeneralSearch(userId, query, resultCount)

// Get search suggestions for autocomplete
getSearchSuggestions(userId, type?, limit?)

// Cleanup old searches (cron job)
cleanupOldSearches(daysToKeep?)
```

#### Usage Example

```typescript
// In productController.ts
import { logProductSearch } from '../services/searchHistoryService';

// After search query executes
if (req.user && search) {
  logProductSearch(
    req.user._id,
    search,
    totalProducts,
    { category, minPrice, maxPrice, rating }
  ).catch(err => console.error('Failed to log search:', err));
}
```

---

## 🔄 Integration Points

### Product Search (productController.ts)

- **Endpoint**: `GET /api/products`
- **When**: User performs search with `?search=query`
- **Logged**: Query, result count, filters (category, price, rating)
- **Async**: Yes (doesn't block response)

### Store Search (storeController.ts)

- **Endpoint**: `GET /api/stores`
- **When**: User performs search with `?search=query`
- **Logged**: Query, result count, filters (category, location, rating, tags)
- **Async**: Yes (doesn't block response)

### Global Search (searchController.ts)

- **Endpoint**: `GET /api/search/global`
- **Future**: Can be integrated to log multi-type searches
- **Type**: 'general'

---

## ⚡ Performance Optimizations

### 1. Async Logging
- Uses `setImmediate()` to defer logging
- Doesn't block API responses
- Errors are logged but don't affect user experience

### 2. Deduplication
- Checks for identical searches within 5-minute window
- Prevents spam and reduces database writes

### 3. Auto Cleanup
- MongoDB TTL index auto-deletes entries after 30 days
- Per-user limit of 50 entries (oldest deleted first)
- Cron job option for manual cleanup

### 4. Efficient Indexes
- Compound indexes for fast user queries
- Index on `createdAt` for time-based queries
- Index on `query` for autocomplete

### 5. Aggregation Pipelines
- Used for analytics and popular searches
- Efficient grouping and sorting
- Minimal data transfer

---

## 🎯 Use Cases

### 1. Search Autocomplete
Show user's recent searches in dropdown:
```
GET /api/search/history/recent?limit=5
```

### 2. Personalized Suggestions
Show frequently searched terms:
```
GET /api/search/history/popular?limit=10
```

### 3. Search Analytics Dashboard
Display user's search behavior:
```
GET /api/search/history/analytics
```

### 4. Search History Management
Allow users to view and clear history:
```
GET /api/search/history
DELETE /api/search/history/:id
DELETE /api/search/history
```

### 5. Click-Through Rate Tracking
Track which searches lead to clicks:
```
PATCH /api/search/history/:id/click
```

---

## 🧪 Testing

### Manual Testing

1. **Save Search**:
```bash
curl -X POST http://localhost:5000/api/search/history \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "pizza", "type": "product", "resultCount": 15}'
```

2. **Get History**:
```bash
curl http://localhost:5000/api/search/history \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. **Get Recent**:
```bash
curl http://localhost:5000/api/search/history/recent?limit=5 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

4. **Clear History**:
```bash
curl -X DELETE http://localhost:5000/api/search/history \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Integration Testing

Test that search logging works:

1. Perform product search: `GET /api/products?search=pizza`
2. Check history: `GET /api/search/history`
3. Verify entry was created with correct data

---

## 📊 Analytics Insights

The system provides valuable analytics:

1. **Most searched terms** - Popular products/stores
2. **Search patterns** - Time of day, frequency
3. **Click-through rate** - Which searches lead to conversions
4. **Failed searches** - Queries with 0 results (improve inventory)
5. **Filter usage** - Most used filters (improve UI)

---

## 🔒 Security & Privacy

1. **User ownership** - Users can only access their own history
2. **Authentication** - All endpoints require valid auth token
3. **Data retention** - Auto-delete after 30 days
4. **User control** - Users can delete history anytime
5. **No sensitive data** - Only search terms are stored

---

## 🚀 Future Enhancements

1. **Trending searches** - Global trending queries
2. **Search suggestions** - AI-powered query suggestions
3. **Voice search** - Track voice queries separately
4. **Search filters** - Track filter combinations
5. **A/B testing** - Test different search algorithms
6. **Machine learning** - Predict search intent

---

## 📝 Notes

- Search history is tied to authenticated users only
- Anonymous searches are not logged
- Logging is async and never blocks responses
- Failed logging attempts are logged but ignored
- Maximum 50 entries per user (configurable)
- Duplicate searches within 5 minutes are skipped
- Auto-cleanup after 30 days via TTL index

---

## 🎉 Implementation Complete!

The search history tracking feature is now fully integrated and production-ready.

**Backend Status**: ✅ Complete
**Endpoints**: ✅ 8 endpoints implemented
**Integration**: ✅ Product & Store controllers
**Documentation**: ✅ Complete

For questions or issues, refer to the code comments or this documentation.

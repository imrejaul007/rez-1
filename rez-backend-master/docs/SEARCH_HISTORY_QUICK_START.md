# Search History - Quick Start Guide

## 🚀 Quick Reference

### Schema Definition
```typescript
// src/models/SearchHistory.ts
{
  user: ObjectId (indexed),
  query: string (lowercase, indexed),
  type: 'product' | 'store' | 'general',
  resultCount: number,
  clicked: boolean,
  filters: { category?, minPrice?, maxPrice?, rating?, location?, tags? },
  clickedItem: { id: ObjectId, type: 'product' | 'store' }?,
  createdAt: Date (TTL: 30 days)
}
```

---

## 📍 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/search/history` | Save search query |
| GET | `/api/search/history` | Get user's history |
| GET | `/api/search/history/popular` | Get popular searches |
| GET | `/api/search/history/recent` | Get recent searches |
| GET | `/api/search/history/analytics` | Get analytics |
| PATCH | `/api/search/history/:id/click` | Mark as clicked |
| DELETE | `/api/search/history/:id` | Delete entry |
| DELETE | `/api/search/history` | Clear all history |

---

## 💻 Usage Examples

### Frontend Integration

```typescript
// Save search when user searches
async function handleSearch(query: string) {
  // Perform search
  const results = await searchProducts(query);

  // Log search history (async, fire-and-forget)
  fetch('/api/search/history', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: query,
      type: 'product',
      resultCount: results.total
    })
  }).catch(console.error); // Don't block UI on error
}
```

### Show Recent Searches in Autocomplete

```typescript
// Get recent searches for autocomplete
async function getRecentSearches() {
  const response = await fetch('/api/search/history/recent?limit=5', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { data } = await response.json();
  return data.searches.map(s => s.query);
}

// Display in autocomplete dropdown
<Autocomplete>
  <RecentSearches searches={recentSearches} />
  <SearchResults results={liveResults} />
</Autocomplete>
```

### Track Clicks

```typescript
// When user clicks a search result
async function handleResultClick(searchId: string, productId: string) {
  fetch(`/api/search/history/${searchId}/click`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      itemId: productId,
      itemType: 'product'
    })
  }).catch(console.error);
}
```

---

## 🔧 Backend Integration

### Already Integrated In:

✅ **Product Search** (`src/controllers/productController.ts`)
- Automatically logs when `?search=` param is used
- Includes filters: category, price range, rating

✅ **Store Search** (`src/controllers/storeController.ts`)
- Automatically logs when `?search=` param is used
- Includes filters: category, location, rating, tags

### How It Works:

```typescript
// Automatic logging in productController.ts
if (req.user && search) {
  logProductSearch(
    req.user._id,
    search,
    totalProducts,
    { category, minPrice, maxPrice, rating }
  ).catch(err => console.error('Failed to log search:', err));
}
// ⬆️ Async, non-blocking, errors don't affect response
```

---

## 🎯 Key Features

1. **Automatic Logging** - Integrated into search endpoints
2. **Async/Non-blocking** - Never slows down API responses
3. **Deduplication** - Skips identical searches within 5 minutes
4. **Auto Cleanup** - Entries older than 30 days deleted automatically
5. **User Limit** - Max 50 entries per user
6. **Privacy** - Users can delete history anytime

---

## 📊 Analytics Dashboard Example

```typescript
// Get analytics for dashboard
async function getSearchAnalytics() {
  const response = await fetch('/api/search/history/analytics', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { data } = await response.json();

  return {
    totalSearches: data.totalSearches,
    clickRate: data.clickRate,
    topSearches: data.topSearches,
    searchesByType: data.searchesByType
  };
}

// Display in UI
<Analytics>
  <Stat label="Total Searches" value={totalSearches} />
  <Stat label="Click Rate" value={`${clickRate}%`} />
  <TopSearches searches={topSearches} />
</Analytics>
```

---

## 🧪 Testing

### Test Search Logging:

```bash
# 1. Perform a product search
curl "http://localhost:5000/api/products?search=pizza" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Check if search was logged
curl "http://localhost:5000/api/search/history" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should see entry with query="pizza", type="product"
```

### Test History Endpoints:

```bash
# Get recent searches
curl "http://localhost:5000/api/search/history/recent?limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get popular searches
curl "http://localhost:5000/api/search/history/popular?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get analytics
curl "http://localhost:5000/api/search/history/analytics" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Clear history
curl -X DELETE "http://localhost:5000/api/search/history" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ⚠️ Important Notes

- Only authenticated users' searches are logged
- Anonymous searches are NOT logged
- Logging errors are logged but don't break API
- Maximum 50 entries per user (oldest auto-deleted)
- Entries auto-delete after 30 days
- Duplicate searches within 5 min are skipped

---

## 🔍 Troubleshooting

**Search not being logged?**
- Check user is authenticated (`req.user` exists)
- Check `search` query param is present
- Check console logs for async errors

**Too many entries?**
- User limit is 50 (oldest auto-deleted)
- Can adjust in `searchHistoryService.ts`

**Old entries not deleting?**
- MongoDB TTL index deletes after 30 days
- Can manually run cleanup: `cleanupOldSearches(30)`

---

## 📚 Further Reading

- Full documentation: `SEARCH_HISTORY_IMPLEMENTATION.md`
- Model code: `src/models/SearchHistory.ts`
- Service code: `src/services/searchHistoryService.ts`
- Controller code: `src/controllers/searchController.ts`

---

**Status**: ✅ Production Ready
**Version**: 1.0.0
**Last Updated**: 2025-01-18

# Search Functionality - Quick Reference Guide

## Quick Start

### How Search Works Now

```
User types → Debounce (300ms) → Check Cache → Call Backend API → Display Results
                                      ↓
                                 Save to Cache & History
```

---

## API Endpoints Used

### Products Search
```typescript
GET /products/search?q={query}&page=1&limit=20

// With filters
GET /products/search?q=iphone&category=electronics&minPrice=10000&maxPrice=50000&rating=4
```

### Stores Search
```typescript
GET /stores/search?q={query}&page=1&limit=5

// Advanced search
GET /stores/search/advanced?search=pizza&category=fastDelivery&rating=4
```

### Categories
```typescript
GET /categories?featured=true
```

### Suggestions (Not Yet Implemented)
```typescript
GET /search/suggestions?q={query}
// Currently returns empty array, uses local history instead
```

---

## Key Components

### 1. Search Page (`app/search.tsx`)
Main search interface

**Key Features:**
- Real-time search
- Filter modal
- Category browsing
- Recent searches
- Empty states
- Error handling

### 2. Search Hook (`hooks/useSearchPage.ts`)
Manages search state and logic

**Key Functions:**
```typescript
actions.performSearch(query)        // Execute search
actions.loadSuggestions(query)      // Load suggestions
actions.applyFilters(filters)       // Apply filters
actions.clearSearchHistory()        // Clear history
```

### 3. Search Service (`services/searchApi.ts`)
API communication layer

**Methods:**
```typescript
searchService.searchProducts(params)
searchService.searchStores(params)
searchService.advancedStoreSearch(params)
searchService.getSearchSuggestions(query)
```

---

## Common Tasks

### Add a New Filter

1. **Update FilterState** in `components/search/FilterModal.tsx`:
```typescript
export interface FilterState {
  priceRange: { min: number; max: number };
  rating: number | null;
  categories: string[];
  inStock: boolean;
  cashbackMin: number;
  // Add new filter here
  newFilter: string;
}
```

2. **Add UI** in FilterModal component
3. **Map to API params** in `handleApplyFilters()`

### Track a New Event

```typescript
import { searchAnalyticsService } from '@/services/searchAnalyticsService';

// Track custom event
await searchAnalyticsService.trackCustomEvent('event-name', {
  query: 'search query',
  additionalData: 'value'
});
```

### Add a Search Shortcut

In `app/search.tsx`, add to categories section:
```typescript
<TouchableOpacity onPress={() => {
  actions.handleSearchChange('your query');
  actions.handleSearchSubmit('your query');
}}>
  <Text>Quick Search: Your Query</Text>
</TouchableOpacity>
```

---

## Debugging

### Check Search Cache
```typescript
import { searchCacheService } from '@/services/searchCacheService';

// Get cached result
const cached = await searchCacheService.getFromCache('iphone');
console.log('Cached:', cached);
```

### Check Search History
```typescript
import { searchHistoryService } from '@/services/searchHistoryService';

// Get all history
const history = await searchHistoryService.getHistory();
console.log('History:', history);
```

### Enable Debug Logs
Backend API calls automatically log to console:
```
🔍 [SEARCH API] Searching products: { q: 'iphone' }
🔍 [SEARCH API] Searching stores: { q: 'pizza' }
```

---

## Testing Search

### Test Cases

```typescript
// 1. Empty search
handleSearchChange('');
// Expected: Shows recent searches or empty state

// 2. Single character
handleSearchChange('i');
// Expected: Shows hint to type more

// 3. Valid search
handleSearchChange('iphone');
// Expected: Shows suggestions after 300ms, then results

// 4. No results
handleSearchChange('xyzabc123');
// Expected: Shows "No results found" with suggestions

// 5. Network error
// Turn off network
handleSearchChange('test');
// Expected: Shows error message with retry button

// 6. Apply filter
handleApplyFilters({ categories: ['electronics'] });
// Expected: Re-searches with filter applied

// 7. Clear filters
handleClearFilters();
// Expected: Re-searches without filters
```

### Manual Testing

```bash
# Start app
npm start

# Navigate to search
# Press search icon in header

# Test scenarios:
1. Type "iphone" → Wait 300ms → See results
2. Click filter icon → Apply filters → See filtered results
3. Click category → Navigate to category page
4. Click result → Navigate to product/store page
5. Clear search → See recent searches
6. Type and delete → See recent searches
7. Search same query twice → Second should be instant (cached)
```

---

## Performance Tips

### 1. Reduce API Calls
```typescript
// Bad: Search on every keystroke
onChange={text => performSearch(text)}

// Good: Use debounced search
const { debouncedValue } = useDebouncedSearch(query, { delay: 300 });
```

### 2. Use Caching
```typescript
// Always check cache first
const cached = await searchCacheService.getFromCache(query);
if (cached) return cached;
```

### 3. Limit Results
```typescript
// Request only what you need
searchService.searchProducts({ q: query, limit: 10 })
```

### 4. Parallel Requests
```typescript
// Search products and stores simultaneously
const [products, stores] = await Promise.all([
  searchService.searchProducts({ q: query }),
  searchService.searchStores({ q: query })
]);
```

---

## Common Errors & Solutions

### Error: "Search failed. Please try again."
**Cause:** Backend API error or network issue
**Solution:**
1. Check backend logs
2. Verify API endpoint is running
3. Check network connectivity
4. Review API response format

### Error: "Failed to load categories"
**Cause:** Categories endpoint error
**Solution:**
1. Verify `/categories` endpoint
2. Check `featured=true` parameter support
3. Review category schema matches expected format

### Suggestions Not Showing
**Cause:** Backend endpoint not implemented
**Solution:**
1. Verify recent searches are saved
2. Check AsyncStorage for search history
3. Implement backend `/search/suggestions` endpoint

### Filters Not Working
**Cause:** Filter mapping issue
**Solution:**
1. Check `handleApplyFilters()` mapping
2. Verify backend supports filter parameters
3. Review API logs for filter params

---

## Best Practices

### 1. Always Handle Errors
```typescript
try {
  await performSearch(query);
} catch (error) {
  console.error('Search failed:', error);
  // Show error to user
  setState({ error: error.message });
}
```

### 2. Show Loading States
```typescript
setState({ loading: true });
const results = await searchService.searchProducts({ q: query });
setState({ loading: false, results });
```

### 3. Track Analytics
```typescript
// Track every search
await searchAnalyticsService.trackSearch(query, resultCount);

// Track clicks
await searchAnalyticsService.trackResultClick(query, resultId, type, position);
```

### 4. Validate Input
```typescript
if (query.trim().length < 2) {
  // Show hint
  return;
}
```

### 5. Use TypeScript
```typescript
// Define types for everything
interface SearchResult {
  id: string;
  title: string;
  // ...
}

const results: SearchResult[] = await search(query);
```

---

## File Structure

```
frontend/
├── app/
│   └── search.tsx                    # Main search page
├── hooks/
│   ├── useSearch.ts                  # Core search logic
│   ├── useSearchPage.ts              # Page-level search state
│   └── useDebouncedSearch.ts         # Debouncing utility
├── services/
│   ├── searchApi.ts                  # Backend API calls
│   ├── searchCacheService.ts         # Caching logic
│   ├── searchAnalyticsService.ts     # Analytics tracking
│   └── searchHistoryService.ts       # Local history storage
├── components/search/
│   ├── FilterModal.tsx               # Filter UI
│   ├── SearchHeader.tsx              # Search header
│   ├── SearchSection.tsx             # Category sections
│   ├── ProductResultCard.tsx         # Product card
│   ├── StoreResultCard.tsx           # Store card
│   └── index.ts                      # Exports
├── types/
│   └── search.types.ts               # TypeScript types
└── data/
    └── searchData.ts                 # DEPRECATED (not used)
```

---

## Contact & Support

**Questions?** Ask in:
- Development team chat
- Backend team (for API issues)
- DevOps (for deployment issues)

**Report bugs:**
1. Check console for errors
2. Review API logs
3. Create issue with reproduction steps

---

**Last Updated:** 2025-10-24
**Version:** 1.0.0

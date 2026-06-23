# REZ APP IMPLEMENTATION EXECUTION PLAN
**Created**: October 27, 2025
**Estimated Time**: 8 hours total
**Priority**: Fix core features with existing APIs

---

## 📋 OVERVIEW
We will fix 4 critical features that are currently using mock data but have APIs ready:
1. **Homepage** - Replace all mock sections with real API calls
2. **Wishlist** - Make persistent using real API
3. **Earn Features** - Connect real project/earning data
4. **Search** - Complete product search functionality

---

## PHASE 1: HOMEPAGE FIX (2 hours)
### Current Issue
Homepage falls back to mock data when backend is unavailable, showing fake products/events/stores.

### Files to Modify
1. `hooks/useHomepage.ts`
2. `services/homepageDataService.ts`
3. `app/(tabs)/index.tsx`

### Implementation Steps

#### Step 1.1: Update useHomepage Hook
**File**: `hooks/useHomepage.ts`
```typescript
// REMOVE mock data fallback
// REPLACE with real API calls:

const fetchHomepageData = async () => {
  try {
    setLoading(true);

    // Parallel API calls for better performance
    const [events, products, stores, offers, flashSales] = await Promise.all([
      eventsApi.getEvents({ limit: 10 }),
      productsApi.getRecommended({ limit: 20 }),
      storesApi.getTrending({ limit: 10 }),
      offersApi.getActive({ limit: 5 }),
      flashSaleApi.getActive({ limit: 5 })
    ]);

    setHomepageData({
      events: events.data || [],
      justForYou: products.data || [],
      newArrivals: products.data || [],
      trendingStores: stores.data || [],
      offers: offers.data || [],
      flashSales: flashSales.data || []
    });
  } catch (error) {
    setError(error.message);
    // Show error UI instead of mock data
  } finally {
    setLoading(false);
  }
};
```

#### Step 1.2: Update Homepage Service
**File**: `services/homepageDataService.ts`
```typescript
// ADD methods for each section
export const fetchEventsSection = () => eventsApi.getEvents({ featured: true });
export const fetchJustForYou = () => productsApi.getRecommended();
export const fetchNewArrivals = () => productsApi.getNewArrivals();
export const fetchTrendingStores = () => storesApi.getTrending();
export const fetchFlashSales = () => flashSaleApi.getActive();
```

#### Step 1.3: Update Homepage Component
**File**: `app/(tabs)/index.tsx`
```typescript
// ADD error states and loading indicators
// ADD refresh capability
// REMOVE all references to mock data
```

### Expected Result
- Homepage shows real events, products, stores
- Loading states while fetching
- Error handling if API fails
- No more dummy data

---

## PHASE 2: WISHLIST FIX (1 hour)
### Current Issue
Wishlist uses mock data and doesn't persist across sessions.

### Files to Modify
1. `contexts/WishlistContext.tsx`
2. `services/wishlistApi.ts`
3. `app/wishlist.tsx`

### Implementation Steps

#### Step 2.1: Create/Update Wishlist API
**File**: `services/wishlistApi.ts`
```typescript
class WishlistApiService {
  async getWishlist(): Promise<ApiResponse<WishlistItem[]>> {
    return apiClient.get('/wishlist');
  }

  async addToWishlist(productId: string): Promise<ApiResponse<WishlistItem>> {
    return apiClient.post('/wishlist', { productId });
  }

  async removeFromWishlist(productId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/wishlist/${productId}`);
  }

  async clearWishlist(): Promise<ApiResponse<void>> {
    return apiClient.delete('/wishlist');
  }

  async checkInWishlist(productId: string): Promise<ApiResponse<boolean>> {
    return apiClient.get(`/wishlist/check/${productId}`);
  }
}
```

#### Step 2.2: Update Wishlist Context
**File**: `contexts/WishlistContext.tsx`
```typescript
// REPLACE mock data with API calls
const WishlistProvider = ({ children }) => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load wishlist on mount
  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      const response = await wishlistApi.getWishlist();
      setWishlistItems(response.data || []);
    } catch (error) {
      console.error('Failed to load wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToWishlist = async (product: Product) => {
    try {
      const response = await wishlistApi.addToWishlist(product.id);
      if (response.success) {
        setWishlistItems(prev => [...prev, response.data]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add to wishlist');
    }
  };

  const removeFromWishlist = async (productId: string) => {
    try {
      const response = await wishlistApi.removeFromWishlist(productId);
      if (response.success) {
        setWishlistItems(prev => prev.filter(item => item.productId !== productId));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to remove from wishlist');
    }
  };
};
```

#### Step 2.3: Update Wishlist Screen
**File**: `app/wishlist.tsx`
```typescript
// Use context data instead of local mock
// Add pull-to-refresh
// Show loading/empty states
```

### Expected Result
- Wishlist persists across sessions
- Real-time sync with backend
- Add/remove operations work
- Shows actual saved products

---

## PHASE 3: EARN FEATURES FIX (3 hours)
### Current Issue
Entire earn section shows dummy projects and fake earnings.

### Files to Modify
1. `app/(tabs)/earn.tsx`
2. `hooks/useEarnPageData.ts`
3. `services/projectsApi.ts`
4. `components/earnPage/ProjectDashboard.tsx`
5. `app/earn-from-social-media.tsx`

### Implementation Steps

#### Step 3.1: Update Projects API
**File**: `services/projectsApi.ts`
```typescript
class ProjectsApiService {
  async getProjects(filters?: ProjectFilters): Promise<ApiResponse<Project[]>> {
    return apiClient.get('/projects', filters);
  }

  async getProjectById(projectId: string): Promise<ApiResponse<Project>> {
    return apiClient.get(`/projects/${projectId}`);
  }

  async joinProject(projectId: string): Promise<ApiResponse<void>> {
    return apiClient.post(`/projects/${projectId}/join`);
  }

  async completeTask(projectId: string, taskId: string): Promise<ApiResponse<TaskReward>> {
    return apiClient.post(`/projects/${projectId}/tasks/${taskId}/complete`);
  }

  async getEarnings(): Promise<ApiResponse<EarningsSummary>> {
    return apiClient.get('/projects/earnings');
  }

  async getEarningHistory(): Promise<ApiResponse<EarningHistory[]>> {
    return apiClient.get('/projects/earnings/history');
  }
}
```

#### Step 3.2: Update Earn Page Hook
**File**: `hooks/useEarnPageData.ts`
```typescript
export const useEarnPageData = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [earnings, setEarnings] = useState<EarningsSummary>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEarnData();
  }, []);

  const fetchEarnData = async () => {
    try {
      setLoading(true);

      const [projectsRes, earningsRes] = await Promise.all([
        projectsApi.getProjects({ status: 'active' }),
        projectsApi.getEarnings()
      ]);

      setProjects(projectsRes.data || []);
      setEarnings(earningsRes.data || {
        total: 0,
        pending: 0,
        completed: 0,
        thisMonth: 0
      });
    } catch (error) {
      console.error('Failed to fetch earn data:', error);
    } finally {
      setLoading(false);
    }
  };

  const joinProject = async (projectId: string) => {
    try {
      await projectsApi.joinProject(projectId);
      await fetchEarnData(); // Refresh
    } catch (error) {
      Alert.alert('Error', 'Failed to join project');
    }
  };

  return { projects, earnings, loading, joinProject, refresh: fetchEarnData };
};
```

#### Step 3.3: Update Earn Tab Screen
**File**: `app/(tabs)/earn.tsx`
```typescript
// Use real data from hook
// Show actual projects
// Display real earnings
// Add join/leave functionality
```

#### Step 3.4: Update Social Media Earning
**File**: `app/earn-from-social-media.tsx`
```typescript
// Connect to socialMediaApi
// Show real Instagram tasks
// Track actual completions
// Display real rewards
```

### Expected Result
- Shows real earning opportunities
- Can join/leave projects
- Tracks actual task completion
- Displays real earnings and rewards
- Social media tasks functional

---

## PHASE 4: SEARCH FIX (2 hours)
### Current Issue
Product search uses mock data, only store search works.

### Files to Modify
1. `app/search.tsx`
2. `hooks/useSearch.ts`
3. `services/searchApi.ts`
4. `components/search/SearchFilters.tsx`

### Implementation Steps

#### Step 4.1: Complete Search API
**File**: `services/searchApi.ts`
```typescript
class SearchApiService {
  // Existing store search
  async searchStores(query: string): Promise<ApiResponse<Store[]>> {
    return apiClient.get(`/search/stores?q=${query}`);
  }

  // ADD product search
  async searchProducts(query: string, filters?: SearchFilters): Promise<ApiResponse<Product[]>> {
    const params = new URLSearchParams({ q: query });

    if (filters?.category) params.append('category', filters.category);
    if (filters?.minPrice) params.append('minPrice', filters.minPrice.toString());
    if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    if (filters?.rating) params.append('rating', filters.rating.toString());
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);

    return apiClient.get(`/search/products?${params.toString()}`);
  }

  // ADD search suggestions
  async getSearchSuggestions(query: string): Promise<ApiResponse<string[]>> {
    return apiClient.get(`/search/suggestions?q=${query}`);
  }

  // ADD search history
  async getSearchHistory(): Promise<ApiResponse<string[]>> {
    return apiClient.get('/search/history');
  }

  async saveSearchQuery(query: string): Promise<ApiResponse<void>> {
    return apiClient.post('/search/history', { query });
  }
}
```

#### Step 4.2: Update Search Hook
**File**: `hooks/useSearch.ts`
```typescript
export const useSearch = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const searchAll = async (query: string) => {
    if (!query.trim()) return;

    try {
      setLoading(true);

      // Parallel search for products and stores
      const [productsRes, storesRes] = await Promise.all([
        searchApi.searchProducts(query),
        searchApi.searchStores(query)
      ]);

      setProducts(productsRes.data || []);
      setStores(storesRes.data || []);

      // Save to search history
      await searchApi.saveSearchQuery(query);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSuggestions = async (query: string) => {
    if (query.length < 2) return;

    try {
      const response = await searchApi.getSearchSuggestions(query);
      setSuggestions(response.data || []);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    }
  };

  return {
    products,
    stores,
    suggestions,
    loading,
    searchAll,
    getSuggestions
  };
};
```

#### Step 4.3: Update Search Screen
**File**: `app/search.tsx`
```typescript
// Show both products and stores
// Add search suggestions dropdown
// Implement filters UI
// Add search history
// Show loading states
```

#### Step 4.4: Add Search Filters Component
**File**: `components/search/SearchFilters.tsx`
```typescript
// Create filter UI for:
// - Price range
// - Category selection
// - Rating filter
// - Sort options
// - Distance (for stores)
```

### Expected Result
- Product search works with real data
- Search suggestions appear while typing
- Filters functional (price, category, rating)
- Search history saved
- Both products and stores searchable

---

## 🎯 EXECUTION TIMELINE

### Day 1 (Today)
**Morning (3 hours)**:
- [x] Create implementation plan (30 min)
- [ ] Phase 1: Homepage Fix (2 hrs)
- [ ] Phase 2: Wishlist Fix (1 hr)

**Afternoon (3 hours)**:
- [ ] Phase 3: Earn Features Fix (3 hrs)

**Evening (2 hours)**:
- [ ] Phase 4: Search Fix (2 hrs)

### Testing & Verification (1 hour)
- [ ] Test homepage loads real data
- [ ] Verify wishlist persistence
- [ ] Check earn features functionality
- [ ] Confirm search works for products
- [ ] Test error states
- [ ] Check loading indicators

---

## 🛠️ IMPLEMENTATION CHECKLIST

### Pre-Implementation
- [x] Backend running at localhost:5001
- [x] Rate limiting disabled
- [x] All APIs documented
- [ ] Test environment ready

### Homepage Fix
- [ ] Update useHomepage hook
- [ ] Modify homepageDataService
- [ ] Update index.tsx component
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test all sections

### Wishlist Fix
- [ ] Create/update wishlistApi
- [ ] Update WishlistContext
- [ ] Modify wishlist screen
- [ ] Test add/remove
- [ ] Verify persistence

### Earn Features Fix
- [ ] Update projectsApi
- [ ] Modify useEarnPageData
- [ ] Update earn tab screen
- [ ] Fix social media earning
- [ ] Test project joining
- [ ] Verify earnings display

### Search Fix
- [ ] Complete searchApi
- [ ] Update useSearch hook
- [ ] Modify search screen
- [ ] Add filters component
- [ ] Test product search
- [ ] Verify suggestions

---

## 📊 SUCCESS METRICS

### Homepage
- ✅ Shows real events (not "Summer Music Festival 2024")
- ✅ Displays actual products (not mock items)
- ✅ Lists real stores (not "Pizza Palace")
- ✅ No hardcoded data visible

### Wishlist
- ✅ Items persist after app restart
- ✅ Sync across devices (same account)
- ✅ Add/remove reflected immediately
- ✅ Count badge accurate

### Earn Features
- ✅ Real projects displayed
- ✅ Can join/leave projects
- ✅ Tasks trackable
- ✅ Earnings update in real-time
- ✅ Social media links work

### Search
- ✅ Products searchable by name
- ✅ Filters apply correctly
- ✅ Suggestions appear
- ✅ History saved
- ✅ Results relevant

---

## ⚠️ POTENTIAL ISSUES & SOLUTIONS

### Issue 1: API Endpoints Not Ready
**Solution**: Check with backend, use Postman to verify endpoints exist

### Issue 2: Data Format Mismatch
**Solution**: Add data transformation layer in services

### Issue 3: Performance with Many API Calls
**Solution**: Implement caching, use pagination, add debouncing

### Issue 4: Error States Not Handled
**Solution**: Add try-catch blocks, show user-friendly error messages

---

## 🚀 READY TO EXECUTE

This plan provides:
1. **Exact file locations** for each change
2. **Code snippets** to implement
3. **Step-by-step instructions**
4. **Expected outcomes** for verification
5. **Timeline** for completion

**Total Estimated Time**: 8 hours
**Complexity**: Medium (mostly integration work)
**Risk**: Low (using existing APIs)

---

**Let's begin implementation!** Starting with Phase 1: Homepage Fix
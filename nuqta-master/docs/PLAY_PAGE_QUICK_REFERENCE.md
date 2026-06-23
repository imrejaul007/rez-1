# Play Page Quick Reference

## File Location
`C:\Users\Mukul raj\Downloads\rez-new\rez-app\frontend\app\(tabs)\play.tsx`

## Data Sources

### Merchant Videos
```typescript
// From: usePlayPageData hook → realVideosApi
state.merchantVideos
```

### Articles
```typescript
// From: articlesService.getArticles()
articles (local state)
```

### UGC Videos
```typescript
// From: usePlayPageData hook → realVideosApi
state.ugcVideos
```

## State Management

### Videos State (from hook)
```typescript
const { state, actions } = usePlayPageData();
// state.merchantVideos
// state.ugcVideos
// state.loading
// state.refreshing
// state.error
```

### Articles State (local)
```typescript
const [articles, setArticles] = useState<Article[]>([]);
const [articlesLoading, setArticlesLoading] = useState(false);
const [articlesError, setArticlesError] = useState<string>();
```

## Loading States

| State | Condition | Display |
|-------|-----------|---------|
| Full-screen loading | `state.loading && state.allVideos.length === 0 && !state.refreshing` | `<LoadingState message="Loading amazing videos for you..." />` |
| Section loading | `state.loading && state.merchantVideos.length === 0` | `<LoadingState message="Loading product videos..." size="small" />` |
| Pull-to-refresh | `state.refreshing` | Purple spinner in RefreshControl |

## Error States

| State | Condition | Display | Action |
|-------|-----------|---------|--------|
| Full-screen error | `state.error && !state.refreshing && state.allVideos.length === 0` | `<ErrorState />` | `handleRetry()` |
| Inline error banner | `state.error && state.allVideos.length > 0` | Red banner | `handleRetry()` |
| Section error | `articlesError && articles.length === 0` | Section error button | `handleRetryArticles()` |

## Key Handlers

```typescript
handleRefresh()           // Refresh both videos and articles
handleRetry()            // Retry all (videos + articles)
handleRetryArticles()    // Retry articles only
handleVideoPress()       // Navigate to video detail
handleArticlePress()     // Navigate to article detail
handleUploadPress()      // Open upload screen (with auth check)
```

## Empty State

**Shows when:**
```typescript
!state.loading &&
!articlesLoading &&
state.merchantVideos.length === 0 &&
articles.length === 0 &&
state.ugcVideos.length === 0
```

## Sections Rendering Logic

### Merchant Videos
```typescript
{state.loading && state.merchantVideos.length === 0 ? (
  <LoadingState />
) : state.merchantVideos.length > 0 ? (
  <MerchantVideoSection />
) : null}
```

### Articles
```typescript
{articlesLoading && articles.length === 0 ? (
  <LoadingState />
) : articlesError && articles.length === 0 ? (
  <ErrorButton />
) : articles.length > 0 ? (
  <ArticleSection />
) : null}
```

### UGC Videos
```typescript
{state.loading && state.ugcVideos.length === 0 ? (
  <LoadingState />
) : state.ugcVideos.length > 0 ? (
  <UGCVideoSection />
) : null}
```

## API Calls

### Fetch Articles
```typescript
articlesService.getArticles({
  page: 1,
  limit: 6,
  sortBy: 'newest',
  isPublished: true
})
```

### Refresh Videos
```typescript
actions.refreshVideos()
```

## Console Logs

```
📰 [PlayPage] Fetching articles...
✅ [PlayPage] Loaded X articles
❌ [PlayPage] Failed to fetch articles
```

## Dependencies

```typescript
import LoadingState from '@/components/common/LoadingState';
import ErrorState from '@/components/common/ErrorState';
import articlesService from '@/services/articlesApi';
import { usePlayPageData } from '@/hooks/usePlayPageData';
```

## Key Colors

```typescript
PLAY_PAGE_COLORS.primary     // #8B5CF6 (Purple)
PLAY_PAGE_COLORS.background  // #F5F5F5 (Light Gray)
PLAY_PAGE_COLORS.text        // #333333 (Dark Gray)
Error Red                    // #EF4444
Error Background             // #FEF2F2
```

## Testing Points

1. **First Load:** Should show full-screen loading
2. **Success:** All sections render with data
3. **Network Error:** Shows appropriate error state
4. **Pull to Refresh:** Refreshes all content
5. **Empty State:** Shows when no content available
6. **Section Failure:** Other sections continue working
7. **Retry:** All retry buttons trigger correct refetch

## Common Issues & Solutions

### Issue: Articles not loading
**Check:**
- `articlesService` import
- API endpoint availability
- Console logs for errors

### Issue: Full-screen loading forever
**Check:**
- Network connectivity
- API response format
- Error state not showing (check conditions)

### Issue: Empty state showing with data
**Check:**
- State update logic
- Conditions for empty state
- Loading state not ending

## Performance Tips

1. Articles and videos fetch in parallel
2. Each section loads independently
3. RefreshControl batches both refreshes
4. Loading states prevent layout shift

## Next Steps

- [ ] Add pagination for articles
- [ ] Add skeleton loaders
- [ ] Implement offline caching
- [ ] Add analytics tracking
- [ ] Add search functionality

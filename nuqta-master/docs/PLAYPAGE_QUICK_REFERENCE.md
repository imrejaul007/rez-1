# Play Page Data Hook - Quick Reference

## Overview
The `usePlayPageData` hook now fetches **all video data from the backend API** (`realVideosApi`). No more dummy data!

## Key Points

### What Changed
- ✅ Removed dummy merchant videos
- ✅ All videos now from `realVideosApi.getVideosByCategory()`
- ✅ Videos automatically filtered by `contentType`
- ✅ Proper error handling with retry logic
- ✅ Full pagination support

### Video Types
Videos are automatically categorized by `contentType`:

| Type | Content Type | Description |
|------|-------------|-------------|
| **Merchant** | `merchant` | Videos from merchant app (promotional) |
| **Article** | `article` | Educational/tutorial videos |
| **UGC** | `ugc` | User-generated content |

### Categories Supported
- `trending_me` - Trends for Me
- `trending_her` - Trends for Her
- `waist` - Waist Pe
- `article` - Articles
- `featured` - Featured Videos

## Usage

```typescript
import { usePlayPageData } from '@/hooks/usePlayPageData';

function PlayPage() {
  const { state, actions } = usePlayPageData();

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={state.refreshing}
          onRefresh={actions.refreshVideos}
        />
      }
    >
      {/* Featured Video */}
      {state.featuredVideo && (
        <FeaturedVideoCard item={state.featuredVideo} />
      )}

      {/* Merchant Videos */}
      <VideoSection
        title="Merchant Videos"
        videos={state.merchantVideos}
        loading={state.loading}
      />

      {/* Articles */}
      <VideoSection
        title="Articles"
        videos={state.articleVideos}
        loading={state.loading}
      />

      {/* UGC Videos */}
      <VideoSection
        title="Community"
        videos={state.ugcVideos}
        loading={state.loading}
        onLoadMore={actions.loadMoreVideos}
        hasMore={state.hasMoreVideos}
      />

      {/* Error */}
      {state.error && (
        <ErrorBanner
          message={state.error}
          onDismiss={actions.clearError}
        />
      )}
    </ScrollView>
  );
}
```

## State Properties

```typescript
state.merchantVideos    // Videos from merchants
state.articleVideos     // Article/tutorial videos
state.ugcVideos         // User-generated videos
state.featuredVideo     // Featured video (if any)
state.loading           // Initial/category load
state.refreshing        // Pull-to-refresh
state.error            // Error message (if any)
state.hasMoreVideos    // Can load more
state.currentPage      // Current page number
```

## Actions

```typescript
// Fetch videos for a category
actions.fetchVideos('trending_me', 1);

// Refresh current category
actions.refreshVideos();

// Load more (pagination)
actions.loadMoreVideos();

// Switch category
actions.setActiveCategory('trending_her');

// Like/Unlike video
await actions.likeVideo(videoId);

// Share video
await actions.shareVideo(video);

// Navigate to detail
actions.navigateToDetail(video);

// Clear error
actions.clearError();
```

## API Integration

### Endpoints Used
```
GET  /videos/category/{category}?page=1&limit=20&sortBy=newest
POST /videos/{videoId}/like
```

### Response Format
```json
{
  "success": true,
  "data": {
    "videos": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "hasNext": true,
      "total": 150
    }
  }
}
```

## Backend Requirements

### Video Object Must Include
```typescript
{
  _id: string;
  videoUrl: string;
  thumbnail: string;
  category: 'trending_me' | 'trending_her' | 'waist' | 'article' | 'featured';
  // IMPORTANT: Must have contentType field
  contentType: 'merchant' | 'article' | 'ugc';
  engagement: {
    views: number;
    likes: string[];
    shares: number;
  };
  // ... other fields
}
```

### Critical Fields
- `contentType` - Used to filter videos into sections
- `category` - Used for category filtering
- `engagement.likes` - Array of user IDs who liked
- `isFeatured` - Boolean to mark featured video

## Error Handling

### Automatic Retry
- First page load errors auto-retry after 2 seconds
- User-friendly error messages displayed
- Error state can be cleared manually

### Error Display Example
```typescript
{state.error && (
  <View style={styles.errorBanner}>
    <Text>{state.error}</Text>
    <Button title="Dismiss" onPress={actions.clearError} />
  </View>
)}
```

## Loading States

### Initial Load
```typescript
{state.loading && <LoadingSpinner />}
```

### Pull-to-Refresh
```typescript
<RefreshControl
  refreshing={state.refreshing}
  onRefresh={actions.refreshVideos}
/>
```

### Load More
```typescript
{state.loading && state.currentPage > 1 && <LoadMoreSpinner />}
```

## Performance Tips

1. **Use FlatList for large lists**
   ```typescript
   <FlatList
     data={state.ugcVideos}
     renderItem={({ item }) => <VideoCard item={item} />}
     onEndReached={actions.loadMoreVideos}
     onEndReachedThreshold={0.5}
   />
   ```

2. **Memoize components**
   ```typescript
   const VideoCard = React.memo(({ item }) => { ... });
   ```

3. **Optimize images**
   - Use thumbnails for grid views
   - Lazy load full videos

## Testing

### Check These Scenarios
- [ ] Videos load on mount
- [ ] Pull-to-refresh works
- [ ] Load more pagination
- [ ] Category switching
- [ ] Like/unlike functionality
- [ ] Share works on both platforms
- [ ] Error displays correctly
- [ ] Retry logic works

### Test Different States
```typescript
// Loading state
state.loading === true

// Error state
state.error === 'Failed to load videos...'

// Empty state
state.merchantVideos.length === 0

// Pagination end
state.hasMoreVideos === false
```

## Common Issues

### Videos Not Loading
1. Check backend API is running
2. Verify `contentType` field exists on videos
3. Check network connectivity
4. Look for errors in console

### Wrong Videos in Sections
- Backend must set correct `contentType` field
- Merchant videos → `contentType: 'merchant'`
- Articles → `contentType: 'article'`
- UGC → `contentType: 'ugc'`

### Pagination Not Working
- Check `hasNext` in pagination response
- Verify page parameter increments correctly

## Console Logs

Look for these log prefixes:
```
📹 Fetching videos...
✅ Loaded successfully
❌ Error occurred
🔄 Retrying/Refreshing
📊 Statistics (counts)
❤️ Like action
🔗 Share action
```

## Migration from Old Code

### Before (with dummy data)
```typescript
// ❌ Old way
import { dummyMerchantVideos } from '@/data/merchantVideos';
const allVideos = [...dummyMerchantVideos, ...apiVideos];
```

### After (real API only)
```typescript
// ✅ New way
const { state } = usePlayPageData();
// Videos automatically fetched from API
// Filtered by contentType
```

## Quick Debugging

### Check Video Counts
```typescript
console.log('Merchant:', state.merchantVideos.length);
console.log('Article:', state.articleVideos.length);
console.log('UGC:', state.ugcVideos.length);
console.log('Total:', state.allVideos.length);
```

### Check API Response
Open Network tab and look for:
```
GET /videos/category/trending_me?page=1&limit=20&sortBy=newest
```

### Verify Video Structure
```typescript
console.log('Sample video:', state.allVideos[0]);
// Should have contentType field
```

## Summary

✅ **All videos from real API**
✅ **Automatic filtering by contentType**
✅ **Proper error handling**
✅ **Pagination support**
✅ **Pull-to-refresh**
✅ **Like/share functionality**
✅ **No breaking changes to interface**

Need help? Check the full documentation in `PLAYPAGE_DATA_HOOK_UPDATE.md`

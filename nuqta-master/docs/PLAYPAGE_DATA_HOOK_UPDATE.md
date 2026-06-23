# Play Page Data Hook - Real API Integration Complete

## Overview
Updated `hooks/usePlayPageData.ts` to fetch all video data from the backend API instead of using dummy data. The hook now properly integrates with `realVideosApi` to fetch merchant videos, article videos, and UGC videos.

## Key Changes

### 1. Removed Dummy Data Dependency
**Before:**
```typescript
import { dummyMerchantVideos } from '@/data/merchantVideos';
// Merged dummy merchant videos with API data
const allVideosWithMerchant = [...dummyMerchantVideos, ...videos];
```

**After:**
```typescript
// Removed import of dummyMerchantVideos
// All videos now come from realVideosApi
const allVideos = page === 1 ? videos : [...prev.allVideos, ...videos];
```

### 2. Enhanced Data Fetching with Real API

#### `fetchVideos` Function
- Fetches videos from `realVideosApi.getVideosByCategory()`
- Automatically filters videos by `contentType`:
  - `merchantVideos`: Videos with contentType = 'merchant'
  - `articleVideos`: Videos with contentType = 'article'
  - `ugcVideos`: Videos with contentType = 'ugc'
- Supports pagination (append on page > 1)
- Includes retry logic for failed initial requests
- Proper error handling with user-friendly messages

```typescript
const fetchVideos = useCallback(async (category?: CategoryType, page: number = 1) => {
  try {
    setState(prev => ({ ...prev, loading: true, error: undefined }));

    const response = await realVideosApi.getVideosByCategory(
      category || 'trending_me',
      { page, limit: 20, sortBy: 'newest' }
    );

    if (response.success) {
      const videos = transformVideosToUGC(response.data.videos, user?.id);
      // Filter by contentType and update state
    }
  } catch (error) {
    // Retry logic for first page
    if (page === 1) {
      setTimeout(() => fetchVideos(category, page), 2000);
    }
  }
}, [user]);
```

#### `refreshVideos` Function
- Resets to page 1 and fetches fresh data
- Updates all video arrays (merchant, article, UGC)
- Clears previous pagination state
- Proper error handling

### 3. Improved State Management

All state updates now properly filter videos by contentType:

```typescript
setState(prev => {
  const allVideos = page === 1 ? videos : [...prev.allVideos, ...videos];

  return {
    ...prev,
    allVideos,
    merchantVideos: allVideos.filter(v => v.contentType === 'merchant'),
    articleVideos: allVideos.filter(v => v.contentType === 'article'),
    ugcVideos: allVideos.filter(v => v.contentType === 'ugc'),
    // ... other state updates
  };
});
```

### 4. Enhanced User Interactions

#### Like Video Action
- Calls `realVideosApi.toggleVideoLike()`
- Updates like status across ALL filtered arrays (merchant, article, UGC)
- Updates featured video if it matches

```typescript
const likeVideoAction = useCallback(async (videoId: string): Promise<boolean> => {
  const response = await realVideosApi.toggleVideoLike(videoId);

  if (response.success) {
    setState(prev => {
      const updatedAllVideos = prev.allVideos.map(video =>
        video.id === videoId ? { ...video, isLiked, likes: newCount } : video
      );

      return {
        ...prev,
        allVideos: updatedAllVideos,
        merchantVideos: updatedAllVideos.filter(v => v.contentType === 'merchant'),
        articleVideos: updatedAllVideos.filter(v => v.contentType === 'article'),
        ugcVideos: updatedAllVideos.filter(v => v.contentType === 'ugc'),
        // ... update featured video
      };
    });
  }
}, []);
```

#### Share Video Action
- Uses native Share API
- Updates share count locally
- Syncs across all filtered arrays

### 5. Proper Loading & Error States

#### Loading States
- `loading`: Set to `true` during data fetch
- `refreshing`: Set to `true` during pull-to-refresh
- Both states properly managed to prevent UI glitches

#### Error Handling
- User-friendly error messages
- Automatic retry for failed initial loads
- Error state can be cleared via `clearError` action

### 6. Pagination Support

```typescript
const loadMoreVideos = useCallback(async () => {
  if (!state.hasMoreVideos || state.loading) return;

  const nextPage = state.currentPage + 1;
  await fetchVideos(state.activeCategory, nextPage);
}, [state.hasMoreVideos, state.loading, state.activeCategory, state.currentPage, fetchVideos]);
```

- Checks `hasMoreVideos` from API response
- Tracks current page
- Prevents multiple simultaneous requests
- Appends new videos to existing arrays

## API Integration Details

### Video Categories Fetched
1. **Merchant Videos** (`contentType: 'merchant'`)
   - Videos uploaded by merchants through merchant app
   - Tagged with product information
   - Promotional content

2. **Article Videos** (`contentType: 'article'`)
   - Educational/informational videos
   - Blog-style content
   - Tutorial videos

3. **UGC Videos** (`contentType: 'ugc'`)
   - User-generated content
   - Reviews and testimonials
   - Personal experiences

### API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/videos/category/{category}` | GET | Fetch videos by category |
| `/videos/{videoId}/like` | POST | Toggle like status |

### Data Transformation
Videos from the backend API are transformed using:
- `transformVideosToUGC()`: Converts backend Video to frontend UGCVideoItem
- `getFeaturedVideo()`: Extracts featured video from response

## State Structure

```typescript
interface PlayPageState {
  // Video data arrays
  featuredVideo?: UGCVideoItem;
  merchantVideos: UGCVideoItem[];  // Filtered by contentType
  articleVideos: UGCVideoItem[];   // Filtered by contentType
  ugcVideos: UGCVideoItem[];       // Filtered by contentType
  trendingVideos: UGCVideoItem[];
  allVideos: UGCVideoItem[];       // Master array

  // UI state
  activeCategory: CategoryType;
  categories: CategoryTab[];
  loading: boolean;
  refreshing: boolean;
  error?: string;

  // Playback state
  playingVideos: Set<string>;
  mutedVideos: Set<string>;

  // Pagination
  hasMoreVideos: boolean;
  currentPage: number;
}
```

## Actions Available

```typescript
interface PlayPageActions {
  // Data fetching
  fetchVideos: (category?: CategoryType, page?: number) => Promise<void>;
  refreshVideos: () => Promise<void>;
  loadMoreVideos: () => Promise<void>;

  // Category management
  setActiveCategory: (category: CategoryType) => void;

  // Video playback
  playVideo: (videoId: string) => void;
  pauseVideo: (videoId: string) => void;
  toggleMute: (videoId: string) => void;

  // User interactions
  likeVideo: (videoId: string) => Promise<boolean>;
  shareVideo: (video: UGCVideoItem) => Promise<void>;

  // Navigation
  navigateToDetail: (video: UGCVideoItem) => void;

  // Error handling
  clearError: () => void;
}
```

## Usage Example

```typescript
import { usePlayPageData } from '@/hooks/usePlayPageData';

function PlayPage() {
  const { state, actions } = usePlayPageData();

  return (
    <View>
      {/* Featured Video */}
      {state.featuredVideo && (
        <FeaturedVideoCard
          item={state.featuredVideo}
          onPress={actions.navigateToDetail}
          onLike={actions.likeVideo}
        />
      )}

      {/* Merchant Videos Section */}
      <SectionHeader title="Merchant Videos" />
      <HorizontalVideoSection
        items={state.merchantVideos}
        onItemPress={actions.navigateToDetail}
        loading={state.loading}
      />

      {/* Article Videos Section */}
      <SectionHeader title="Articles" />
      <HorizontalVideoSection
        items={state.articleVideos}
        onItemPress={actions.navigateToDetail}
        loading={state.loading}
      />

      {/* UGC Videos Section */}
      <SectionHeader title="From Our Community" />
      <HorizontalVideoSection
        items={state.ugcVideos}
        onItemPress={actions.navigateToDetail}
        loading={state.loading}
        onLoadMore={actions.loadMoreVideos}
        hasMore={state.hasMoreVideos}
      />

      {/* Error Display */}
      {state.error && (
        <ErrorBanner
          message={state.error}
          onDismiss={actions.clearError}
        />
      )}
    </View>
  );
}
```

## Performance Optimizations

1. **Memoized Callbacks**: All action functions are wrapped in `useCallback`
2. **Efficient State Updates**: State updates use functional form to avoid stale closures
3. **Video Management**: iOS-specific logic to limit concurrent playing videos
4. **Retry Logic**: Automatic retry for failed initial loads (2-second delay)
5. **Pagination**: Load more videos on demand to reduce initial load time

## Error Handling

### Network Errors
```typescript
catch (error) {
  setState(prev => ({
    ...prev,
    loading: false,
    error: 'Failed to load videos. Please try again.'
  }));

  // Retry logic for first page
  if (page === 1) {
    setTimeout(() => fetchVideos(category, page), 2000);
  }
}
```

### Transformation Errors
- Logged with detailed context
- Prevents app crash
- Maintains app stability

## Backend Requirements

For this hook to work properly, the backend must:

1. **Return videos with proper contentType field**
   - Videos should be tagged as 'merchant', 'article', or 'ugc'

2. **Support category-based filtering**
   - Categories: 'trending_me', 'trending_her', 'waist', 'article', 'featured'

3. **Provide pagination metadata**
   ```json
   {
     "pagination": {
       "page": 1,
       "limit": 20,
       "hasNext": true,
       "hasPrev": false,
       "total": 150,
       "totalPages": 8
     }
   }
   ```

4. **Support like toggling**
   - Endpoint: `POST /videos/{videoId}/like`
   - Returns updated like count and status

## Migration Notes

### For Developers
1. **No breaking changes** to the hook's public interface
2. Same state structure and actions
3. Components using this hook don't need updates

### For Backend Team
1. Ensure videos have `contentType` field set correctly
2. Merchant videos should be tagged as `contentType: 'merchant'`
3. Article/tutorial videos should be `contentType: 'article'`
4. User-uploaded videos should be `contentType: 'ugc'`

## Testing Checklist

- [ ] Videos load on initial mount
- [ ] Pull-to-refresh works correctly
- [ ] Pagination loads more videos
- [ ] Category switching fetches correct videos
- [ ] Like/unlike updates UI immediately
- [ ] Share functionality works on iOS and Android
- [ ] Error states display correctly
- [ ] Retry logic works for failed requests
- [ ] Video playback state is maintained
- [ ] Featured video displays when available
- [ ] All three sections (merchant, article, UGC) populate correctly

## Console Logging

The hook includes comprehensive logging for debugging:

```
📹 [PlayPage] Fetching videos for category: trending_me, page: 1
✅ [PlayPage] Loaded 20 videos successfully
📊 [PlayPage] Merchant: 5, Article: 8, UGC: 7
```

Log prefixes:
- `📹` - Video fetch started
- `✅` - Success
- `❌` - Error
- `🔄` - Retry/refresh
- `📄` - Pagination
- `❤️` - Like action
- `🔗` - Share action
- `🔍` - Debug info
- `📊` - Statistics

## Future Enhancements

1. **Caching**: Add video caching to reduce API calls
2. **Optimistic Updates**: Update UI before API response
3. **Video Preloading**: Preload next page of videos
4. **Real-time Updates**: WebSocket integration for live like counts
5. **Advanced Filtering**: Filter by tags, creator, date range
6. **Search Integration**: Search within fetched videos
7. **Bookmark Feature**: Save videos for later

## Summary

The `usePlayPageData` hook is now fully integrated with the real backend API, providing a robust and scalable solution for fetching and managing video content on the Play page. All dummy data has been removed, and the hook properly handles merchant videos, article videos, and UGC videos through the `realVideosApi` service.

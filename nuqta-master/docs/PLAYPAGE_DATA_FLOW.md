# Play Page Data Flow - Visual Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Play Page Component                       │
│                                                                  │
│  const { state, actions } = usePlayPageData();                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ uses
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     usePlayPageData Hook                         │
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────┐  │
│  │  fetchVideos   │  │ refreshVideos  │  │ loadMoreVideos  │  │
│  └────────┬───────┘  └────────┬───────┘  └────────┬────────┘  │
│           │                   │                    │            │
│           └───────────────────┼────────────────────┘            │
│                               │                                 │
│                               ▼                                 │
│                    ┌──────────────────────┐                    │
│                    │  realVideosApi       │                    │
│                    │  .getVideosByCategory│                    │
│                    └──────────┬───────────┘                    │
└───────────────────────────────┼────────────────────────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │   Backend API        │
                    │   /videos/category/  │
                    │   {category}         │
                    └──────────┬───────────┘
                                │
                                │ returns
                                ▼
                    ┌──────────────────────┐
                    │   Video[] +          │
                    │   Pagination         │
                    └──────────┬───────────┘
                                │
                                │ transform
                                ▼
                    ┌──────────────────────┐
                    │ transformVideosToUGC │
                    │ getFeaturedVideo     │
                    └──────────┬───────────┘
                                │
                                │ filter by contentType
                                ▼
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌──────────────┐      ┌──────────────┐       ┌──────────────┐
│ contentType: │      │ contentType: │       │ contentType: │
│  'merchant'  │      │  'article'   │       │    'ugc'     │
└──────┬───────┘      └──────┬───────┘       └──────┬───────┘
       │                     │                      │
       ▼                     ▼                      ▼
┌──────────────┐      ┌──────────────┐       ┌──────────────┐
│ state.       │      │ state.       │       │ state.       │
│ merchantVideos│     │ articleVideos│       │ ugcVideos    │
└──────────────┘      └──────────────┘       └──────────────┘
```

## Data Fetch Flow

### 1. Initial Load (On Mount)

```
Component Mounts
      │
      ▼
useEffect(() => refreshVideos(), [])
      │
      ▼
setState({ refreshing: true })
      │
      ▼
API: GET /videos/category/trending_me?page=1&limit=20
      │
      ▼
Response: { success: true, data: { videos: [...], pagination: {...} } }
      │
      ▼
Transform: videos.map(transformVideoToUGC)
      │
      ▼
Filter by contentType:
  - merchantVideos = videos.filter(v => v.contentType === 'merchant')
  - articleVideos = videos.filter(v => v.contentType === 'article')
  - ugcVideos = videos.filter(v => v.contentType === 'ugc')
      │
      ▼
setState({
  allVideos,
  merchantVideos,
  articleVideos,
  ugcVideos,
  featuredVideo,
  refreshing: false
})
      │
      ▼
Component Re-renders with Data
```

### 2. Category Switch

```
User Clicks Category Tab
      │
      ▼
actions.setActiveCategory('trending_her')
      │
      ▼
setState({ activeCategory: 'trending_her' })
      │
      ▼
fetchVideos('trending_her', 1)
      │
      ▼
setState({ loading: true })
      │
      ▼
API: GET /videos/category/trending_her?page=1&limit=20
      │
      ▼
Transform & Filter (same as above)
      │
      ▼
setState({ loading: false, ... })
```

### 3. Load More (Pagination)

```
User Scrolls to Bottom
      │
      ▼
actions.loadMoreVideos()
      │
      ▼
Check: !state.hasMoreVideos || state.loading
      │ (if false, continue)
      ▼
fetchVideos(state.activeCategory, currentPage + 1)
      │
      ▼
setState({ loading: true })
      │
      ▼
API: GET /videos/category/trending_me?page=2&limit=20
      │
      ▼
Transform new videos
      │
      ▼
setState(prev => {
  const allVideos = [...prev.allVideos, ...newVideos];
  return {
    allVideos,
    merchantVideos: allVideos.filter(...),
    articleVideos: allVideos.filter(...),
    ugcVideos: allVideos.filter(...),
    currentPage: 2,
    hasMoreVideos: pagination.hasNext
  };
})
```

### 4. Like Video

```
User Clicks Like Button
      │
      ▼
actions.likeVideo(videoId)
      │
      ▼
API: POST /videos/{videoId}/like
      │
      ▼
Response: { success: true, data: { isLiked: true, likeCount: 42 } }
      │
      ▼
setState(prev => {
  const updatedAllVideos = prev.allVideos.map(video =>
    video.id === videoId
      ? { ...video, isLiked: true, likes: 42 }
      : video
  );

  return {
    allVideos: updatedAllVideos,
    merchantVideos: updatedAllVideos.filter(...),
    articleVideos: updatedAllVideos.filter(...),
    ugcVideos: updatedAllVideos.filter(...),
    featuredVideo: updated if matches
  };
})
      │
      ▼
UI Updates Immediately
```

## State Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        Initial State                         │
│                                                              │
│  {                                                           │
│    merchantVideos: [],                                       │
│    articleVideos: [],                                        │
│    ugcVideos: [],                                            │
│    allVideos: [],                                            │
│    featuredVideo: undefined,                                 │
│    loading: false,                                           │
│    refreshing: false,                                        │
│    error: undefined,                                         │
│    hasMoreVideos: true,                                      │
│    currentPage: 1                                            │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ refreshVideos()
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Loading State                           │
│                                                              │
│  {                                                           │
│    ...prev,                                                  │
│    refreshing: true,                                         │
│    error: undefined                                          │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ API Success
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Loaded State                            │
│                                                              │
│  {                                                           │
│    merchantVideos: [5 videos],                               │
│    articleVideos: [8 videos],                                │
│    ugcVideos: [7 videos],                                    │
│    allVideos: [20 videos],                                   │
│    featuredVideo: { ... },                                   │
│    refreshing: false,                                        │
│    hasMoreVideos: true,                                      │
│    currentPage: 1                                            │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ loadMoreVideos()
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Loaded More State                          │
│                                                              │
│  {                                                           │
│    merchantVideos: [10 videos],                              │
│    articleVideos: [15 videos],                               │
│    ugcVideos: [15 videos],                                   │
│    allVideos: [40 videos],                                   │
│    hasMoreVideos: true,                                      │
│    currentPage: 2                                            │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
API Call
    │
    ▼
Try Block
    │
    ├─ Success ────────────► Transform & Update State
    │
    ├─ Network Error ───────► Catch Block
    │                              │
    │                              ▼
    │                     setState({ error: '...' })
    │                              │
    │                              ▼
    │                     Is First Page?
    │                              │
    │                              ├─ Yes ──► setTimeout(() => retry(), 2000)
    │                              │
    │                              └─ No ───► Show Error, No Retry
    │
    └─ Transform Error ─────► Log Error & Re-throw
```

## Video Filtering Logic

```
Backend API Returns: Video[]
        │
        ▼
    All Videos
        │
        ├─ contentType === 'merchant' ──► merchantVideos[]
        │
        ├─ contentType === 'article' ───► articleVideos[]
        │
        └─ contentType === 'ugc' ────────► ugcVideos[]
```

## Component Integration

```
┌──────────────────────────────────────────────────────────┐
│                      Play Page                            │
│                                                           │
│  ┌────────────────────────────────────────────────┐     │
│  │  Featured Video Section                        │     │
│  │  - state.featuredVideo                         │     │
│  │  - Full width banner                           │     │
│  └────────────────────────────────────────────────┘     │
│                                                           │
│  ┌────────────────────────────────────────────────┐     │
│  │  Merchant Videos Section                       │     │
│  │  - state.merchantVideos                        │     │
│  │  - Horizontal scroll                           │     │
│  │  - Shows products from merchants               │     │
│  └────────────────────────────────────────────────┘     │
│                                                           │
│  ┌────────────────────────────────────────────────┐     │
│  │  Articles Section                              │     │
│  │  - state.articleVideos                         │     │
│  │  - Horizontal scroll                           │     │
│  │  - Educational content                         │     │
│  └────────────────────────────────────────────────┘     │
│                                                           │
│  ┌────────────────────────────────────────────────┐     │
│  │  UGC Videos Section                            │     │
│  │  - state.ugcVideos                             │     │
│  │  - Grid or list view                           │     │
│  │  - User-generated content                      │     │
│  │  - Load more pagination                        │     │
│  └────────────────────────────────────────────────┘     │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

## Key Transformations

### Backend Video → Frontend UGCVideoItem

```
Backend Video Object:
{
  _id: "video-123",
  videoUrl: "https://...",
  thumbnail: "https://...",
  category: "trending_me",
  contentType: "merchant",
  engagement: {
    views: 15000,
    likes: ["user1", "user2"],
    shares: 42
  },
  creator: {
    profile: {
      firstName: "John",
      lastName: "Doe"
    }
  }
}
        │
        │ transformVideoToUGC()
        ▼
Frontend UGCVideoItem:
{
  id: "video-123",
  videoUrl: "https://...",
  thumbnailUrl: "https://...",
  category: "trending_me",
  contentType: "merchant",
  viewCount: "15K",
  likes: 2,
  isLiked: false,
  shares: 42,
  author: "John Doe"
}
```

## Summary

This visual guide shows:
- ✅ Data flows from API → Transform → Filter → State → UI
- ✅ Three video types (merchant, article, UGC) filtered automatically
- ✅ Pagination appends to existing data
- ✅ Like/share updates propagate to all filtered arrays
- ✅ Error handling with retry logic
- ✅ Loading states managed properly

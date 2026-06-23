# UGC Comments Modal - Integration Guide

## Overview

The **UGCCommentsModal** is a comprehensive, production-ready comments system for UGC (User-Generated Content) that includes:

- 📱 Full-screen bottom sheet modal with smooth animations
- 💬 Nested comments (1-level deep replies)
- ❤️ Like/unlike functionality
- 🗑️ Delete own comments
- 🚩 Report inappropriate comments
- ♾️ Infinite scroll with pagination
- 🔄 Pull-to-refresh
- ⌨️ Keyboard-aware input
- 📊 Character counter (500 chars max)
- 🎨 Purple gradient theme (#7C3AED)
- 🎭 Loading states, empty states, error handling
- ✨ Optimistic updates for instant feedback

---

## Quick Start

### 1. Import the Component

```typescript
import UGCCommentsModal from '@/components/ugc/UGCCommentsModal';
// OR
import { UGCCommentsModal } from '@/components/ugc';
```

### 2. Add State Management

```typescript
const [showComments, setShowComments] = useState(false);
const [commentCount, setCommentCount] = useState(24); // Optional
```

### 3. Add the Modal to Your Component

```tsx
<UGCCommentsModal
  visible={showComments}
  contentId="ugc-content-id"
  contentType="video"
  contentThumbnail="https://example.com/thumb.jpg"
  contentCaption="Check out this amazing product!"
  initialCommentCount={commentCount}
  onClose={() => setShowComments(false)}
  onCommentCountChange={(count) => setCommentCount(count)}
/>
```

### 4. Add a Trigger Button

```tsx
<TouchableOpacity onPress={() => setShowComments(true)}>
  <Ionicons name="chatbubble-outline" size={24} color="#FFF" />
  <Text>{commentCount}</Text>
</TouchableOpacity>
```

---

## Component Props

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `visible` | `boolean` | Controls modal visibility |
| `contentId` | `string` | Unique ID of the UGC content |
| `contentType` | `'image' \| 'video'` | Type of content |
| `onClose` | `() => void` | Callback when modal is closed |

### Optional Props

| Prop | Type | Description |
|------|------|-------------|
| `contentThumbnail` | `string` | Thumbnail URL for content preview |
| `contentCaption` | `string` | Caption/description of content |
| `initialCommentCount` | `number` | Initial comment count (default: 0) |
| `onCommentCountChange` | `(count: number) => void` | Callback when comment count changes |

---

## API Methods Used

The component uses the following API methods from `ugcApi`:

### 1. Get Comments

```typescript
async getComments(
  contentId: string,
  limit: number = 20,
  offset: number = 0
): Promise<ApiResponse<{
  comments: UGCComment[];
  total: number;
  hasMore: boolean;
}>>
```

### 2. Add Comment

```typescript
async addComment(
  contentId: string,
  comment: string,
  parentId?: string
): Promise<ApiResponse<{
  comment: UGCComment;
}>>
```

### 3. Like/Unlike Comment

```typescript
async toggleCommentLike(
  ugcId: string,
  commentId: string
): Promise<ApiResponse<{
  isLiked: boolean;
  likes: number;
}>>
```

### 4. Delete Comment

```typescript
async deleteComment(
  ugcId: string,
  commentId: string
): Promise<ApiResponse<{
  message: string;
}>>
```

### 5. Report Comment (NEW)

```typescript
async reportComment(
  ugcId: string,
  commentId: string,
  reason: string,
  description?: string
): Promise<ApiResponse<{
  message: string;
}>>
```

---

## Comment Interface

```typescript
export interface UGCComment {
  _id: string;
  userId: string;
  user: {
    _id: string;
    profile: {
      firstName: string;
      lastName: string;
      avatar?: string;
    };
  };
  comment: string;
  likes: number;
  isLiked: boolean;
  replies: UGCComment[];
  createdAt: string;
}
```

---

## Features Breakdown

### 1. Comment Posting

- ✅ Real-time character counter (500 max)
- ✅ Multi-line input support
- ✅ Keyboard-aware positioning
- ✅ Optimistic UI updates
- ✅ Auto-scroll to new comment
- ✅ Toast notifications

### 2. Reply System

- ✅ 1-level deep nesting
- ✅ Reply indicator bar
- ✅ Cancel reply option
- ✅ Visual indentation for replies

### 3. Like System

- ✅ Like/unlike with animation
- ✅ Optimistic updates
- ✅ Like count formatting (1.2K, 2.5M)
- ✅ Visual feedback (red heart)

### 4. Comment Actions

- ✅ Delete own comments
- ✅ Report inappropriate comments
- ✅ Contextual action menu
- ✅ Confirmation before delete

### 5. Loading & Empty States

- ✅ Skeleton loaders while loading
- ✅ Empty state ("Be the first to comment!")
- ✅ Error state with retry button
- ✅ Loading indicator for pagination

### 6. Pagination

- ✅ Infinite scroll (20 comments per page)
- ✅ "Load more" on scroll to bottom
- ✅ Pull-to-refresh
- ✅ Loading indicator

### 7. Animations

- ✅ Smooth slide-up modal
- ✅ Fade-in overlay
- ✅ Skeleton shimmer effect
- ✅ Bounce animation on open

---

## Integration Examples

### Example 1: Basic Social Actions Bar

```tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import UGCCommentsModal from '@/components/ugc/UGCCommentsModal';

function SocialActions({ contentId, comments }) {
  const [showComments, setShowComments] = useState(false);

  return (
    <View>
      <TouchableOpacity onPress={() => setShowComments(true)}>
        <Ionicons name="chatbubble-outline" size={30} color="#FFF" />
        <Text>{comments}</Text>
      </TouchableOpacity>

      <UGCCommentsModal
        visible={showComments}
        contentId={contentId}
        contentType="video"
        onClose={() => setShowComments(false)}
      />
    </View>
  );
}
```

### Example 2: UGC Detail Page

```tsx
import React, { useState } from 'react';
import UGCCommentsModal from '@/components/ugc/UGCCommentsModal';

function UGCDetailPage({ ugcItem }) {
  const [showComments, setShowComments] = useState(false);

  return (
    <View>
      {/* Video/Image */}
      <VideoPlayer source={ugcItem.url} />

      {/* Caption with Comments Link */}
      <View>
        <Text>{ugcItem.caption}</Text>
        <TouchableOpacity onPress={() => setShowComments(true)}>
          <Text>View all {ugcItem.comments} comments</Text>
        </TouchableOpacity>
      </View>

      {/* Comments Modal */}
      <UGCCommentsModal
        visible={showComments}
        contentId={ugcItem._id}
        contentType={ugcItem.type}
        contentThumbnail={ugcItem.thumbnail}
        contentCaption={ugcItem.caption}
        initialCommentCount={ugcItem.comments}
        onClose={() => setShowComments(false)}
      />
    </View>
  );
}
```

### Example 3: Auto-open from Notification

```tsx
import React, { useState, useEffect } from 'react';
import UGCCommentsModal from '@/components/ugc/UGCCommentsModal';

function UGCPageWithDeepLink({ contentId, openCommentsOnMount }) {
  const [showComments, setShowComments] = useState(openCommentsOnMount);

  return (
    <View>
      {/* Your content */}

      <UGCCommentsModal
        visible={showComments}
        contentId={contentId}
        contentType="video"
        onClose={() => setShowComments(false)}
      />
    </View>
  );
}

// Usage from notification handler:
// navigation.navigate('UGCDetail', {
//   contentId: 'ugc-123',
//   openCommentsOnMount: true
// });
```

---

## Mock Data

The component works seamlessly with the comprehensive mock data in `data/mockCommentsData.ts`:

```typescript
import { generateMockComments } from '@/data/mockCommentsData';

// Generate 30 mock comments
const mockComments = generateMockComments();
```

**Mock Data Features:**
- 20+ realistic comments
- Various timestamps (2m ago, 1h ago, 3d ago, etc.)
- Nested replies
- Different like counts
- Multiple user avatars
- Realistic comment text

---

## Styling & Theme

The component uses a **purple gradient theme** matching the app's design:

- Primary: `#7C3AED` (Purple)
- Secondary: `#6366F1` (Indigo)
- Error: `#EF4444` (Red)
- Like: `#EF4444` (Red heart)

All styles are contained in the component's StyleSheet.

---

## Accessibility

- ✅ Keyboard navigation support
- ✅ Screen reader compatible
- ✅ Touch target sizes (44x44 minimum)
- ✅ High contrast colors
- ✅ Error messages read aloud

---

## Error Handling

The component includes comprehensive error handling:

1. **Network Errors**: Shows error state with retry button
2. **API Failures**: Toast notification with error message
3. **Empty States**: Friendly "Be the first to comment!" message
4. **Validation**: Character limit enforcement
5. **Optimistic Updates**: Automatic rollback on failure

---

## Performance Optimizations

- ✅ FlatList for efficient rendering
- ✅ Optimistic updates (instant UI feedback)
- ✅ Pagination (only 20 comments loaded at once)
- ✅ Image loading optimization
- ✅ Debounced input (prevents spam)

---

## Testing

### Manual Testing Checklist

- [ ] Open/close modal with smooth animations
- [ ] Post a new comment
- [ ] Reply to a comment
- [ ] Like/unlike a comment
- [ ] Delete own comment
- [ ] Report someone else's comment
- [ ] Scroll to load more comments
- [ ] Pull to refresh
- [ ] Test with 0 comments (empty state)
- [ ] Test with network error
- [ ] Test character limit (500 chars)
- [ ] Test keyboard behavior

---

## Troubleshooting

### Issue: Modal doesn't open

**Solution**: Ensure `visible` prop is set to `true`

```tsx
const [showComments, setShowComments] = useState(false);
// ...
onPress={() => setShowComments(true)} // ✅ Correct
```

### Issue: Toast notifications not working

**Solution**: Ensure your app is wrapped with `ToastProvider`

```tsx
// App.tsx or _layout.tsx
import { ToastProvider } from '@/contexts/ToastContext';

export default function App() {
  return (
    <ToastProvider>
      {/* Your app */}
    </ToastProvider>
  );
}
```

### Issue: Comments not loading

**Solution**: Check API endpoint and network connection

```typescript
// Check browser console or React Native debugger
// The component logs errors to console
```

### Issue: Avatar images not showing

**Solution**: Ensure avatar URLs are valid or provide fallback

```typescript
// Component already includes fallback:
require('@/assets/images/default-avatar.png')
```

---

## API Endpoints (Backend)

Ensure your backend implements these endpoints:

```
GET    /api/ugc/:id/comments?limit=20&offset=0
POST   /api/ugc/:id/comments
POST   /api/ugc/:id/comments/:commentId/like
DELETE /api/ugc/:id/comments/:commentId/like
DELETE /api/ugc/:id/comments/:commentId
POST   /api/ugc/:id/comments/:commentId/report
```

---

## Future Enhancements

Potential features for future versions:

- [ ] Mention support (@username)
- [ ] Emoji picker integration
- [ ] GIF support in comments
- [ ] Pin comments (admin feature)
- [ ] Comment sorting (newest, popular, etc.)
- [ ] Comment search/filter
- [ ] Nested replies beyond 1 level
- [ ] Rich text formatting
- [ ] Edit own comments
- [ ] Comment reactions (beyond like)

---

## Support

For issues or questions:
1. Check this integration guide
2. Review `UGCCommentsModalExample.tsx`
3. Check existing UGC components for patterns
4. Verify API endpoint implementation

---

## Files Created

```
✅ components/ugc/UGCCommentsModal.tsx       - Main component
✅ services/ugcApi.ts                        - Enhanced with reportComment
✅ types/ugc-comments.types.ts               - TypeScript interfaces
✅ data/mockCommentsData.ts                  - Mock data (20+ comments)
✅ components/ugc/UGCCommentsModalExample.tsx - Usage examples
✅ UGC_COMMENTS_INTEGRATION_GUIDE.md         - This guide
```

---

## Summary

The UGCCommentsModal is a **production-ready**, **fully-featured** comments system that includes:

- ✅ Complete UI with animations
- ✅ Full API integration
- ✅ Nested replies (1 level)
- ✅ Like/unlike functionality
- ✅ Delete & report features
- ✅ Infinite scroll & refresh
- ✅ Loading & error states
- ✅ Character limit enforcement
- ✅ Optimistic updates
- ✅ Toast notifications
- ✅ Comprehensive mock data
- ✅ TypeScript types
- ✅ Integration examples
- ✅ Purple theme matching app

**Ready to deploy!** 🚀

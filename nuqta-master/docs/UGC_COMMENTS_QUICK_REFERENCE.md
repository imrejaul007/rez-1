# UGC Comments Modal - Quick Reference Card

## 🚀 30-Second Integration

```tsx
import { UGCCommentsModal } from '@/components/ugc';

function MyComponent() {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)}>
        <Text>💬 Comments</Text>
      </TouchableOpacity>

      <UGCCommentsModal
        visible={visible}
        contentId="ugc-123"
        contentType="video"
        onClose={() => setVisible(false)}
      />
    </>
  );
}
```

---

## 📋 Props Cheat Sheet

| Prop | Type | Required | Example |
|------|------|----------|---------|
| `visible` | `boolean` | ✅ | `true` |
| `contentId` | `string` | ✅ | `"ugc-123"` |
| `contentType` | `'image' \| 'video'` | ✅ | `"video"` |
| `onClose` | `() => void` | ✅ | `() => setVisible(false)` |
| `contentThumbnail` | `string` | ❌ | `"https://..."` |
| `contentCaption` | `string` | ❌ | `"Amazing product!"` |
| `initialCommentCount` | `number` | ❌ | `24` |
| `onCommentCountChange` | `(n: number) => void` | ❌ | `(n) => setCount(n)` |

---

## 🎯 Common Use Cases

### 1. Basic Comments Button
```tsx
<TouchableOpacity onPress={() => setShowComments(true)}>
  <Ionicons name="chatbubble-outline" size={24} />
  <Text>{commentCount}</Text>
</TouchableOpacity>
```

### 2. With Content Preview
```tsx
<UGCCommentsModal
  visible={showComments}
  contentId={item._id}
  contentType={item.type}
  contentThumbnail={item.thumbnail}
  contentCaption={item.caption}
  onClose={() => setShowComments(false)}
/>
```

### 3. Track Comment Count
```tsx
const [count, setCount] = useState(24);

<UGCCommentsModal
  initialCommentCount={count}
  onCommentCountChange={setCount}
  {...otherProps}
/>
```

---

## 🔧 API Methods

```typescript
// Get comments
await ugcApi.getComments(contentId, limit, offset);

// Post comment
await ugcApi.addComment(contentId, text, parentId?);

// Like comment
await ugcApi.toggleCommentLike(ugcId, commentId);

// Delete comment
await ugcApi.deleteComment(ugcId, commentId);

// Report comment
await ugcApi.reportComment(ugcId, commentId, reason);
```

---

## ✨ Features Summary

- ✅ Post comments (500 char limit)
- ✅ Nested replies (1 level)
- ✅ Like/unlike comments
- ✅ Delete own comments
- ✅ Report inappropriate comments
- ✅ Infinite scroll (20/page)
- ✅ Pull-to-refresh
- ✅ Loading/empty/error states
- ✅ Optimistic updates
- ✅ Character counter
- ✅ Smooth animations
- ✅ Keyboard handling

---

## 🎨 Theme Colors

```typescript
Primary:   #7C3AED  // Purple
Secondary: #6366F1  // Indigo
Like:      #EF4444  // Red heart
Success:   #10B981  // Green
```

---

## 📱 Keyboard Shortcuts

| Action | Method |
|--------|--------|
| Focus input | Auto on reply |
| Send comment | Press send button |
| Dismiss keyboard | Auto on send |
| Close modal | X button or back |

---

## 🐛 Common Issues

### Modal won't open
```tsx
// ❌ Wrong
visible={false}

// ✅ Correct
visible={showComments}
onPress={() => setShowComments(true)}
```

### Toast not showing
```tsx
// Wrap app with ToastProvider
<ToastProvider>
  <YourApp />
</ToastProvider>
```

### Comments not loading
```typescript
// Check API endpoint
console.log('Loading comments for:', contentId);
```

---

## 📦 Files Reference

```
components/ugc/UGCCommentsModal.tsx        - Main component
components/ugc/index.ts                    - Export
services/ugcApi.ts                         - API methods
types/ugc-comments.types.ts                - Types
data/mockCommentsData.ts                   - Mock data
hooks/useToast.ts                          - Toast hook
```

---

## 📚 Full Documentation

1. **Integration Guide**: `UGC_COMMENTS_INTEGRATION_GUIDE.md`
2. **Visual Guide**: `UGC_COMMENTS_VISUAL_GUIDE.md`
3. **Examples**: `components/ugc/UGCCommentsModalExample.tsx`
4. **Summary**: `UGC_COMMENTS_IMPLEMENTATION_SUMMARY.md`

---

## ⚡ Performance Tips

1. Use `initialCommentCount` to avoid flashing
2. Implement `onCommentCountChange` for real-time updates
3. Pre-load user avatar in parent component
4. Use optimistic updates (already implemented)
5. Enable pull-to-refresh for manual refresh

---

## ✅ Testing Checklist

- [ ] Open/close modal
- [ ] Post comment
- [ ] Reply to comment
- [ ] Like comment
- [ ] Delete own comment
- [ ] Report comment
- [ ] Scroll to load more
- [ ] Pull to refresh
- [ ] Test with 0 comments
- [ ] Test with network error

---

## 🎯 Example Integration (Full)

```tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UGCCommentsModal } from '@/components/ugc';

export default function UGCVideoCard({ video }) {
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(video.comments);

  return (
    <View style={styles.container}>
      {/* Video Display */}
      <Video source={{ uri: video.url }} />

      {/* Social Actions */}
      <View style={styles.actions}>
        {/* Like Button */}
        <TouchableOpacity>
          <Ionicons name="heart-outline" size={32} color="#FFF" />
          <Text>{video.likes}</Text>
        </TouchableOpacity>

        {/* Comments Button */}
        <TouchableOpacity onPress={() => setShowComments(true)}>
          <Ionicons name="chatbubble-outline" size={30} color="#FFF" />
          <Text>{commentCount}</Text>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity>
          <Ionicons name="share-social-outline" size={30} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Comments Modal */}
      <UGCCommentsModal
        visible={showComments}
        contentId={video._id}
        contentType="video"
        contentThumbnail={video.thumbnail}
        contentCaption={video.caption}
        initialCommentCount={commentCount}
        onClose={() => setShowComments(false)}
        onCommentCountChange={setCommentCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  actions: {
    position: 'absolute',
    right: 12,
    bottom: 100,
    gap: 24,
  },
});
```

---

## 🚀 Production Checklist

- [x] Component created
- [x] API methods added
- [x] Types defined
- [x] Mock data ready
- [x] Documentation complete
- [ ] Backend endpoints ready
- [ ] ToastProvider integrated
- [ ] User testing done
- [ ] Accessibility tested
- [ ] Performance tested

---

**Ready to use!** 🎉

For detailed documentation, see `UGC_COMMENTS_INTEGRATION_GUIDE.md`

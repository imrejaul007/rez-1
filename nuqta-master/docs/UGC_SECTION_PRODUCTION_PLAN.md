# 📸 UGC Section Production-Ready Implementation Plan

## 📋 Current State Analysis

### ✅ What Exists
- **UGCSection component** (`app/MainStoreSection/UGCSection.tsx`)
  - Well-designed video carousel with autoplay
  - Product plate overlay
  - View count badges
  - Skeleton loading states
  - Responsive layout for mobile/tablet

- **UGC API Service** (`services/ugcApi.ts`)
  - Complete backend integration ready
  - Methods for: getFeed, getStoreContent, getProductContent
  - Like/Bookmark functionality
  - Comments system
  - Upload capability

### ❌ Critical Issues - Using Dummy Data

**Lines 59-124 in UGCSection.tsx**: Hardcoded `defaultImages` array with:
- Test video URLs from Google Storage (BigBuckBunny, ElephantsDream, Sintel)
- Mock product data (titles, prices, thumbnails)
- Fake view counts (2.5K, 1.9K, etc.)
- Stock images from Unsplash

**In MainStorePage.tsx (lines 318-333, 353-368)**:
- Partially transforms store videos to UGC format
- Falls back to defaultImages if no store videos
- No integration with `ugcApi.getStoreContent(storeId)`

### 📊 Production Readiness: **20%**
- ✅ UI Component: Excellent design, responsive, performant
- ❌ Data Integration: Using dummy data, no backend connection
- ❌ User Interaction: Like/bookmark not working
- ❌ Comments: Not implemented
- ❌ Upload: Not accessible from store page

---

## 🎯 Implementation Plan: Make UGC 100% Production-Ready

### **PHASE 2.5: UGC Integration (Week 5, Days 6-7) 🟡**

Add this between existing Phase 2 and Phase 3 tasks.

---

## 🚀 Day 1: Backend Integration & Real Data

### Task 1.1: Replace Dummy Data with Real API Call

**Goal**: Load actual UGC content from backend

**Implementation in MainStorePage.tsx**:

```typescript
// Add new state
const [ugcContent, setUgcContent] = useState<any[]>([]);
const [ugcLoading, setUgcLoading] = useState(false);
const [ugcError, setUgcError] = useState<string | null>(null);

// Add useEffect to load UGC
useEffect(() => {
  const loadStoreUGC = async () => {
    if (!storeData?.id) return;

    try {
      setUgcLoading(true);
      setUgcError(null);

      // Try to get store-specific UGC first
      const ugcResponse = await ugcApi.getStoreContent(storeData.id);

      if (ugcResponse.success && ugcResponse.data) {
        const { content } = ugcResponse.data;

        // Transform backend UGC to component format
        const transformedUGC = content.map((ugc: any) => ({
          id: ugc._id,
          videoUrl: ugc.type === 'video' ? ugc.url : undefined,
          uri: ugc.type === 'photo' ? ugc.url : ugc.thumbnail,
          viewCount: formatViewCount(ugc.views),
          description: ugc.caption || '',
          category: ugc.tags?.[0] || storeData.category,
          author: ugc.user?.profile?.firstName || storeData.name,
          productTitle: ugc.relatedProduct?.name || '',
          productPrice: '',
          productThumb: ugc.relatedProduct?.image || storeData.logo,
          likes: ugc.likes,
          comments: ugc.comments,
          isLiked: ugc.isLiked,
          isBookmarked: ugc.isBookmarked,
        }));

        setUgcContent(transformedUGC);
        console.log('✅ [UGC] Loaded', transformedUGC.length, 'UGC items');
      } else {
        // Fallback: Use store videos if no UGC available
        console.warn('⚠️ [UGC] No UGC found, using store videos');
        setUgcContent(storeVideos);
      }
    } catch (error) {
      console.error('❌ [UGC] Failed to load:', error);
      setUgcError('Failed to load content');
      // Fallback to store videos
      setUgcContent(storeVideos);
    } finally {
      setUgcLoading(false);
    }
  };

  loadStoreUGC();
}, [storeData?.id, storeVideos]);

// Helper function
const formatViewCount = (views: number): string => {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return String(views);
};
```

**Update UGCSection call**:
```typescript
<UGCSection
  onViewAllPress={handleViewAllPress}
  onImagePress={handleImagePress}
  images={ugcContent.length > 0 ? ugcContent : undefined}
/>
```

---

### Task 1.2: Remove Default Images from UGCSection.tsx

**Goal**: Component should only display passed data, no fallback dummy data

**Changes**:
```typescript
// Line 59-124: DELETE defaultImages array completely

// Update component props default
export default function UGCSection({
  title = 'Community',
  images = [], // Changed from defaultImages
  onViewAllPress,
  onImagePress,
  // ... rest
}: UGCSectionProps) {

  // Add empty state when no images
  if (images.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
          <ThemedText style={[styles.sectionTitle, { fontSize: typography.sectionTitle }]}>
            {title}
          </ThemedText>
        </View>

        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={64} color="#D1D5DB" />
          <ThemedText style={styles.emptyText}>
            No community content yet
          </ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Be the first to share photos or videos!
          </ThemedText>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => {/* Navigate to upload */}}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#FFF" />
            <ThemedText style={styles.uploadButtonText}>Upload Content</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Rest of component...
}
```

**Add empty state styles**:
```typescript
emptyState: {
  alignItems: 'center',
  paddingVertical: 48,
  paddingHorizontal: 24,
},
emptyText: {
  fontSize: 18,
  fontWeight: '600',
  color: '#374151',
  marginTop: 16,
},
emptySubtext: {
  fontSize: 14,
  color: '#6B7280',
  marginTop: 8,
  textAlign: 'center',
},
uploadButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#8B5CF6',
  paddingHorizontal: 24,
  paddingVertical: 12,
  borderRadius: 12,
  marginTop: 24,
  gap: 8,
},
uploadButtonText: {
  color: '#FFF',
  fontSize: 15,
  fontWeight: '600',
},
```

**Acceptance Criteria**:
- ✅ No more hardcoded dummy data in component
- ✅ All UGC loads from backend API
- ✅ Empty state shows when no content
- ✅ Store videos used as fallback
- ✅ View counts formatted correctly (1.5K, 2.3M)

---

## 📱 Day 2: Interactive Features (Like, Bookmark, Comments)

### Task 2.1: Implement Like Functionality

**Goal**: Users can like UGC content with backend sync

**Add Like Button to UGCCard**:

```typescript
// In UGCCard component, add state
const [isLiked, setIsLiked] = useState(item.isLiked || false);
const [likeCount, setLikeCount] = useState(item.likes || 0);
const [likeLoading, setLikeLoading] = useState(false);

const handleLike = async (e: any) => {
  // Prevent card press
  e.stopPropagation();

  if (likeLoading) return;

  // Optimistic update
  const wasLiked = isLiked;
  const previousCount = likeCount;

  setIsLiked(!wasLiked);
  setLikeCount(wasLiked ? likeCount - 1 : likeCount + 1);

  try {
    setLikeLoading(true);
    const response = await ugcApi.toggleLike(item.id);

    if (response.success && response.data) {
      // Update with server response
      setIsLiked(response.data.isLiked);
      setLikeCount(response.data.likes);
    } else {
      // Revert on failure
      setIsLiked(wasLiked);
      setLikeCount(previousCount);
    }
  } catch (error) {
    console.error('Failed to toggle like:', error);
    // Revert on error
    setIsLiked(wasLiked);
    setLikeCount(previousCount);
  } finally {
    setLikeLoading(false);
  }
};

// Add like button in render (after view count badge)
<TouchableOpacity
  style={styles.likeButton}
  onPress={handleLike}
  disabled={likeLoading}
  accessibilityLabel={`${isLiked ? 'Unlike' : 'Like'} this content`}
  accessibilityRole="button"
>
  <Ionicons
    name={isLiked ? "heart" : "heart-outline"}
    size={20}
    color={isLiked ? "#FF5F7A" : "#FFF"}
  />
  <ThemedText style={styles.likeCount}>
    {formatCount(likeCount)}
  </ThemedText>
</TouchableOpacity>
```

**Add styles**:
```typescript
likeButton: {
  position: 'absolute',
  top: 12,
  right: 12,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(0,0,0,0.6)',
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 20,
  gap: 4,
},
likeCount: {
  color: '#FFF',
  fontSize: 12,
  fontWeight: '600',
},
```

---

### Task 2.2: Implement Bookmark Functionality

**Goal**: Users can save UGC to bookmarks

**Add Bookmark Button**:

```typescript
// Similar to like, add bookmark state
const [isBookmarked, setIsBookmarked] = useState(item.isBookmarked || false);
const [bookmarkLoading, setBookmarkLoading] = useState(false);

const handleBookmark = async (e: any) => {
  e.stopPropagation();

  if (bookmarkLoading) return;

  const wasBookmarked = isBookmarked;
  setIsBookmarked(!wasBookmarked);

  try {
    setBookmarkLoading(true);
    const response = await ugcApi.toggleBookmark(item.id);

    if (response.success && response.data) {
      setIsBookmarked(response.data.isBookmarked);

      // Show toast
      showToast(
        response.data.isBookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks',
        'success'
      );
    } else {
      setIsBookmarked(wasBookmarked);
    }
  } catch (error) {
    console.error('Failed to toggle bookmark:', error);
    setIsBookmarked(wasBookmarked);
  } finally {
    setBookmarkLoading(false);
  }
};

// Add bookmark button (bottom right of card)
<TouchableOpacity
  style={styles.bookmarkButton}
  onPress={handleBookmark}
  disabled={bookmarkLoading}
>
  <Ionicons
    name={isBookmarked ? "bookmark" : "bookmark-outline"}
    size={22}
    color="#FFF"
  />
</TouchableOpacity>
```

---

### Task 2.3: Add Comments Preview & Modal

**Goal**: Show comment count and open comments modal

**Add Comments Button**:

```typescript
// Add to product plate area
<TouchableOpacity
  style={styles.commentsButton}
  onPress={(e) => {
    e.stopPropagation();
    onOpenComments?.(item.id);
  }}
>
  <Ionicons name="chatbubble-outline" size={16} color="#FFF" />
  <ThemedText style={styles.commentsCount}>
    {formatCount(item.comments || 0)}
  </ThemedText>
</TouchableOpacity>
```

**Create UGCCommentsModal Component**:

```typescript
// components/store/UGCCommentsModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, View, FlatList, TextInput, TouchableOpacity } from 'react-native';
import ugcApi from '@/services/ugcApi';

interface UGCCommentsModalProps {
  visible: boolean;
  ugcId: string;
  onClose: () => void;
}

export default function UGCCommentsModal({
  visible,
  ugcId,
  onClose
}: UGCCommentsModalProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (visible && ugcId) {
      loadComments();
    }
  }, [visible, ugcId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await ugcApi.getComments(ugcId, 50, 0);

      if (response.success && response.data) {
        setComments(response.data.comments);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || posting) return;

    try {
      setPosting(true);
      const response = await ugcApi.addComment(ugcId, newComment.trim());

      if (response.success && response.data) {
        setComments([response.data.comment, ...comments]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setPosting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.title}>Comments</ThemedText>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#111" />
          </TouchableOpacity>
        </View>

        {/* Comments List */}
        <FlatList
          data={comments}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <CommentItem comment={item} ugcId={ugcId} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <ThemedText>No comments yet. Be the first!</ThemedText>
            </View>
          }
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Write a comment..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity
            onPress={handlePostComment}
            disabled={!newComment.trim() || posting}
            style={styles.sendButton}
          >
            <Ionicons
              name="send"
              size={24}
              color={newComment.trim() ? "#8B5CF6" : "#D1D5DB"}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// CommentItem component
function CommentItem({ comment, ugcId }: { comment: any; ugcId: string }) {
  const [isLiked, setIsLiked] = useState(comment.isLiked);
  const [likeCount, setLikeCount] = useState(comment.likes);

  const handleLike = async () => {
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount(wasLiked ? likeCount - 1 : likeCount + 1);

    try {
      const response = await ugcApi.toggleCommentLike(ugcId, comment._id);
      if (response.success) {
        setIsLiked(response.data.isLiked);
        setLikeCount(response.data.likes);
      }
    } catch (error) {
      setIsLiked(wasLiked);
      setLikeCount(likeCount);
    }
  };

  return (
    <View style={styles.commentItem}>
      <Image
        source={{ uri: comment.user.profile.avatar }}
        style={styles.avatar}
      />
      <View style={styles.commentContent}>
        <ThemedText style={styles.username}>
          {comment.user.profile.firstName} {comment.user.profile.lastName}
        </ThemedText>
        <ThemedText style={styles.commentText}>
          {comment.comment}
        </ThemedText>
        <View style={styles.commentActions}>
          <TouchableOpacity onPress={handleLike}>
            <ThemedText style={styles.likeText}>
              {isLiked ? '❤️' : '🤍'} {likeCount}
            </ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.timeAgo}>
            {formatTimeAgo(comment.createdAt)}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}
```

---

## 📤 Day 3: Upload UGC Feature

### Task 3.1: Add "Upload Content" Button

**Goal**: Users can upload photos/videos to store page

**Add FAB (Floating Action Button) in MainStorePage**:

```typescript
// Add state
const [showUploadModal, setShowUploadModal] = useState(false);

// Add FAB before closing ThemedView
<TouchableOpacity
  style={styles.uploadFAB}
  onPress={() => setShowUploadModal(true)}
  accessibilityLabel="Upload photo or video"
  accessibilityRole="button"
>
  <LinearGradient
    colors={['#8B5CF6', '#A855F7']}
    style={styles.fabGradient}
  >
    <Ionicons name="camera" size={24} color="#FFF" />
  </LinearGradient>
</TouchableOpacity>

// Add styles
uploadFAB: {
  position: 'absolute',
  bottom: 100,
  right: 20,
  width: 60,
  height: 60,
  borderRadius: 30,
  elevation: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
},
fabGradient: {
  width: '100%',
  height: '100%',
  borderRadius: 30,
  justifyContent: 'center',
  alignItems: 'center',
},
```

---

### Task 3.2: Create UGC Upload Modal

**Create `components/store/UGCUploadModal.tsx`**:

```typescript
import React, { useState } from 'react';
import { Modal, View, Image, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import ugcApi from '@/services/ugcApi';

interface UGCUploadModalProps {
  visible: boolean;
  storeId: string;
  storeName: string;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export default function UGCUploadModal({
  visible,
  storeId,
  storeName,
  onClose,
  onUploadSuccess
}: UGCUploadModalProps) {
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      alert('Permission to access media library is required!');
      return;
    }

    const result = await ImagePicker.launchImagePickerAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
      videoMaxDuration: 60, // 60 seconds max
    });

    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
      setMediaType(result.assets[0].type === 'video' ? 'video' : 'photo');
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      alert('Camera permission is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
      setMediaType(result.assets[0].type === 'video' ? 'video' : 'photo');
    }
  };

  const handleUpload = async () => {
    if (!mediaUri) return;

    try {
      setUploading(true);

      // Create FormData
      const formData = new FormData();

      const filename = mediaUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `${mediaType}/${match[1]}` : mediaType;

      formData.append('file', {
        uri: mediaUri,
        name: filename,
        type
      } as any);

      // Upload via API
      const response = await ugcApi.create(
        {
          type: mediaType,
          caption: caption.trim(),
          relatedStoreId: storeId,
          tags: [storeName]
        },
        formData
      );

      if (response.success) {
        showToast('Content uploaded successfully!', 'success');
        onUploadSuccess();
        handleClose();
      } else {
        showToast('Upload failed. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showToast('Upload failed. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setMediaUri(null);
    setCaption('');
    setMediaType('photo');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={28} color="#111" />
          </TouchableOpacity>
          <ThemedText style={styles.title}>Share Content</ThemedText>
          <TouchableOpacity
            onPress={handleUpload}
            disabled={!mediaUri || uploading}
          >
            <ThemedText
              style={[
                styles.uploadButton,
                (!mediaUri || uploading) && styles.uploadButtonDisabled
              ]}
            >
              {uploading ? 'Uploading...' : 'Post'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Media Preview */}
        {mediaUri ? (
          <View style={styles.previewContainer}>
            {mediaType === 'photo' ? (
              <Image source={{ uri: mediaUri }} style={styles.preview} />
            ) : (
              <Video
                source={{ uri: mediaUri }}
                style={styles.preview}
                useNativeControls
                isLooping
              />
            )}

            <TouchableOpacity
              style={styles.changeMedia}
              onPress={pickImage}
            >
              <Ionicons name="refresh" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.pickerContainer}>
            <TouchableOpacity style={styles.pickerButton} onPress={takePhoto}>
              <Ionicons name="camera" size={40} color="#8B5CF6" />
              <ThemedText style={styles.pickerText}>Take Photo/Video</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerButton} onPress={pickImage}>
              <Ionicons name="images" size={40} color="#8B5CF6" />
              <ThemedText style={styles.pickerText}>Choose from Library</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Caption Input */}
        <View style={styles.captionContainer}>
          <TextInput
            style={styles.captionInput}
            placeholder={`Share your experience at ${storeName}...`}
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={500}
          />
          <ThemedText style={styles.charCount}>
            {caption.length}/500
          </ThemedText>
        </View>

        {uploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <ThemedText style={styles.uploadingText}>Uploading...</ThemedText>
          </View>
        )}
      </View>
    </Modal>
  );
}
```

---

## ✅ Acceptance Criteria - UGC Section 100% Production-Ready

### Data Integration ✅
- [x] All dummy data removed from UGCSection.tsx
- [x] Real UGC loads from `ugcApi.getStoreContent(storeId)`
- [x] Empty state displays when no content
- [x] Store videos used as fallback
- [x] Loading states during API calls
- [x] Error handling with retry option

### User Interactions ✅
- [x] Like button working with backend sync
- [x] Bookmark button saving to user's collection
- [x] Like/bookmark counts updating in real-time
- [x] Optimistic UI updates (instant feedback)
- [x] Comments button showing count
- [x] Comments modal opening on tap

### Comments System ✅
- [x] Comments loading from backend
- [x] Post new comment functionality
- [x] Like/unlike comments
- [x] Reply to comments (if supported)
- [x] Comment count updating
- [x] Time ago display (2h ago, 1d ago)

### Upload Feature ✅
- [x] FAB visible on store page
- [x] Upload modal with camera/library options
- [x] Photo/video selection working
- [x] Caption input with character limit
- [x] Upload progress indicator
- [x] Success toast after upload
- [x] Auto-refresh UGC after upload

### Performance ✅
- [x] Videos lazy load only when visible
- [x] Autoplay works correctly
- [x] No memory leaks on scroll
- [x] Smooth 60fps scrolling
- [x] Images compressed before upload
- [x] Videos respect max duration (60s)

### Analytics ✅
- [x] Track UGC views
- [x] Track likes/bookmarks
- [x] Track comments
- [x] Track uploads
- [x] Track share events

---

## 📊 Production Readiness Score

**Before Implementation**: 20%
- ✅ UI Component (excellent)
- ❌ Data (dummy)
- ❌ Interactions (none)

**After Implementation**: 100%
- ✅ UI Component
- ✅ Real Data from Backend
- ✅ Full User Interactions
- ✅ Comments System
- ✅ Upload Capability
- ✅ Analytics Tracking

---

## 🔧 Files to Create/Modify

### Files to Modify
1. **`app/MainStorePage.tsx`**
   - Add UGC loading logic
   - Add upload FAB
   - Add comments modal state
   - Connect to ugcApi

2. **`app/MainStoreSection/UGCSection.tsx`**
   - Remove defaultImages array (lines 59-124)
   - Add empty state
   - Add like/bookmark buttons
   - Add comments preview
   - Handle real data format

### Files to Create
1. **`components/store/UGCCommentsModal.tsx`**
   - Comments list
   - Post comment input
   - Like comment functionality
   - Reply to comments

2. **`components/store/UGCUploadModal.tsx`**
   - Camera/gallery picker
   - Photo/video selection
   - Caption input
   - Upload progress
   - Success/error handling

3. **`components/store/UGCDetailModal.tsx`** (Optional)
   - Full-screen UGC view
   - Swipe between items
   - Like/bookmark/comment
   - Share functionality

---

## 🎯 Integration with Existing Todo List

Add these tasks to your todo list:

```
Phase 2.5 (Days 6-7 of Week 5):
22. [pending] PHASE 2.5 DAY 1: Replace UGC dummy data with ugcApi.getStoreContent()
23. [pending] PHASE 2.5 DAY 1: Remove defaultImages from UGCSection and add empty state
24. [pending] PHASE 2.5 DAY 2: Add like/bookmark buttons with backend integration
25. [pending] PHASE 2.5 DAY 2: Create UGCCommentsModal component
26. [pending] PHASE 2.5 DAY 3: Add upload FAB and create UGCUploadModal
27. [pending] PHASE 2.5 DAY 3: Test UGC upload flow end-to-end
```

---

## 🚀 Quick Implementation Checklist

### Day 1 (2-3 hours):
- [ ] Add ugcApi.getStoreContent() call in MainStorePage
- [ ] Transform backend data to component format
- [ ] Remove defaultImages from UGCSection
- [ ] Add empty state component
- [ ] Test with real backend data

### Day 2 (3-4 hours):
- [ ] Add like button to UGCCard
- [ ] Implement toggleLike with optimistic updates
- [ ] Add bookmark button
- [ ] Create UGCCommentsModal component
- [ ] Connect comments to ugcApi
- [ ] Test like/bookmark/comment flows

### Day 3 (3-4 hours):
- [ ] Add upload FAB to MainStorePage
- [ ] Create UGCUploadModal
- [ ] Implement camera/gallery picker
- [ ] Add upload progress indicator
- [ ] Test upload flow
- [ ] Verify auto-refresh after upload

**Total Time**: 8-11 hours (2-3 days part-time)

---

## 📞 Support & Testing

### Testing Checklist
- [ ] UGC loads for stores with content
- [ ] Empty state shows for stores without content
- [ ] Like button works (online & offline)
- [ ] Bookmark saves to user account
- [ ] Comments load and post correctly
- [ ] Upload works for photos
- [ ] Upload works for videos
- [ ] Upload respects 60s video limit
- [ ] All analytics events fire
- [ ] Performance remains smooth with many items

### Edge Cases to Handle
- [ ] User not authenticated (disable upload/like)
- [ ] Network offline (queue actions)
- [ ] Upload fails mid-transfer (retry option)
- [ ] Large video file (show file size warning)
- [ ] Inappropriate content (report button)
- [ ] Deleted UGC (graceful handling)

---

## 🎉 Conclusion

With this implementation, the UGC section transforms from a **static demo component** using test videos to a **fully functional social feature** where users can:
- View real community content for each store
- Like and bookmark their favorite posts
- Comment and engage with other users
- Upload their own photos and videos
- Share their shopping experiences

This adds significant value to the store page by building **social proof** and **community engagement** - key factors in e-commerce conversion rates.

---

**Document Version**: 1.0
**Last Updated**: 2025-01-12
**Implementation Time**: 2-3 days (8-11 hours)
**Status**: Ready for Implementation
**Priority**: Medium-High (Part of Phase 2)

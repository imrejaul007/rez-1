# UGC Upload System Integration Guide

## Overview

This guide explains how to integrate the comprehensive UGC upload system (FAB + Modal) into your application.

## Components Created

### 1. `components/ugc/UGCUploadFAB.tsx`
- **Purpose**: Floating Action Button for triggering UGC upload
- **Features**:
  - Purple (#7C3AED) 60x60 button with camera icon
  - Animated entrance with scale and rotate
  - Haptic feedback on press
  - Elevation shadow
  - Configurable position
  - Show/hide animation

### 2. `components/ugc/UGCUploadModal.tsx`
- **Purpose**: Full-screen multi-step upload modal
- **Features**:
  - **Step 1: Media Selection** - Choose camera or library
  - **Step 2: Preview & Edit** - Caption, tags, privacy
  - **Step 3: Details** - Category, hashtags
  - **Step 4: Uploading** - Progress bar, cancel option
  - **Step 5: Success** - Confirmation with actions

### 3. `services/ugcUploadService.ts`
- **Purpose**: Upload service with progress tracking
- **Features**:
  - XMLHttpRequest for progress monitoring
  - File validation
  - Error handling
  - Auth token integration

## Installation

All components are already created. No additional packages needed (expo-image-picker is already installed).

## Integration Steps

### Step 1: Import Components

```typescript
import UGCUploadFAB from '@/components/ugc/UGCUploadFAB';
import UGCUploadModal from '@/components/ugc/UGCUploadModal';
import { useAuth } from '@/contexts/AuthContext'; // For authentication check
```

### Step 2: Add State Management

```typescript
const [showUploadModal, setShowUploadModal] = useState(false);
const { isAuthenticated } = useAuth();
```

### Step 3: Add FAB to Your Screen

**Example for MainStorePage.tsx:**

```typescript
// Around line 1050, before </ThemedView> closing tag:

{/* UGC Upload FAB - Only show if user is authenticated */}
{isAuthenticated && (
  <UGCUploadFAB
    onPress={() => setShowUploadModal(true)}
    visible={true}
    bottom={90} // Position above bottom nav if needed
    right={20}
  />
)}

{/* UGC Upload Modal */}
<UGCUploadModal
  visible={showUploadModal}
  onClose={() => setShowUploadModal(false)}
  storeId={storeData?.id || params.storeId as string}
  onUploadSuccess={(contentId) => {
    console.log('Upload successful:', contentId);
    // Optionally refresh UGC content
    // or navigate to the uploaded content
  }}
/>
```

### Step 4: Update UGCSection Component (Optional)

To pass storeId to UGCSection:

```typescript
<UGCSection
  onViewAllPress={handleViewAllPress}
  onImagePress={handleImagePress}
  images={storeVideos.length > 0 ? storeVideos : undefined}
  storeId={storeData?.id || params.storeId as string}
/>
```

## Upload Flow

### Step 1: Media Selection
- User can choose to take photo/video with camera
- Or select existing media from library
- Validation happens immediately:
  - Max 10MB for images
  - Max 50MB for videos
  - Formats: jpg, png, mp4, mov

### Step 2: Preview & Caption
- Media preview (image or video with controls)
- Multi-line caption input (max 500 chars)
- Character counter
- Tag Product checkbox (if productId provided)
- Tag Location checkbox
- Privacy selector (Public/Private/Friends)

### Step 3: Details Form
- Category selection:
  - Product Review
  - Tutorial
  - Unboxing
  - Experience
- Hashtag input with chips
- Max 10 hashtags
- Add/remove functionality

### Step 4: Uploading
- Progress bar (0-100%)
- Animated spinner
- Upload status message
- Cancel button with confirmation

### Step 5: Success
- Animated checkmark (scale animation)
- Success message
- "View Post" button
- "Upload Another" button
- Auto-close after 3 seconds

## API Integration

### Upload Endpoint
```
POST /api/ugc
```

### FormData Structure
```javascript
{
  file: File, // Image or video file
  type: 'photo' | 'video',
  caption: string,
  tags: string[], // JSON array
  relatedStoreId: string, // Optional
  relatedProductId: string, // Optional
}
```

### Progress Tracking

The upload uses XMLHttpRequest for real-time progress:

```typescript
xhr.upload.addEventListener('progress', (event) => {
  if (event.lengthComputable) {
    const percentComplete = Math.round((event.loaded / event.total) * 100);
    onProgress(percentComplete);
  }
});
```

## File Validation Rules

### Images
- **Max Size**: 10MB
- **Formats**: jpg, jpeg, png, gif, webp
- **Recommended**: 1080x1920 (9:16 aspect ratio)

### Videos
- **Max Size**: 50MB
- **Formats**: mp4, mov, avi, mkv
- **Max Duration**: 60 seconds
- **Recommended**: 1080x1920 (9:16 aspect ratio)

### Caption
- **Max Length**: 500 characters
- **Character counter** shown

### Hashtags
- **Max Count**: 10
- **No duplicates** allowed
- **Format**: Plain text (# added automatically in display)

## Error Handling

### Network Errors
```typescript
{
  success: false,
  message: 'Network error during upload',
  error: 'Details...'
}
```

### Validation Errors
```typescript
{
  success: false,
  message: 'File size exceeds 10MB limit',
  error: 'Validation failed'
}
```

### Server Errors
```typescript
{
  success: false,
  message: 'Upload failed with status 500',
  error: 'Server error'
}
```

All errors are displayed in a red error banner at the top of the modal.

## Permissions

The modal automatically requests:
- Camera permission
- Media library permission

If denied, shows alert:
```
"Permissions Required"
"Please grant camera and media library permissions to upload content."
```

## Styling

### Theme Colors
- **Primary**: #7C3AED (Purple)
- **Secondary**: #8B5CF6 (Light Purple)
- **Success**: #10B981 (Green)
- **Error**: #EF4444 (Red)
- **Background**: #F9FAFB (Light Gray)

### FAB Styling
- **Size**: 60x60px
- **Border Radius**: 30px (circular)
- **Shadow**: Elevation 8
- **Icon**: camera (28px)

### Modal Styling
- **Full Screen**: Takes entire viewport
- **Header**: Purple gradient
- **Content**: White cards with shadows
- **Buttons**: Gradient purple primary, outlined secondary

## Usage Examples

### Basic Usage (Current Screen)
```typescript
<UGCUploadFAB
  onPress={() => setShowUploadModal(true)}
  visible={true}
/>

<UGCUploadModal
  visible={showUploadModal}
  onClose={() => setShowUploadModal(false)}
/>
```

### With Store Tagging
```typescript
<UGCUploadModal
  visible={showUploadModal}
  onClose={() => setShowUploadModal(false)}
  storeId="store-123"
  onUploadSuccess={(contentId) => {
    // Handle success
    refreshUGCFeed();
  }}
/>
```

### With Product Tagging
```typescript
<UGCUploadModal
  visible={showUploadModal}
  onClose={() => setShowUploadModal(false)}
  storeId="store-123"
  productId="product-456"
  onUploadSuccess={(contentId) => {
    router.push(`/ugc/${contentId}`);
  }}
/>
```

### Hide FAB on Scroll (Optional)
```typescript
const [fabVisible, setFabVisible] = useState(true);
const scrollY = useRef(0);

const handleScroll = (event: any) => {
  const currentScrollY = event.nativeEvent.contentOffset.y;
  setFabVisible(currentScrollY < scrollY.current);
  scrollY.current = currentScrollY;
};

<ScrollView onScroll={handleScroll} scrollEventThrottle={16}>
  {/* Content */}
</ScrollView>

<UGCUploadFAB
  onPress={() => setShowUploadModal(true)}
  visible={fabVisible}
/>
```

## Authentication Check

Always check if user is authenticated before showing FAB:

```typescript
import { useAuth } from '@/contexts/AuthContext';

const { isAuthenticated, user } = useAuth();

// Only show FAB if authenticated
{isAuthenticated && (
  <UGCUploadFAB onPress={() => setShowUploadModal(true)} />
)}
```

If not authenticated, prompt user to sign in:

```typescript
const handleFABPress = () => {
  if (!isAuthenticated) {
    Alert.alert(
      'Sign In Required',
      'Please sign in to upload content',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/sign-in') }
      ]
    );
    return;
  }
  setShowUploadModal(true);
};
```

## Best Practices

1. **Always check authentication** before showing upload FAB
2. **Validate files** before upload (size, format)
3. **Show progress** to user during upload
4. **Handle errors gracefully** with user-friendly messages
5. **Provide feedback** with haptics and animations
6. **Auto-refresh content** after successful upload
7. **Clear state** when modal closes
8. **Test on device** (camera/permissions work differently than simulator)

## Testing Checklist

- [ ] FAB appears and animates correctly
- [ ] Modal opens on FAB press
- [ ] Camera permission requested
- [ ] Library permission requested
- [ ] Can take photo with camera
- [ ] Can take video with camera
- [ ] Can select photo from library
- [ ] Can select video from library
- [ ] File validation works (size, format)
- [ ] Caption input works (with counter)
- [ ] Hashtag input works (add/remove)
- [ ] Category selection works
- [ ] Privacy selection works
- [ ] Upload progress shows
- [ ] Cancel upload works
- [ ] Success animation plays
- [ ] Auto-close works after 3s
- [ ] onUploadSuccess callback works
- [ ] Error messages display correctly
- [ ] Works on both iOS and Android
- [ ] Works on web (if applicable)

## Troubleshooting

### FAB not showing
- Check if `isAuthenticated` is true
- Check if `visible` prop is set to true
- Check z-index conflicts

### Upload fails
- Check backend URL in environment variables
- Check auth token is being sent
- Check file size limits
- Check network connection

### Permissions denied
- Request permissions earlier in app flow
- Show explanation before requesting
- Guide user to app settings if needed

### Camera not working on iOS
- Add camera usage description to app.json:
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Allow access to camera to take photos and videos",
        "NSPhotoLibraryUsageDescription": "Allow access to photos to select media"
      }
    }
  }
}
```

## Support

For issues or questions:
1. Check console logs for errors
2. Verify API endpoint is correct
3. Test with mock data first
4. Check auth token is valid

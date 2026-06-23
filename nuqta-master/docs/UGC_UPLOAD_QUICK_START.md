# UGC Video Upload - Quick Start Guide

## Quick Access

Navigate to upload screen from anywhere:
```typescript
import { useRouter } from 'expo-router';

const router = useRouter();
router.push('/ugc-upload');
```

---

## Component Architecture

```
ugc-upload.tsx (Main Screen)
├── PurpleGradientBg (Background)
├── SourcePicker (When no video selected)
│   ├── Camera Option
│   ├── Gallery Option
│   └── URL Option (with modal)
└── Upload Form (When video selected)
    ├── Video Preview
    ├── UploadProgress (during upload)
    ├── Form Fields (title, description, hashtags)
    └── Upload Button
```

---

## Hook Usage

```typescript
import { useVideoUpload } from '@/hooks/useVideoUpload';

const {
  state,              // Current upload state
  selectFromCamera,   // Launch camera
  selectFromGallery,  // Open gallery
  setUrlVideo,        // Import from URL
  updateTitle,        // Set video title
  updateDescription,  // Set description
  updateHashtags,     // Set hashtags (comma-separated)
  clearVideo,         // Remove selected video
  uploadToCloudinary, // Upload (placeholder)
  canUpload,          // Boolean: ready to upload
  isUploading,        // Boolean: upload in progress
} = useVideoUpload();
```

---

## State Structure

```typescript
state = {
  source: 'camera' | 'gallery' | 'url' | null,
  video: {
    uri: string,
    fileName: string,
    fileSize: number,
    mimeType: string,
    duration: number,
    width?: number,
    height?: number,
  } | null,
  title: string,
  description: string,
  hashtags: string[],
  status: 'idle' | 'selecting' | 'selected' | 'uploading' | 'processing' | 'complete' | 'error',
  progress: {
    bytesUploaded: number,
    totalBytes: number,
    percentage: number,
    uploadSpeed?: number,
    estimatedTimeRemaining?: number,
  } | null,
  error: string | null,
  validationErrors: Array<{field: string, message: string}>,
}
```

---

## Standalone Component Usage

### SourcePicker
```typescript
import { SourcePicker } from '@/components/ugc';

<SourcePicker
  onSelectCamera={() => console.log('Camera')}
  onSelectGallery={() => console.log('Gallery')}
  onSelectUrl={(url) => console.log('URL:', url)}
  disabled={false}
/>
```

### UploadProgress
```typescript
import { UploadProgress } from '@/components/ugc';

<UploadProgress
  status="uploading"
  progress={{
    bytesUploaded: 5000000,
    totalBytes: 10000000,
    percentage: 50,
    uploadSpeed: 500000,
    estimatedTimeRemaining: 10,
  }}
  onCancel={() => console.log('Cancelled')}
  showCancel={true}
/>
```

---

## Validation Rules

```typescript
import { DEFAULT_VIDEO_RULES } from '@/types/ugc-upload.types';

// Rules:
maxFileSize: 100 MB
maxDuration: 180 seconds (3 minutes)
minDuration: 3 seconds
allowedFormats: ['mp4', 'mov', 'avi', 'mkv']
maxTitleLength: 100 characters
maxDescriptionLength: 500 characters
maxHashtags: 10
```

---

## Example Flow

```typescript
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';

export default function MyScreen() {
  const router = useRouter();

  return (
    <TouchableOpacity onPress={() => router.push('/ugc-upload')}>
      <Text>Upload Video</Text>
    </TouchableOpacity>
  );
}
```

---

## Permissions

The hook automatically handles:
- Camera permission request
- Media library permission request
- Permission denied error states

Permissions are requested when user selects a source.

---

## Cloudinary Integration (Next Phase)

The `uploadToCloudinary` function is a placeholder. Next agent should:

1. Create `services/cloudinaryUploadService.ts`
2. Implement upload logic
3. Update `useVideoUpload.ts` hook
4. Add progress tracking
5. Handle errors

Example implementation location:
```typescript
// hooks/useVideoUpload.ts - Line ~360
const uploadToCloudinary = useCallback(async (): Promise<boolean> => {
  // TODO: Implement Cloudinary upload
  // See UGC_UPLOAD_PHASE2_PART1_SUMMARY.md for details
}, []);
```

---

## Testing

Quick manual test:
1. Navigate to `/ugc-upload`
2. Select a video source
3. Choose/record a video
4. Fill in title (required)
5. Add description (optional)
6. Add hashtags: `fashion, style, trending`
7. Click "Upload Video"
8. Check console logs

---

## Files Reference

| File | Purpose | Lines |
|------|---------|-------|
| `types/ugc-upload.types.ts` | TypeScript types | 176 |
| `hooks/useVideoUpload.ts` | State management | 391 |
| `components/ugc/SourcePicker.tsx` | Source selection | 366 |
| `components/ugc/UploadProgress.tsx` | Progress UI | 345 |
| `app/ugc-upload.tsx` | Main screen | 639 |
| `components/ugc/index.ts` | Exports | 5 |

---

## Common Issues

### Permission Denied
- User denies camera/media permission
- Error shown automatically
- User must enable in Settings

### Video Too Large
- Max 100MB
- Validation error shown
- User must select smaller video

### Missing Title
- Upload button disabled
- Title is required field
- User must enter title

---

## Styling

All components use:
- Purple gradient background (#667eea to #764ba2)
- White cards with shadows
- Consistent spacing (8px, 12px, 16px, 20px, 24px)
- Ionicons for all icons
- Rounded corners (8px, 12px, 16px, 20px)

Colors:
- Primary: #8B5CF6 (purple)
- Secondary: #EC4899 (pink)
- Accent: #3B82F6 (blue)
- Success: #10B981 (green)
- Error: #EF4444 (red)
- Text: #333 (dark), #666 (medium), #999 (light)

---

## Next Steps

1. Test the UI thoroughly
2. Implement Cloudinary service (Phase 2 Part 2)
3. Integrate with backend API
4. Add analytics tracking
5. Add to main navigation

---

## Support

For issues or questions about this implementation, refer to:
- `UGC_UPLOAD_PHASE2_PART1_SUMMARY.md` - Full documentation
- Code comments in each file
- TypeScript types for API contracts

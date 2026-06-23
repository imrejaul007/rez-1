# UGC Upload System - Quick Reference

## 🚀 Quick Start (3 Steps)

### 1. Import
```typescript
import UGCUploadFAB from '@/components/ugc/UGCUploadFAB';
import UGCUploadModal from '@/components/ugc/UGCUploadModal';
import { useAuth } from '@/contexts/AuthContext';
```

### 2. Add State
```typescript
const [showUploadModal, setShowUploadModal] = useState(false);
const { isAuthenticated } = useAuth();
```

### 3. Add Components
```typescript
{isAuthenticated && (
  <>
    <UGCUploadFAB onPress={() => setShowUploadModal(true)} />
    <UGCUploadModal
      visible={showUploadModal}
      onClose={() => setShowUploadModal(false)}
      storeId={storeId}
      onUploadSuccess={(id) => console.log('Success:', id)}
    />
  </>
)}
```

---

## 📁 File Structure

```
frontend/
├── components/
│   └── ugc/
│       ├── UGCUploadFAB.tsx          ← Floating Action Button
│       └── UGCUploadModal.tsx        ← Upload Modal (5 steps)
├── services/
│   ├── ugcApi.ts                     ← API methods (existing)
│   └── ugcUploadService.ts           ← Upload with progress
└── docs/
    ├── UGC_UPLOAD_INTEGRATION_GUIDE.md
    ├── UGC_UPLOAD_DELIVERY_SUMMARY.md
    └── UGC_UPLOAD_QUICK_REFERENCE.md  ← This file
```

---

## 🎨 Components

### UGCUploadFAB

**Purpose**: Trigger upload modal

**Props**:
```typescript
{
  onPress: () => void;          // Required
  visible?: boolean;            // Default: true
  bottom?: number;              // Default: 80
  right?: number;               // Default: 20
  style?: ViewStyle;            // Optional
}
```

**Example**:
```typescript
<UGCUploadFAB
  onPress={() => setShowUploadModal(true)}
  visible={true}
  bottom={90}
  right={20}
/>
```

---

### UGCUploadModal

**Purpose**: Multi-step upload flow

**Props**:
```typescript
{
  visible: boolean;             // Required
  onClose: () => void;          // Required
  storeId?: string;             // Optional
  productId?: string;           // Optional
  onUploadSuccess?: (id: string) => void; // Optional
}
```

**Example**:
```typescript
<UGCUploadModal
  visible={showUploadModal}
  onClose={() => setShowUploadModal(false)}
  storeId="store-123"
  productId="product-456"
  onUploadSuccess={(contentId) => {
    console.log('Uploaded:', contentId);
    refreshFeed();
  }}
/>
```

---

## 🔄 Upload Flow

### Visual Flow
```
┌─────────────────┐
│  1. MEDIA       │  Choose camera or library
│  SELECTION      │  → Validate file
└────────┬────────┘
         ↓
┌─────────────────┐
│  2. PREVIEW     │  Caption + Tags
│  & CAPTION      │  → Character count
└────────┬────────┘
         ↓
┌─────────────────┐
│  3. DETAILS     │  Category + Hashtags
│  FORM           │  → Max 10 hashtags
└────────┬────────┘
         ↓
┌─────────────────┐
│  4. UPLOADING   │  Progress bar 0-100%
│  (PROGRESS)     │  → Can cancel
└────────┬────────┘
         ↓
┌─────────────────┐
│  5. SUCCESS     │  Checkmark animation
│  CONFIRMATION   │  → Auto-close (3s)
└─────────────────┘
```

---

## ✅ Validation Rules

| Type | Rule | Limit |
|------|------|-------|
| **Images** | Max size | 10MB |
| | Formats | jpg, jpeg, png, gif, webp |
| **Videos** | Max size | 50MB |
| | Max duration | 60s (camera) |
| | Formats | mp4, mov, avi, mkv |
| **Caption** | Max length | 500 chars |
| **Hashtags** | Max count | 10 |
| | Duplicates | Not allowed |

---

## 🎯 API Integration

### Endpoint
```
POST /api/ugc
```

### Request (FormData)
```javascript
{
  file: File,              // Required
  type: 'photo' | 'video', // Required
  caption: string,         // Optional
  tags: string[],          // Optional
  relatedStoreId: string,  // Optional
  relatedProductId: string // Optional
}
```

### Response
```javascript
{
  success: boolean,
  data: {
    content: UGCMedia,
    message: string
  }
}
```

---

## 🎨 Theme Colors

| Element | Color | Hex |
|---------|-------|-----|
| Primary | Purple | #7C3AED |
| Secondary | Light Purple | #8B5CF6 |
| Success | Green | #10B981 |
| Error | Red | #EF4444 |
| Background | Light Gray | #F9FAFB |

---

## 🔐 Authentication

**Always check** if user is authenticated:

```typescript
import { useAuth } from '@/contexts/AuthContext';

const { isAuthenticated } = useAuth();

{isAuthenticated && <UGCUploadFAB ... />}
```

**Prompt login** if not authenticated:

```typescript
const handleFABPress = () => {
  if (!isAuthenticated) {
    Alert.alert(
      'Sign In Required',
      'Please sign in to upload content',
      [
        { text: 'Cancel' },
        { text: 'Sign In', onPress: () => router.push('/sign-in') }
      ]
    );
    return;
  }
  setShowUploadModal(true);
};
```

---

## 🛠️ Permissions

**Required**:
- Camera permission
- Media library permission

**Auto-requested** by modal when:
- User selects "Take Photo/Video"
- User selects "Choose from Library"

**If denied**:
```
Alert: "Permissions Required"
Message: "Please grant camera and media library permissions"
```

---

## ⚠️ Error Handling

### Common Errors

| Error | Message | Fix |
|-------|---------|-----|
| File too large | "File size exceeds 10MB limit" | Compress file |
| Invalid format | "Invalid format. Allowed: jpg, png" | Use supported format |
| Network error | "Network error during upload" | Check connection |
| Upload failed | "Upload failed with status 500" | Check backend |
| No permission | "Permissions Required" | Grant permissions |

### Error Display

All errors show in **red banner** at top of modal:
```
[!] Error message here [X]
```

---

## 🎬 Animations

### FAB
- **Entrance**: Scale 0→1 + Rotate 0°→360° (300ms)
- **Press**: Scale 0.9 (100ms)
- **Haptic**: Medium impact

### Modal
- **Open**: Fade in (300ms)
- **Close**: Fade out (300ms)

### Success
- **Checkmark**: Spring scale 0→1
- **Haptic**: Success notification
- **Auto-close**: 3 seconds

---

## 🧪 Testing

### Quick Test Checklist
```
□ FAB appears and animates
□ Modal opens on FAB press
□ Camera option works
□ Library option works
□ File validation works
□ Caption input works
□ Hashtag add/remove works
□ Category selection works
□ Upload progress shows
□ Success animation plays
□ onUploadSuccess callback works
```

### Test on Device
Camera and permissions work differently on **real devices** vs simulator!

---

## 🐛 Troubleshooting

### FAB not showing
```typescript
// Check:
1. isAuthenticated === true
2. visible === true
3. No z-index conflicts
```

### Upload fails
```typescript
// Check:
1. Backend URL correct (env variables)
2. Auth token present
3. File size within limits
4. Network connection active
```

### Camera not working (iOS)
```json
// Add to app.json:
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Allow access to camera",
        "NSPhotoLibraryUsageDescription": "Allow access to photos"
      }
    }
  }
}
```

---

## 📱 Platform Support

| Feature | iOS | Android | Web |
|---------|-----|---------|-----|
| FAB | ✅ | ✅ | ✅ |
| Modal | ✅ | ✅ | ✅ |
| Camera | ✅ | ✅ | ⚠️ |
| Library | ✅ | ✅ | ✅ |
| Haptics | ✅ | ✅ | ❌ |
| Progress | ✅ | ✅ | ✅ |

⚠️ = Limited functionality
❌ = Not supported (gracefully degrades)

---

## 🎯 Integration Locations

### MainStorePage
```typescript
// Around line 1050, before </ThemedView>
{isAuthenticated && (
  <>
    <UGCUploadFAB ... />
    <UGCUploadModal ... />
  </>
)}
```

### ProductPage
```typescript
// In product detail view
{isAuthenticated && (
  <UGCUploadFAB
    onPress={() => setShowUploadModal(true)}
    bottom={120} // Above product actions
  />
)}
```

### Profile Page
```typescript
// In user's UGC gallery
<UGCUploadFAB
  onPress={() => setShowUploadModal(true)}
  visible={isOwnProfile}
/>
```

---

## 📊 Analytics (Optional)

```typescript
// Track upload events
onUploadSuccess={(contentId) => {
  analytics.track('ugc_uploaded', {
    contentId,
    type: 'photo', // or 'video'
    storeId,
    hasCaption: true,
    hashtagCount: 3
  });
}}
```

---

## 🔗 Related Files

| File | Purpose |
|------|---------|
| `ugcApi.ts` | API methods (GET/POST/DELETE) |
| `ugcUploadService.ts` | Upload with progress |
| `UGCSection.tsx` | Display UGC content |
| `UGCDetailScreen.tsx` | View single UGC item |
| `AuthContext.tsx` | Authentication state |

---

## 💡 Tips

1. **Always check auth** before showing FAB
2. **Test on device** for camera/permissions
3. **Compress files** before upload (future enhancement)
4. **Show feedback** during upload (progress bar)
5. **Handle errors** gracefully
6. **Refresh content** after successful upload
7. **Use TypeScript** for type safety
8. **Add analytics** to track usage

---

## 📚 Full Documentation

- **Integration Guide**: `UGC_UPLOAD_INTEGRATION_GUIDE.md`
- **Delivery Summary**: `UGC_UPLOAD_DELIVERY_SUMMARY.md`
- **Quick Reference**: This file

---

## ✨ Features Summary

### User Features
- 📸 Take photo/video with camera
- 🖼️ Select from library
- ✍️ Add caption (500 chars)
- 🏷️ Add hashtags (max 10)
- 📂 Choose category
- 🔒 Set privacy (public/private/friends)
- 📊 See upload progress
- ✅ Success confirmation

### Developer Features
- 🎨 Purple theme
- 📱 Cross-platform
- 🔐 Auth integration
- ⚡ Progress tracking
- 🛡️ Error handling
- 📝 TypeScript types
- 🎭 Animations
- ♿ Accessibility

---

**Ready to use!** 🚀

Copy the 3-step quick start and you're done!

# Quick Reference: File Upload Constants

## 📍 Location
**Single Source of Truth:** `utils/fileUploadConstants.ts`

## 🎯 Quick Facts

| Setting | Value | Why |
|---------|-------|-----|
| Max Image Size | 5MB | Fast uploads on mobile networks |
| Min Image Size | 50KB | Ensures sufficient quality |
| Max Video Size | 50MB | Reasonable for UGC |
| Upload Timeout | 2 minutes | Sufficient for 5MB on slow networks |
| Allowed Image Formats | jpg, jpeg, png, heic, heif | Common formats + iOS HEIC |
| Min Resolution | 800x600 | Minimum for OCR processing |

## 🔧 Common Use Cases

### Validate File Before Upload
```typescript
import { validateFile } from '@/utils/fileUploadConstants';

const result = validateFile(fileSize, filename, width, height, mimeType);
if (!result.isValid) {
  Alert.alert('Error', result.error);
  return;
}
```

### Check File Size
```typescript
import { FILE_SIZE_LIMITS, isFileSizeValid } from '@/utils/fileUploadConstants';

if (!isFileSizeValid(fileSize)) {
  Alert.alert('Error', `File exceeds ${FILE_SIZE_LIMITS.MAX_IMAGE_SIZE / (1024 * 1024)}MB limit`);
}
```

### Format File Size for Display
```typescript
import { formatFileSize } from '@/utils/fileUploadConstants';

console.log(formatFileSize(5242880)); // "5.00 MB"
console.log(formatFileSize(1024)); // "1.00 KB"
```

### Check File Format
```typescript
import { isFileFormatValid, isFileSizeValid } from '@/utils/fileUploadConstants';

const filename = "bill.jpg";
if (!isFileFormatValid(filename)) {
  Alert.alert('Error', 'Invalid file format');
}
```

### Check Image Resolution
```typescript
import { isResolutionValid, IMAGE_QUALITY_REQUIREMENTS } from '@/utils/fileUploadConstants';

if (!isResolutionValid(width, height)) {
  Alert.alert('Error', `Minimum resolution: ${IMAGE_QUALITY_REQUIREMENTS.MIN_WIDTH}x${IMAGE_QUALITY_REQUIREMENTS.MIN_HEIGHT}`);
}
```

## 📊 All Constants at a Glance

### File Size Limits
```typescript
FILE_SIZE_LIMITS = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024,  // 5MB
  MIN_IMAGE_SIZE: 50 * 1024,         // 50KB
  MAX_VIDEO_SIZE: 50 * 1024 * 1024,  // 50MB
  MIN_VIDEO_SIZE: 100 * 1024,        // 100KB
}
```

### Allowed Formats
```typescript
ALLOWED_FILE_FORMATS = {
  IMAGES: ['jpg', 'jpeg', 'png', 'heic', 'heif'],
  VIDEOS: ['mp4', 'mov', 'webm'],
}
```

### Image Quality
```typescript
IMAGE_QUALITY_REQUIREMENTS = {
  MIN_WIDTH: 800,
  MIN_HEIGHT: 600,
  IDEAL_WIDTH: 1600,
  IDEAL_HEIGHT: 1200,
  MAX_WIDTH: 4000,
  MAX_HEIGHT: 3000,
  BLUR_THRESHOLD: 100,
  BRIGHTNESS_MIN: 30,
  BRIGHTNESS_MAX: 225,
}
```

### Timeouts
```typescript
UPLOAD_TIMEOUTS = {
  DEFAULT: 120000,    // 2 minutes
  IMAGE: 120000,      // 2 minutes
  VIDEO: 300000,      // 5 minutes
  RETRY_DELAY: 1000,  // 1 second
  MAX_RETRIES: 3,
}
```

## 🚫 Common Mistakes to Avoid

### ❌ Don't Hardcode Values
```typescript
// BAD
if (fileSize > 5242880) { ... }
if (width < 800) { ... }
```

### ✅ Use Constants
```typescript
// GOOD
import { FILE_SIZE_LIMITS, IMAGE_QUALITY_REQUIREMENTS } from '@/utils/fileUploadConstants';

if (fileSize > FILE_SIZE_LIMITS.MAX_IMAGE_SIZE) { ... }
if (width < IMAGE_QUALITY_REQUIREMENTS.MIN_WIDTH) { ... }
```

## 🎨 Error Messages

Pre-built user-friendly error messages:
```typescript
import { UPLOAD_ERROR_MESSAGES } from '@/utils/fileUploadConstants';

UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE
// "File size exceeds 5MB limit. Please choose a smaller file."

UPLOAD_ERROR_MESSAGES.INVALID_FORMAT
// "Invalid file format. Allowed formats: jpg, jpeg, png, heic, heif"

UPLOAD_ERROR_MESSAGES.RESOLUTION_TOO_LOW
// "Image resolution is too low. Minimum: 800x600"
```

## 🔍 Helper Functions

All available helper functions:

| Function | Purpose | Example |
|----------|---------|---------|
| `isFileSizeValid(size)` | Check if size is within limits | `isFileSizeValid(5000000)` |
| `isFileFormatValid(filename)` | Check if format is allowed | `isFileFormatValid('bill.jpg')` |
| `isMimeTypeValid(mimeType)` | Check if MIME type is allowed | `isMimeTypeValid('image/jpeg')` |
| `isResolutionValid(w, h)` | Check if resolution meets minimum | `isResolutionValid(1024, 768)` |
| `isMegapixelsValid(w, h)` | Check if megapixels meet minimum | `isMegapixelsValid(800, 600)` |
| `formatFileSize(bytes)` | Format bytes for display | `formatFileSize(5242880)` → "5.00 MB" |
| `getFileExtension(filename)` | Extract file extension | `getFileExtension('bill.jpg')` → "jpg" |
| `calculateMegapixels(w, h)` | Calculate megapixels | `calculateMegapixels(1920, 1080)` → 2.07 |
| `validateFile(...)` | Complete validation | Returns `FileValidationResult` |

## 💡 Tips

1. **Always validate before upload** - Save bandwidth and improve UX
2. **Use helper functions** - They handle edge cases and formatting
3. **Show clear error messages** - Use pre-built `UPLOAD_ERROR_MESSAGES`
4. **Consider compression** - Files > 3MB can be automatically compressed
5. **Monitor uploads** - Track success rates and adjust limits if needed

## 🔗 Related Files

- **Constants:** `utils/fileUploadConstants.ts`
- **Validation:** `utils/imageQualityValidator.ts`
- **Bill Upload:** `app/bill-upload.tsx`
- **Image Upload Service:** `services/imageUploadService.ts`
- **Upload Hook:** `hooks/useBillUpload.ts`
- **Quality Hook:** `hooks/useImageQuality.ts`

## 📚 Full Documentation

See `FILE_UPLOAD_CONSTANTS_MIGRATION.md` for:
- Detailed explanation of all changes
- Migration guide
- Rationale for decisions
- Testing checklist

---

**Need to change limits?** → Edit `utils/fileUploadConstants.ts`

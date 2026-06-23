# BillImageUploader - Quick Reference

## 🎯 Quick Start

```tsx
import { BillImageUploader } from '@/components/bills';

<BillImageUploader
  onImageSelected={(uri) => console.log('Selected:', uri)}
  onImageRemoved={() => console.log('Removed')}
/>
```

## 📋 All Props (Copy & Paste)

```tsx
<BillImageUploader
  // Required
  onImageSelected={(uri: string) => {}}

  // Optional
  onImageRemoved={() => {}}
  onUploadStart={() => {}}
  onUploadProgress={(progress: UploadProgress) => {}}
  onUploadComplete={(uri: string) => {}}
  onUploadError={(error: Error) => {}}
  maxSize={5 * 1024 * 1024} // 5MB
  acceptedFormats={['image/jpeg', 'image/jpg', 'image/png']}
  initialImageUri="https://example.com/image.jpg"
/>
```

## 🎨 Component States Flow

```
idle → selecting → quality_checking → quality_warning/success
                                    → uploading → upload_error/success
```

## ✅ Features Checklist

- [x] Take photo button (opens camera)
- [x] Choose from gallery button (opens picker)
- [x] Image preview with metadata
- [x] Upload progress bar (0-100%)
- [x] Upload speed indicator (Mbps/KBps)
- [x] Time remaining counter
- [x] Retry button on failure
- [x] Cancel upload button
- [x] File size indicator (current/max)
- [x] Quality score badge (Excellent/Good/Fair/Poor)

## 🔍 Quality Checks

| Check | Minimum | Result |
|-------|---------|--------|
| Resolution | 800x600 | Pass/Fail |
| File Size | < maxSize | Pass/Fail |
| Aspect Ratio | Standard | Pass/Warn |
| Blur | Estimated | Pass/Warn |

## 🎯 Quality Score

- 90-100: **Excellent** (Green)
- 70-89: **Good** (Green)
- 50-69: **Fair** (Orange)
- 0-49: **Poor** (Red)

## 📦 File Size Formatting

| Bytes | Display |
|-------|---------|
| 1024 | 1 KB |
| 1048576 | 1 MB |
| 1073741824 | 1 GB |

## 🔄 Upload Progress

```tsx
interface UploadProgress {
  loaded: number;      // Bytes uploaded
  total: number;       // Total bytes
  percentage: number;  // 0-100
  speed: number;       // Bytes per second
  timeRemaining: number; // Seconds
  startTime: number;   // Timestamp
  currentTime: number; // Timestamp
}
```

## ⚠️ Error Handling

```tsx
<BillImageUploader
  onUploadError={(error) => {
    if (error.message.includes('network')) {
      // Network error
    } else if (error.message.includes('size')) {
      // File too large
    } else {
      // Other error
    }
  }}
/>
```

## 🎭 Common Use Cases

### 1. Basic Form Field
```tsx
const [billImage, setBillImage] = useState('');

<BillImageUploader onImageSelected={setBillImage} />
```

### 2. With Progress Tracking
```tsx
const [progress, setProgress] = useState(0);

<BillImageUploader
  onImageSelected={(uri) => console.log(uri)}
  onUploadProgress={(p) => setProgress(p.percentage)}
/>
```

### 3. Edit Existing Bill
```tsx
<BillImageUploader
  initialImageUri={existingBill.imageUrl}
  onImageSelected={(uri) => updateBill(uri)}
/>
```

### 4. Custom Size Limit
```tsx
<BillImageUploader
  maxSize={2 * 1024 * 1024} // 2MB
  onImageSelected={(uri) => console.log(uri)}
/>
```

### 5. Complete Form Integration
```tsx
const [form, setForm] = useState({ billImage: '', amount: '', date: '' });

<BillImageUploader
  onImageSelected={(uri) => setForm(prev => ({ ...prev, billImage: uri }))}
  onImageRemoved={() => setForm(prev => ({ ...prev, billImage: '' }))}
/>
```

## 🛠️ Testing Checklist

- [ ] Camera opens correctly
- [ ] Gallery opens correctly
- [ ] Image quality is checked
- [ ] Quality warnings are shown
- [ ] Quality score badge displays
- [ ] File size is formatted
- [ ] Upload progress shows
- [ ] Upload speed displays
- [ ] Time remaining shows
- [ ] Remove button works
- [ ] Retry button works
- [ ] Error handling works
- [ ] Permissions are requested
- [ ] Initial image loads

## 🎨 UI Elements

| Element | Icon | Color |
|---------|------|-------|
| Take Photo | `camera` | Purple |
| Gallery | `image` | Purple |
| Quality Badge | - | Green/Orange/Red |
| Remove | `trash` | Red |
| Retry | `refresh` | Purple |
| Error | `alert-circle` | Red |
| Warning | `warning` | Orange |
| Success | `checkmark-circle` | Green |

## 📱 Platform Support

- ✅ iOS
- ✅ Android
- ✅ Web (limited camera support)

## 🔗 Related Hooks

- `useImageQuality()` - Quality validation
- `useBillUpload()` - Upload progress
- `cameraService` - Camera/gallery access

## 📝 TypeScript Types

```tsx
import type { BillImageUploaderProps } from '@/components/bills';
import type { UploadProgress } from '@/types/upload.types';
import type { ImageQualityResult } from '@/hooks/useImageQuality';
```

## 🚀 Performance Tips

1. Quality checks are **cached** for 5 minutes
2. Progress updates are **throttled** for smooth animation
3. Images are **compressed** before upload
4. Use `initialImageUri` for edit mode to avoid re-upload

## 🐛 Common Issues

### Camera not opening
```tsx
// Check permissions
await cameraService.requestPermissions();
```

### Quality check failing
```tsx
// Reduce minimum requirements
<BillImageUploader
  // Lower quality requirements in useImageQuality hook
/>
```

### Upload timeout
```tsx
// Increase timeout in billUploadService
// Default: 30 seconds
```

## 📚 Additional Resources

- Full documentation: `README.md`
- Usage examples: `BillImageUploader.example.tsx`
- Unit tests: `BillImageUploader.test.tsx`
- Component exports: `index.ts`

## 🎉 Quick Copy Templates

### Minimal
```tsx
<BillImageUploader onImageSelected={(uri) => console.log(uri)} />
```

### With All Features
```tsx
<BillImageUploader
  onImageSelected={(uri) => console.log('Selected:', uri)}
  onImageRemoved={() => console.log('Removed')}
  onUploadStart={() => console.log('Starting...')}
  onUploadProgress={(p) => console.log(`${p.percentage}%`)}
  onUploadComplete={(uri) => console.log('Done:', uri)}
  onUploadError={(e) => console.error('Error:', e)}
  maxSize={5 * 1024 * 1024}
  acceptedFormats={['image/jpeg', 'image/png']}
/>
```

### Form Integration
```tsx
const [form, setForm] = useState({
  billImage: '',
  merchantId: '',
  amount: '',
  date: new Date(),
});

<BillImageUploader
  initialImageUri={form.billImage}
  onImageSelected={(uri) => setForm(prev => ({ ...prev, billImage: uri }))}
  onImageRemoved={() => setForm(prev => ({ ...prev, billImage: '' }))}
/>
```

---

**Created**: 2025-11-03
**Component Version**: 1.0.0
**Status**: ✅ Production Ready

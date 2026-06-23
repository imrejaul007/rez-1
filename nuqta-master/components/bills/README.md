# BillImageUploader Component

Production-ready bill image upload component with quality checking, progress tracking, and error handling.

## Features

1. **Take Photo** - Opens camera to capture bill photo
2. **Choose from Gallery** - Opens image picker for existing photos
3. **Image Preview** - Shows selected image with metadata
4. **Progress Bar** - Real-time upload progress (0-100%)
5. **Upload Speed** - Shows transfer speed in Mbps/KBps
6. **Time Remaining** - Estimated seconds until completion
7. **Retry Button** - Automatic retry on upload failure
8. **Cancel Button** - Stop current upload
9. **File Size Indicator** - Shows current/max size
10. **Quality Indicator** - Visual quality score badge

## Installation

The component is already integrated with the following services:
- `cameraService` - Camera and gallery access
- `useImageQuality` - Image quality validation
- `useBillUpload` - Upload progress tracking

## Basic Usage

```tsx
import { BillImageUploader } from '@/components/bills';

function MyComponent() {
  const [imageUri, setImageUri] = useState<string>('');

  return (
    <BillImageUploader
      onImageSelected={(uri) => {
        console.log('Image selected:', uri);
        setImageUri(uri);
      }}
      onImageRemoved={() => {
        console.log('Image removed');
        setImageUri('');
      }}
    />
  );
}
```

## Props

### BillImageUploaderProps

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `onImageSelected` | `(uri: string) => void` | Yes | - | Called when image is selected and validated |
| `onImageRemoved` | `() => void` | No | - | Called when image is removed |
| `onUploadStart` | `() => void` | No | - | Called when upload starts |
| `onUploadProgress` | `(progress: UploadProgress) => void` | No | - | Called with upload progress updates |
| `onUploadComplete` | `(uri: string) => void` | No | - | Called when upload completes successfully |
| `onUploadError` | `(error: Error) => void` | No | - | Called when upload fails |
| `maxSize` | `number` | No | `5242880` (5MB) | Maximum file size in bytes |
| `acceptedFormats` | `string[]` | No | `['image/jpeg', 'image/jpg', 'image/png']` | Accepted image formats |
| `initialImageUri` | `string` | No | - | Pre-populate with existing image |

## Component States

The component manages 7 different states:

1. **`idle`** - Initial state, shows camera/gallery buttons
2. **`selecting`** - User is selecting image (disabled state)
3. **`quality_checking`** - Checking image quality (spinner)
4. **`quality_warning`** - Quality issues detected (show warnings)
5. **`uploading`** - Upload in progress (progress bar)
6. **`upload_error`** - Upload failed (error message + retry)
7. **`success`** - Image uploaded successfully (preview + remove)

## UI Structure

```
┌─────────────────────────────────────┐
│    Bill Photo *                     │
├─────────────────────────────────────┤
│ ┌──────────────────────────────────┐│
│ │   [📷 Take Photo]  [🖼️ Gallery]  ││
│ │   Ensure bill is clear & visible ││
│ └──────────────────────────────────┘│
├─────────────────────────────────────┤
│ [Image Preview]  📷 bill.jpg        │
│ Size: 2.3 MB / 5 MB (Max)           │
│ Quality: Good ✓                     │
├─────────────────────────────────────┤
│ Uploading... 45%                    │
│ ━━━━━━━━━━━━━░░░░░░░░░░░            │
│ Speed: 1.2 Mbps | Time left: 3s     │
│ [Cancel]                            │
├─────────────────────────────────────┤
│ [Remove Image]                      │
└─────────────────────────────────────┘
```

## Advanced Usage Examples

### With Upload Progress Tracking

```tsx
import { BillImageUploader } from '@/components/bills';
import { UploadProgress } from '@/types/upload.types';

function MyComponent() {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  return (
    <BillImageUploader
      onImageSelected={(uri) => console.log('Selected:', uri)}
      onUploadProgress={(progress) => {
        setUploadProgress(progress);
        console.log(`Upload: ${progress.percentage}%`);
      }}
      onUploadComplete={(uri) => {
        console.log('Upload complete:', uri);
        Alert.alert('Success', 'Bill uploaded successfully!');
      }}
      onUploadError={(error) => {
        console.error('Upload error:', error);
        Alert.alert('Error', error.message);
      }}
    />
  );
}
```

### With Custom Max Size and Formats

```tsx
<BillImageUploader
  maxSize={2 * 1024 * 1024} // 2MB
  acceptedFormats={['image/jpeg', 'image/png']} // Only JPEG and PNG
  onImageSelected={(uri) => console.log('Selected:', uri)}
/>
```

### Form Integration

```tsx
function BillUploadForm() {
  const [formData, setFormData] = useState({
    billImage: '',
    merchantId: '',
    amount: '',
    date: '',
  });

  const handleImageSelected = (uri: string) => {
    setFormData(prev => ({ ...prev, billImage: uri }));
  };

  const handleSubmit = () => {
    if (!formData.billImage) {
      Alert.alert('Error', 'Please upload a bill image');
      return;
    }
    // Submit form...
  };

  return (
    <View>
      <BillImageUploader
        onImageSelected={handleImageSelected}
        onImageRemoved={() => setFormData(prev => ({ ...prev, billImage: '' }))}
      />
      {/* Other form fields */}
    </View>
  );
}
```

### With Error Handling

```tsx
<BillImageUploader
  onImageSelected={(uri) => console.log('Selected:', uri)}
  onUploadError={(error) => {
    // Custom error handling
    if (error.message.includes('network')) {
      Alert.alert('Network Error', 'Check your connection');
    } else if (error.message.includes('size')) {
      Alert.alert('File Too Large', 'Select a smaller image');
    } else {
      Alert.alert('Error', error.message);
    }
  }}
/>
```

### With Initial Image (Edit Mode)

```tsx
<BillImageUploader
  initialImageUri="https://example.com/bill.jpg"
  onImageSelected={(uri) => console.log('New image:', uri)}
  onImageRemoved={() => console.log('Image removed')}
/>
```

## Quality Checks

The component performs the following quality checks:

1. **Resolution Check** - Minimum 800x600 pixels
2. **File Size Check** - Within max size limit
3. **Aspect Ratio Check** - Standard ratios (1:1, 4:3, 3:2, 16:9)
4. **Blur Detection** - Estimates image clarity

### Quality Score

- **90-100**: Excellent ✅ (Green badge)
- **70-89**: Good ✅ (Green badge)
- **50-69**: Fair ⚠️ (Orange badge)
- **0-49**: Poor ❌ (Red badge)

## Upload Progress

The component tracks and displays:

- **Percentage** - 0-100%
- **Speed** - Formatted as B/s, KB/s, MB/s, GB/s
- **Time Remaining** - Formatted as MM:SS
- **Loaded/Total** - Bytes uploaded/total

## Error Handling

The component handles various error scenarios:

1. **Camera Permission Denied** - Shows permission alert
2. **Network Error** - Shows retry button
3. **File Too Large** - Shows size error
4. **Invalid Format** - Shows format error
5. **Upload Timeout** - Shows retry button
6. **Quality Issues** - Shows warnings with "Use Anyway" option

## Styling

The component uses a comprehensive style system with:

- Purple primary color (`#8b5cf6`)
- Neutral grays for text and backgrounds
- Semantic colors (red for errors, orange for warnings, green for success)
- Consistent spacing and border radius
- Responsive layout

### Customizing Styles

```tsx
// The component exports StyleSheet internally
// To customize, wrap it in a container with custom styles

<View style={{ padding: 20, backgroundColor: '#fff' }}>
  <BillImageUploader {...props} />
</View>
```

## Accessibility

The component includes:

- Semantic icons from Ionicons
- Clear labels and hints
- Loading states with spinners
- Error states with descriptive messages
- Touch-friendly button sizes

## Performance Considerations

1. **Image Caching** - Quality check results are cached for 5 minutes
2. **Progress Throttling** - Upload progress updates are smoothly animated
3. **Memory Management** - Images are automatically cleaned up
4. **Lazy Loading** - Quality checks run only when needed

## Dependencies

- `expo-image-picker` - Camera and gallery access
- `expo-file-system` - File size and metadata
- `@expo/vector-icons` - Ionicons
- React Native core components

## Testing

See `BillImageUploader.example.tsx` for comprehensive usage examples:

```tsx
import { BillImageUploaderDemo } from '@/components/bills';

// Render all examples
<BillImageUploaderDemo />
```

## Troubleshooting

### Camera not opening
- Check camera permissions
- Verify `expo-image-picker` is installed
- Test on physical device (camera may not work in simulator)

### Upload progress not showing
- Ensure `onUploadProgress` callback is provided
- Check network connectivity
- Verify backend supports progress tracking

### Quality check fails
- Verify image meets minimum requirements (800x600)
- Check file size is within limits
- Ensure image is not corrupted

### Images not displaying
- Check image URI is valid
- Verify file permissions
- Test with different image sources

## Best Practices

1. **Always handle errors** - Provide `onUploadError` callback
2. **Show upload progress** - Use `onUploadProgress` for better UX
3. **Validate images** - Default quality checks catch most issues
4. **Set appropriate limits** - Use `maxSize` based on your backend
5. **Provide feedback** - Use `onUploadComplete` to confirm success

## Related Components

- `BillVerificationFlow` - Complete bill verification workflow
- `BillHistoryList` - Display uploaded bills
- `BillPreview` - Full-screen bill image preview

## API Integration

The component integrates with:

- `billUploadService.uploadBillWithProgress()` - Main upload method
- `billUploadService.uploadBillWithRetry()` - Retry logic
- `cameraService.openCamera()` - Camera access
- `cameraService.openImagePicker()` - Gallery access

## License

Part of the Rez App frontend application.

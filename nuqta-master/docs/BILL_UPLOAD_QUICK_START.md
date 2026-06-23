# Bill Upload Quick Start Guide

## Quick Usage

### 1. Basic Upload (Simplest)

```typescript
import { useBillUpload } from '@/hooks/useBillUpload';

function MyComponent() {
  const { startUpload, isUploading, percentComplete } = useBillUpload();

  const handleUpload = async () => {
    await startUpload({
      billImage: 'file://path/to/bill.jpg',
      merchantId: 'merchant_123',
      amount: 1500,
      billDate: new Date(),
    });
  };

  return (
    <View>
      <Button onPress={handleUpload} disabled={isUploading}>
        Upload
      </Button>
      {isUploading && <Text>{percentComplete}% uploaded</Text>}
    </View>
  );
}
```

### 2. With Progress Bar

```typescript
const {
  startUpload,
  isUploading,
  percentComplete,
  uploadSpeed,
  timeRemaining
} = useBillUpload();

return (
  <View>
    {isUploading && (
      <View>
        <ProgressBar progress={percentComplete / 100} />
        <Text>{percentComplete}%</Text>
        <Text>{uploadSpeed}</Text>
        <Text>{timeRemaining} remaining</Text>
      </View>
    )}
  </View>
);
```

### 3. With Error Handling & Retry

```typescript
const {
  startUpload,
  retryUpload,
  error,
  canRetry,
  currentAttempt,
  maxAttempts,
} = useBillUpload();

return (
  <View>
    {error && (
      <View>
        <Text style={{ color: 'red' }}>{error.message}</Text>
        {canRetry && (
          <Button onPress={retryUpload}>
            Retry ({currentAttempt}/{maxAttempts})
          </Button>
        )}
      </View>
    )}
  </View>
);
```

### 4. With Image Quality Check

```typescript
import { useImageQuality } from '@/hooks/useImageQuality';
import { useBillUpload } from '@/hooks/useBillUpload';

function MyComponent() {
  const { checkQuality, result } = useImageQuality();
  const { startUpload } = useBillUpload();

  const handleImageSelect = async (imageUri: string) => {
    // Check quality first
    const quality = await checkQuality(imageUri);

    if (!quality.isValid) {
      alert('Image quality is too low');
      return;
    }

    // Quality OK, upload
    await startUpload({
      billImage: imageUri,
      merchantId: 'merchant_123',
      amount: 1500,
      billDate: new Date(),
    });
  };

  return (
    <View>
      {result && (
        <Text>Quality Score: {result.score}/100</Text>
      )}
    </View>
  );
}
```

### 5. With Form Persistence

```typescript
const {
  formData,
  saveFormData,
  startUpload,
} = useBillUpload();

// Auto-saves form data
const handleChange = (field: string, value: any) => {
  saveFormData({
    ...formData,
    [field]: value,
  });
};

// Form data persists across app restarts
```

## Configuration Options

### Retry Configuration

```typescript
const upload = useBillUpload({
  maxAttempts: 5,              // Default: 3
  initialDelay: 2000,          // Default: 1000ms
  maxDelay: 60000,             // Default: 30000ms
  backoffMultiplier: 2,        // Default: 2
  retryableErrors: [           // Default: network, timeout, server errors
    'NETWORK_ERROR',
    'TIMEOUT',
    'SERVER_ERROR',
  ],
});
```

### Image Quality Options

```typescript
const quality = useImageQuality({
  minWidth: 1200,              // Default: 800
  minHeight: 900,              // Default: 600
  maxFileSize: 5 * 1024 * 1024, // Default: 10MB
  checkBlur: true,             // Default: true
  checkAspectRatio: true,      // Default: true
  allowedAspectRatios: [1, 1.33, 1.5, 1.77], // Default
});
```

## Common Patterns

### Pattern 1: Full Upload Flow

```typescript
function BillUploadScreen() {
  const { checkQuality } = useImageQuality();
  const {
    startUpload,
    isUploading,
    percentComplete,
    uploadSpeed,
    timeRemaining,
    error,
    canRetry,
    retryUpload,
  } = useBillUpload();

  const handleUpload = async (imageUri: string) => {
    // 1. Check quality
    const quality = await checkQuality(imageUri);
    if (!quality.isValid) {
      alert('Image quality too low');
      return;
    }

    // 2. Upload with automatic retry
    const success = await startUpload({
      billImage: imageUri,
      merchantId: 'merchant_123',
      amount: 1500,
      billDate: new Date(),
    });

    // 3. Handle result
    if (success) {
      navigation.navigate('Success');
    }
  };

  return (
    <View>
      {/* Upload button */}
      <Button onPress={() => handleUpload(imageUri)}>
        Upload Bill
      </Button>

      {/* Progress indicator */}
      {isUploading && (
        <View>
          <ProgressBar progress={percentComplete / 100} />
          <Text>{percentComplete}%</Text>
          <Text>{uploadSpeed}</Text>
          <Text>{timeRemaining} left</Text>
        </View>
      )}

      {/* Error with retry */}
      {error && (
        <View>
          <Text>{error.message}</Text>
          {canRetry && (
            <Button onPress={retryUpload}>Retry</Button>
          )}
        </View>
      )}
    </View>
  );
}
```

### Pattern 2: Cancel Upload

```typescript
const { startUpload, cancelUpload, isUploading } = useBillUpload();

return (
  <View>
    {isUploading && (
      <Button onPress={cancelUpload}>Cancel Upload</Button>
    )}
  </View>
);
```

### Pattern 3: Manual Retry Control

```typescript
const {
  startUpload,
  error,
  retryUpload,
  currentAttempt,
  maxAttempts,
} = useBillUpload({ maxAttempts: 5 });

const handleManualRetry = async () => {
  if (currentAttempt >= maxAttempts) {
    // Max attempts reached, ask user
    const shouldContinue = await confirm('Max attempts reached. Try again?');
    if (shouldContinue) {
      // Reset and start fresh
      reset();
      await startUpload(lastData);
    }
  } else {
    // Normal retry
    await retryUpload();
  }
};
```

## Upload States

```typescript
type UploadState =
  | 'idle'        // Not started
  | 'preparing'   // Creating FormData
  | 'uploading'   // Upload in progress
  | 'paused'      // Upload paused (future)
  | 'completed'   // Successfully completed
  | 'failed'      // Failed after all retries
  | 'cancelled';  // Cancelled by user

const { uploadState } = useBillUpload();
```

## Error Codes

```typescript
// Retryable errors (will auto-retry)
'NETWORK_ERROR'    // Network connection failed
'TIMEOUT'          // Request timed out
'SERVER_ERROR'     // Server error (500, 502, etc.)

// Non-retryable errors (won't retry)
'FILE_TOO_LARGE'      // File exceeds size limit
'INVALID_FILE_TYPE'   // Wrong file type
'FILE_NOT_FOUND'      // File doesn't exist
'PERMISSION_DENIED'   // No file access permission
'CANCELLED'           // User cancelled
'VALIDATION_ERROR'    // Validation failed
```

## Direct Service Usage

If you don't want to use the hook:

```typescript
import { billUploadService } from '@/services/billUploadService';

// With progress
const result = await billUploadService.uploadBillWithProgress(
  data,
  (progress) => {
    console.log(`${progress.percentage}% - ${progress.speed} bytes/sec`);
  }
);

// With retry
const result = await billUploadService.uploadBillWithRetry(
  data,
  (progress) => console.log(progress),
  { maxAttempts: 5 }
);

// Cancel
billUploadService.cancelUpload(uploadId);
```

## Tips

1. **Always check image quality before upload** - Saves bandwidth and time
2. **Use retry for unreliable networks** - Increases success rate
3. **Save form data frequently** - Prevents data loss
4. **Show progress indicators** - Better UX
5. **Handle errors gracefully** - Provide clear feedback
6. **Clear form data on success** - Prevents duplicate uploads

## Troubleshooting

### Upload Fails Immediately
- Check network connectivity
- Verify backend API is running
- Check auth token is valid
- Verify file exists and is accessible

### Progress Not Updating
- Check if `onProgress` callback is provided
- Verify XMLHttpRequest is supported
- Check console for errors

### Retry Not Working
- Check if error is retryable
- Verify maxAttempts > currentAttempt
- Check retry config

### Form Data Not Persisting
- Check AsyncStorage permissions
- Verify saveFormData is called
- Check console for storage errors

### Image Quality Check Fails
- Check file permissions
- Verify image URI is valid
- Ensure Image.getSize works
- Check FileSystem access

## File Locations

```
frontend/
├── services/
│   └── billUploadService.ts      # Enhanced service
├── hooks/
│   ├── useBillUpload.ts          # Upload hook
│   └── useImageQuality.ts        # Quality check hook
└── types/
    └── upload.types.ts           # Type definitions
```

## Next Steps

1. Integrate with your bill upload form
2. Add progress bar component
3. Implement error boundary
4. Add analytics tracking
5. Test with real backend
6. Add offline queue (future)
7. Implement chunked uploads (future)

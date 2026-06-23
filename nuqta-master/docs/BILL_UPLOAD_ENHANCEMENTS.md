# Bill Upload Service Enhancements

## Overview
This document describes the enhanced bill upload system with progress tracking, retry mechanisms, image quality checks, and form persistence.

## Files Created/Enhanced

### 1. **types/upload.types.ts** (NEW)
Complete type definitions for upload functionality.

#### Key Types:
- `UploadProgress`: Tracks upload progress with speed and time remaining
- `UploadError`: Standardized error handling with retry capability
- `RetryConfig`: Configuration for exponential backoff retry logic
- `UploadState`: Upload lifecycle states (idle, preparing, uploading, paused, completed, failed, cancelled)
- `UploadMetadata`: File metadata and upload results
- `UploadResult`: Complete upload result with metrics

#### Constants:
- `DEFAULT_RETRY_CONFIG`: 3 attempts, exponential backoff (1s, 2s, 4s)
- `DEFAULT_UPLOAD_OPTIONS`: 30s timeout, validation enabled
- `FILE_SIZE_LIMITS`: Max sizes for images (10MB), videos (100MB)
- `ALLOWED_FILE_TYPES`: Supported MIME types

### 2. **services/billUploadService.ts** (ENHANCED)
Production-ready bill upload service with advanced features.

#### New Methods:

##### `uploadBillWithProgress(data, onProgress)`
- Uses XMLHttpRequest for real-time progress tracking
- Calculates upload speed (bytes/sec) and time remaining
- Tracks progress with 5-sample moving average for speed
- 30-second timeout
- Proper error handling for network, timeout, and cancellation

**Features:**
- Real-time progress callbacks
- Speed calculation (B/s, KB/s, MB/s, GB/s)
- Time remaining estimation
- Auth token injection
- Platform-specific FormData handling (web vs mobile)

##### `uploadBillWithRetry(data, onProgress, retryConfig)`
- Automatic retry with exponential backoff
- Configurable max attempts (default: 3)
- Only retries on retryable errors (network, timeout, server errors)
- Returns detailed UploadResult with metrics

**Retry Logic:**
- Attempt 1: Immediate
- Attempt 2: Wait 1 second
- Attempt 3: Wait 2 seconds
- Maximum delay: 30 seconds

##### `cancelUpload(uploadId)`
- Cancel active uploads via XMLHttpRequest.abort()
- Cleanup tracking data
- Returns success/failure status

##### Private Helper Methods:
- `calculateUploadMetrics()`: Speed and time calculations
- `createFormData()`: Platform-specific FormData creation
- `createUploadError()`: Standardized error creation
- `formatSpeed()`: Human-readable speed formatting

### 3. **hooks/useBillUpload.ts** (NEW)
React hook for managing bill upload state and workflow.

#### Features:

##### State Management:
```typescript
const {
  isUploading,        // Boolean: upload in progress
  uploadState,        // Current state: idle, preparing, uploading, etc.
  progress,           // UploadProgress object with speed, timeRemaining
  error,              // UploadError object if failed
  formData,           // Saved form data for recovery

  currentAttempt,     // Current retry attempt (1-3)
  maxAttempts,        // Maximum retry attempts
  canRetry,           // Boolean: can retry upload

  uploadSpeed,        // Formatted speed string (e.g., "1.5 MB/s")
  timeRemaining,      // Formatted time string (e.g., "2:34")
  percentComplete,    // 0-100 percentage

  startUpload,        // Start upload with retry
  retryUpload,        // Manually retry failed upload
  cancelUpload,       // Cancel active upload
  saveFormData,       // Save form to AsyncStorage
  loadFormData,       // Load saved form data
  clearFormData,      // Clear saved data
  reset,              // Reset all state
} = useBillUpload();
```

##### Form Persistence:
- Auto-saves form data to AsyncStorage
- Survives app crashes/restarts
- Auto-loads on mount
- Clears on successful upload

##### Progress Tracking:
- Real-time progress updates
- Upload speed calculation
- Time remaining estimation
- Milestone logging (25%, 50%, 75%, 100%)

##### Error Handling:
- Automatic retry on network errors
- Exponential backoff between retries
- Non-retryable error detection
- State persistence for recovery

### 4. **hooks/useImageQuality.ts** (NEW)
Hook for checking image quality before upload.

#### Features:

##### Quality Checks:
```typescript
const {
  checkQuality,  // Check image quality
  isChecking,    // Boolean: check in progress
  result,        // ImageQualityResult object
  error,         // Error message if check failed
  clearCache,    // Clear cached results
} = useImageQuality({
  minWidth: 800,
  minHeight: 600,
  maxFileSize: 10 * 1024 * 1024,  // 10MB
  checkBlur: true,
  checkAspectRatio: true,
  allowedAspectRatios: [1, 1.33, 1.5, 1.77],
});

const result = await checkQuality('file://path/to/image.jpg');
```

##### Quality Result:
```typescript
interface ImageQualityResult {
  isValid: boolean;           // Overall validation result
  score: number;              // 0-100 quality score
  checks: {
    resolution: {
      passed: boolean;
      width: number;
      height: number;
      message: string;
    };
    fileSize: {
      passed: boolean;
      size: number;
      message: string;
    };
    aspectRatio: {
      passed: boolean;
      ratio: number;
      message: string;
    };
    blur: {
      passed: boolean;
      score: number;
      message: string;
    };
  };
  recommendations: string[];   // How to improve quality
  warnings: string[];          // Non-critical issues
  errors: string[];           // Critical issues
}
```

##### Caching:
- Results cached for 5 minutes
- Keyed by image URI
- Automatic cache expiration
- Manual cache clearing

##### Checks Performed:
1. **Resolution**: Minimum 800x600 (configurable)
2. **File Size**: Maximum 10MB (configurable)
3. **Aspect Ratio**: Standard ratios (1:1, 4:3, 3:2, 16:9)
4. **Blur Detection**: Basic heuristic based on compression ratio

## Usage Examples

### Example 1: Basic Upload with Progress

```typescript
import { useBillUpload } from '@/hooks/useBillUpload';
import { BillUploadData } from '@/services/billUploadService';

function BillUploadScreen() {
  const {
    startUpload,
    isUploading,
    progress,
    uploadSpeed,
    timeRemaining,
    percentComplete,
    error,
  } = useBillUpload();

  const handleUpload = async () => {
    const data: BillUploadData = {
      billImage: 'file://path/to/bill.jpg',
      merchantId: 'merchant_123',
      amount: 1500,
      billDate: new Date(),
    };

    const success = await startUpload(data);

    if (success) {
      console.log('Upload completed!');
    } else {
      console.error('Upload failed:', error?.message);
    }
  };

  return (
    <View>
      <Button onPress={handleUpload} disabled={isUploading}>
        Upload Bill
      </Button>

      {isUploading && (
        <View>
          <Text>Uploading... {percentComplete}%</Text>
          <Text>Speed: {uploadSpeed}</Text>
          <Text>Time remaining: {timeRemaining}</Text>
          <ProgressBar progress={percentComplete / 100} />
        </View>
      )}

      {error && (
        <Text style={{ color: 'red' }}>
          Error: {error.message}
        </Text>
      )}
    </View>
  );
}
```

### Example 2: Upload with Retry

```typescript
import { useBillUpload } from '@/hooks/useBillUpload';

function BillUploadWithRetry() {
  const {
    startUpload,
    retryUpload,
    cancelUpload,
    isUploading,
    error,
    canRetry,
    currentAttempt,
    maxAttempts,
  } = useBillUpload({
    maxAttempts: 5,
    initialDelay: 2000,
    backoffMultiplier: 2,
  });

  return (
    <View>
      {isUploading && (
        <View>
          <Text>Attempt {currentAttempt}/{maxAttempts}</Text>
          <Button onPress={cancelUpload}>Cancel</Button>
        </View>
      )}

      {error && canRetry && (
        <Button onPress={retryUpload}>Retry Upload</Button>
      )}
    </View>
  );
}
```

### Example 3: Image Quality Check Before Upload

```typescript
import { useImageQuality } from '@/hooks/useImageQuality';
import { useBillUpload } from '@/hooks/useBillUpload';

function BillUploadWithQualityCheck() {
  const { checkQuality, isChecking, result } = useImageQuality({
    minWidth: 1200,
    minHeight: 900,
    maxFileSize: 5 * 1024 * 1024, // 5MB
  });

  const { startUpload } = useBillUpload();

  const handleImageSelected = async (imageUri: string) => {
    // Check quality first
    const qualityResult = await checkQuality(imageUri);

    if (!qualityResult.isValid) {
      alert(`Image quality issues:\n${qualityResult.errors.join('\n')}`);
      return;
    }

    if (qualityResult.warnings.length > 0) {
      // Show warnings but allow upload
      console.warn('Image warnings:', qualityResult.warnings);
    }

    // Quality is good, proceed with upload
    await startUpload({
      billImage: imageUri,
      // ... other data
    });
  };

  return (
    <View>
      {isChecking && <Text>Checking image quality...</Text>}

      {result && (
        <View>
          <Text>Quality Score: {result.score}/100</Text>
          <Text>Resolution: {result.checks.resolution.width}x{result.checks.resolution.height}</Text>

          {result.recommendations.length > 0 && (
            <View>
              <Text>Recommendations:</Text>
              {result.recommendations.map((rec, i) => (
                <Text key={i}>• {rec}</Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
```

### Example 4: Form Persistence

```typescript
import { useBillUpload } from '@/hooks/useBillUpload';
import { useEffect } from 'react';

function BillUploadForm() {
  const {
    formData,
    saveFormData,
    loadFormData,
    clearFormData,
    startUpload,
  } = useBillUpload();

  // Auto-load saved form on mount
  useEffect(() => {
    loadFormData();
  }, []);

  const handleInputChange = (field: string, value: any) => {
    const updatedData = { ...formData, [field]: value };
    saveFormData(updatedData); // Auto-save on every change
  };

  return (
    <View>
      {formData && (
        <Text>Form data recovered from previous session</Text>
      )}

      <TextInput
        value={formData?.amount}
        onChangeText={(text) => handleInputChange('amount', text)}
      />

      <Button onPress={() => clearFormData()}>
        Clear Saved Data
      </Button>
    </View>
  );
}
```

### Example 5: Direct Service Usage (Without Hook)

```typescript
import { billUploadService } from '@/services/billUploadService';
import { UploadProgress } from '@/types/upload.types';

async function directUpload() {
  const data = {
    billImage: 'file://path/to/bill.jpg',
    merchantId: 'merchant_123',
    amount: 1500,
    billDate: new Date(),
  };

  // Upload with progress tracking
  const result = await billUploadService.uploadBillWithProgress(
    data,
    (progress: UploadProgress) => {
      console.log(`Progress: ${progress.percentage}%`);
      console.log(`Speed: ${progress.speed} bytes/sec`);
      console.log(`Time remaining: ${progress.timeRemaining}s`);
    }
  );

  if (result.success) {
    console.log('Upload successful:', result.data);
  } else {
    console.error('Upload failed:', result.error);
  }
}

async function uploadWithRetry() {
  const result = await billUploadService.uploadBillWithRetry(
    data,
    (progress) => console.log(progress),
    {
      maxAttempts: 5,
      initialDelay: 1000,
      backoffMultiplier: 2,
    }
  );

  console.log('Upload result:', result);
  console.log('Duration:', result.duration, 'ms');
  console.log('Average speed:', result.averageSpeed, 'bytes/sec');
}
```

## Error Handling

### Error Codes
```typescript
enum UploadErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',           // Retryable
  TIMEOUT = 'TIMEOUT',                       // Retryable
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',        // Not retryable
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',  // Not retryable
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',        // Not retryable
  PERMISSION_DENIED = 'PERMISSION_DENIED',   // Not retryable
  SERVER_ERROR = 'SERVER_ERROR',             // Retryable
  CANCELLED = 'CANCELLED',                   // Not retryable
  VALIDATION_ERROR = 'VALIDATION_ERROR',     // Not retryable
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',           // Retryable
}
```

### Error Properties
```typescript
interface UploadError {
  code: string;          // Error code
  message: string;       // User-friendly message
  details?: string;      // Technical details
  retryable: boolean;    // Can this error be retried?
  httpStatus?: number;   // HTTP status code
  timestamp: number;     // When error occurred
}
```

## Performance Considerations

### Upload Speed Calculation
- Uses 5-sample moving average for smooth speed display
- Updates every progress event
- Handles variable network speeds

### Time Remaining Calculation
- Based on average upload speed
- Updates in real-time
- Accounts for network fluctuations

### Memory Management
- Cleanup on upload completion/cancellation
- No memory leaks from event listeners
- Efficient FormData handling

### Caching
- Image quality results cached for 5 minutes
- Reduces redundant checks
- Automatic cache expiration

## Production Readiness Checklist

- ✅ Progress tracking with XMLHttpRequest
- ✅ Exponential backoff retry mechanism
- ✅ Timeout handling (30 seconds)
- ✅ Upload speed and time remaining calculation
- ✅ Network error handling
- ✅ Form data persistence with AsyncStorage
- ✅ Image quality validation
- ✅ Result caching
- ✅ Cancel upload capability
- ✅ Platform-specific handling (web vs mobile)
- ✅ Comprehensive error handling
- ✅ TypeScript type safety
- ✅ Detailed logging
- ✅ Production-grade code quality

## Backend Integration

### Expected API Endpoint
```
POST /api/bills/upload
Content-Type: multipart/form-data
Authorization: Bearer {token}

FormData:
- billImage: File
- merchantId: string
- amount: string
- billDate: ISO string
- billNumber?: string
- notes?: string
- ocrData?: JSON string
- verificationResult?: JSON string
- fraudCheck?: JSON string
- cashbackCalculation?: JSON string
```

### Expected Response
```json
{
  "success": true,
  "data": {
    "_id": "bill_123",
    "billImage": {
      "url": "https://cdn.example.com/bills/bill_123.jpg",
      "thumbnailUrl": "https://cdn.example.com/bills/bill_123_thumb.jpg",
      "cloudinaryId": "bills/bill_123"
    },
    "merchant": {
      "_id": "merchant_123",
      "name": "Merchant Name"
    },
    "amount": 1500,
    "verificationStatus": "pending",
    "createdAt": "2025-11-03T10:00:00Z"
  }
}
```

## Testing

### Unit Tests
```typescript
// Test upload progress tracking
// Test retry mechanism
// Test exponential backoff
// Test error handling
// Test form persistence
// Test image quality checks
```

### Integration Tests
```typescript
// Test with real backend API
// Test network error scenarios
// Test timeout scenarios
// Test cancellation
// Test form recovery
```

## Future Enhancements

1. **Chunked Uploads**: For very large files
2. **Resumable Uploads**: Resume from failure point
3. **Compression**: Auto-compress images before upload
4. **Advanced Blur Detection**: Use native modules for better accuracy
5. **Multi-file Upload**: Upload multiple bills at once
6. **Upload Queue**: Background upload queue with priorities
7. **Offline Support**: Queue uploads when offline
8. **Analytics**: Track upload success rates, speeds, failure reasons

## Dependencies

```json
{
  "@react-native-async-storage/async-storage": "^1.x.x",
  "expo-file-system": "^15.x.x",
  "react-native": "^0.x.x"
}
```

## Related Files

- `services/apiClient.ts` - Base API client
- `types/billVerification.types.ts` - Bill verification types
- `config/env.ts` - Environment configuration
- `hooks/useBillVerification.ts` - Bill verification workflow

## Support

For issues or questions:
1. Check console logs for detailed error messages
2. Verify backend API is running
3. Check network connectivity
4. Ensure proper permissions for file access
5. Review AsyncStorage for persisted data

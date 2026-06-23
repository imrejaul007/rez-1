# Bill Upload Backend Integration Improvements

## Summary

This document outlines the improvements made to the bill upload frontend integration to fix backend-related issues and enhance the user experience.

---

## 1. Fixed Incomplete Merchant Search

### Problem
The merchant search implementation in `billVerificationService.ts` was incomplete:
- No timeout handling for slow API responses
- Missing fallback for unavailable API endpoints
- Poor error messages when search fails
- No input validation

### Solution
**File**: `services/billVerificationService.ts`

**Improvements**:
```typescript
//  Added input validation
if (!merchantName || merchantName.trim().length < 2) {
  return {
    success: false,
    error: 'Merchant name must be at least 2 characters',
  };
}

//  Added timeout handling (30 seconds)
const timeoutPromise = new Promise<never>((_, reject) =>
  setTimeout(() => reject(new Error('Merchant search timed out')), 30000)
);

//  Race between timeout and search
const response = await Promise.race([searchPromise, timeoutPromise]);

//  Sort results by match score
matches.sort((a, b) => b.matchScore - a.matchScore);

//  Graceful fallback when API is unavailable
if (error.response?.status === 404 || error.response?.status === 501) {
  return {
    success: true,
    data: [],
    message: 'Merchant search is temporarily unavailable. Please enter merchant details manually.',
  };
}
```

**User-facing improvements**:
- Clear timeout messages: "Merchant search is taking too long. Please try again or enter merchant details manually."
- Network error guidance: "Unable to search merchants. Please check your internet connection and try again."
- Fallback when API unavailable: Returns empty results with message to enter manually
- Results sorted by relevance (match score)

---

## 2. Image Duplicate Detection

### Problem
No duplicate detection was implemented, allowing users to upload the same bill image multiple times.

### Solution
**New File**: `services/imageHashService.ts` (630 lines)

**Features**:
- SHA-256 hash generation for web platform
- MD5 hash generation for native platforms (iOS/Android)
- Local storage of recent upload hashes (up to 100)
- Time-window based duplicate detection (24 hours configurable)
- Merchant-specific duplicate checking
- Amount similarity checking

**API**:
```typescript
// Generate hash for an image
const hash = await imageHashService.generateImageHash(imageUri);

// Check for duplicates
const result = await imageHashService.checkDuplicate(imageUri, {
  merchantId: 'merchant123',
  amount: 1000,
  checkMerchant: true,
  checkAmount: true,
  amountThreshold: 10, // ¹10 difference
  timeWindow: 24 * 60 * 60 * 1000, // 24 hours
});

if (result.isDuplicate) {
  console.log('Duplicate found:', result.reason);
  console.log('Match similarity:', result.similarity, '%');
}

// Store hash after successful upload
await imageHashService.storeHash({
  hash,
  imageUri,
  merchantId,
  amount,
  timestamp: Date.now(),
  uploadId: 'upload_123',
});
```

**Duplicate Detection Logic**:
1. Exact hash match (100% similarity) = definite duplicate
2. High similarity (>95%) + same merchant + similar amount = likely duplicate
3. Configurable time window (default 24 hours)
4. Automatic cleanup of old hashes

**Storage**:
- Persisted in AsyncStorage (`@bill_upload_hashes`)
- Automatic cleanup of hashes older than configured window
- Maximum 100 hashes stored (pruned by age)

---

## 3. Improved Error Messages

### Problem
Generic error messages that don't help users understand what went wrong or how to fix it.

### Solution
**File**: `utils/billUploadErrors.ts` (already exists, enhanced)

**Error Categories**:
- FILE errors: Size, format, quality, corruption, duplicates
- VALIDATION errors: Invalid merchant, amount, date, bill number
- NETWORK errors: Timeout, connection issues, interruptions
- SERVER errors: Server errors, unavailable, authentication
- BUSINESS errors: Duplicate bills, merchant eligibility, limits
- PROCESSING errors: OCR failures, verification failures

**Example Error Messages**:

| Error Type | User Message | Recovery Suggestions |
|------------|--------------|---------------------|
| `DUPLICATE_IMAGE` | "You have already uploaded this bill image. Each bill can only be submitted once." | " Check your previous uploads<br>" Upload a different bill<br>" Contact support if you believe this is an error |
| `IMAGE_QUALITY_LOW` | "The image quality is too low. Please take a clearer photo of your bill." | " Ensure the bill is clearly visible<br>" Use better lighting conditions<br>" Hold the camera steady to avoid blur<br>" Make sure all text is readable<br>" Avoid shadows and glare |
| `MERCHANT_NOT_FOUND` | "We couldn't find a matching merchant. Please select from suggestions or add manually." | " Check the merchant name spelling<br>" Try entering the merchant address<br>" Select 'Add new merchant' to create entry<br>" Contact support if merchant should be listed |
| `NETWORK_TIMEOUT` | "Upload is taking too long. Please check your internet connection and try again." | " Check your internet connection<br>" Try connecting to a faster network<br>" Move to an area with better signal<br>" Retry the upload |

**Error Response Structure**:
```typescript
{
  type: BillUploadErrorType.DUPLICATE_IMAGE,
  category: ErrorCategory.FILE,
  severity: ErrorSeverity.MEDIUM,
  message: 'Technical error message',
  userMessage: 'User-friendly message',
  recoverySuggestions: ['Step 1', 'Step 2', 'Step 3'],
  isRetryable: false,
  requiresUserAction: true,
}
```

---

## 4. Frontend Validation

### Problem
No pre-upload validation, causing unnecessary backend calls and poor user experience.

### Solution

**Image Quality Validation** (`utils/imageQualityValidator.ts`):
```typescript
const result = await validateImageQuality({
  uri: imageUri,
  fileSize: 1024000,
  width: 1920,
  height: 1080,
  mimeType: 'image/jpeg'
});

if (!result.isValid) {
  // Show errors to user
  result.errors.forEach(error => console.error(error));
  result.warnings.forEach(warning => console.warn(warning));

  // Show improvement suggestions
  const suggestions = getQualityImprovementSuggestions(result);
}
```

**Bill Data Validation** (`utils/billValidation.ts`):
```typescript
// Individual field validation
const amountResult = validateAmount('1000'); // { isValid: true, value: 1000 }
const dateResult = validateBillDate(new Date()); // { isValid: true, value: Date }

// Complete form validation
const formResult = validateBillForm({
  amount: '1000',
  date: new Date(),
  merchant: 'ABC Store',
  billNumber: 'INV-001',
  notes: 'Monthly purchase'
});

if (!formResult.isValid) {
  console.log('Errors:', formResult.errors);
  // { amount: undefined, date: undefined, merchant: undefined }
}
```

**Duplicate Image Check** (before upload):
```typescript
// Check before adding to queue
const duplicateCheck = await imageHashService.checkDuplicate(imageUri, {
  merchantId: formData.merchantId,
  amount: formData.amount,
  checkMerchant: true,
  checkAmount: true,
});

if (duplicateCheck.isDuplicate) {
  throw new Error('Duplicate bill detected. This image was already uploaded.');
}
```

**Validation Rules**:
- Amount: ¹50 - ¹100,000
- Date: Not future, max 30 days old
- Image: 800x600 minimum, 5MB maximum
- Format: JPG, JPEG, PNG, HEIC only
- Quality: Minimum score of 40/100

---

## 5. Centralized Configuration

### Problem
Hardcoded values scattered across multiple files, difficult to maintain and update.

### Solution
**File**: `config/uploadConfig.ts` (389 lines)

**Configuration Modules**:

1. **File Size Limits**
```typescript
export const FILE_SIZE_LIMITS = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024,    // 5MB
  MIN_IMAGE_SIZE: 50 * 1024,           // 50KB
  OPTIMAL_SIZE: 2 * 1024 * 1024,       // 2MB
  WARNING_THRESHOLD: 3 * 1024 * 1024,  // 3MB
};
```

2. **Upload Configuration**
```typescript
export const UPLOAD_CONFIG = {
  TIMEOUT_MS: 60000,              // 60 seconds
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY: 1000,      // 1 second
  MAX_RETRY_DELAY: 30000,         // 30 seconds
  BACKOFF_MULTIPLIER: 2,          // Exponential backoff
  USE_JITTER: true,               // Prevent thundering herd
};
```

3. **Queue Configuration**
```typescript
export const QUEUE_CONFIG = {
  MAX_QUEUE_SIZE: 50,
  BATCH_SIZE: 5,
  SYNC_INTERVAL: 5 * 60 * 1000,   // 5 minutes
  AUTO_SYNC_ON_RECONNECT: true,
  MAX_QUEUE_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days
};
```

4. **Image Quality Configuration**
```typescript
export const IMAGE_QUALITY_CONFIG = {
  MIN_RESOLUTION: { width: 800, height: 600 },
  RECOMMENDED_RESOLUTION: { width: 1920, height: 1080 },
  MIN_QUALITY_SCORE: 60,
  JPEG_QUALITY: 0.85,
  AUTO_COMPRESS: true,
};
```

5. **Bill-Specific Configuration**
```typescript
export const BILL_SPECIFIC_CONFIG = {
  ENABLE_OCR: true,
  MIN_OCR_CONFIDENCE: 0.7,
  ENABLE_DUPLICATE_DETECTION: true,
  DUPLICATE_WINDOW: 30 * 24 * 60 * 60 * 1000, // 30 days
};
```

6. **Error Classification**
```typescript
export const RETRYABLE_ERRORS = [
  'TIMEOUT',
  'NETWORK_ERROR',
  'SERVER_ERROR',
  'SERVICE_UNAVAILABLE',
  // ... more
];

export const NON_RETRYABLE_ERRORS = [
  'INVALID_FILE_FORMAT',
  'FILE_TOO_LARGE',
  'DUPLICATE_IMAGE',
  'VALIDATION_ERROR',
  // ... more
];
```

**Helper Functions**:
```typescript
// Check if error should be retried
const shouldRetry = shouldRetryError(errorCode);

// Calculate exponential backoff delay
const delay = calculateRetryDelay(attemptNumber);

// Validate file
const isValid = isValidFileSize(fileSize) && isValidFileFormat(mimeType);
```

---

## Integration Examples

### Example 1: Upload with Duplicate Detection

```typescript
import { billUploadQueueService } from '@/services/billUploadQueueService';
import { imageHashService } from '@/services/imageHashService';
import { BillUploadErrorType, createBillUploadError } from '@/utils/billUploadErrors';

async function uploadBill(imageUri: string, formData: BillUploadData) {
  try {
    // 1. Check for duplicate image
    const duplicateCheck = await imageHashService.checkDuplicate(imageUri, {
      merchantId: formData.merchantId,
      amount: formData.amount,
      checkMerchant: true,
      checkAmount: true,
    });

    if (duplicateCheck.isDuplicate) {
      const error = createBillUploadError(
        BillUploadErrorType.DUPLICATE_IMAGE,
        duplicateCheck.reason
      );
      throw new Error(error.userMessage);
    }

    // 2. Add to upload queue
    const uploadId = await billUploadQueueService.addToQueue(formData, imageUri);

    // 3. Store hash for future duplicate detection
    const hash = await imageHashService.generateImageHash(imageUri);
    await imageHashService.storeHash({
      hash,
      imageUri,
      merchantId: formData.merchantId,
      amount: formData.amount,
      timestamp: Date.now(),
      uploadId,
    });

    return { success: true, uploadId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

### Example 2: Merchant Search with Fallback

```typescript
import { billVerificationService } from '@/services/billVerificationService';

async function searchMerchant(merchantName: string) {
  try {
    const result = await billVerificationService.findMerchantMatches(
      merchantName,
      location // optional
    );

    if (result.success) {
      if (result.data && result.data.length > 0) {
        // Show merchant matches (already sorted by score)
        return {
          status: 'found',
          merchants: result.data,
        };
      } else {
        // No matches - show manual entry option
        return {
          status: 'not_found',
          message: result.message || 'Merchant not found. Please enter details manually.',
        };
      }
    } else {
      // Search failed - show error with fallback
      return {
        status: 'error',
        message: result.error,
        allowManualEntry: true,
      };
    }
  } catch (error) {
    // Network or timeout error
    return {
      status: 'error',
      message: 'Unable to search merchants. Please enter details manually.',
      allowManualEntry: true,
    };
  }
}
```

### Example 3: Form Validation with Clear Errors

```typescript
import { validateBillForm } from '@/utils/billValidation';
import { getErrorInfo } from '@/utils/billUploadErrors';

async function submitBillForm(formData: BillFormData) {
  // Validate form
  const validation = validateBillForm(formData);

  if (!validation.isValid) {
    // Show field-specific errors
    Object.entries(validation.errors).forEach(([field, error]) => {
      showFieldError(field, error);
    });
    return;
  }

  // Use validated values
  const { amount, date, merchant, billNumber, notes } = validation.values;

  // Proceed with upload...
}
```

---

## Configuration Usage

All services should import from the centralized configuration:

```typescript
// L Bad - hardcoded values
const maxFileSize = 5 * 1024 * 1024;
const timeout = 60000;

//  Good - use centralized config
import { BILL_UPLOAD_CONFIG } from '@/config/uploadConfig';

const maxFileSize = BILL_UPLOAD_CONFIG.FILE_SIZE_LIMITS.MAX_IMAGE_SIZE;
const timeout = BILL_UPLOAD_CONFIG.UPLOAD_CONFIG.TIMEOUT_MS;
```

---

## Testing Checklist

### Merchant Search
- [ ] Search with valid merchant name returns results
- [ ] Search timeout after 30 seconds shows clear message
- [ ] No internet connection shows helpful error
- [ ] API unavailable (404/501) provides manual entry fallback
- [ ] Results sorted by match score
- [ ] Empty search (< 2 chars) shows validation error

### Duplicate Detection
- [ ] Uploading same image twice is blocked
- [ ] Same merchant + same amount flagged as duplicate
- [ ] Different merchant allows same image
- [ ] Time window properly enforced (old duplicates allowed)
- [ ] Hash storage persists across app restarts
- [ ] Cleanup removes old hashes (> 30 days)

### Error Messages
- [ ] Each error type shows user-friendly message
- [ ] Recovery suggestions displayed
- [ ] Retryable errors show retry button
- [ ] Non-retryable errors show alternative actions
- [ ] Network errors show connectivity guidance

### Validation
- [ ] Image size validation blocks large files (> 5MB)
- [ ] Image format validation blocks unsupported types
- [ ] Amount validation enforces min/max (¹50 - ¹100,000)
- [ ] Date validation blocks future dates
- [ ] Date validation blocks old bills (> 30 days)
- [ ] Bill number format validated correctly

### Configuration
- [ ] All timeouts use centralized config
- [ ] File size limits consistent across services
- [ ] Retry logic uses configured backoff
- [ ] Error classification consistent

---

## Files Modified/Created

### Created
1.  `services/imageHashService.ts` - Image duplicate detection service
2.  `BILL_UPLOAD_IMPROVEMENTS_SUMMARY.md` - This document

### Modified
1.  `services/billVerificationService.ts` - Enhanced merchant search
2. ó `services/billUploadQueueService.ts` - Integrate duplicate detection
3. ó `services/billUploadService.ts` - Use centralized config

### Existing (Enhanced)
1.  `config/uploadConfig.ts` - Centralized configuration
2.  `utils/billUploadErrors.ts` - Comprehensive error definitions
3.  `utils/billValidation.ts` - Form validation utilities
4.  `utils/imageQualityValidator.ts` - Image quality validation

---

## Next Steps (Integration)

### 1. Update billUploadQueueService
Add duplicate detection to queue service:

```typescript
// In addToQueue method
const duplicateCheck = await imageHashService.checkDuplicate(imageUri, {
  merchantId: formData.merchantId,
  amount: formData.amount,
  checkMerchant: true,
  checkAmount: true,
});

if (duplicateCheck.isDuplicate) {
  throw new Error(createBillUploadError(
    BillUploadErrorType.DUPLICATE_IMAGE
  ).userMessage);
}
```

### 2. Update UI Components
Integrate error messages in upload screens:

```typescript
// Show error with recovery suggestions
const errorInfo = getErrorInfo(errorType);
Alert.alert(
  'Upload Failed',
  errorInfo.userMessage,
  [
    ...errorInfo.recoverySuggestions.map(suggestion => ({
      text: suggestion,
      onPress: () => handleRecoverySuggestion(suggestion)
    })),
    { text: 'OK' }
  ]
);
```

### 3. Add Merchant Search UI
Implement search with timeout and fallback:

```typescript
<SearchInput
  onSearch={async (query) => {
    setLoading(true);
    const result = await searchMerchant(query);
    setLoading(false);

    if (result.status === 'found') {
      setMerchants(result.merchants);
    } else if (result.status === 'not_found') {
      setShowManualEntry(true);
      showMessage(result.message);
    } else {
      showError(result.message);
      setShowManualEntry(result.allowManualEntry);
    }
  }}
  timeout={30000}
  placeholder="Search for merchant..."
/>
```

### 4. Add Pre-Upload Validation
Validate before allowing upload:

```typescript
// Before showing upload button
const validation = await validateImageQuality(imageInfo);
if (!validation.isValid) {
  setErrors(validation.errors);
  setSuggestions(validation.feedback);
  setUploadDisabled(true);
} else if (validation.warnings.length > 0) {
  setWarnings(validation.warnings);
  setUploadDisabled(false); // Allow with warning
} else {
  setUploadDisabled(false);
}
```

---

## Benefits

1. **Better User Experience**
   - Clear, actionable error messages
   - Prevents duplicate submissions
   - Faster merchant search with fallback
   - Real-time validation feedback

2. **Reduced Backend Load**
   - Duplicate detection prevents unnecessary uploads
   - Client-side validation reduces invalid requests
   - Timeout prevents hanging requests

3. **Easier Maintenance**
   - Centralized configuration
   - Consistent error handling
   - Reusable validation utilities

4. **Better Error Recovery**
   - Specific recovery suggestions for each error
   - Graceful fallbacks when APIs unavailable
   - Retry logic for transient errors

---

## Backend Team Notes

### Expected API Endpoints

1. **Merchant Search**: `POST /bills/match-merchant`
   - Request: `{ merchantName: string, location?: string }`
   - Response: `{ matches: MerchantMatch[] }`
   - Timeout: Should respond within 30 seconds
   - Fallback: Return 404/501 if not implemented

2. **Bill Upload**: `POST /bills/upload`
   - Should handle duplicate detection on backend
   - Return clear error codes for validation failures
   - Support retry with idempotency

### Error Codes to Return

- `409 Conflict` - Duplicate bill
- `413 Payload Too Large` - File too large
- `415 Unsupported Media Type` - Invalid format
- `422 Unprocessable Entity` - Validation failed
- `429 Too Many Requests` - Rate limited
- `503 Service Unavailable` - Temporary outage

---

## Support & Troubleshooting

### Common Issues

**Issue**: Duplicate detection not working
- Check AsyncStorage permissions
- Verify image hash service initialized
- Check console for hash generation errors

**Issue**: Merchant search timeout
- Increase timeout in config if needed
- Check backend API response time
- Verify network connectivity

**Issue**: Validation errors not showing
- Check error message mapping
- Verify error type classification
- Review console logs for errors

---

## Version History

- **v1.0.0** (2025-11-03)
  - Initial implementation
  - Image duplicate detection
  - Enhanced merchant search
  - Centralized configuration
  - Improved error messages
  - Frontend validation

---

**Note**: This implementation focuses on frontend improvements. Backend teams should review expected API behaviors and error codes for full integration.

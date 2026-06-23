# Bill Upload Quick Reference Guide

## =€ Quick Start

### Import What You Need

```typescript
// Configuration
import { BILL_UPLOAD_CONFIG } from '@/config/uploadConfig';

// Services
import { billVerificationService } from '@/services/billVerificationService';
import { billUploadService } from '@/services/billUploadService';
import { billUploadQueueService } from '@/services/billUploadQueueService';
import { imageHashService } from '@/services/imageHashService';

// Validation
import { validateBillForm, validateImageQuality } from '@/utils/billValidation';
import { validateImageQuality } from '@/utils/imageQualityValidator';

// Errors
import {
  BillUploadErrorType,
  getErrorInfo,
  createBillUploadError,
  getUserErrorMessage,
  getRecoverySuggestions
} from '@/utils/billUploadErrors';
```

---

## =Ë Common Tasks

### 1. Check for Duplicate Image

```typescript
const duplicateCheck = await imageHashService.checkDuplicate(imageUri, {
  merchantId: 'merchant_123',
  amount: 1000,
  checkMerchant: true,
  checkAmount: true,
});

if (duplicateCheck.isDuplicate) {
  Alert.alert('Duplicate Bill', duplicateCheck.reason);
  return;
}
```

### 2. Validate Bill Form

```typescript
const validation = validateBillForm({
  amount: '1000',
  date: new Date(),
  merchant: 'ABC Store',
  billNumber: 'INV-001',
  notes: 'Purchase notes'
});

if (!validation.isValid) {
  // Show errors
  Object.entries(validation.errors).forEach(([field, error]) => {
    console.error(`${field}: ${error}`);
  });
} else {
  // Use validated values
  const { amount, date, merchant } = validation.values;
}
```

### 3. Validate Image Quality

```typescript
const qualityResult = await validateImageQuality({
  uri: imageUri,
  fileSize: fileInfo.size,
  width: imageInfo.width,
  height: imageInfo.height,
  mimeType: 'image/jpeg'
});

if (!qualityResult.isValid) {
  qualityResult.errors.forEach(error => console.error(error));
  qualityResult.warnings.forEach(warning => console.warn(warning));
}

console.log('Quality score:', qualityResult.qualityScore);
console.log('Suggestions:', qualityResult.feedback);
```

### 4. Search for Merchant

```typescript
const result = await billVerificationService.findMerchantMatches(
  'ABC Store',
  'New York' // optional location
);

if (result.success && result.data) {
  if (result.data.length > 0) {
    // Merchants found (sorted by match score)
    const bestMatch = result.data[0];
    console.log('Best match:', bestMatch.merchantName, bestMatch.matchScore);
  } else {
    // No matches - show manual entry
    console.log('No merchants found');
  }
} else {
  // Error - show fallback
  console.error(result.error);
}
```

### 5. Upload Bill with Queue

```typescript
try {
  const uploadId = await billUploadQueueService.addToQueue(formData, imageUri);
  console.log('Added to queue:', uploadId);

  // Listen for queue events
  billUploadQueueService.on('queue:change', (event) => {
    console.log('Queue updated:', event.status);
  });

  // Manually trigger sync
  await billUploadQueueService.syncQueue();
} catch (error) {
  console.error('Failed to add to queue:', error.message);
}
```

### 6. Handle Upload Errors

```typescript
try {
  await uploadBill(imageUri, formData);
} catch (error: any) {
  // Get error info
  const errorInfo = getErrorInfo(BillUploadErrorType.DUPLICATE_IMAGE);

  // Show to user
  Alert.alert(
    'Upload Failed',
    errorInfo.userMessage,
    [
      ...errorInfo.recoverySuggestions.map(suggestion => ({
        text: suggestion,
        style: 'default'
      })),
      {
        text: 'Cancel',
        style: 'cancel'
      }
    ]
  );

  // Check if retryable
  if (errorInfo.isRetryable) {
    // Show retry button
  }
}
```

---

## <¯ Error Handling Patterns

### Pattern 1: Simple Error Display

```typescript
const errorInfo = getErrorInfo(BillUploadErrorType.FILE_TOO_LARGE);
Alert.alert('Error', errorInfo.userMessage);
```

### Pattern 2: Error with Suggestions

```typescript
const errorInfo = getErrorInfo(BillUploadErrorType.IMAGE_QUALITY_LOW);
const suggestions = errorInfo.recoverySuggestions.join('\n" ');

Alert.alert(
  'Image Quality Issue',
  `${errorInfo.userMessage}\n\nSuggestions:\n" ${suggestions}`
);
```

### Pattern 3: Conditional Retry

```typescript
const errorInfo = getErrorInfo(errorType);

if (errorInfo.isRetryable) {
  Alert.alert(
    'Upload Failed',
    errorInfo.userMessage,
    [
      { text: 'Retry', onPress: () => retryUpload() },
      { text: 'Cancel', style: 'cancel' }
    ]
  );
} else {
  Alert.alert('Error', errorInfo.userMessage);
}
```

---

## =' Configuration Access

### Get Config Values

```typescript
// File size limits
const maxSize = BILL_UPLOAD_CONFIG.FILE_SIZE_LIMITS.MAX_IMAGE_SIZE; // 5MB
const minSize = BILL_UPLOAD_CONFIG.FILE_SIZE_LIMITS.MIN_IMAGE_SIZE; // 50KB

// Timeouts
const uploadTimeout = BILL_UPLOAD_CONFIG.UPLOAD_CONFIG.TIMEOUT_MS; // 60000ms
const maxRetries = BILL_UPLOAD_CONFIG.UPLOAD_CONFIG.MAX_RETRIES; // 3

// Queue settings
const maxQueue = BILL_UPLOAD_CONFIG.QUEUE_CONFIG.MAX_QUEUE_SIZE; // 50
const batchSize = BILL_UPLOAD_CONFIG.QUEUE_CONFIG.BATCH_SIZE; // 5

// Image quality
const minResolution = BILL_UPLOAD_CONFIG.IMAGE_QUALITY_CONFIG.MIN_RESOLUTION;
// { width: 800, height: 600 }

// Bill validation
const minAmount = BILL_VALIDATION_CONFIG.amount.min; // 50
const maxAmount = BILL_VALIDATION_CONFIG.amount.max; // 100000
const maxDaysOld = BILL_VALIDATION_CONFIG.date.maxDaysOld; // 30
```

### Helper Functions

```typescript
// Check if error is retryable
import { shouldRetryError } from '@/config/uploadConfig';
const canRetry = shouldRetryError('NETWORK_ERROR'); // true

// Validate file format
import { isValidFileFormat } from '@/config/uploadConfig';
const isValid = isValidFileFormat('image/jpeg'); // true

// Calculate retry delay
import { calculateRetryDelay } from '@/config/uploadConfig';
const delay = calculateRetryDelay(2); // Returns delay for 2nd retry
```

---

## =Ê Validation Rules Summary

| Field | Min | Max | Rule |
|-------|-----|-----|------|
| **Amount** | ¹50 | ¹100,000 | Numbers only, 2 decimal places |
| **Date** | 30 days ago | Today | Cannot be future |
| **Bill Number** | 3 chars | 50 chars | Alphanumeric + `-/_` |
| **Merchant** | 2 chars | 100 chars | Required |
| **Notes** | - | 500 chars | Optional |
| **Image Size** | 50KB | 5MB | JPEG, PNG, HEIC |
| **Resolution** | 800x600 | 4096x4096 | Min for OCR |

---

## <¨ UI Component Examples

### Error Display Component

```typescript
function ErrorMessage({ errorType }: { errorType: BillUploadErrorType }) {
  const errorInfo = getErrorInfo(errorType);

  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>
        {errorInfo.category} Error
      </Text>
      <Text style={styles.errorMessage}>
        {errorInfo.userMessage}
      </Text>
      <View style={styles.suggestions}>
        <Text style={styles.suggestionsTitle}>How to fix:</Text>
        {errorInfo.recoverySuggestions.map((suggestion, index) => (
          <Text key={index} style={styles.suggestion}>
            " {suggestion}
          </Text>
        ))}
      </View>
      {errorInfo.isRetryable && (
        <Button title="Retry" onPress={handleRetry} />
      )}
    </View>
  );
}
```

### Duplicate Detection Alert

```typescript
async function checkAndAlertDuplicate(imageUri: string, formData: any) {
  const result = await imageHashService.checkDuplicate(imageUri, {
    merchantId: formData.merchantId,
    amount: formData.amount,
  });

  if (result.isDuplicate) {
    Alert.alert(
      'Duplicate Bill Detected',
      result.reason,
      [
        {
          text: 'View Previous Upload',
          onPress: () => navigateToBill(result.matchedRecord?.uploadId)
        },
        {
          text: 'Upload Anyway',
          onPress: () => proceedWithUpload(),
          style: 'destructive'
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
    return true; // Is duplicate
  }
  return false; // Not duplicate
}
```

### Merchant Search with Timeout

```typescript
function MerchantSearch({ onSelect }: { onSelect: (merchant: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [merchants, setMerchants] = useState([]);
  const [error, setError] = useState<string | null>(null);

  const searchMerchants = async (query: string) => {
    if (query.length < 2) return;

    setLoading(true);
    setError(null);

    try {
      const result = await billVerificationService.findMerchantMatches(query);

      if (result.success && result.data) {
        setMerchants(result.data);
      } else {
        setError(result.error || 'No merchants found');
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Search merchant..."
        onChangeText={searchMerchants}
        editable={!loading}
      />
      {loading && <ActivityIndicator />}
      {error && <Text style={styles.error}>{error}</Text>}
      {merchants.map(merchant => (
        <TouchableOpacity key={merchant.merchantId} onPress={() => onSelect(merchant)}>
          <Text>{merchant.merchantName} ({merchant.matchScore}% match)</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

---

## = Debugging

### Check Service Initialization

```typescript
// Image hash service
const stats = await imageHashService.getStats();
console.log('Stored hashes:', stats.totalHashes);
console.log('Oldest:', new Date(stats.oldestTimestamp));
console.log('Newest:', new Date(stats.newestTimestamp));

// Queue service
const queueStatus = await billUploadQueueService.getStatus();
console.log('Queue:', queueStatus);
// { total: 5, pending: 2, uploading: 1, failed: 1, success: 1 }
```

### View All Stored Hashes

```typescript
const hashes = await imageHashService.getAllHashes();
hashes.forEach(record => {
  console.log('Hash:', record.hash);
  console.log('Upload ID:', record.uploadId);
  console.log('Merchant:', record.merchantId);
  console.log('Amount:', record.amount);
  console.log('Age:', Date.now() - record.timestamp, 'ms');
});
```

### Clear Debug Data

```typescript
// Clear all hashes
await imageHashService.clearAll();

// Clear queue
await billUploadQueueService.clearAll();

// Clear only completed
await billUploadQueueService.clearCompleted();
```

---

## =ñ Platform-Specific Notes

### Web Platform
- Uses `crypto.subtle.digest()` for SHA-256 hashing
- Fetches image as blob before hashing
- Web Crypto API required (HTTPS)

### Native Platform (iOS/Android)
- Uses `FileSystem.getInfoAsync()` with MD5
- For SHA-256, install `expo-crypto` or `crypto-js`
- Requires file system permissions

---

## ¡ Performance Tips

1. **Validate Early**: Check file size/format before image quality analysis
2. **Debounce Search**: Use 300ms debounce for merchant search
3. **Batch Uploads**: Queue batches of 5 for optimal performance
4. **Cache Results**: Merchant search results cached for 10 minutes
5. **Cleanup Regularly**: Old hashes auto-cleaned after 30 days

---

## = Common Pitfalls

### L Don't Do This

```typescript
// Don't hardcode values
const maxSize = 5 * 1024 * 1024;

// Don't skip validation
await uploadBill(imageUri, formData); // No validation!

// Don't ignore errors
try {
  await uploadBill();
} catch (e) {
  // Ignore
}

// Don't block duplicate detection errors
try {
  await checkDuplicate();
} catch (e) {
  // Silently continue - will allow duplicates!
}
```

###  Do This

```typescript
// Use centralized config
const maxSize = BILL_UPLOAD_CONFIG.FILE_SIZE_LIMITS.MAX_IMAGE_SIZE;

// Validate first
const validation = validateBillForm(formData);
if (validation.isValid) {
  await uploadBill(imageUri, validation.values);
}

// Handle errors properly
try {
  await uploadBill();
} catch (error: any) {
  const errorInfo = getErrorInfo(errorType);
  showErrorAlert(errorInfo);
}

// Check duplicates explicitly
const isDuplicate = await checkDuplicate(imageUri);
if (isDuplicate) {
  showDuplicateAlert();
  return; // Stop upload
}
```

---

## =Ú Related Documentation

- **Full Guide**: `BILL_UPLOAD_IMPROVEMENTS_SUMMARY.md`
- **Configuration**: `config/uploadConfig.ts`
- **Error Definitions**: `utils/billUploadErrors.ts`
- **Validation Rules**: `utils/billValidation.ts`
- **Image Quality**: `utils/imageQualityValidator.ts`

---

## <˜ Support

### Common Issues

**Q: Duplicate detection not working**
- Check AsyncStorage permissions
- Verify service is initialized
- Check console for hash generation errors

**Q: Merchant search timeout**
- Default timeout is 30 seconds
- Check backend API performance
- Use manual entry fallback

**Q: Validation errors not clear**
- Use `getErrorInfo()` for full details
- Show `recoverySuggestions` to users
- Log `technicalDetails` for debugging

---

## <¯ Best Practices

1. **Always validate before upload**
2. **Show clear error messages to users**
3. **Provide recovery suggestions**
4. **Use centralized configuration**
5. **Handle duplicates gracefully**
6. **Implement timeout fallbacks**
7. **Log errors for debugging**
8. **Test offline functionality**

---

**Last Updated**: 2025-11-03
**Version**: 1.0.0

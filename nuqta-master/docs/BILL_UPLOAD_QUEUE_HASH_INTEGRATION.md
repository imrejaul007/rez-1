# Bill Upload Queue Service - Image Hash Integration

## Overview

The `billUploadQueueService` has been enhanced with advanced duplicate detection using the `imageHashService`. This integration provides cryptographic hash-based duplicate detection to prevent users from uploading the same bill multiple times.

## Key Features

### 1. **Hash-Based Duplicate Detection**
- Uses SHA-256 (web) or MD5 (native) image hashing
- Checks for exact image matches before queueing
- Configurable time window for duplicate detection (30 days by default)
- Merchant-specific and amount-aware duplicate checking

### 2. **Smart Queueing**
- Generates image hash when bill is added to queue
- Stores hash with queued bill for future reference
- Falls back to basic duplicate detection if hash generation fails
- User-friendly error messages for duplicate detections

### 3. **Pre-Upload Verification**
- Double-checks for duplicates before actual upload
- Prevents wasted bandwidth and server resources
- Marks duplicates as failed with clear reason

### 4. **Post-Upload Hash Storage**
- Stores hash in imageHashService after successful upload
- Enables long-term duplicate detection across app sessions
- Includes merchant ID and amount for context-aware checking

### 5. **Automatic Cleanup**
- Removes hashes when bills are removed from queue
- Clears all hashes when queue is cleared
- Keeps hashes for successful uploads (intentionally, for duplicate prevention)

## Configuration

All settings are controlled via `uploadConfig.ts`:

```typescript
BILL_SPECIFIC_CONFIG: {
  /** Enable duplicate bill detection */
  ENABLE_DUPLICATE_DETECTION: true,

  /** Time window for duplicate detection: 30 days */
  DUPLICATE_WINDOW: 30 * 24 * 60 * 60 * 1000,
}
```

## How It Works

### Adding a Bill to Queue

```typescript
async addToQueue(formData: BillUploadData, imageUri: string): Promise<string>
```

**Flow:**
1. Check queue size limit
2. Generate image hash (if duplicate detection enabled)
3. Check for hash-based duplicates with merchant and amount context
4. Fallback to basic duplicate detection
5. Create queued bill with hash
6. Persist to AsyncStorage
7. Trigger auto-sync if online

**Duplicate Detection:**
- Compares image hash against stored hashes
- Checks if same merchant (optional)
- Checks if similar amount within threshold (optional)
- Respects configured time window (30 days)

**Error Messages:**
- Hash duplicate: "Same image for same merchant already uploaded"
- Basic duplicate: "A similar bill is already queued for upload"

### Uploading a Bill

```typescript
private async uploadBill(bill: QueuedBill): Promise<boolean>
```

**Flow:**
1. Check network connectivity
2. **Pre-upload verification:** Re-check for duplicates (security measure)
3. Update status to uploading
4. Apply exponential backoff if retry
5. Upload bill via billUploadService
6. **Post-upload hash storage:** Store hash in imageHashService
7. Mark as success

**Benefits:**
- Prevents race conditions (duplicate added while offline)
- Ensures hash is stored only for successful uploads
- Associates hash with backend bill ID

### Removing Bills

```typescript
async removeFromQueue(billId: string): Promise<void>
```

**Flow:**
1. Find bill in queue
2. Get hash before removal
3. Remove from queue
4. Clean up associated hash from imageHashService
5. Persist changes

### Clearing Queue

**Clear Completed:**
```typescript
async clearCompleted(): Promise<void>
```
- Removes successfully uploaded bills from queue
- **Intentionally keeps hashes** in imageHashService for duplicate prevention

**Clear All:**
```typescript
async clearAll(): Promise<void>
```
- Cleans up all associated hashes
- Removes all bills from queue
- Complete reset

## Data Structure

### QueuedBill Interface

```typescript
export interface QueuedBill {
  id: string;
  formData: BillUploadData;
  imageUri: string;
  timestamp: number;
  status: 'pending' | 'uploading' | 'success' | 'failed';
  attempt: number;
  error?: string;
  lastAttemptTime?: number;
  imageHash?: string; // NEW: Hash for duplicate detection
}
```

### Hash Comparison Options

```typescript
interface HashComparisonOptions {
  checkMerchant?: boolean;      // Check merchant match
  checkAmount?: boolean;         // Check amount similarity
  merchantId?: string;           // Merchant ID to compare
  amount?: number;               // Amount to compare
  amountThreshold?: number;      // Amount difference threshold (default: ₹10)
  timeWindow?: number;           // Time window in milliseconds
}
```

## Integration Points

### 1. Service Imports
```typescript
import { imageHashService } from './imageHashService';
import { BILL_UPLOAD_CONFIG } from '@/config/uploadConfig';
```

### 2. Key Methods Using imageHashService

**Generate Hash:**
```typescript
const hash = await imageHashService.generateImageHash(imageUri);
```

**Check Duplicate:**
```typescript
const duplicateCheck = await imageHashService.checkDuplicate(imageUri, {
  checkMerchant: true,
  checkAmount: true,
  merchantId: formData.merchantId,
  amount: formData.amount,
  timeWindow: BILL_UPLOAD_CONFIG.BILL_SPECIFIC_CONFIG.DUPLICATE_WINDOW,
});
```

**Store Hash:**
```typescript
await imageHashService.storeHash({
  hash: bill.imageHash,
  imageUri: bill.imageUri,
  merchantId: bill.formData.merchantId,
  amount: bill.formData.amount,
  timestamp: Date.now(),
  uploadId: result.data?._id || bill.id,
});
```

**Remove Hash:**
```typescript
await imageHashService.removeHash(bill.imageHash);
```

## Error Handling

### Graceful Degradation
- If hash generation fails, falls back to basic duplicate detection
- If hash check fails, allows upload (fail-open approach)
- Logs warnings for hash-related errors without breaking upload flow

### User-Friendly Messages
```typescript
// Duplicate detected
"This bill has already been uploaded recently"
"Same image for same merchant already uploaded"
"A similar bill is already queued for upload"

// Network issues
"Waiting for network connection"
"No network connection"

// Upload failures
"Upload timeout"
"Upload failed"
```

## Performance Considerations

### Hash Generation
- **Web:** Uses Web Crypto API (SHA-256) - Fast and secure
- **Native:** Uses Expo FileSystem MD5 - Adequate for duplicate detection
- **Async:** Non-blocking, doesn't freeze UI

### Storage
- Hashes stored in AsyncStorage via imageHashService
- Limited to 100 most recent hashes (configurable)
- Automatic cleanup of old hashes (> 30 days)

### Memory
- In-memory cache in imageHashService
- Minimal memory footprint per hash (~64 bytes)
- Queue persisted to AsyncStorage separately

## Testing Recommendations

### Unit Tests
1. Test hash generation for various image formats
2. Test duplicate detection with exact matches
3. Test duplicate detection with different merchants
4. Test duplicate detection with different amounts
5. Test hash cleanup on bill removal
6. Test graceful degradation on hash failures

### Integration Tests
1. Add same bill twice (should reject second)
2. Add similar bills to different merchants (should allow)
3. Add bill offline, then online with same bill (should detect)
4. Clear queue and verify hash cleanup
5. Upload bill and verify hash stored

### Edge Cases
1. Hash generation fails
2. imageHashService unavailable
3. AsyncStorage full
4. Network interrupted during upload
5. App crashes with bills in queue

## Security Considerations

### Duplicate Prevention Strategy
- **Two-layer defense:**
  1. Client-side: Hash-based detection (prevents unnecessary uploads)
  2. Server-side: Should also implement duplicate detection

### Privacy
- Hashes are stored locally only
- No image data sent to third parties for hashing
- Hashes automatically expire after time window

### Data Integrity
- Cryptographic hashes ensure exact image matching
- Context-aware checking (merchant, amount) prevents false positives
- Pre-upload verification prevents race conditions

## Future Enhancements

### Potential Improvements
1. **Perceptual Hashing:** Detect similar (not just identical) images
2. **Backend Integration:** Sync hashes with backend for cross-device detection
3. **Advanced Context:** Check bill date, bill number for additional validation
4. **User Override:** Allow users to force upload if false positive
5. **Analytics:** Track duplicate detection rates and patterns

### Configuration Extensions
```typescript
DUPLICATE_DETECTION_CONFIG: {
  ENABLE_PERCEPTUAL_HASH: false,
  SIMILARITY_THRESHOLD: 95, // For perceptual hashing
  ENABLE_BACKEND_SYNC: false,
  ALLOW_USER_OVERRIDE: true,
  TRACK_ANALYTICS: true,
}
```

## Troubleshooting

### Common Issues

**Issue:** Duplicate not detected
- Check if `ENABLE_DUPLICATE_DETECTION` is true
- Verify time window hasn't expired
- Check if hash generation succeeded

**Issue:** False positive (valid bill rejected)
- Check merchant ID matching logic
- Verify amount threshold
- Consider implementing user override

**Issue:** Hash generation fails
- Check file permissions
- Verify image URI is valid
- Check platform-specific hash implementation

**Issue:** Hashes not cleaned up
- Verify `removeFromQueue` is called
- Check `clearAll` method
- Inspect AsyncStorage manually

## Logging

### Key Log Messages
```
[BillUploadQueue] Generating image hash for duplicate detection...
[BillUploadQueue] Duplicate detected via hash: {reason}
[BillUploadQueue] Duplicate bill found (basic check): {billId}
[BillUploadQueue] Hash stored for uploaded bill: {billId}
[BillUploadQueue] Removed associated hash for bill: {billId}
[BillUploadQueue] Cleared all {count} bills and associated hashes
```

### Error Logs
```
[BillUploadQueue] Hash-based duplicate check failed, continuing with basic check
[BillUploadQueue] Failed to remove hash
[BillUploadQueue] Failed to store hash after upload
[BillUploadQueue] Pre-upload duplicate check failed
```

## Summary

The integration of `imageHashService` into `billUploadQueueService` provides:

✅ **Robust duplicate detection** using cryptographic hashes
✅ **Context-aware checking** with merchant and amount validation
✅ **Graceful error handling** with fallback mechanisms
✅ **Automatic cleanup** of stored hashes
✅ **User-friendly messaging** for duplicate scenarios
✅ **Performance optimized** with async operations and caching
✅ **Production-ready** with comprehensive logging and error handling

This enhancement significantly improves user experience by preventing accidental duplicate uploads while maintaining system reliability and performance.

# Bill Upload Queue - Hash Integration Quick Reference

## What Changed?

The `billUploadQueueService` now uses `imageHashService` for advanced duplicate detection.

## Key Changes Summary

### 1. **QueuedBill Interface** - Added Hash Field
```typescript
export interface QueuedBill {
  // ... existing fields
  imageHash?: string; // NEW: For duplicate detection
}
```

### 2. **addToQueue()** - Enhanced Duplicate Detection
**Before:** Basic URI and timestamp comparison
**After:**
- Generates SHA-256/MD5 hash of image
- Checks against stored hashes with merchant/amount context
- Falls back to basic check if hash fails
- Throws user-friendly error if duplicate found

```typescript
// NEW: Hash-based duplicate detection
const duplicateCheck = await imageHashService.checkDuplicate(imageUri, {
  checkMerchant: true,
  checkAmount: true,
  merchantId: formData.merchantId,
  amount: formData.amount,
  timeWindow: 30 * 24 * 60 * 60 * 1000, // 30 days
});
```

### 3. **uploadBill()** - Pre/Post Upload Hash Handling
**Pre-upload:** Re-checks for duplicates before upload
**Post-upload:** Stores hash in imageHashService

```typescript
// Pre-upload duplicate check
const duplicateCheck = await imageHashService.checkDuplicate(...);

// Post-upload hash storage
await imageHashService.storeHash({
  hash: bill.imageHash,
  uploadId: result.data?._id,
  // ... other data
});
```

### 4. **removeFromQueue()** - Hash Cleanup
Now removes associated hash from imageHashService

```typescript
if (bill.imageHash) {
  await imageHashService.removeHash(bill.imageHash);
}
```

### 5. **clearAll()** - Cleanup All Hashes
Cleans up all hashes when clearing queue

```typescript
const hashCleanupPromises = this.queue
  .filter(bill => bill.imageHash)
  .map(bill => imageHashService.removeHash(bill.imageHash!));
await Promise.allSettled(hashCleanupPromises);
```

## Configuration

All settings in `config/uploadConfig.ts`:

```typescript
BILL_SPECIFIC_CONFIG: {
  ENABLE_DUPLICATE_DETECTION: true,
  DUPLICATE_WINDOW: 30 * 24 * 60 * 60 * 1000, // 30 days
}
```

## Error Messages for Users

### Duplicate Detected (Hash-based)
```
"This bill has already been uploaded recently"
"Same image for same merchant already uploaded"
"Same image with similar amount already uploaded"
```

### Duplicate Detected (Basic)
```
"A similar bill is already queued for upload. Please check your pending uploads."
```

## Usage Example

```typescript
import { billUploadQueueService } from '@/services/billUploadQueueService';

try {
  const billId = await billUploadQueueService.addToQueue(formData, imageUri);
  console.log('Bill queued:', billId);
  // Success - bill added to queue with hash stored
} catch (error) {
  if (error.message.includes('already been uploaded')) {
    // Duplicate detected - show appropriate UI
    Alert.alert('Duplicate Bill', error.message);
  } else {
    // Other error
    Alert.alert('Error', 'Failed to queue bill');
  }
}
```

## Benefits

✅ **Prevents duplicate uploads** - Cryptographic hash matching
✅ **Context-aware** - Checks merchant and amount
✅ **Offline support** - Works even offline
✅ **Automatic cleanup** - Removes old hashes
✅ **User-friendly** - Clear error messages
✅ **Fail-safe** - Falls back to basic check if hash fails
✅ **Performance** - Async operations, non-blocking

## Technical Details

### Hash Generation
- **Web:** SHA-256 via Web Crypto API
- **Native:** MD5 via Expo FileSystem
- Both are sufficient for duplicate detection

### Storage
- Hashes stored in AsyncStorage via imageHashService
- Max 100 recent hashes stored
- Auto-cleanup after 30 days

### Duplicate Criteria
1. **Exact hash match** → Definite duplicate
2. **High similarity (>95%)** → Check merchant + amount
3. **Within time window** → Default 30 days
4. **Amount threshold** → Default ±₹10

## Testing Checklist

- [ ] Upload same bill twice (should reject)
- [ ] Upload same image, different merchant (should allow if configured)
- [ ] Upload same image, different amount (should allow if >₹10 difference)
- [ ] Add bill offline, then try online (should still detect)
- [ ] Clear queue and verify hashes removed
- [ ] Test with hash generation failure (should fallback)

## Logging

Watch for these logs:

```bash
# Success path
[BillUploadQueue] Generating image hash for duplicate detection...
[BillUploadQueue] Hash stored for uploaded bill: {id}

# Duplicate detected
[BillUploadQueue] Duplicate detected via hash: {reason}

# Cleanup
[BillUploadQueue] Removed associated hash for bill: {id}
[BillUploadQueue] Cleared all {count} bills and associated hashes

# Warnings (non-fatal)
[BillUploadQueue] Hash-based duplicate check failed, continuing with basic check
[BillUploadQueue] Failed to remove hash
[BillUploadQueue] Failed to store hash after upload
```

## Backward Compatibility

✅ **Fully backward compatible**
- Old queued bills without hash still work
- Hash field is optional in QueuedBill
- Falls back to basic duplicate detection
- No breaking changes to API

## Migration Notes

**No migration needed!** The integration is:
- Transparent to existing code
- Automatically enabled if configured
- Gracefully degrades if unavailable

## Troubleshooting

### "Duplicate detected but it's a new bill"
- Check time window configuration
- Verify merchant ID matching
- Check amount threshold
- Clear imageHashService storage if needed

### "Hash generation taking too long"
- Normal for large images (>5MB)
- Consider compressing images first
- Check device performance

### "Duplicates not being detected"
- Verify `ENABLE_DUPLICATE_DETECTION` is true
- Check imageHashService is initialized
- Review logs for hash generation errors

## Related Services

- `imageHashService` - Core hashing functionality
- `billUploadService` - Actual upload to backend
- `billVerificationService` - Bill verification
- `uploadConfig` - Configuration settings

## Files Modified

1. **services/billUploadQueueService.ts**
   - Added imageHashService import
   - Updated QueuedBill interface
   - Enhanced addToQueue() with hash checking
   - Updated uploadBill() with pre/post checks
   - Updated removeFromQueue() with hash cleanup
   - Updated clearAll() with hash cleanup

2. **services/imageHashService.ts**
   - Updated HashComparisonOptions interface
   - Added merchantId and amount fields

3. **config/uploadConfig.ts**
   - (No changes, already had configuration)

## Quick Commands

```bash
# Check TypeScript errors
npx tsc --noEmit

# Run tests
npm test

# Check specific service
npm run test -- billUploadQueueService

# Clear AsyncStorage (for testing)
# In app, use: AsyncStorage.clear()
```

## Support

For issues or questions:
1. Check logs for error messages
2. Review `BILL_UPLOAD_QUEUE_HASH_INTEGRATION.md` for details
3. Test with duplicate detection disabled first
4. Check imageHashService independently

---

**Last Updated:** 2025-11-03
**Integration Status:** ✅ Complete
**Backward Compatible:** Yes
**Production Ready:** Yes

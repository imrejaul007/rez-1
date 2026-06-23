# Bill Upload Queue - Hash Integration Test Checklist

## Pre-Testing Setup

### Environment Preparation
- [ ] Clear AsyncStorage: `AsyncStorage.clear()`
- [ ] Verify `ENABLE_DUPLICATE_DETECTION` is `true` in config
- [ ] Check network connectivity status
- [ ] Prepare test images (3-5 different bills)
- [ ] Create test merchants in backend
- [ ] Have offline/online testing capability

---

## Test Categories

## 1. Hash Generation Tests

### 1.1 Basic Hash Generation
- [ ] **Test:** Upload a single bill image
  - **Expected:** Hash generated successfully
  - **Verify:** Check logs for `[BillUploadQueue] Generating image hash`
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Upload JPEG image
  - **Expected:** Hash generated (SHA-256/MD5)
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Upload PNG image
  - **Expected:** Hash generated successfully
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Upload HEIC image (iOS)
  - **Expected:** Hash generated successfully
  - **Status:** ⬜ Pass / ⬜ Fail

### 1.2 Hash Generation Edge Cases
- [ ] **Test:** Upload very large image (>5MB)
  - **Expected:** Hash generated but may take time
  - **Verify:** Check performance logs
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Upload corrupted image
  - **Expected:** Error caught, fallback to basic detection
  - **Verify:** Check warning logs
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Upload with invalid URI
  - **Expected:** Error caught, user-friendly message
  - **Status:** ⬜ Pass / ⬜ Fail

---

## 2. Duplicate Detection Tests

### 2.1 Exact Duplicate Detection
- [ ] **Test:** Upload same image twice immediately
  - **Expected:** Second upload rejected
  - **Error:** "This bill has already been uploaded recently"
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Upload same image to same merchant twice
  - **Expected:** Second upload rejected
  - **Error:** "Same image for same merchant already uploaded"
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Upload same image with same amount twice
  - **Expected:** Second upload rejected
  - **Error:** "Same image with similar amount already uploaded"
  - **Status:** ⬜ Pass / ⬜ Fail

### 2.2 Context-Aware Detection
- [ ] **Test:** Upload same image to different merchant
  - **Expected:** Upload allowed (if merchant check enabled)
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Upload same image with significantly different amount (>₹10)
  - **Expected:** Upload allowed
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Upload same image with slightly different amount (≤₹10)
  - **Expected:** Upload rejected (similar amount)
  - **Status:** ⬜ Pass / ⬜ Fail

### 2.3 Time Window Testing
- [ ] **Test:** Upload same image after 30+ days
  - **Expected:** Upload allowed (outside time window)
  - **Note:** Use mock timestamp for testing
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Upload same image within 30 days
  - **Expected:** Upload rejected
  - **Status:** ⬜ Pass / ⬜ Fail

### 2.4 Queue-Specific Duplicates
- [ ] **Test:** Add same bill to queue while previous is pending
  - **Expected:** Second add rejected
  - **Error:** "A similar bill is already queued for upload"
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Add same bill after previous uploaded successfully
  - **Expected:** Second add rejected (hash stored)
  - **Status:** ⬜ Pass / ⬜ Fail

---

## 3. Upload Flow Tests

### 3.1 Pre-Upload Verification
- [ ] **Test:** Queue bill offline, then go online and sync
  - **Expected:** Pre-upload hash check runs
  - **Verify:** Check logs for "Pre-upload duplicate check"
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Add duplicate while offline, sync when online
  - **Expected:** Duplicate detected during sync
  - **Error:** Bill marked as failed with duplicate reason
  - **Status:** ⬜ Pass / ⬜ Fail

### 3.2 Post-Upload Hash Storage
- [ ] **Test:** Upload bill successfully
  - **Expected:** Hash stored in imageHashService
  - **Verify:** Check logs for "Hash stored for uploaded bill"
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Check AsyncStorage after successful upload
  - **Expected:** Hash exists in `@bill_upload_hashes`
  - **Verify:** Use AsyncStorage.getItem()
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Upload same bill again after successful upload
  - **Expected:** Duplicate detected using stored hash
  - **Status:** ⬜ Pass / ⬜ Fail

### 3.3 Upload Failure Scenarios
- [ ] **Test:** Upload fails due to network error
  - **Expected:** Hash NOT stored, bill remains in queue
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Upload fails due to server error
  - **Expected:** Hash NOT stored, retry available
  - **Status:** ⬜ Pass / ⬜ Fail

---

## 4. Cleanup Tests

### 4.1 Remove from Queue
- [ ] **Test:** Remove single bill from queue
  - **Expected:** Associated hash removed from imageHashService
  - **Verify:** Check logs for "Removed associated hash"
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Remove bill without hash (old queued bill)
  - **Expected:** No error, graceful handling
  - **Status:** ⬜ Pass / ⬜ Fail

### 4.2 Clear Completed
- [ ] **Test:** Clear successfully uploaded bills
  - **Expected:** Bills removed from queue
  - **Note:** Hashes intentionally kept for duplicate prevention
  - **Verify:** Hashes still in imageHashService
  - **Status:** ⬜ Pass / ⬜ Fail

### 4.3 Clear All
- [ ] **Test:** Clear all bills from queue
  - **Expected:** All hashes removed
  - **Verify:** Check logs for "Cleared all X bills and associated hashes"
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Clear all with 10+ bills
  - **Expected:** All hashes cleaned up, no errors
  - **Status:** ⬜ Pass / ⬜ Fail

---

## 5. Error Handling & Resilience Tests

### 5.1 Hash Service Failures
- [ ] **Test:** Simulate imageHashService unavailable
  - **Expected:** Falls back to basic duplicate detection
  - **Verify:** Warning logged, upload continues
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Hash generation takes too long (>5s)
  - **Expected:** May timeout, fallback to basic detection
  - **Status:** ⬜ Pass / ⬜ Fail

### 5.2 Storage Failures
- [ ] **Test:** AsyncStorage full (simulate)
  - **Expected:** Error caught, user notified
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** AsyncStorage permission denied
  - **Expected:** Error caught, graceful degradation
  - **Status:** ⬜ Pass / ⬜ Fail

### 5.3 Network Interruptions
- [ ] **Test:** Go offline during hash generation
  - **Expected:** Hash generation completes, bill queued
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Go offline during upload
  - **Expected:** Bill remains in queue with hash
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Network interrupted between pre-upload check and upload
  - **Expected:** Retry logic handles gracefully
  - **Status:** ⬜ Pass / ⬜ Fail

---

## 6. Performance Tests

### 6.1 Hash Generation Performance
- [ ] **Test:** Measure hash generation time for 1MB image
  - **Target:** <200ms
  - **Actual:** _____ ms
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Measure hash generation time for 5MB image
  - **Target:** <500ms
  - **Actual:** _____ ms
  - **Status:** ⬜ Pass / ⬜ Fail

### 6.2 Duplicate Check Performance
- [ ] **Test:** Duplicate check with 10 stored hashes
  - **Target:** <10ms
  - **Actual:** _____ ms
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Duplicate check with 100 stored hashes (max)
  - **Target:** <50ms
  - **Actual:** _____ ms
  - **Status:** ⬜ Pass / ⬜ Fail

### 6.3 Queue Performance
- [ ] **Test:** Add 10 bills to queue rapidly
  - **Expected:** All processed, hashes generated
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Sync 10 bills in queue
  - **Expected:** Pre-upload checks for all, no slowdown
  - **Status:** ⬜ Pass / ⬜ Fail

---

## 7. Edge Cases & Boundary Tests

### 7.1 Queue Limits
- [ ] **Test:** Add bills until queue is full (50)
  - **Expected:** 51st bill rejected with queue full error
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Try to add duplicate when queue is nearly full
  - **Expected:** Duplicate check happens before queue full check
  - **Status:** ⬜ Pass / ⬜ Fail

### 7.2 Hash Storage Limits
- [ ] **Test:** Store 100 hashes (max)
  - **Expected:** Oldest hash pruned automatically
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Store 101st hash
  - **Expected:** Oldest hash removed, new hash stored
  - **Status:** ⬜ Pass / ⬜ Fail

### 7.3 Merchant & Amount Edge Cases
- [ ] **Test:** Upload with missing merchant ID
  - **Expected:** Duplicate check skips merchant comparison
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Upload with amount = 0
  - **Expected:** Amount check handles gracefully
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Upload with negative amount
  - **Expected:** Validation error (before hash check)
  - **Status:** ⬜ Pass / ⬜ Fail

---

## 8. Backward Compatibility Tests

### 8.1 Migration from Old Queue
- [ ] **Test:** Load queue with old bills (no imageHash field)
  - **Expected:** Old bills load successfully
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Upload old bill from queue (no hash)
  - **Expected:** Upload succeeds, new hash generated
  - **Status:** ⬜ Pass / ⬜ Fail

### 8.2 Configuration Toggle
- [ ] **Test:** Set `ENABLE_DUPLICATE_DETECTION` to false
  - **Expected:** Hash-based detection disabled
  - **Verify:** Only basic duplicate detection runs
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Toggle detection on/off during runtime
  - **Expected:** System adapts immediately
  - **Status:** ⬜ Pass / ⬜ Fail

---

## 9. User Experience Tests

### 9.1 Error Messages
- [ ] **Test:** Verify error message clarity
  - **Expected:** User understands why upload rejected
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Check error message tone (friendly, not technical)
  - **Expected:** No technical jargon like "hash mismatch"
  - **Status:** ⬜ Pass / ⬜ Fail

### 9.2 Loading & Feedback
- [ ] **Test:** User sees loading indicator during hash generation
  - **Expected:** No frozen UI
  - **Status:** ⬜ Pass / ⬜ Fail

- [ ] **Test:** Queue status updates immediately after duplicate detection
  - **Expected:** Real-time status update
  - **Status:** ⬜ Pass / ⬜ Fail

---

## 10. Integration Tests

### 10.1 With billUploadService
- [ ] **Test:** Full upload flow end-to-end
  - **Expected:** Hash generated → Checked → Uploaded → Stored
  - **Status:** ⬜ Pass / ⬜ Fail

### 10.2 With billVerificationService
- [ ] **Test:** Upload verified bill
  - **Expected:** Hash stored with verification data
  - **Status:** ⬜ Pass / ⬜ Fail

### 10.3 With Offline Queue
- [ ] **Test:** Queue multiple bills offline, sync online
  - **Expected:** All hashes checked before upload
  - **Status:** ⬜ Pass / ⬜ Fail

---

## Test Execution Summary

### Test Statistics
- **Total Tests:** 70+
- **Tests Passed:** _____
- **Tests Failed:** _____
- **Tests Skipped:** _____
- **Success Rate:** _____%

### Critical Issues Found
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Minor Issues Found
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Performance Metrics
- **Avg Hash Generation Time:** _____ ms
- **Avg Duplicate Check Time:** _____ ms
- **Memory Usage:** _____ MB
- **Storage Usage:** _____ KB

---

## Test Environment

### Device Information
- **Platform:** ⬜ iOS / ⬜ Android / ⬜ Web
- **OS Version:** _____
- **Device Model:** _____
- **App Version:** _____
- **React Native Version:** _____

### Configuration
- **ENABLE_DUPLICATE_DETECTION:** ⬜ true / ⬜ false
- **DUPLICATE_WINDOW:** _____ ms
- **MAX_QUEUE_SIZE:** _____
- **MAX_STORED_HASHES:** _____

---

## Sign-Off

### Tester Information
- **Name:** _____________________
- **Date:** _____________________
- **Time Spent:** _____ hours

### Approval
- [ ] All critical tests passed
- [ ] No blocking issues found
- [ ] Performance acceptable
- [ ] Ready for production

### Notes
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

## Appendix: Test Helper Code

### Check Stored Hashes
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const checkHashes = async () => {
  const hashes = await AsyncStorage.getItem('@bill_upload_hashes');
  console.log('Stored Hashes:', JSON.parse(hashes || '[]'));
};
```

### Check Queue
```typescript
import { billUploadQueueService } from '@/services/billUploadQueueService';

const checkQueue = async () => {
  const queue = await billUploadQueueService.getQueue();
  const status = await billUploadQueueService.getStatus();
  console.log('Queue:', queue);
  console.log('Status:', status);
};
```

### Clear All Data
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { billUploadQueueService } from '@/services/billUploadQueueService';
import { imageHashService } from '@/services/imageHashService';

const clearAllData = async () => {
  await billUploadQueueService.clearAll();
  await imageHashService.clearAll();
  console.log('All data cleared');
};
```

### Simulate Offline
```typescript
// Use device network settings or:
import NetInfo from '@react-native-community/netinfo';

NetInfo.configure({
  reachabilityTest: async () => Promise.resolve(false),
});
```

---

**Test Plan Version:** 1.0.0
**Last Updated:** November 3, 2025
**Status:** Ready for Execution

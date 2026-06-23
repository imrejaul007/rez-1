# Bill Upload Queue - Hash Integration Flow Diagram

## Complete Flow Visualization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        USER UPLOADS BILL IMAGE                              │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   billUploadQueueService.addToQueue()                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Check Queue Size Limit                                                 │
│     └─► If full → throw error                                              │
│                                                                             │
│  2. Generate Image Hash (if enabled)                                       │
│     └─► imageHashService.generateImageHash(imageUri)                       │
│         ├─► Web: SHA-256 via Web Crypto API                                │
│         └─► Native: MD5 via Expo FileSystem                                │
│                                                                             │
│  3. Check for Hash-Based Duplicates                                        │
│     └─► imageHashService.checkDuplicate(imageUri, {                        │
│           checkMerchant: true,                                             │
│           checkAmount: true,                                               │
│           merchantId: formData.merchantId,                                 │
│           amount: formData.amount,                                         │
│           timeWindow: 30 days                                              │
│         })                                                                  │
│         │                                                                   │
│         ├─► If duplicate found → throw error                               │
│         │   "This bill has already been uploaded recently"                 │
│         │                                                                   │
│         └─► If check fails → log warning, continue                         │
│                                                                             │
│  4. Fallback: Basic Duplicate Check                                        │
│     └─► findDuplicateBill(formData, imageUri)                             │
│         ├─► Compare: merchant + timestamp + imageUri                       │
│         └─► If duplicate → throw error                                     │
│                                                                             │
│  5. Create QueuedBill                                                      │
│     └─► {                                                                  │
│           id: generated,                                                   │
│           formData,                                                        │
│           imageUri,                                                        │
│           imageHash: hash,  ◄── NEW FIELD                                 │
│           status: 'pending',                                               │
│           timestamp: now                                                   │
│         }                                                                  │
│                                                                             │
│  6. Add to Queue & Persist                                                 │
│     └─► this.queue.push(queuedBill)                                        │
│     └─► persistQueue() → AsyncStorage                                      │
│                                                                             │
│  7. Trigger Auto-Sync (if online)                                          │
│     └─► checkAndSync()                                                     │
│                                                                             │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BILL QUEUED - WAITING FOR SYNC                           │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    billUploadQueueService.syncQueue()                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Check Network Connection                                               │
│     └─► If offline → throw error, keep in queue                            │
│                                                                             │
│  2. Get Bills to Sync                                                      │
│     └─► Filter: status = 'pending' or 'failed' with retries available     │
│                                                                             │
│  3. Process in Batches                                                     │
│     └─► For each batch (5 bills):                                          │
│         └─► uploadBill(bill) for each                                      │
│                                                                             │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      billUploadQueueService.uploadBill()                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Check Network Connectivity                                             │
│     └─► If offline → set pending, return false                             │
│                                                                             │
│  2. PRE-UPLOAD: Verify Hash Still Doesn't Exist ◄── NEW                    │
│     └─► imageHashService.checkDuplicate(bill.imageUri, {...})             │
│         │                                                                   │
│         ├─► If duplicate → set failed status, return false                 │
│         │   (Prevents race conditions)                                     │
│         │                                                                   │
│         └─► If check fails → log warning, continue                         │
│                                                                             │
│  3. Update Status to 'uploading'                                           │
│     └─► updateBillStatus(bill.id, 'uploading')                            │
│                                                                             │
│  4. Apply Exponential Backoff (if retry)                                   │
│     └─► Calculate delay based on attempt number                            │
│                                                                             │
│  5. Upload to Backend                                                      │
│     └─► billUploadService.uploadBill(uploadData)                          │
│         └─► With timeout (60 seconds)                                      │
│                                                                             │
│  6. Check Upload Success                                                   │
│     └─► If failed → throw error                                            │
│                                                                             │
│  7. POST-UPLOAD: Store Hash ◄── NEW                                        │
│     └─► imageHashService.storeHash({                                       │
│           hash: bill.imageHash,                                            │
│           imageUri: bill.imageUri,                                         │
│           merchantId: bill.formData.merchantId,                            │
│           amount: bill.formData.amount,                                    │
│           timestamp: now,                                                  │
│           uploadId: result.data._id                                        │
│         })                                                                  │
│         │                                                                   │
│         ├─► Stored in imageHashService (AsyncStorage)                      │
│         └─► Used for future duplicate detection                            │
│                                                                             │
│  8. Mark as Success                                                        │
│     └─► updateBillStatus(bill.id, 'success')                              │
│                                                                             │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         UPLOAD SUCCESSFUL                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Hash Lifecycle Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          IMAGE HASH LIFECYCLE                                │
└──────────────────────────────────────────────────────────────────────────────┘

1. GENERATION
   ┌────────────────┐
   │  User selects  │
   │     image      │
   └────────┬───────┘
            │
            ▼
   ┌────────────────────────────────┐
   │ imageHashService               │
   │   .generateImageHash()         │
   ├────────────────────────────────┤
   │ Web: SHA-256 (crypto.subtle)   │
   │ Native: MD5 (FileSystem)       │
   └────────┬───────────────────────┘
            │
            ▼
   ┌────────────────┐
   │  Hash: 64-char │
   │  hex string    │
   └────────┬───────┘
            │
            │
2. STORAGE  │
   (During  │
   Queue)   ▼
   ┌─────────────────────────────────┐
   │ QueuedBill {                    │
   │   id: "bill_123...",            │
   │   imageUri: "file://...",       │
   │   imageHash: "a3f5c2..." ◄──────┼─── Stored with bill
   │   status: "pending",            │
   │   ...                           │
   │ }                               │
   └────────┬────────────────────────┘
            │
            │ Persisted to AsyncStorage
            │
            ▼
   ┌─────────────────────────────────┐
   │ AsyncStorage                    │
   │  @bill_upload_queue             │
   │  [                              │
   │    { id, imageHash, ... },      │
   │    { id, imageHash, ... },      │
   │  ]                              │
   └────────┬────────────────────────┘
            │
            │
3. USAGE    │
   (Checking│
   Dupli-   │
   cates)   ▼
   ┌─────────────────────────────────┐
   │ imageHashService                │
   │   .checkDuplicate()             │
   ├─────────────────────────────────┤
   │ • Compare against stored hashes │
   │ • Check merchant match          │
   │ • Check amount similarity       │
   │ • Check time window (30 days)   │
   └────────┬────────────────────────┘
            │
            ├─► Match found → isDuplicate: true
            │
            └─► No match → isDuplicate: false


4. STORAGE
   (After
   Upload)
            ▼
   ┌─────────────────────────────────┐
   │ imageHashService                │
   │   .storeHash()                  │
   ├─────────────────────────────────┤
   │ ImageHashRecord {               │
   │   hash: "a3f5c2...",            │
   │   imageUri: "file://...",       │
   │   merchantId: "merchant_123",   │
   │   amount: 1500,                 │
   │   timestamp: 1699012345678,     │
   │   uploadId: "bill_backend_456"  │
   │ }                               │
   └────────┬────────────────────────┘
            │
            │ Persisted to AsyncStorage
            │
            ▼
   ┌─────────────────────────────────┐
   │ AsyncStorage                    │
   │  @bill_upload_hashes            │
   │  [                              │
   │    { hash, merchantId, ... },   │
   │    { hash, merchantId, ... },   │
   │  ]                              │
   └────────┬────────────────────────┘
            │
            │ Used for long-term
            │ duplicate detection
            │
            │
5. CLEANUP  │
            ▼
   ┌─────────────────────────────────┐
   │ OPTION A: Remove from Queue     │
   │  removeFromQueue(billId)        │
   │  └─► removeHash(hash)           │
   │                                 │
   │ OPTION B: Clear All             │
   │  clearAll()                     │
   │  └─► removeHash() for all       │
   │                                 │
   │ OPTION C: Auto Cleanup          │
   │  (imageHashService)             │
   │  └─► Remove hashes > 30 days    │
   └─────────────────────────────────┘
```

## Duplicate Detection Decision Tree

```
                    ┌─────────────────────┐
                    │  New Bill Upload    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Generate Image Hash  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Hash Exists in       │
                    │ imageHashService?    │
                    └──────┬───────┬───────┘
                           │       │
                    NO ◄───┘       └───► YES
                     │                    │
                     │                    ▼
                     │         ┌──────────────────────┐
                     │         │ Check Time Window    │
                     │         │ (< 30 days?)         │
                     │         └──────┬───────┬───────┘
                     │                │       │
                     │         NO ◄───┘       └───► YES
                     │          │                    │
                     │          │                    ▼
                     │          │         ┌──────────────────────┐
                     │          │         │ Check Merchant Match?│
                     │          │         │ (if enabled)         │
                     │          │         └──────┬───────┬───────┘
                     │          │                │       │
                     │          │         NO ◄───┘       └───► YES
                     │          │          │                    │
                     │          │          │                    ▼
                     │          │          │         ┌──────────────────────┐
                     │          │          │         │ Check Amount Similar?│
                     │          │          │         │ (within ₹10)         │
                     │          │          │         └──────┬───────┬───────┘
                     │          │          │                │       │
                     │          │          │         NO ◄───┘       └───► YES
                     │          │          │          │                    │
                     ▼          ▼          ▼          ▼                    ▼
        ┌─────────────────────────────────────────────────┐   ┌──────────────────┐
        │          ALLOW UPLOAD                           │   │ REJECT DUPLICATE │
        │  ✓ No hash match OR                             │   │  ✗ Exact match   │
        │  ✓ Outside time window OR                       │   │  ✗ Same merchant │
        │  ✓ Different merchant OR                        │   │  ✗ Similar amt   │
        │  ✓ Significant amount difference                │   │  ✗ Recent upload │
        └─────────────────────────────────────────────────┘   └──────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ERROR HANDLING FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

Hash Generation Fails
  │
  ├─► Log Warning: "Hash-based duplicate check failed"
  │
  └─► FALLBACK: Use basic duplicate detection
      │
      └─► Compare: URI + merchant + timestamp
          │
          └─► Continue with upload


Hash Check Fails
  │
  ├─► Log Warning: "Pre-upload duplicate check failed"
  │
  └─► CONTINUE: Allow upload (fail-open approach)
      │
      └─► Don't block user on hash service issues


Hash Storage Fails (Post-Upload)
  │
  ├─► Log Warning: "Failed to store hash after upload"
  │
  └─► CONTINUE: Upload already succeeded
      │
      └─► Only affects future duplicate detection


Hash Cleanup Fails
  │
  ├─► Log Warning: "Failed to remove hash"
  │
  └─► CONTINUE: Non-critical operation
      │
      └─► Hash will be cleaned up later (auto-cleanup)


Network Error During Upload
  │
  ├─► Set status: 'pending'
  │
  └─► Will retry when connection restored
      │
      └─► Hash remains in queue for retry


Duplicate Detected
  │
  ├─► Throw Error with user-friendly message
  │
  └─► "This bill has already been uploaded recently"
      │
      └─► User can see error, take action
```

## Data Flow Summary

```
┌──────────────┐
│     USER     │
└──────┬───────┘
       │ uploads image
       ▼
┌──────────────────────┐
│ billUploadQueueService│ ◄──┐
└──────┬───────────────┘    │
       │ generate hash      │ reads stored hashes
       ▼                    │
┌──────────────────────┐    │
│  imageHashService    │────┘
└──────┬───────────────┘
       │ check duplicates
       ▼
┌──────────────────────┐
│   AsyncStorage       │
│ • @bill_upload_queue │
│ • @bill_upload_hashes│
└──────┬───────────────┘
       │ persist data
       ▼
┌──────────────────────┐
│   OFFLINE QUEUE      │
│  (with hashes)       │
└──────┬───────────────┘
       │ when online
       ▼
┌──────────────────────┐
│ billUploadService    │
└──────┬───────────────┘
       │ upload to server
       ▼
┌──────────────────────┐
│    BACKEND API       │
└──────────────────────┘
```

---

## Key Symbols Used

- `►` : Flow direction
- `◄──` : New feature/change
- `✓` : Success condition
- `✗` : Failure/rejection
- `└─►` : Sub-flow/action
- `├─►` : Branch in flow
- `▼` : Downward flow
- `│` : Connection line

---

**Version:** 1.0.0
**Last Updated:** November 3, 2025

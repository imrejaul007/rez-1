# Upload Configuration Architecture

## Visual Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CENTRALIZED UPLOAD CONFIG                        │
│                   config/uploadConfig.ts                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ exports
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐         ┌──────────────┐         ┌──────────────┐
│   Constants   │         │   Helper     │         │    Types     │
│               │         │  Functions   │         │              │
│ • Sizes       │         │              │         │ • Errors     │
│ • Formats     │         │ • Validate   │         │ • Formats    │
│ • Timeouts    │         │ • Retry      │         │ • Config     │
│ • Errors      │         │ • Check      │         │              │
└───────────────┘         └──────────────┘         └──────────────┘
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  │ imported by
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐         ┌──────────────┐         ┌──────────────┐
│   Services    │         │    Utils     │         │ Components   │
│               │         │              │         │              │
│ • billUpload  │         │ • validation │         │ • Uploader   │
│ • fileUpload  │         │ • errors     │         │ • Forms      │
│ • imageProc   │         │ • retry      │         │              │
└───────────────┘         └──────────────┘         └──────────────┘
```

## Configuration Structure

```
BILL_UPLOAD_CONFIG
│
├── FILE_SIZE_LIMITS
│   ├── MAX_IMAGE_SIZE ────────── 5MB
│   ├── MIN_IMAGE_SIZE ────────── 50KB
│   ├── OPTIMAL_SIZE ──────────── 2MB
│   └── WARNING_THRESHOLD ────── 3MB
│
├── ALLOWED_FILE_FORMATS
│   ├── IMAGES ───────────────── ['image/jpeg', 'image/png', 'image/heic']
│   ├── EXTENSIONS ───────────── ['.jpg', '.jpeg', '.png', '.heic']
│   └── PRIMARY_FORMAT ───────── 'image/jpeg'
│
├── UPLOAD_CONFIG
│   ├── TIMEOUT_MS ──────────────── 60000 (60 seconds)
│   ├── MAX_RETRIES ─────────────── 3
│   ├── INITIAL_RETRY_DELAY ────── 1000 (1 second)
│   ├── MAX_RETRY_DELAY ─────────── 30000 (30 seconds)
│   ├── BACKOFF_MULTIPLIER ──────── 2
│   ├── USE_EXPONENTIAL_BACKOFF ── true
│   ├── USE_JITTER ──────────────── true
│   └── MAX_JITTER ──────────────── 0.3
│
├── QUEUE_CONFIG
│   ├── MAX_QUEUE_SIZE ──────────── 50
│   ├── BATCH_SIZE ──────────────── 5
│   ├── SYNC_INTERVAL ───────────── 300000 (5 minutes)
│   ├── AUTO_SYNC_ON_RECONNECT ──── true
│   ├── RETRY_FAILED_ITEMS ──────── true
│   ├── MAX_QUEUE_AGE ───────────── 604800000 (7 days)
│   └── CLEAR_ON_SUCCESS ────────── true
│
├── IMAGE_QUALITY_CONFIG
│   ├── MIN_RESOLUTION ──────────── { width: 800, height: 600 }
│   ├── RECOMMENDED_RESOLUTION ──── { width: 1920, height: 1080 }
│   ├── MAX_RESOLUTION ──────────── { width: 4096, height: 4096 }
│   ├── MIN_FILE_SIZE ───────────── 50KB
│   ├── MIN_QUALITY_SCORE ───────── 60
│   ├── JPEG_QUALITY ────────────── 0.85
│   ├── AUTO_COMPRESS ───────────── true
│   └── COMPRESS_THRESHOLD ──────── 3MB
│
├── RETRYABLE_ERRORS ────────────── ['TIMEOUT', 'NETWORK_ERROR', ...]
│
├── NON_RETRYABLE_ERRORS ────────── ['INVALID_FILE_FORMAT', 'FILE_TOO_LARGE', ...]
│
├── PROGRESS_CONFIG
│   ├── UPDATE_INTERVAL ─────────── 100ms
│   ├── ENABLE_PROGRESS ─────────── true
│   └── GRANULARITY ─────────────── 1
│
├── ANALYTICS_CONFIG
│   ├── TRACK_SUCCESS_RATE ──────── true
│   ├── TRACK_DURATION ──────────── true
│   ├── TRACK_FILE_SIZE ─────────── true
│   ├── TRACK_ERRORS ────────────── true
│   └── TRACK_QUEUE ─────────────── true
│
├── NETWORK_ADAPTIVE_CONFIG
│   ├── ENABLED ─────────────────── true
│   ├── SLOW_NETWORK
│   │   ├── MAX_IMAGE_SIZE ──────── 2MB
│   │   ├── TIMEOUT_MS ──────────── 120000
│   │   ├── BATCH_SIZE ──────────── 2
│   │   └── JPEG_QUALITY ────────── 0.7
│   └── FAST_NETWORK
│       ├── MAX_IMAGE_SIZE ──────── 5MB
│       ├── TIMEOUT_MS ──────────── 60000
│       ├── BATCH_SIZE ──────────── 5
│       └── JPEG_QUALITY ────────── 0.85
│
└── BILL_SPECIFIC_CONFIG
    ├── REQUIRE_MERCHANT ────────── true
    ├── ALLOW_MANUAL_MERCHANT ───── true
    ├── ENABLE_OCR ──────────────── true
    ├── VALIDATE_EXTRACTED_DATA ─── true
    ├── MIN_OCR_CONFIDENCE ──────── 0.7
    ├── ENABLE_DUPLICATE_DETECTION ─ true
    └── DUPLICATE_WINDOW ────────── 30 days
```

## Helper Functions Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    VALIDATION FLOW                          │
└─────────────────────────────────────────────────────────────┘

File Input
    │
    ├─► isValidFileSize(size) ────► boolean
    │       │
    │       ├─► size >= MIN_IMAGE_SIZE
    │       └─► size <= MAX_IMAGE_SIZE
    │
    ├─► isValidFileFormat(mimeType) ─► boolean
    │       │
    │       └─► ALLOWED_FORMATS.includes(mimeType)
    │
    └─► isValidExtension(ext) ────► boolean
            │
            └─► ALLOWED_EXTENSIONS.includes(ext)

┌─────────────────────────────────────────────────────────────┐
│                    ERROR HANDLING FLOW                       │
└─────────────────────────────────────────────────────────────┘

Error Occurs
    │
    └─► shouldRetryError(errorCode) ─► boolean
            │
            ├─► If in RETRYABLE_ERRORS ──────► retry
            │       │
            │       └─► calculateRetryDelay(attempt)
            │               │
            │               ├─► base = INITIAL_DELAY * (MULTIPLIER ^ attempt)
            │               ├─► capped = min(base, MAX_DELAY)
            │               └─► jittered = capped + random(0, MAX_JITTER * capped)
            │
            └─► If in NON_RETRYABLE_ERRORS ──► fail permanently
```

## Retry Logic Visualization

```
Attempt 1:
  Delay: 1000ms
  ├─────► [Upload] ──X─► Error: TIMEOUT
                           │
                           ├─► shouldRetryError('TIMEOUT') = true
                           └─► calculateRetryDelay(1) = ~1000ms
Attempt 2:
  Delay: ~2000ms + jitter
  ├─────► [Upload] ──X─► Error: TIMEOUT
                           │
                           ├─► shouldRetryError('TIMEOUT') = true
                           └─► calculateRetryDelay(2) = ~2000ms + jitter
Attempt 3:
  Delay: ~4000ms + jitter
  ├─────► [Upload] ──✓─► Success!

OR

Attempt 1:
  Delay: 0ms (first attempt)
  ├─────► [Upload] ──X─► Error: INVALID_FILE_FORMAT
                           │
                           ├─► shouldRetryError('INVALID_FILE_FORMAT') = false
                           └─► Fail immediately (no retry)
```

## Network Adaptive Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  NETWORK DETECTION                          │
└─────────────────────────────────────────────────────────────┘

User uploads file
    │
    ├─► Detect network type
    │       │
    │       ├─► 2G/3G ──────────► Use SLOW_NETWORK config
    │       │                       │
    │       │                       ├─► MAX_SIZE: 2MB
    │       │                       ├─► TIMEOUT: 120s
    │       │                       ├─► BATCH: 2
    │       │                       └─► QUALITY: 0.7
    │       │
    │       └─► 4G/5G/WiFi ───────► Use FAST_NETWORK config
    │                               │
    │                               ├─► MAX_SIZE: 5MB
    │                               ├─► TIMEOUT: 60s
    │                               ├─► BATCH: 5
    │                               └─► QUALITY: 0.85
    │
    └─► Compress if needed
            │
            ├─► size > COMPRESS_THRESHOLD ──► Compress with quality
            └─► size <= COMPRESS_THRESHOLD ─► Upload as-is
```

## Queue Processing Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    QUEUE SYSTEM                             │
└─────────────────────────────────────────────────────────────┘

Upload Request
    │
    ├─► Online? ──Yes──► Upload immediately
    │                       │
    │                       └─► Success? ──Yes──► Done
    │                                       │
    │                                      No
    │                                       │
    │                                       └─► Add to queue
    │
    └─► Offline? ──Yes──► Add to queue
                            │
                            ├─► Queue size < MAX_QUEUE_SIZE?
                            │       │
                            │       ├─► Yes ──► Add item
                            │       └─► No ───► Error: Queue full
                            │
                            └─► Auto-sync timer
                                    │
                                    ├─► Every SYNC_INTERVAL (5 min)
                                    │
                                    └─► Process BATCH_SIZE items
                                            │
                                            ├─► Success ──► Remove from queue
                                            │
                                            └─► Failure ──► Retry or keep in queue
```

## File Validation Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│              FILE VALIDATION PIPELINE                        │
└─────────────────────────────────────────────────────────────┘

File Selected
    │
    ▼
┌─────────────────┐
│ Size Check      │ ──X─► FILE_TOO_LARGE / FILE_TOO_SMALL
│ isValidFileSize │
└─────────────────┘
    │ ✓
    ▼
┌─────────────────┐
│ Format Check    │ ──X─► INVALID_FILE_FORMAT
│ isValidFormat   │
└─────────────────┘
    │ ✓
    ▼
┌─────────────────┐
│ Extension Check │ ──X─► UNSUPPORTED_FORMAT
│ isValidExt      │
└─────────────────┘
    │ ✓
    ▼
┌─────────────────┐
│ Quality Check   │ ──X─► INVALID_IMAGE
│ checkQuality    │
└─────────────────┘
    │ ✓
    ▼
┌─────────────────┐
│ Resolution      │ ──X─► RESOLUTION_TOO_LOW
│ checkResolution │
└─────────────────┘
    │ ✓
    ▼
┌─────────────────┐
│ Compression     │
│ if needed       │
└─────────────────┘
    │
    ▼
Ready for Upload
```

## Migration Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                  MIGRATION PROCESS                          │
└─────────────────────────────────────────────────────────────┘

Step 1: Run Verification
    │
    ├─► node scripts/verify-upload-config.js
    │
    └─► Shows:
            ├─► Files with hardcoded values
            ├─► Migration recommendations
            └─► Progress percentage

Step 2: Choose Migration Method
    │
    ├─► Automated
    │   │
    │   ├─► --dry-run ────────► Preview changes
    │   ├─► --backup ─────────► Create .bak files
    │   └─► --auto ───────────► Apply automatically
    │
    └─► Manual
        │
        ├─► Add import
        ├─► Replace values
        ├─► Use helpers
        └─► Remove constants

Step 3: Verify Migration
    │
    └─► node scripts/verify-upload-config.js
            │
            └─► Should show 100%

Step 4: Test
    │
    ├─► Unit tests
    ├─► Integration tests
    └─► Manual testing
```

## Data Flow Example

```
┌─────────────────────────────────────────────────────────────┐
│              COMPLETE UPLOAD FLOW                           │
└─────────────────────────────────────────────────────────────┘

User selects file
    │
    ▼
Component (BillImageUploader)
    │
    ├─► Import: BILL_UPLOAD_CONFIG, isValidFileSize, isValidFileFormat
    │
    └─► Validate file
            │
            ├─► isValidFileSize(file.size)
            ├─► isValidFileFormat(file.type)
            └─► isValidExtension(file.ext)
            │
            ▼
Service (billUploadService)
    │
    ├─► Import: BILL_UPLOAD_CONFIG, shouldRetryError, calculateRetryDelay
    │
    └─► Upload with retry
            │
            ├─► timeout: UPLOAD_CONFIG.TIMEOUT_MS
            ├─► max retries: UPLOAD_CONFIG.MAX_RETRIES
            │
            └─► On error:
                    │
                    ├─► shouldRetryError(error.code)?
                    │       │
                    │       ├─► Yes: Wait calculateRetryDelay(attempt), retry
                    │       └─► No: Fail permanently
                    │
                    └─► If offline: Add to queue
                            │
                            ├─► Check: queue.length < QUEUE_CONFIG.MAX_QUEUE_SIZE
                            └─► Auto-sync every QUEUE_CONFIG.SYNC_INTERVAL
```

## Project Structure

```
frontend/
│
├── config/
│   └── uploadConfig.ts ─────────► Central configuration
│
├── scripts/
│   ├── verify-upload-config.js ─► Verification tool
│   └── migrate-to-upload-config.js ─► Migration tool
│
├── services/
│   ├── billUploadService.ts ────► Uses config
│   ├── fileUploadService.ts ────► Uses config
│   └── imageUploadService.ts ───► Uses config
│
├── utils/
│   ├── billUploadErrors.ts ─────► Uses config
│   ├── imageQualityValidator.ts ► Uses config
│   └── retryStrategy.ts ────────► Uses config
│
├── components/
│   └── bills/
│       └── BillImageUploader.tsx ► Uses config
│
└── docs/
    ├── UPLOAD_CONFIG_GUIDE.md ──────────────► Full documentation
    ├── UPLOAD_CONFIG_QUICK_REFERENCE.md ────► Quick reference
    ├── UPLOAD_CONFIG_IMPLEMENTATION_SUMMARY.md ► Summary
    └── UPLOAD_CONFIG_ARCHITECTURE.md ───────► This file
```

## Error Hierarchy

```
Upload Errors
│
├── Retryable (Auto-retry)
│   ├── TIMEOUT
│   ├── NETWORK_ERROR
│   ├── CONNECTION_RESET
│   ├── SERVER_ERROR
│   ├── SERVICE_UNAVAILABLE
│   ├── GATEWAY_TIMEOUT
│   ├── CONNECTION_REFUSED
│   ├── DNS_ERROR
│   └── SOCKET_TIMEOUT
│
└── Non-Retryable (Permanent)
    ├── INVALID_FILE_FORMAT
    ├── FILE_TOO_LARGE
    ├── FILE_TOO_SMALL
    ├── INVALID_MERCHANT
    ├── DUPLICATE_IMAGE
    ├── RATE_LIMITED
    ├── UNAUTHORIZED
    ├── FORBIDDEN
    ├── NOT_FOUND
    ├── BAD_REQUEST
    ├── VALIDATION_ERROR
    ├── INVALID_IMAGE
    ├── CORRUPTED_FILE
    └── UNSUPPORTED_FORMAT
```

## Performance Considerations

```
┌─────────────────────────────────────────────────────────────┐
│                PERFORMANCE OPTIMIZATION                      │
└─────────────────────────────────────────────────────────────┘

Image Upload
    │
    ├─► Size > 3MB? ──Yes──► Compress
    │       │                   │
    │       │                   ├─► Use JPEG_QUALITY (0.85)
    │       │                   └─► Target: OPTIMAL_SIZE (2MB)
    │       │
    │       └─► No ───────────► Upload as-is
    │
    ├─► Network slow? ──Yes──► Adaptive config
    │       │                   │
    │       │                   ├─► Lower quality (0.7)
    │       │                   ├─► Smaller max (2MB)
    │       │                   └─► Longer timeout (120s)
    │       │
    │       └─► No ───────────► Standard config
    │
    └─► Queue batch
            │
            ├─► Process BATCH_SIZE at a time
            └─► Prevents server overload
```

---

**Legend:**
- `──►` Flow direction
- `──X─►` Error/rejection path
- `──✓─►` Success path
- `│` Continuation
- `├─►` Branch option
- `└─►` Final branch option

---

**Last Updated:** 2025-11-03
**Version:** 1.0.0

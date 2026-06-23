# Cloudinary Video Upload - Flow Diagrams

## 1. Complete Upload Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     START: Upload Video                         │
│         videoUploadService.uploadVideoToCloudinary()            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  STEP 1: Validate Configuration                 │
├─────────────────────────────────────────────────────────────────┤
│ • Check CLOUDINARY_CLOUD_NAME exists                            │
│ • Check CLOUDINARY_UGC_PRESET exists                            │
│ • validateCloudinaryConfig()                                    │
│                                                                 │
│ ❌ Invalid → Throw VALIDATION_ERROR                             │
│ ✅ Valid → Continue                                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   STEP 2: Validate Video File                   │
├─────────────────────────────────────────────────────────────────┤
│ • Check file exists (FileSystem.getInfoAsync)                   │
│ • Check file size < 100MB                                       │
│ • Check file format (mp4, mov, webm, avi, mkv)                  │
│ • Get file metadata (width, height, duration)                   │
│                                                                 │
│ ❌ Invalid → Throw VALIDATION_ERROR                             │
│ ✅ Valid → Continue                                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                 STEP 3: Check if Compression Needed             │
├─────────────────────────────────────────────────────────────────┤
│ Is file size > 100MB AND compressIfNeeded = true?              │
│                                                                 │
│ ✅ YES → Compress Video                                         │
│    ┌──────────────────────────────────────────────────┐        │
│    │ • videoCompressionService.compressVideo()        │        │
│    │ • Track compression progress (0-100%)            │        │
│    │ • onCompressionProgress callback                 │        │
│    │ • Get compressed URI and new file size           │        │
│    │ • Log compression ratio                          │        │
│    └──────────────────────────────────────────────────┘        │
│                                                                 │
│ ❌ NO → Use original video                                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STEP 4: Upload with Retry                    │
├─────────────────────────────────────────────────────────────────┤
│ Retry Loop (maxAttempts: 3)                                    │
│                                                                 │
│ ┌─── Attempt 1 (Delay: 0s) ────────────────────────┐           │
│ │  • performUpload()                                │           │
│ │  • ✅ Success → Exit loop, return result          │           │
│ │  • ❌ Error → Check if retryable                  │           │
│ │    - Retryable? Continue to Attempt 2             │           │
│ │    - Not retryable? Throw error                   │           │
│ └───────────────────────────────────────────────────┘           │
│                                                                 │
│ ┌─── Attempt 2 (Delay: 1s) ─────────────────────────┐          │
│ │  • Wait 1000ms                                     │          │
│ │  • performUpload()                                 │          │
│ │  • ✅ Success → Exit loop, return result           │          │
│ │  • ❌ Error → Check if retryable                   │          │
│ │    - Retryable? Continue to Attempt 3              │          │
│ │    - Not retryable? Throw error                    │          │
│ └────────────────────────────────────────────────────┘          │
│                                                                 │
│ ┌─── Attempt 3 (Delay: 2s) ─────────────────────────┐          │
│ │  • Wait 2000ms                                     │          │
│ │  • performUpload()                                 │          │
│ │  • ✅ Success → Exit loop, return result           │          │
│ │  • ❌ Error → Throw error (last attempt)           │          │
│ └────────────────────────────────────────────────────┘          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     STEP 5: Perform Upload                      │
├─────────────────────────────────────────────────────────────────┤
│ • Initialize upload state (ID, start time, speed tracking)      │
│ • Prepare FormData:                                             │
│   - Add video file (uri, type, name)                            │
│   - Add upload_preset                                           │
│   - Add folder                                                  │
│   - Add tags                                                    │
│   - Add context metadata                                        │
│   - Add resource_type: 'video'                                  │
│                                                                 │
│ • Upload via FileSystem.uploadAsync                             │
│   - POST to: https://api.cloudinary.com/v1_1/CLOUD/video/upload│
│   - Track progress in real-time                                 │
│   - Calculate speed (bytes/sec)                                 │
│   - Calculate ETA (seconds)                                     │
│   - Invoke onProgress callback                                  │
│                                                                 │
│ ❌ Error → Throw appropriate error code                         │
│ ✅ Success → Parse response                                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   STEP 6: Process Response                      │
├─────────────────────────────────────────────────────────────────┤
│ • Parse Cloudinary JSON response                                │
│ • Extract data:                                                 │
│   - secure_url → videoUrl                                       │
│   - public_id → publicId                                        │
│   - duration → duration                                         │
│   - bytes → fileSize                                            │
│   - format → format                                             │
│   - width → width                                               │
│   - height → height                                             │
│   - created_at → createdAt                                      │
│                                                                 │
│ • Generate thumbnail URL:                                       │
│   - Use Cloudinary transformation API                           │
│   - w_320,h_180,c_fill,f_auto,q_auto                            │
│   - Extract from video at optimal frame                         │
│                                                                 │
│ • Cleanup upload state                                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STEP 7: Return Result                        │
├─────────────────────────────────────────────────────────────────┤
│ Return VideoUploadResult:                                       │
│   {                                                             │
│     videoUrl: "https://res.cloudinary.com/.../video.mp4",       │
│     thumbnailUrl: "https://res.cloudinary.com/.../thumb.jpg",   │
│     publicId: "videos/ugc/abc123",                              │
│     duration: 15.5,                                             │
│     fileSize: 8388608,                                          │
│     format: "mp4",                                              │
│     width: 1920,                                                │
│     height: 1080,                                               │
│     createdAt: "2025-01-08T10:30:00Z"                           │
│   }                                                             │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ✅ UPLOAD COMPLETE
```

---

## 2. Progress Tracking Flow

```
┌───────────────────────────────────────────────────────────┐
│              Upload Progress Tracking                     │
└───────────────────────────┬───────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────┐
│  Initialize Upload State                                  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ startTime = Date.now()                              │  │
│  │ lastProgressTime = Date.now()                       │  │
│  │ lastProgressBytes = 0                               │  │
│  │ speedSamples = []                                   │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────┬───────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────┐
│  On Each Progress Update (every ~100ms)                   │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 1. Get current loaded bytes                         │  │
│  │ 2. Get total bytes                                  │  │
│  │ 3. Calculate percentage: (loaded/total) × 100       │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────┬───────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────┐
│  Calculate Upload Speed                                   │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ bytesSinceLastUpdate = loaded - lastProgressBytes   │  │
│  │ timeSinceLastUpdate = now - lastProgressTime        │  │
│  │ speed = bytesSinceLastUpdate / timeSinceLastUpdate  │  │
│  │ speed = speed × 1000  (convert to bytes/sec)        │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────┬───────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────┐
│  Track Speed Samples (for averaging)                      │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ speedSamples.push(speed)                            │  │
│  │ if (speedSamples.length > 10) {                     │  │
│  │   speedSamples.shift()  // Keep last 10 samples    │  │
│  │ }                                                   │  │
│  │                                                     │  │
│  │ averageSpeed = sum(speedSamples) / length          │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────┬───────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────┐
│  Calculate Time Remaining                                 │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ remainingBytes = total - loaded                     │  │
│  │ timeRemaining = remainingBytes / averageSpeed       │  │
│  │ timeRemaining = Math.ceil(timeRemaining)  (seconds) │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────┬───────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────┐
│  Create Progress Object                                   │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ {                                                   │  │
│  │   loaded: 4194304,          // 4MB                 │  │
│  │   total: 10485760,          // 10MB                │  │
│  │   percentage: 40,           // 40%                 │  │
│  │   speed: 1048576,           // 1MB/s               │  │
│  │   timeRemaining: 6,         // 6 seconds           │  │
│  │   startTime: 1704700800000,                        │  │
│  │   currentTime: 1704700804000                       │  │
│  │ }                                                   │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────┬───────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────┐
│  Invoke Callback                                          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ onProgress?.(progressObject)                        │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────┬───────────────────────────────┘
                            │
                            ▼
                 Repeat until upload complete
```

---

## 3. Error Handling Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Upload Error Occurs                  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│            Identify Error Type                          │
├─────────────────────────────────────────────────────────┤
│ • Network failure → NETWORK_ERROR                       │
│ • Timeout (>10 min) → TIMEOUT                           │
│ • File > 100MB → FILE_TOO_LARGE                         │
│ • Invalid format → INVALID_FILE_TYPE                    │
│ • File not found → FILE_NOT_FOUND                       │
│ • No permission → PERMISSION_DENIED                     │
│ • Server 5xx → SERVER_ERROR                             │
│ • User cancelled → CANCELLED                            │
│ • Config invalid → VALIDATION_ERROR                     │
│ • Other → UNKNOWN_ERROR                                 │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Create UploadError Object                  │
├─────────────────────────────────────────────────────────┤
│ {                                                       │
│   code: 'NETWORK_ERROR',                                │
│   message: 'Network connection failed',                 │
│   retryable: true,                                      │
│   httpStatus: undefined,                                │
│   timestamp: 1704700800000                              │
│ }                                                       │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│          Check if Error is Retryable                    │
├─────────────────────────────────────────────────────────┤
│ Retryable Errors:                                       │
│   • NETWORK_ERROR                                       │
│   • TIMEOUT                                             │
│   • SERVER_ERROR                                        │
│                                                         │
│ Non-Retryable Errors:                                   │
│   • VALIDATION_ERROR                                    │
│   • FILE_TOO_LARGE                                      │
│   • INVALID_FILE_TYPE                                   │
│   • PERMISSION_DENIED                                   │
│   • CANCELLED                                           │
└────────────────────────┬────────────────────────────────┘
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
    ┌──────────────┐         ┌──────────────┐
    │  Retryable   │         │ Not Retryable│
    └──────┬───────┘         └──────┬───────┘
           │                        │
           ▼                        ▼
  ┌────────────────┐       ┌────────────────┐
  │ Check Attempt  │       │  Throw Error   │
  │ Count          │       │  Immediately   │
  └────────┬───────┘       └────────────────┘
           │
           ▼
  ┌─────────────────────────────┐
  │ Attempt < maxAttempts?      │
  └────┬────────────────┬───────┘
       │ YES            │ NO
       │                │
       ▼                ▼
  ┌──────────┐    ┌────────────┐
  │ Retry    │    │ Throw Error│
  │ Upload   │    └────────────┘
  └──────────┘
```

---

## 4. Retry Backoff Strategy

```
┌──────────────────────────────────────────────────────────┐
│                 Retry Backoff Strategy                   │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │  Attempt 1 (Immediate) │
            └────────┬───────────────┘
                     │
                ❌ Fails
                     │
                     ▼
         ┌──────────────────────────┐
         │  Calculate Delay for     │
         │  Attempt 2               │
         │  delay = initialDelay    │
         │        × backoffMultiplier^0│
         │  delay = 1000ms          │
         └──────────┬───────────────┘
                    │
                    ▼
         ┌──────────────────────────┐
         │  Wait 1000ms             │
         └──────────┬───────────────┘
                    │
                    ▼
         ┌──────────────────────────┐
         │  Attempt 2               │
         └──────────┬───────────────┘
                    │
               ❌ Fails
                    │
                    ▼
         ┌──────────────────────────┐
         │  Calculate Delay for     │
         │  Attempt 3               │
         │  delay = initialDelay    │
         │        × backoffMultiplier^1│
         │  delay = 2000ms          │
         └──────────┬───────────────┘
                    │
                    ▼
         ┌──────────────────────────┐
         │  Wait 2000ms             │
         └──────────┬───────────────┘
                    │
                    ▼
         ┌──────────────────────────┐
         │  Attempt 3 (Final)       │
         └──────────┬───────────────┘
                    │
               ❌ Fails
                    │
                    ▼
         ┌──────────────────────────┐
         │  Throw Final Error       │
         └──────────────────────────┘

Backoff Formula:
delay = min(
  initialDelay × (backoffMultiplier ^ (attempt - 1)),
  maxDelay
)

Example with defaults:
• Attempt 1: 0ms (immediate)
• Attempt 2: 1000ms (1s)
• Attempt 3: 2000ms (2s)
• Attempt 4: 4000ms (4s) - if maxAttempts was 4
• Max delay: 30000ms (30s) - capped
```

---

## 5. User Interaction Flow

```
┌─────────────────────────────────────────────────────────┐
│                    User Flow                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  User taps "Upload     │
        │  Video" button         │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  Open ImagePicker      │
        │  (Videos only)         │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  User selects video    │
        │  Get video URI         │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  Show uploading UI     │
        │  • Progress bar        │
        │  • Percentage          │
        │  • Speed               │
        │  • ETA                 │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  Call uploadVideo()    │
        │  with onProgress       │
        └────────┬───────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
   ✅ Success        ❌ Error
        │                 │
        ▼                 ▼
┌──────────────┐  ┌──────────────┐
│ Show success │  │ Show error   │
│ message      │  │ message      │
│              │  │              │
│ Display:     │  │ Display:     │
│ • Video URL  │  │ • Error text │
│ • Thumbnail  │  │ • Retry btn  │
│ • Play btn   │  └──────────────┘
└──────────────┘
```

---

## 6. State Transitions

```
                    IDLE
                     │
                     ▼
            ┌────────────────┐
            │   PREPARING    │ ← Validating config & file
            └────────┬───────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
  ┌──────────┐            ┌──────────────┐
  │ UPLOADING│            │ COMPRESSING  │ ← If file > 100MB
  └────┬─────┘            └──────┬───────┘
       │                         │
       │                         ▼
       │                  ┌──────────────┐
       │                  │  UPLOADING   │
       │                  └──────┬───────┘
       │                         │
       └─────────┬───────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
   ┌─────────┐       ┌─────────┐
   │COMPLETED│       │ FAILED  │
   └─────────┘       └────┬────┘
                          │
                          ▼
                    ┌──────────┐
                    │ RETRYING │
                    └────┬─────┘
                         │
                         ▼
                   (Back to UPLOADING)

User can trigger:
• CANCELLED (from any state except COMPLETED/FAILED)
• PAUSED (future enhancement)
```

---

**Visual Guide Version:** 1.0.0
**Last Updated:** 2025-01-08

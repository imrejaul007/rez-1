# Upload Config Quick Reference

> **Single source of truth for all upload settings**
> Location: `frontend/config/uploadConfig.ts`

---

## Quick Import

```typescript
import { BILL_UPLOAD_CONFIG } from '@/config/uploadConfig';
```

---

## Common Values at a Glance

| Category | Setting | Value | Usage |
|----------|---------|-------|-------|
| **File Size** | Max Size | 5MB | `BILL_UPLOAD_CONFIG.FILE_SIZE_LIMITS.MAX_IMAGE_SIZE` |
| | Min Size | 50KB | `BILL_UPLOAD_CONFIG.FILE_SIZE_LIMITS.MIN_IMAGE_SIZE` |
| | Optimal | 2MB | `BILL_UPLOAD_CONFIG.FILE_SIZE_LIMITS.OPTIMAL_SIZE` |
| | Warning | 3MB | `BILL_UPLOAD_CONFIG.FILE_SIZE_LIMITS.WARNING_THRESHOLD` |
| **Formats** | Images | JPEG, PNG, HEIC | `BILL_UPLOAD_CONFIG.ALLOWED_FILE_FORMATS.IMAGES` |
| | Extensions | .jpg, .jpeg, .png, .heic | `BILL_UPLOAD_CONFIG.ALLOWED_FILE_FORMATS.EXTENSIONS` |
| **Upload** | Timeout | 60s | `BILL_UPLOAD_CONFIG.UPLOAD_CONFIG.TIMEOUT_MS` |
| | Max Retries | 3 | `BILL_UPLOAD_CONFIG.UPLOAD_CONFIG.MAX_RETRIES` |
| | Initial Delay | 1s | `BILL_UPLOAD_CONFIG.UPLOAD_CONFIG.INITIAL_RETRY_DELAY` |
| **Queue** | Max Size | 50 | `BILL_UPLOAD_CONFIG.QUEUE_CONFIG.MAX_QUEUE_SIZE` |
| | Batch Size | 5 | `BILL_UPLOAD_CONFIG.QUEUE_CONFIG.BATCH_SIZE` |
| | Sync Interval | 5 min | `BILL_UPLOAD_CONFIG.QUEUE_CONFIG.SYNC_INTERVAL` |
| **Quality** | Min Resolution | 800x600 | `BILL_UPLOAD_CONFIG.IMAGE_QUALITY_CONFIG.MIN_RESOLUTION` |
| | JPEG Quality | 0.85 | `BILL_UPLOAD_CONFIG.IMAGE_QUALITY_CONFIG.JPEG_QUALITY` |
| | Min Score | 60/100 | `BILL_UPLOAD_CONFIG.IMAGE_QUALITY_CONFIG.MIN_QUALITY_SCORE` |

---

## Helper Functions

### File Validation

```typescript
import { isValidFileSize, isValidFileFormat, isValidExtension } from '@/config/uploadConfig';

// Check file size (50KB - 5MB)
isValidFileSize(file.size) // Returns: boolean

// Check MIME type
isValidFileFormat('image/jpeg') // Returns: boolean

// Check extension
isValidExtension('.jpg') // Returns: boolean
```

### Error Handling

```typescript
import { shouldRetryError } from '@/config/uploadConfig';

// Determine if error should be retried
shouldRetryError('TIMEOUT') // Returns: true
shouldRetryError('INVALID_FILE_FORMAT') // Returns: false
```

### Retry Logic

```typescript
import { calculateRetryDelay } from '@/config/uploadConfig';

// Get retry delay with exponential backoff + jitter
calculateRetryDelay(1) // Returns: ~1000ms
calculateRetryDelay(2) // Returns: ~2000ms + jitter
calculateRetryDelay(3) // Returns: ~4000ms + jitter
```

---

## Code Snippets

### File Validation

```typescript
import { BILL_UPLOAD_CONFIG, isValidFileSize, isValidFileFormat } from '@/config/uploadConfig';

export const validateFile = (file: File) => {
  if (!isValidFileSize(file.size)) {
    throw new Error('Invalid file size');
  }

  if (!isValidFileFormat(file.type)) {
    throw new Error('Invalid file format');
  }

  return true;
};
```

### Upload with Retry

```typescript
import { BILL_UPLOAD_CONFIG, shouldRetryError, calculateRetryDelay } from '@/config/uploadConfig';

export const uploadWithRetry = async (file: File) => {
  const { MAX_RETRIES, TIMEOUT_MS } = BILL_UPLOAD_CONFIG.UPLOAD_CONFIG;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      return await upload(file, { timeout: TIMEOUT_MS });
    } catch (error) {
      attempt++;
      if (!shouldRetryError(error.code) || attempt >= MAX_RETRIES) {
        throw error;
      }
      await new Promise(r => setTimeout(r, calculateRetryDelay(attempt)));
    }
  }
};
```

### Queue Manager

```typescript
import { BILL_UPLOAD_CONFIG } from '@/config/uploadConfig';

export class QueueManager {
  async processQueue() {
    const { BATCH_SIZE, SYNC_INTERVAL } = BILL_UPLOAD_CONFIG.QUEUE_CONFIG;
    const batch = queue.slice(0, BATCH_SIZE);
    await Promise.all(batch.map(upload));
  }
}
```

### Network Adaptive Upload

```typescript
import { BILL_UPLOAD_CONFIG } from '@/config/uploadConfig';

export const getConfig = (networkType: string) => {
  const { SLOW_NETWORK, FAST_NETWORK } = BILL_UPLOAD_CONFIG.NETWORK_ADAPTIVE_CONFIG;
  return ['2g', '3g'].includes(networkType) ? SLOW_NETWORK : FAST_NETWORK;
};
```

---

## Error Classifications

### Retryable Errors (Auto-retry)
- `TIMEOUT`
- `NETWORK_ERROR`
- `CONNECTION_RESET`
- `SERVER_ERROR`
- `SERVICE_UNAVAILABLE`
- `GATEWAY_TIMEOUT`

### Non-Retryable Errors (Permanent)
- `INVALID_FILE_FORMAT`
- `FILE_TOO_LARGE`
- `FILE_TOO_SMALL`
- `INVALID_MERCHANT`
- `DUPLICATE_IMAGE`
- `RATE_LIMITED`
- `UNAUTHORIZED`

---

## Migration Checklist

- [ ] Import `BILL_UPLOAD_CONFIG` from `@/config/uploadConfig`
- [ ] Replace all hardcoded file sizes
- [ ] Replace all hardcoded timeouts
- [ ] Replace all hardcoded retry values
- [ ] Replace error type arrays with config
- [ ] Use helper functions where applicable
- [ ] Remove local constant definitions
- [ ] Run verification: `node scripts/verify-upload-config.js`

---

## Verification

```bash
# Run verification script
cd frontend
node scripts/verify-upload-config.js

# Should show 100% migration progress when complete
```

---

## Config Sections

| Section | Description | Example Use Case |
|---------|-------------|------------------|
| `FILE_SIZE_LIMITS` | Size constraints | Validation before upload |
| `ALLOWED_FILE_FORMATS` | Valid formats | File picker configuration |
| `UPLOAD_CONFIG` | Upload behavior | HTTP timeouts, retries |
| `QUEUE_CONFIG` | Queue settings | Offline sync, batching |
| `IMAGE_QUALITY_CONFIG` | Quality rules | Compression, validation |
| `RETRYABLE_ERRORS` | Retry triggers | Error handling logic |
| `NON_RETRYABLE_ERRORS` | Permanent fails | User error messages |
| `PROGRESS_CONFIG` | Progress tracking | Upload UI updates |
| `ANALYTICS_CONFIG` | Monitoring | Telemetry, logging |
| `NETWORK_ADAPTIVE_CONFIG` | Network rules | Adaptive compression |
| `BILL_SPECIFIC_CONFIG` | Bill uploads | OCR, merchant validation |

---

## Best Practices

1. ✅ Always import from `@/config/uploadConfig`
2. ✅ Use helper functions for validation
3. ✅ Destructure config values for readability
4. ✅ Never modify config at runtime (it's readonly)
5. ✅ Run verification after changes

---

## Support

- 📄 Full guide: `frontend/UPLOAD_CONFIG_GUIDE.md`
- 🔧 Config file: `frontend/config/uploadConfig.ts`
- ✅ Verification: `frontend/scripts/verify-upload-config.js`

---

**Version:** 1.0.0
**Last Updated:** 2025-11-03

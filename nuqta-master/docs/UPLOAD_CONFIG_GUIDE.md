# Upload Configuration Guide

## Overview

This document provides comprehensive guidance on the centralized upload configuration system. All upload-related settings, timeouts, file size limits, and error handling rules are now managed through a single source of truth: `config/uploadConfig.ts`.

## Table of Contents

- [Quick Start](#quick-start)
- [Configuration Structure](#configuration-structure)
- [Migration Guide](#migration-guide)
- [Usage Examples](#usage-examples)
- [Helper Functions](#helper-functions)
- [Best Practices](#best-practices)
- [Verification](#verification)

---

## Quick Start

### Import the Configuration

```typescript
import { BILL_UPLOAD_CONFIG } from '@/config/uploadConfig';

// Access any configuration value
const maxSize = BILL_UPLOAD_CONFIG.FILE_SIZE_LIMITS.MAX_IMAGE_SIZE;
const timeout = BILL_UPLOAD_CONFIG.UPLOAD_CONFIG.TIMEOUT_MS;
```

### Use Helper Functions

```typescript
import {
  isValidFileSize,
  isValidFileFormat,
  shouldRetryError,
  calculateRetryDelay
} from '@/config/uploadConfig';

// Validate file size
if (!isValidFileSize(file.size)) {
  throw new Error('File size out of range');
}

// Check if error should be retried
if (shouldRetryError(errorCode)) {
  const delay = calculateRetryDelay(attemptNumber);
  setTimeout(() => retry(), delay);
}
```

---

## Configuration Structure

### 1. FILE_SIZE_LIMITS

Controls file size constraints for uploads.

```typescript
{
  MAX_IMAGE_SIZE: 5 * 1024 * 1024,      // 5MB - Maximum allowed
  MIN_IMAGE_SIZE: 50 * 1024,            // 50KB - Minimum for quality
  OPTIMAL_SIZE: 2 * 1024 * 1024,        // 2MB - Optimal processing size
  WARNING_THRESHOLD: 3 * 1024 * 1024,   // 3MB - Suggest compression
}
```

**Use cases:**
- File validation before upload
- Image compression thresholds
- User warnings and error messages

### 2. ALLOWED_FILE_FORMATS

Defines acceptable file formats.

```typescript
{
  IMAGES: ['image/jpeg', 'image/png', 'image/heic', 'image/jpg'],
  EXTENSIONS: ['.jpg', '.jpeg', '.png', '.heic'],
  PRIMARY_FORMAT: 'image/jpeg',
}
```

**Use cases:**
- File picker configuration
- File type validation
- Format conversion defaults

### 3. UPLOAD_CONFIG

Upload behavior and retry settings.

```typescript
{
  TIMEOUT_MS: 60000,                    // 60 seconds
  MAX_RETRIES: 3,                       // Maximum retry attempts
  INITIAL_RETRY_DELAY: 1000,            // 1 second initial delay
  MAX_RETRY_DELAY: 30000,               // 30 seconds maximum delay
  BACKOFF_MULTIPLIER: 2,                // Exponential backoff multiplier
  USE_EXPONENTIAL_BACKOFF: true,        // Enable exponential backoff
  USE_JITTER: true,                     // Add random jitter
  MAX_JITTER: 0.3,                      // 30% maximum jitter
}
```

**Use cases:**
- HTTP request timeouts
- Retry logic implementation
- Network error handling

### 4. QUEUE_CONFIG

Offline queue and batch processing.

```typescript
{
  MAX_QUEUE_SIZE: 50,                   // Maximum queued items
  BATCH_SIZE: 5,                        // Items per batch
  SYNC_INTERVAL: 5 * 60 * 1000,         // 5 minutes auto-sync
  AUTO_SYNC_ON_RECONNECT: true,         // Auto-sync on reconnect
  RETRY_FAILED_ITEMS: true,             // Retry failed items
  MAX_QUEUE_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days
  CLEAR_ON_SUCCESS: true,               // Clear successful uploads
}
```

**Use cases:**
- Offline queue management
- Batch upload processing
- Background sync operations

### 5. IMAGE_QUALITY_CONFIG

Image quality validation thresholds.

```typescript
{
  MIN_RESOLUTION: { width: 800, height: 600 },
  RECOMMENDED_RESOLUTION: { width: 1920, height: 1080 },
  MAX_RESOLUTION: { width: 4096, height: 4096 },
  MIN_FILE_SIZE: 50 * 1024,             // 50KB
  MIN_QUALITY_SCORE: 60,                // 0-100 scale
  JPEG_QUALITY: 0.85,                   // Compression quality
  AUTO_COMPRESS: true,                  // Enable auto-compression
  COMPRESS_THRESHOLD: 3 * 1024 * 1024,  // 3MB
}
```

**Use cases:**
- Image quality validation
- Automatic image compression
- Resolution checks

### 6. RETRYABLE_ERRORS

Errors that should trigger automatic retry.

```typescript
[
  'TIMEOUT',
  'NETWORK_ERROR',
  'CONNECTION_RESET',
  'SERVER_ERROR',
  'SERVICE_UNAVAILABLE',
  'GATEWAY_TIMEOUT',
  'CONNECTION_REFUSED',
  'DNS_ERROR',
  'SOCKET_TIMEOUT',
]
```

### 7. NON_RETRYABLE_ERRORS

Errors that should NOT trigger retry (permanent failures).

```typescript
[
  'INVALID_FILE_FORMAT',
  'FILE_TOO_LARGE',
  'FILE_TOO_SMALL',
  'INVALID_MERCHANT',
  'DUPLICATE_IMAGE',
  'RATE_LIMITED',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'BAD_REQUEST',
  'VALIDATION_ERROR',
  'INVALID_IMAGE',
  'CORRUPTED_FILE',
  'UNSUPPORTED_FORMAT',
]
```

### 8. NETWORK_ADAPTIVE_CONFIG

Adaptive settings based on network conditions.

```typescript
{
  ENABLED: true,
  SLOW_NETWORK: {
    MAX_IMAGE_SIZE: 2 * 1024 * 1024,    // 2MB
    TIMEOUT_MS: 120000,                 // 2 minutes
    BATCH_SIZE: 2,
    JPEG_QUALITY: 0.7,
  },
  FAST_NETWORK: {
    MAX_IMAGE_SIZE: 5 * 1024 * 1024,    // 5MB
    TIMEOUT_MS: 60000,                  // 1 minute
    BATCH_SIZE: 5,
    JPEG_QUALITY: 0.85,
  },
}
```

### 9. BILL_SPECIFIC_CONFIG

Bill upload specific settings.

```typescript
{
  REQUIRE_MERCHANT: true,
  ALLOW_MANUAL_MERCHANT: true,
  ENABLE_OCR: true,
  VALIDATE_EXTRACTED_DATA: true,
  MIN_OCR_CONFIDENCE: 0.7,
  ENABLE_DUPLICATE_DETECTION: true,
  DUPLICATE_WINDOW: 30 * 24 * 60 * 60 * 1000, // 30 days
}
```

---

## Migration Guide

### Current Status

As of 2025-11-03:
- **Total files with hardcoded values:** 40
- **Files migrated:** 0
- **Migration progress:** 0%

### Priority Files

These files should be migrated first:

1. `services/billUploadService.ts`
2. `services/billUploadQueueService.ts`
3. `services/billUploadAnalytics.ts`
4. `services/fileUploadService.ts`
5. `services/imageUploadService.ts`
6. `utils/fileUploadConstants.ts`
7. `utils/billUploadErrors.ts`
8. `utils/imageQualityValidator.ts`

### Migration Steps

#### Step 1: Add Import

Replace existing imports with:

```typescript
import { BILL_UPLOAD_CONFIG, isValidFileSize, shouldRetryError } from '@/config/uploadConfig';
```

#### Step 2: Replace Hardcoded Values

**Before:**
```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const TIMEOUT = 60000;
const MAX_RETRIES = 3;

if (file.size > MAX_FILE_SIZE) {
  throw new Error('File too large');
}
```

**After:**
```typescript
import { BILL_UPLOAD_CONFIG, isValidFileSize } from '@/config/uploadConfig';

const { MAX_IMAGE_SIZE } = BILL_UPLOAD_CONFIG.FILE_SIZE_LIMITS;
const { TIMEOUT_MS } = BILL_UPLOAD_CONFIG.UPLOAD_CONFIG;
const { MAX_RETRIES } = BILL_UPLOAD_CONFIG.UPLOAD_CONFIG;

if (!isValidFileSize(file.size)) {
  throw new Error('File too large');
}
```

#### Step 3: Update Error Handling

**Before:**
```typescript
const RETRYABLE_ERRORS = ['TIMEOUT', 'NETWORK_ERROR'];

if (RETRYABLE_ERRORS.includes(error.code)) {
  retry();
}
```

**After:**
```typescript
import { shouldRetryError, calculateRetryDelay } from '@/config/uploadConfig';

if (shouldRetryError(error.code)) {
  const delay = calculateRetryDelay(attemptNumber);
  setTimeout(() => retry(), delay);
}
```

#### Step 4: Remove Duplicate Constants

Delete any local constant definitions that are now centralized:

```typescript
// DELETE THESE:
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const TIMEOUT = 60000;
const ALLOWED_FORMATS = ['image/jpeg', 'image/png'];
```

### Verification

Run the verification script after migration:

```bash
node scripts/verify-upload-config.js
```

This will show:
- Which files still have hardcoded values
- Migration progress percentage
- Remaining files to update

---

## Usage Examples

### Example 1: File Validation Service

```typescript
import {
  BILL_UPLOAD_CONFIG,
  isValidFileSize,
  isValidFileFormat
} from '@/config/uploadConfig';

export const validateUploadFile = (file: File): ValidationResult => {
  const { MAX_IMAGE_SIZE, MIN_IMAGE_SIZE } = BILL_UPLOAD_CONFIG.FILE_SIZE_LIMITS;
  const { IMAGES } = BILL_UPLOAD_CONFIG.ALLOWED_FILE_FORMATS;

  // Validate file size
  if (!isValidFileSize(file.size)) {
    return {
      valid: false,
      error: `File size must be between ${MIN_IMAGE_SIZE / 1024}KB and ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`,
    };
  }

  // Validate file format
  if (!isValidFileFormat(file.type)) {
    return {
      valid: false,
      error: `Only ${IMAGES.join(', ')} formats are allowed`,
    };
  }

  return { valid: true };
};
```

### Example 2: Upload Service with Retry Logic

```typescript
import {
  BILL_UPLOAD_CONFIG,
  shouldRetryError,
  calculateRetryDelay
} from '@/config/uploadConfig';

export const uploadWithRetry = async (file: File): Promise<UploadResult> => {
  const { MAX_RETRIES, TIMEOUT_MS } = BILL_UPLOAD_CONFIG.UPLOAD_CONFIG;

  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const result = await uploadFile(file, { timeout: TIMEOUT_MS });
      return result;
    } catch (error) {
      attempt++;

      if (!shouldRetryError(error.code) || attempt >= MAX_RETRIES) {
        throw error;
      }

      const delay = calculateRetryDelay(attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries exceeded');
};
```

### Example 3: Image Quality Checker

```typescript
import { BILL_UPLOAD_CONFIG } from '@/config/uploadConfig';

export const checkImageQuality = async (file: File): Promise<QualityResult> => {
  const { MIN_RESOLUTION, MIN_QUALITY_SCORE } = BILL_UPLOAD_CONFIG.IMAGE_QUALITY_CONFIG;

  const image = await loadImage(file);

  if (image.width < MIN_RESOLUTION.width || image.height < MIN_RESOLUTION.height) {
    return {
      passed: false,
      message: `Image must be at least ${MIN_RESOLUTION.width}x${MIN_RESOLUTION.height}`,
    };
  }

  const qualityScore = await analyzeImageQuality(image);

  if (qualityScore < MIN_QUALITY_SCORE) {
    return {
      passed: false,
      message: `Image quality is too low (score: ${qualityScore})`,
    };
  }

  return { passed: true };
};
```

### Example 4: Offline Queue Management

```typescript
import { BILL_UPLOAD_CONFIG } from '@/config/uploadConfig';

export class UploadQueueManager {
  private queue: UploadItem[] = [];

  constructor() {
    this.startAutoSync();
  }

  private startAutoSync() {
    const { SYNC_INTERVAL } = BILL_UPLOAD_CONFIG.QUEUE_CONFIG;

    setInterval(() => {
      this.processQueue();
    }, SYNC_INTERVAL);
  }

  async addToQueue(item: UploadItem) {
    const { MAX_QUEUE_SIZE } = BILL_UPLOAD_CONFIG.QUEUE_CONFIG;

    if (this.queue.length >= MAX_QUEUE_SIZE) {
      throw new Error('Queue is full');
    }

    this.queue.push(item);
  }

  private async processQueue() {
    const { BATCH_SIZE } = BILL_UPLOAD_CONFIG.QUEUE_CONFIG;
    const batch = this.queue.slice(0, BATCH_SIZE);

    await Promise.all(batch.map(item => this.uploadItem(item)));
  }
}
```

### Example 5: Network-Adaptive Upload

```typescript
import { BILL_UPLOAD_CONFIG } from '@/config/uploadConfig';

export const getAdaptiveUploadConfig = (networkType: string) => {
  const { SLOW_NETWORK, FAST_NETWORK } = BILL_UPLOAD_CONFIG.NETWORK_ADAPTIVE_CONFIG;

  const isSlowNetwork = ['2g', '3g'].includes(networkType.toLowerCase());

  return isSlowNetwork ? SLOW_NETWORK : FAST_NETWORK;
};

export const uploadWithNetworkAdaptation = async (file: File) => {
  const networkType = await getNetworkType();
  const config = getAdaptiveUploadConfig(networkType);

  // Use adaptive settings
  const compressedFile = await compressImage(file, config.JPEG_QUALITY);
  const result = await uploadFile(compressedFile, {
    timeout: config.TIMEOUT_MS,
    maxSize: config.MAX_IMAGE_SIZE
  });

  return result;
};
```

---

## Helper Functions

### shouldRetryError(errorCode: string): boolean

Determines if an error should trigger a retry attempt.

```typescript
import { shouldRetryError } from '@/config/uploadConfig';

try {
  await uploadFile(file);
} catch (error) {
  if (shouldRetryError(error.code)) {
    // Retry the upload
  } else {
    // Permanent error, show error message
  }
}
```

### isValidFileFormat(mimeType: string): boolean

Validates if a MIME type is allowed for upload.

```typescript
import { isValidFileFormat } from '@/config/uploadConfig';

if (!isValidFileFormat(file.type)) {
  alert('Invalid file format');
}
```

### isValidExtension(extension: string): boolean

Validates if a file extension is allowed.

```typescript
import { isValidExtension } from '@/config/uploadConfig';

const ext = file.name.split('.').pop();
if (!isValidExtension(`.${ext}`)) {
  alert('Invalid file extension');
}
```

### isValidFileSize(size: number): boolean

Checks if file size is within acceptable limits.

```typescript
import { isValidFileSize } from '@/config/uploadConfig';

if (!isValidFileSize(file.size)) {
  alert('File size must be between 50KB and 5MB');
}
```

### calculateRetryDelay(attemptNumber: number): number

Calculates retry delay with exponential backoff and jitter.

```typescript
import { calculateRetryDelay } from '@/config/uploadConfig';

let attempt = 1;
while (attempt <= 3) {
  try {
    await uploadFile(file);
    break;
  } catch (error) {
    const delay = calculateRetryDelay(attempt);
    await new Promise(resolve => setTimeout(resolve, delay));
    attempt++;
  }
}
```

---

## Best Practices

### 1. Always Import from Central Config

❌ **Don't:**
```typescript
const MAX_SIZE = 5 * 1024 * 1024; // Hardcoded
```

✅ **Do:**
```typescript
import { BILL_UPLOAD_CONFIG } from '@/config/uploadConfig';
const MAX_SIZE = BILL_UPLOAD_CONFIG.FILE_SIZE_LIMITS.MAX_IMAGE_SIZE;
```

### 2. Use Helper Functions

❌ **Don't:**
```typescript
if (file.size > 5242880 && file.size < 51200) {
  throw new Error('Invalid size');
}
```

✅ **Do:**
```typescript
import { isValidFileSize } from '@/config/uploadConfig';
if (!isValidFileSize(file.size)) {
  throw new Error('Invalid size');
}
```

### 3. Destructure Config Values

✅ **Good:**
```typescript
const { MAX_IMAGE_SIZE, MIN_IMAGE_SIZE } = BILL_UPLOAD_CONFIG.FILE_SIZE_LIMITS;
const { TIMEOUT_MS, MAX_RETRIES } = BILL_UPLOAD_CONFIG.UPLOAD_CONFIG;
```

### 4. Don't Modify Config at Runtime

❌ **Don't:**
```typescript
BILL_UPLOAD_CONFIG.UPLOAD_CONFIG.TIMEOUT_MS = 120000; // Will fail - config is readonly
```

✅ **Do:**
```typescript
// Use the config as-is, or create a new object if you need custom values
const customConfig = {
  ...BILL_UPLOAD_CONFIG.UPLOAD_CONFIG,
  TIMEOUT_MS: 120000
};
```

### 5. Keep Constants in Sync

If you add a new upload-related constant anywhere in the codebase:
1. Add it to `uploadConfig.ts` first
2. Export it from the appropriate config section
3. Import it where needed
4. Run verification script to confirm

---

## Verification

### Run Verification Script

```bash
cd frontend
node scripts/verify-upload-config.js
```

### Expected Output

The script will show:
1. ✅ Config file integrity check
2. 📦 Available configuration objects
3. 🔍 Files with hardcoded values
4. 📋 Migration recommendations
5. 📊 Migration progress statistics

### When Migration is Complete

You should see:
```
✅ All files are using the centralized config!
Migration Progress: 100%
```

### Continuous Verification

Add to your CI/CD pipeline:

```json
{
  "scripts": {
    "verify-config": "node scripts/verify-upload-config.js",
    "test": "npm run verify-config && jest"
  }
}
```

---

## Configuration Version

- **Version:** 1.0.0
- **Last Updated:** 2025-11-03
- **Config File:** `frontend/config/uploadConfig.ts`
- **Verification Script:** `frontend/scripts/verify-upload-config.js`

---

## Additional Resources

- See `config/uploadConfig.ts` for complete configuration details
- Run `node scripts/verify-upload-config.js` for migration status
- Check `types/upload.types.ts` for TypeScript type definitions

---

## Support

If you encounter issues during migration:

1. Check that imports are correct (`@/config/uploadConfig`)
2. Verify TypeScript types are properly exported
3. Run the verification script for detailed diagnostics
4. Ensure no circular dependencies are created

---

**Last Updated:** 2025-11-03
**Maintained By:** Development Team
**Status:** Active Development (0% migrated)

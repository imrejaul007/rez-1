# Cloudinary Video Upload Service - Implementation Guide

## Overview

This guide covers the implementation of the Cloudinary video upload service for React Native (Expo) with full production features including:

- ✅ Progress tracking with speed and ETA
- ✅ Automatic retry on network errors (3 attempts)
- ✅ Video compression for large files (>100MB)
- ✅ Automatic thumbnail generation
- ✅ Error handling with specific error types
- ✅ Support for both file URI and URL
- ✅ Cancel upload support
- ✅ Timeout handling (10 min max)

## Table of Contents

1. [Setup](#setup)
2. [Configuration](#configuration)
3. [Usage](#usage)
4. [API Reference](#api-reference)
5. [Error Handling](#error-handling)
6. [Upload Flow](#upload-flow)

---

## Setup

### 1. Cloudinary Account Setup

1. **Create Account**: Go to [cloudinary.com](https://cloudinary.com) and create a free account
2. **Get Cloud Name**: Found in your dashboard (e.g., `my-app-cloud`)
3. **Create Upload Preset**:
   - Navigate to: Settings → Upload → Upload Presets
   - Click "Add Upload Preset"
   - Configure:
     - **Signing Mode**: Unsigned (important!)
     - **Upload Preset Name**: `ugc_videos`
     - **Folder**: `videos/ugc/`
     - **Max File Size**: 100MB
     - **Allowed Formats**: mp4, mov, webm
     - **Resource Type**: Video
   - Click Save

### 2. Environment Configuration

Add to your `.env` file:

```bash
# Cloudinary Configuration
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
EXPO_PUBLIC_CLOUDINARY_API_KEY=your-api-key # Optional for unsigned uploads
EXPO_PUBLIC_CLOUDINARY_UGC_PRESET=ugc_videos
EXPO_PUBLIC_CLOUDINARY_PROFILE_PRESET=profile_images
EXPO_PUBLIC_CLOUDINARY_REVIEW_PRESET=review_media
EXPO_PUBLIC_CLOUDINARY_IMAGE_PRESET=general_images
```

### 3. Install Dependencies

All required dependencies are already in package.json:
- `expo-file-system` ✅
- `expo-av` ✅
- `expo-image-picker` ✅

---

## Configuration

### Files Structure

```
frontend/
├── config/
│   └── cloudinary.config.ts          # Cloudinary configuration
├── services/
│   └── videoUploadService.ts         # Main upload service
├── utils/
│   └── videoCompression.ts           # Video compression utility
└── types/
    └── upload.types.ts               # TypeScript types
```

### Default Configuration

```typescript
// config/cloudinary.config.ts
export const CLOUDINARY_CONFIG = {
  cloudName: 'your-cloud-name',
  uploadPresets: {
    ugcVideos: 'ugc_videos',
    profileImages: 'profile_images',
  },
  folders: {
    ugcVideos: 'videos/ugc/',
  },
  maxSizes: {
    video: 100 * 1024 * 1024, // 100MB
    image: 10 * 1024 * 1024,  // 10MB
  },
  allowedFormats: {
    video: ['mp4', 'mov', 'webm', 'avi', 'mkv'],
    image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  },
};
```

---

## Usage

### Basic Usage

```typescript
import { videoUploadService } from '@/services/videoUploadService';

// Upload a video
const result = await videoUploadService.uploadVideoToCloudinary(
  videoUri,
  {
    onProgress: (progress) => {
      console.log(`Upload progress: ${progress.percentage}%`);
      console.log(`Speed: ${videoUploadService.formatSpeed(progress.speed)}`);
      console.log(`ETA: ${videoUploadService.formatTimeRemaining(progress.timeRemaining)}`);
    }
  }
);

console.log('Video URL:', result.videoUrl);
console.log('Thumbnail URL:', result.thumbnailUrl);
console.log('Duration:', result.duration);
console.log('File Size:', result.fileSize);
```

### Advanced Usage with All Options

```typescript
import { videoUploadService } from '@/services/videoUploadService';
import { UploadProgress } from '@/types/upload.types';

const uploadVideo = async (videoUri: string) => {
  try {
    const result = await videoUploadService.uploadVideoToCloudinary(
      videoUri,
      {
        // Folder configuration
        folder: 'videos/ugc/',
        uploadPreset: 'ugc_videos',

        // Feature flags
        generateThumbnail: true,
        compressIfNeeded: true,
        compressionQuality: 'medium', // 'low' | 'medium' | 'high'

        // Retry configuration
        retryConfig: {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 30000,
          backoffMultiplier: 2,
        },

        // Timeout (10 minutes)
        timeout: 600000,

        // Progress callbacks
        onProgress: (progress: UploadProgress) => {
          console.log('Upload Progress:', {
            percentage: progress.percentage,
            speed: videoUploadService.formatSpeed(progress.speed),
            remaining: videoUploadService.formatTimeRemaining(progress.timeRemaining),
            loaded: `${(progress.loaded / 1024 / 1024).toFixed(2)} MB`,
            total: `${(progress.total / 1024 / 1024).toFixed(2)} MB`,
          });
        },

        onCompressionProgress: (progress) => {
          console.log(`Compressing video: ${progress.percentage}%`);
        },

        // Metadata
        tags: ['ugc', 'user-video', 'mobile'],
        context: {
          userId: '12345',
          category: 'review',
          platform: 'mobile',
        },
      }
    );

    console.log('Upload Success:', result);
    return result;

  } catch (error) {
    console.error('Upload Failed:', error);
    throw error;
  }
};
```

### React Component Example

```typescript
import React, { useState } from 'react';
import { View, Button, Text, ProgressBarAndroid } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { videoUploadService } from '@/services/videoUploadService';
import { UploadProgress } from '@/types/upload.types';

export const VideoUploadComponent = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const pickAndUploadVideo = async () => {
    try {
      // Pick video
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (pickerResult.canceled) return;

      const videoUri = pickerResult.assets[0].uri;

      // Upload
      setUploading(true);
      setError(null);

      const uploadResult = await videoUploadService.uploadVideoToCloudinary(
        videoUri,
        {
          onProgress: (prog) => {
            setProgress(prog);
          },
          onCompressionProgress: (prog) => {
            console.log('Compressing:', prog.percentage);
          },
        }
      );

      setResult(uploadResult);
      setUploading(false);

    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setUploading(false);
    }
  };

  return (
    <View>
      <Button
        title="Pick and Upload Video"
        onPress={pickAndUploadVideo}
        disabled={uploading}
      />

      {uploading && progress && (
        <View>
          <Text>Uploading: {progress.percentage}%</Text>
          <Text>Speed: {videoUploadService.formatSpeed(progress.speed)}</Text>
          <Text>
            ETA: {videoUploadService.formatTimeRemaining(progress.timeRemaining)}
          </Text>
          <ProgressBarAndroid
            styleAttr="Horizontal"
            progress={progress.percentage / 100}
          />
        </View>
      )}

      {result && (
        <View>
          <Text>✅ Upload Complete!</Text>
          <Text>Video URL: {result.videoUrl}</Text>
          <Text>Thumbnail: {result.thumbnailUrl}</Text>
          <Text>Duration: {result.duration}s</Text>
          <Text>Size: {(result.fileSize / 1024 / 1024).toFixed(2)} MB</Text>
        </View>
      )}

      {error && <Text style={{ color: 'red' }}>Error: {error}</Text>}
    </View>
  );
};
```

---

## API Reference

### `videoUploadService.uploadVideoToCloudinary()`

Main upload method.

**Parameters:**
- `videoUri` (string): URI of the video file
- `options` (VideoUploadOptions): Upload configuration

**Returns:** `Promise<VideoUploadResult>`

```typescript
interface VideoUploadResult {
  videoUrl: string;        // Cloudinary video URL
  thumbnailUrl: string;    // Auto-generated thumbnail
  publicId: string;        // Cloudinary public ID
  duration?: number;       // Video duration in seconds
  fileSize: number;        // File size in bytes
  format: string;          // Video format (mp4, mov, etc.)
  width?: number;          // Video width in pixels
  height?: number;         // Video height in pixels
  createdAt: string;       // ISO timestamp
}
```

### `VideoUploadOptions`

```typescript
interface VideoUploadOptions {
  folder?: string;                    // Upload folder path
  uploadPreset?: string;              // Cloudinary upload preset
  generateThumbnail?: boolean;        // Generate thumbnail (default: true)
  compressIfNeeded?: boolean;         // Auto-compress large files (default: true)
  compressionQuality?: 'low' | 'medium' | 'high';
  retryConfig?: Partial<RetryConfig>; // Retry configuration
  timeout?: number;                   // Timeout in ms (default: 600000)
  onProgress?: (progress: UploadProgress) => void;
  onCompressionProgress?: (progress: CompressionProgress) => void;
  tags?: string[];                    // Cloudinary tags
  context?: Record<string, string>;   // Custom metadata
}
```

### `UploadProgress`

```typescript
interface UploadProgress {
  loaded: number;          // Bytes uploaded
  total: number;           // Total bytes
  percentage: number;      // Progress percentage (0-100)
  speed: number;           // Upload speed (bytes/sec)
  timeRemaining: number;   // Estimated time remaining (seconds)
  startTime: number;       // Upload start timestamp
  currentTime: number;     // Current timestamp
}
```

### Helper Methods

```typescript
// Format upload speed
videoUploadService.formatSpeed(bytesPerSecond: number): string
// Returns: "1.5 MB/s"

// Format time remaining
videoUploadService.formatTimeRemaining(seconds: number): string
// Returns: "2m 30s"

// Cancel upload
videoUploadService.cancelUpload(uploadId: string): void
```

### Helper Functions

```typescript
import { videoUploadHelpers } from '@/services/videoUploadService';

// Check if Cloudinary is configured
videoUploadHelpers.isCloudinaryConfigured(): boolean

// Get configuration errors
videoUploadHelpers.getConfigurationErrors(): string[]

// Estimate upload time
videoUploadHelpers.estimateUploadTime(
  fileSizeBytes: number,
  averageSpeedBytesPerSec?: number
): number

// Check if video should be compressed
videoUploadHelpers.shouldCompressVideo(videoUri: string): Promise<boolean>
```

---

## Error Handling

### Error Types

```typescript
enum UploadErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',          // Network connection issue
  TIMEOUT = 'TIMEOUT',                      // Upload timeout
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',       // File exceeds size limit
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',  // Invalid format
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',       // File doesn't exist
  PERMISSION_DENIED = 'PERMISSION_DENIED',  // No file permission
  SERVER_ERROR = 'SERVER_ERROR',            // Server error (5xx)
  CANCELLED = 'CANCELLED',                  // Upload cancelled
  VALIDATION_ERROR = 'VALIDATION_ERROR',    // Config/file validation
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',          // Unknown error
}
```

### Error Object

```typescript
interface UploadError {
  code: string;           // Error code
  message: string;        // Human-readable message
  details?: string;       // Additional details
  retryable: boolean;     // Can retry?
  httpStatus?: number;    // HTTP status if applicable
  timestamp: number;      // Error timestamp
}
```

### Error Handling Example

```typescript
try {
  const result = await videoUploadService.uploadVideoToCloudinary(videoUri);
  console.log('Success:', result);

} catch (error: any) {
  switch (error.code) {
    case 'NETWORK_ERROR':
      alert('Network error. Please check your connection and try again.');
      break;

    case 'FILE_TOO_LARGE':
      alert('Video file is too large. Maximum size is 100MB.');
      break;

    case 'TIMEOUT':
      alert('Upload timed out. Please try again.');
      break;

    case 'VALIDATION_ERROR':
      alert(`Configuration error: ${error.message}`);
      break;

    default:
      alert(`Upload failed: ${error.message}`);
  }
}
```

---

## Upload Flow

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Start Upload                                             │
│    - videoUploadService.uploadVideoToCloudinary(uri)        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Validate Configuration                                   │
│    - Check Cloudinary cloud name                            │
│    - Check upload preset                                    │
│    - Throw error if invalid                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Validate Video File                                      │
│    - Check file exists                                      │
│    - Check file size (<100MB)                               │
│    - Check file format (mp4, mov, webm)                     │
│    - Get file metadata                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Compression Check                                        │
│    - If file > 100MB and compressIfNeeded = true            │
│      ├─→ Compress video                                     │
│      └─→ Track compression progress                         │
│    - Else: Use original video                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Upload with Retry                                        │
│    - Attempt 1                                              │
│      ├─→ Success: Continue                                  │
│      └─→ Fail: Retry logic                                  │
│    - Attempt 2 (after 1s delay)                             │
│      ├─→ Success: Continue                                  │
│      └─→ Fail: Retry logic                                  │
│    - Attempt 3 (after 2s delay)                             │
│      ├─→ Success: Continue                                  │
│      └─→ Fail: Throw error                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Perform Upload                                           │
│    - Create FormData                                        │
│    - Add video file                                         │
│    - Add upload preset                                      │
│    - Add folder, tags, context                              │
│    - Upload via FileSystem.uploadAsync                      │
│    - Track progress (speed, ETA, percentage)                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Process Response                                         │
│    - Parse Cloudinary response                              │
│    - Extract video URL                                      │
│    - Generate thumbnail URL                                 │
│    - Extract metadata (duration, size, format)              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Return Result                                            │
│    - VideoUploadResult object                               │
│      ├─ videoUrl                                            │
│      ├─ thumbnailUrl                                        │
│      ├─ publicId                                            │
│      ├─ duration                                            │
│      ├─ fileSize                                            │
│      └─ format                                              │
└─────────────────────────────────────────────────────────────┘
```

### Progress Tracking Flow

```
Upload Progress Calculation:
┌────────────────────────────────────────┐
│ Track for each progress update:        │
├────────────────────────────────────────┤
│ - Bytes loaded                         │
│ - Total bytes                          │
│ - Time elapsed                         │
│ - Calculate speed (bytes/sec)          │
│ - Average last 10 speed samples        │
│ - Calculate ETA                        │
│ - Invoke onProgress callback           │
└────────────────────────────────────────┘

Speed Calculation:
  speed = (bytesLoaded - lastBytesLoaded) / timeDelta

Average Speed:
  avgSpeed = sum(last10Samples) / 10

Estimated Time Remaining:
  ETA = (totalBytes - loadedBytes) / avgSpeed
```

### Retry Strategy

```
Retry Backoff:
┌─────────────────────────────────────────────────┐
│ Attempt 1: Immediate (0s delay)                 │
│ Attempt 2: 1s delay (initialDelay)              │
│ Attempt 3: 2s delay (initialDelay × 2)          │
│ ...                                             │
│ Max delay: 30s (maxDelay)                       │
└─────────────────────────────────────────────────┘

Retryable Errors:
- NETWORK_ERROR
- TIMEOUT
- SERVER_ERROR (5xx)

Non-Retryable Errors:
- VALIDATION_ERROR
- FILE_TOO_LARGE
- INVALID_FILE_TYPE
- PERMISSION_DENIED
```

---

## Production Checklist

Before deploying to production, ensure:

- [ ] Cloudinary account created
- [ ] Cloud name added to `.env`
- [ ] Upload presets created (unsigned mode)
- [ ] Upload presets added to `.env`
- [ ] File size limits configured
- [ ] Allowed formats configured
- [ ] Test uploads on all platforms (iOS, Android, Web)
- [ ] Error handling implemented
- [ ] Progress tracking working
- [ ] Retry logic tested
- [ ] Compression tested for large files
- [ ] Thumbnail generation working
- [ ] Timeout handling verified

---

## Troubleshooting

### "Cloudinary configuration error"
**Solution:** Check that `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` and `EXPO_PUBLIC_CLOUDINARY_UGC_PRESET` are set in `.env`

### "Upload preset not found"
**Solution:**
1. Go to Cloudinary Dashboard → Settings → Upload → Upload Presets
2. Create preset with exact name from `.env`
3. Set "Signing Mode" to "Unsigned"

### "File too large" error
**Solution:** Enable compression: `compressIfNeeded: true` or reduce video quality before upload

### Upload stuck at 0%
**Solution:** Check network connection, verify Cloudinary credentials, check device permissions

### Thumbnail not generating
**Solution:** Cloudinary auto-generates thumbnails. Check `generateThumbnail: true` in options

---

## Support

For issues or questions:
1. Check this documentation
2. Review error codes and messages
3. Check Cloudinary dashboard for upload logs
4. Verify environment configuration

---

**Last Updated:** 2025-01-08
**Version:** 1.0.0

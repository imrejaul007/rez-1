# Cloudinary Video Upload - Quick Start

## 5-Minute Setup

### 1. Get Cloudinary Credentials (2 minutes)

1. Go to https://cloudinary.com and create account
2. Copy your **Cloud Name** from dashboard
3. Create upload preset:
   - Settings → Upload → Upload Presets → Add
   - Set **Signing Mode**: Unsigned
   - Preset Name: `ugc_videos`
   - Folder: `videos/ugc/`

### 2. Configure Environment (1 minute)

Add to `.env`:
```bash
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name-here
EXPO_PUBLIC_CLOUDINARY_UGC_PRESET=ugc_videos
```

### 3. Use in Your App (2 minutes)

```typescript
import { videoUploadService } from '@/services/videoUploadService';

// Upload video
const result = await videoUploadService.uploadVideoToCloudinary(
  videoUri,
  {
    onProgress: (progress) => {
      console.log(`${progress.percentage}% - ${videoUploadService.formatSpeed(progress.speed)}`);
    }
  }
);

console.log('Video:', result.videoUrl);
console.log('Thumbnail:', result.thumbnailUrl);
```

## Complete Example Component

```typescript
import React, { useState } from 'react';
import { View, Button, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { videoUploadService } from '@/services/videoUploadService';

export const QuickVideoUpload = () => {
  const [status, setStatus] = useState('');

  const upload = async () => {
    // Pick video
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    });

    if (result.canceled) return;

    // Upload to Cloudinary
    const uploadResult = await videoUploadService.uploadVideoToCloudinary(
      result.assets[0].uri,
      {
        onProgress: (p) => setStatus(`${p.percentage}%`)
      }
    );

    setStatus(`✅ Done! ${uploadResult.videoUrl}`);
  };

  return (
    <View>
      <Button title="Upload Video" onPress={upload} />
      <Text>{status}</Text>
    </View>
  );
};
```

## Features Included

- ✅ Auto compression for large files (>100MB)
- ✅ Progress tracking (percentage, speed, ETA)
- ✅ Auto retry on network errors (3 attempts)
- ✅ Auto thumbnail generation
- ✅ Timeout protection (10 min)
- ✅ Full error handling

## That's It!

You now have production-ready video uploads with Cloudinary.

For advanced options, see [CLOUDINARY_VIDEO_UPLOAD_GUIDE.md](./CLOUDINARY_VIDEO_UPLOAD_GUIDE.md)

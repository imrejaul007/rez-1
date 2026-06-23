import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  targetFileSize?: number; // in bytes
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.8,
  targetFileSize: 2 * 1024 * 1024, // 2MB
};

/**
 * Get file size in bytes
 */
const getFileSize = async (uri: string): Promise<number> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists && 'size' in fileInfo) {
      return fileInfo.size;
    }
    return 0;
  } catch (error) {
    return 0;
  }
};

/**
 * Compress image if needed
 */
export const compressImageIfNeeded = async (
  uri: string,
  options: CompressionOptions = {}
): Promise<string> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Check file size
    const fileSize = await getFileSize(uri);

    // If file is already small enough, return original
    if (fileSize <= opts.targetFileSize) {
      return uri;
    }

    // Calculate compression quality based on file size
    let quality = opts.quality;
    if (fileSize > 5 * 1024 * 1024) {
      quality = 0.6; // Very large files
    } else if (fileSize > 3 * 1024 * 1024) {
      quality = 0.7; // Large files
    }


    // Compress image
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: opts.maxWidth } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    const newSize = await getFileSize(manipResult.uri);
    const reduction = ((1 - newSize / fileSize) * 100).toFixed(2);

    return manipResult.uri;
  } catch (error) {
    // Return original URI if compression fails
    return uri;
  }
};

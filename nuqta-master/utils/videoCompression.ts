/**
 * Video Compression Utility
 * Handles video compression before upload to reduce file size
 *
 * This service uses expo-av for basic video manipulation
 * For advanced compression, consider using:
 * - react-native-compressor
 * - react-native-video-processing
 * - ffmpeg-kit-react-native
 */

import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { CLOUDINARY_CONFIG } from '@/config/cloudinary.config';

export interface CompressionOptions {
  quality?: 'low' | 'medium' | 'high';
  maxSizeMB?: number;
  maxDurationSeconds?: number;
  targetBitrate?: string; // e.g., '1m', '500k'
}

export interface CompressionResult {
  uri: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  duration?: number;
}

export interface CompressionProgress {
  percentage: number;
  estimatedTimeRemaining?: number;
}

class VideoCompressionService {
  private readonly MAX_FILE_SIZE = CLOUDINARY_CONFIG.maxSizes.video;
  private readonly COMPRESSION_THRESHOLD = 100 * 1024 * 1024; // 100MB

  /**
   * Check if video needs compression
   */
  async needsCompression(videoUri: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(videoUri);

      if (!fileInfo.exists || typeof fileInfo.size !== 'number') {
        return false;
      }

      return fileInfo.size > this.COMPRESSION_THRESHOLD;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get video file size in bytes
   */
  async getVideoSize(videoUri: string): Promise<number> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(videoUri);
      return fileInfo.exists && typeof fileInfo.size === 'number' ? fileInfo.size : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Format file size to human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Compress video
   * Note: This is a simplified implementation
   * For production, integrate with a proper video compression library
   */
  async compressVideo(
    videoUri: string,
    options: CompressionOptions = {},
    onProgress?: (progress: CompressionProgress) => void
  ): Promise<CompressionResult> {
    const {
      quality = 'medium',
      maxSizeMB = 100,
      maxDurationSeconds,
      targetBitrate = '1m',
    } = options;

    try {
      // Get original file info
      const originalFileInfo = await FileSystem.getInfoAsync(videoUri);
      const originalSize = originalFileInfo.exists && typeof originalFileInfo.size === 'number'
        ? originalFileInfo.size
        : 0;

      // Simulate compression progress
      // In real implementation, this would be actual compression progress
      const simulateProgress = () => {
        let progress = 0;
        return new Promise<void>((resolve) => {
          const interval = setInterval(() => {
            progress += 5 + Math.random() * 15;
            if (progress > 100) progress = 100;

            onProgress?.({
              percentage: Math.round(progress),
              estimatedTimeRemaining: ((100 - progress) / 10) * 1000, // Rough estimate
            });

            if (progress >= 100) {
              clearInterval(interval);
              resolve();
            }
          }, 500);
        });
      };

      await simulateProgress();

      // For now, we'll return the original video
      // In production, implement actual compression using:
      // - expo-av for basic trimming
      // - react-native-compressor for compression
      // - ffmpeg-kit for advanced processing

      const result: CompressionResult = {
        uri: videoUri,
        originalSize,
        compressedSize: originalSize, // Would be smaller after compression
        compressionRatio: 1.0, // Would be < 1.0 after compression
      };

      return result;
    } catch (error) {
      throw new Error(`Video compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Trim video to specified duration
   * This is a placeholder - implement with expo-av or video processing library
   */
  async trimVideo(
    videoUri: string,
    startTime: number,
    endTime: number
  ): Promise<string> {
    // This would use expo-av or another library to trim the video
    // For now, return original URI
    return videoUri;
  }

  /**
   * Validate video file
   */
  async validateVideo(videoUri: string): Promise<{
    isValid: boolean;
    errors: string[];
    fileSize?: number;
    duration?: number;
  }> {
    const errors: string[] = [];

    try {
      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(videoUri);
      if (!fileInfo.exists) {
        errors.push('Video file does not exist');
        return { isValid: false, errors };
      }

      const fileSize = typeof fileInfo.size === 'number' ? fileInfo.size : 0;

      // Check file size
      if (fileSize > this.MAX_FILE_SIZE) {
        errors.push(
          `Video file size (${this.formatFileSize(fileSize)}) exceeds maximum allowed size (${this.formatFileSize(this.MAX_FILE_SIZE)})`
        );
      }

      // Check file format (basic check based on extension)
      const extension = videoUri.split('.').pop()?.toLowerCase();
      const allowedFormats = CLOUDINARY_CONFIG.allowedFormats.video;

      if (extension && !allowedFormats.includes(extension)) {
        errors.push(`Video format .${extension} is not supported. Allowed formats: ${allowedFormats.join(', ')}`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        fileSize,
      };
    } catch (error) {
      errors.push('Failed to validate video file');
      return { isValid: false, errors };
    }
  }

  /**
   * Get quality settings based on quality level
   */
  private getQualitySettings(quality: 'low' | 'medium' | 'high') {
    switch (quality) {
      case 'low':
        return {
          bitrate: '500k',
          resolution: { width: 640, height: 360 },
          fps: 24,
        };
      case 'medium':
        return {
          bitrate: '1m',
          resolution: { width: 1280, height: 720 },
          fps: 30,
        };
      case 'high':
        return {
          bitrate: '2m',
          resolution: { width: 1920, height: 1080 },
          fps: 30,
        };
    }
  }

  /**
   * Calculate compression target size
   */
  private calculateTargetSize(
    originalSize: number,
    quality: 'low' | 'medium' | 'high'
  ): number {
    const compressionRatios = {
      low: 0.3, // Compress to 30% of original
      medium: 0.5, // Compress to 50% of original
      high: 0.7, // Compress to 70% of original
    };

    return Math.floor(originalSize * compressionRatios[quality]);
  }
}

// Export singleton instance
export const videoCompressionService = new VideoCompressionService();

// Export helper functions
export const videoCompressionHelpers = {
  /**
   * Get recommended quality based on file size
   */
  getRecommendedQuality(fileSizeBytes: number): 'low' | 'medium' | 'high' {
    const sizeMB = fileSizeBytes / (1024 * 1024);

    if (sizeMB > 100) return 'low';
    if (sizeMB > 50) return 'medium';
    return 'high';
  },

  /**
   * Estimate compression time based on file size
   */
  estimateCompressionTime(fileSizeBytes: number): number {
    // Rough estimate: ~1 second per MB (varies by device)
    const sizeMB = fileSizeBytes / (1024 * 1024);
    return Math.ceil(sizeMB) * 1000; // milliseconds
  },

  /**
   * Check if device has enough space for compression
   */
  async hasEnoughSpace(requiredBytes: number): Promise<boolean> {
    try {
      const freeDiskStorage = await FileSystem.getFreeDiskStorageAsync();
      // Require 2x the file size for temporary compression files
      return freeDiskStorage > requiredBytes * 2;
    } catch (error) {
      return true; // Assume enough space if check fails
    }
  },
};

export default videoCompressionService;

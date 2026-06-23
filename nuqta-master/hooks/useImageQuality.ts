/**
 * Use Image Quality Hook
 * Checks image quality before upload with caching support
 */

import { useState, useCallback, useRef } from 'react';
import { Image, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { FILE_SIZE_LIMITS, IMAGE_QUALITY_REQUIREMENTS } from '@/utils/fileUploadConstants';

// Quality check result
export interface ImageQualityResult {
  isValid: boolean;
  score: number; // 0-100 (higher is better)
  checks: {
    resolution: {
      passed: boolean;
      width: number;
      height: number;
      minWidth: number;
      minHeight: number;
      message: string;
    };
    fileSize: {
      passed: boolean;
      size: number;
      maxSize: number;
      message: string;
    };
    aspectRatio: {
      passed: boolean;
      ratio: number;
      message: string;
    };
    blur: {
      passed: boolean;
      score: number; // Estimated blur score (lower is better)
      message: string;
    };
  };
  recommendations: string[];
  warnings: string[];
  errors: string[];
}

// Quality check options
export interface QualityCheckOptions {
  minWidth?: number;
  minHeight?: number;
  maxFileSize?: number; // in bytes
  checkBlur?: boolean;
  checkAspectRatio?: boolean;
  allowedAspectRatios?: number[]; // e.g., [1, 1.33, 1.5] for 1:1, 4:3, 3:2
}

// Default options - using centralized constants
const DEFAULT_OPTIONS: Required<QualityCheckOptions> = {
  minWidth: IMAGE_QUALITY_REQUIREMENTS.MIN_WIDTH,
  minHeight: IMAGE_QUALITY_REQUIREMENTS.MIN_HEIGHT,
  maxFileSize: FILE_SIZE_LIMITS.MAX_IMAGE_SIZE, // Updated to 5MB (was 10MB)
  checkBlur: true,
  checkAspectRatio: true,
  allowedAspectRatios: [1, 1.33, 1.5, 1.77], // 1:1, 4:3, 3:2, 16:9
};

// Cache for quality check results
interface CacheEntry {
  result: ImageQualityResult;
  timestamp: number;
}

/**
 * Custom hook for checking image quality
 */
export function useImageQuality(options: QualityCheckOptions = {}) {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<ImageQualityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cache for results (key: image URI, value: result + timestamp)
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Merge options with defaults
  const finalOptions: Required<QualityCheckOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  /**
   * Get cached result if available and not expired
   */
  const getCachedResult = useCallback(
    (uri: string): ImageQualityResult | null => {
      const cached = cacheRef.current.get(uri);
      if (!cached) return null;

      const isExpired = Date.now() - cached.timestamp > CACHE_DURATION;
      if (isExpired) {
        cacheRef.current.delete(uri);
        return null;
      }

      return cached.result;
    },
    []
  );

  /**
   * Cache result
   */
  const cacheResult = useCallback((uri: string, result: ImageQualityResult) => {
    cacheRef.current.set(uri, {
      result,
      timestamp: Date.now(),
    });
  }, []);

  /**
   * Clear cache
   */
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  /**
   * Get image dimensions
   */
  const getImageDimensions = useCallback(
    (uri: string): Promise<{ width: number; height: number }> => {
      return new Promise((resolve, reject) => {
        Image.getSize(
          uri,
          (width, height) => resolve({ width, height }),
          (error) => reject(error)
        );
      });
    },
    []
  );

  /**
   * Get file size
   */
  const getFileSize = useCallback(async (uri: string): Promise<number> => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists && 'size' in fileInfo) {
        return fileInfo.size;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }, []);

  /**
   * Check resolution
   */
  const checkResolution = useCallback(
    (width: number, height: number) => {
      const passed = width >= finalOptions.minWidth && height >= finalOptions.minHeight;
      let message = '';

      if (!passed) {
        message = `Image resolution (${width}x${height}) is below minimum requirement (${finalOptions.minWidth}x${finalOptions.minHeight})`;
      } else if (width < 1200 || height < 900) {
        message = 'Image resolution is acceptable but could be higher for better quality';
      } else {
        message = 'Image resolution is good';
      }

      return {
        passed,
        width,
        height,
        minWidth: finalOptions.minWidth,
        minHeight: finalOptions.minHeight,
        message,
      };
    },
    [finalOptions]
  );

  /**
   * Check file size
   */
  const checkFileSize = useCallback(
    (size: number) => {
      const passed = size <= finalOptions.maxFileSize;
      let message = '';

      if (!passed) {
        const sizeMB = (size / (1024 * 1024)).toFixed(2);
        const maxMB = (finalOptions.maxFileSize / (1024 * 1024)).toFixed(2);
        message = `File size (${sizeMB}MB) exceeds maximum allowed (${maxMB}MB)`;
      } else if (size < 100 * 1024) {
        // Less than 100KB
        message = 'File size is very small, image quality may be poor';
      } else {
        message = 'File size is acceptable';
      }

      return {
        passed,
        size,
        maxSize: finalOptions.maxFileSize,
        message,
      };
    },
    [finalOptions]
  );

  /**
   * Check aspect ratio
   */
  const checkAspectRatio = useCallback(
    (width: number, height: number) => {
      const ratio = width / height;
      const tolerance = 0.1;

      const isAllowed = finalOptions.allowedAspectRatios.some(
        (allowedRatio) => Math.abs(ratio - allowedRatio) < tolerance
      );

      let message = '';
      if (!isAllowed) {
        message = `Unusual aspect ratio (${ratio.toFixed(2)}:1). Consider using standard ratios like 1:1, 4:3, or 16:9`;
      } else {
        message = 'Aspect ratio is acceptable';
      }

      return {
        passed: isAllowed,
        ratio,
        message,
      };
    },
    [finalOptions]
  );

  /**
   * Estimate blur (simplified check)
   * Note: This is a basic estimation. For production, consider using native modules
   * or more sophisticated algorithms
   */
  const estimateBlur = useCallback(
    async (uri: string, width: number, height: number) => {
      // For now, we'll do a basic check based on file size relative to resolution
      // In production, you'd want to use native image processing libraries
      try {
        const fileSize = await getFileSize(uri);
        const pixelCount = width * height;
        const bytesPerPixel = fileSize / pixelCount;

        // Very rough heuristic: if bytes per pixel is very low, might indicate heavy compression/blur
        const threshold = 0.5; // bytes per pixel
        const score = Math.min(bytesPerPixel / threshold, 1) * 100;
        const passed = score > 40; // Arbitrary threshold

        let message = '';
        if (!passed) {
          message = 'Image may be blurry or heavily compressed';
        } else if (score < 60) {
          message = 'Image quality is acceptable but could be better';
        } else {
          message = 'Image appears to be clear';
        }

        return {
          passed,
          score: Math.round(score),
          message,
        };
      } catch (error) {
        return {
          passed: true,
          score: 50,
          message: 'Unable to check for blur',
        };
      }
    },
    [getFileSize]
  );

  /**
   * Calculate overall quality score
   */
  const calculateQualityScore = useCallback((checks: ImageQualityResult['checks']): number => {
    let score = 0;
    let maxScore = 0;

    // Resolution (30 points)
    maxScore += 30;
    if (checks.resolution.passed) {
      score += 30;
    }

    // File size (20 points)
    maxScore += 20;
    if (checks.fileSize.passed) {
      score += 20;
    }

    // Aspect ratio (20 points)
    maxScore += 20;
    if (checks.aspectRatio.passed) {
      score += 20;
    }

    // Blur (30 points)
    maxScore += 30;
    score += (checks.blur.score / 100) * 30;

    return Math.round((score / maxScore) * 100);
  }, []);

  /**
   * Generate recommendations based on checks
   */
  const generateRecommendations = useCallback((checks: ImageQualityResult['checks']): string[] => {
    const recommendations: string[] = [];

    if (!checks.resolution.passed) {
      recommendations.push('Take a photo with a higher resolution camera or reduce zoom');
    }

    if (!checks.fileSize.passed) {
      recommendations.push('Reduce image quality or resolution before upload');
    }

    if (!checks.aspectRatio.passed) {
      recommendations.push('Crop the image to a standard aspect ratio for better display');
    }

    if (!checks.blur.passed) {
      recommendations.push('Ensure camera is focused and steady when taking the photo');
    }

    if (checks.resolution.width < 1200 || checks.resolution.height < 900) {
      recommendations.push('For best results, use a higher resolution image (1200x900 or larger)');
    }

    return recommendations;
  }, []);

  /**
   * Check image quality
   */
  const checkQuality = useCallback(
    async (uri: string): Promise<ImageQualityResult> => {
      // Check cache first
      const cached = getCachedResult(uri);
      if (cached) {
        setResult(cached);
        return cached;
      }

      setIsChecking(true);
      setError(null);

      try {

        // Get image dimensions
        const { width, height } = await getImageDimensions(uri);

        // Get file size
        const fileSize = await getFileSize(uri);

        // Perform checks
        const resolutionCheck = checkResolution(width, height);
        const fileSizeCheck = checkFileSize(fileSize);
        const aspectRatioCheck = finalOptions.checkAspectRatio
          ? checkAspectRatio(width, height)
          : { passed: true, ratio: width / height, message: 'Aspect ratio check skipped' };
        const blurCheck = finalOptions.checkBlur
          ? await estimateBlur(uri, width, height)
          : { passed: true, score: 100, message: 'Blur check skipped' };

        const checks = {
          resolution: resolutionCheck,
          fileSize: fileSizeCheck,
          aspectRatio: aspectRatioCheck,
          blur: blurCheck,
        };

        // Calculate overall score
        const score = calculateQualityScore(checks);

        // Determine if valid
        const isValid =
          resolutionCheck.passed &&
          fileSizeCheck.passed &&
          (finalOptions.checkAspectRatio ? aspectRatioCheck.passed : true) &&
          (finalOptions.checkBlur ? blurCheck.passed : true);

        // Generate recommendations
        const recommendations = generateRecommendations(checks);

        // Collect warnings and errors
        const warnings: string[] = [];
        const errors: string[] = [];

        if (!resolutionCheck.passed) errors.push(resolutionCheck.message);
        if (!fileSizeCheck.passed) errors.push(fileSizeCheck.message);
        if (!aspectRatioCheck.passed) warnings.push(aspectRatioCheck.message);
        if (!blurCheck.passed) warnings.push(blurCheck.message);

        const qualityResult: ImageQualityResult = {
          isValid,
          score,
          checks,
          recommendations,
          warnings,
          errors,
        };


        // Cache result
        cacheResult(uri, qualityResult);

        // Update state
        setResult(qualityResult);
        setIsChecking(false);

        return qualityResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to check image quality';
        setError(errorMessage);
        setIsChecking(false);

        // Return a default failed result
        const failedResult: ImageQualityResult = {
          isValid: false,
          score: 0,
          checks: {
            resolution: {
              passed: false,
              width: 0,
              height: 0,
              minWidth: finalOptions.minWidth,
              minHeight: finalOptions.minHeight,
              message: 'Failed to get image dimensions',
            },
            fileSize: {
              passed: false,
              size: 0,
              maxSize: finalOptions.maxFileSize,
              message: 'Failed to get file size',
            },
            aspectRatio: {
              passed: false,
              ratio: 0,
              message: 'Failed to check aspect ratio',
            },
            blur: {
              passed: false,
              score: 0,
              message: 'Failed to check for blur',
            },
          },
          recommendations: ['Please try selecting a different image'],
          warnings: [],
          errors: [errorMessage],
        };

        setResult(failedResult);
        return failedResult;
      }
    },
    [
      getCachedResult,
      getImageDimensions,
      getFileSize,
      checkResolution,
      checkFileSize,
      checkAspectRatio,
      estimateBlur,
      calculateQualityScore,
      generateRecommendations,
      cacheResult,
      finalOptions,
    ]
  );

  return {
    checkQuality,
    isChecking,
    result,
    error,
    clearCache,
  };
}

export default useImageQuality;

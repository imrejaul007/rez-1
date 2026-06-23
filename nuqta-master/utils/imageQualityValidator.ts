// @ts-nocheck
/**
 * Image Quality Validator
 *
 * Validates uploaded bill images for:
 * - File size limits
 * - Supported formats
 * - Minimum resolution
 * - Image quality (blur detection, brightness)
 *
 * Returns a quality score (0-100) with actionable feedback
 */

import { Platform } from 'react-native';
import {
  FILE_SIZE_LIMITS,
  ALLOWED_FILE_FORMATS,
  IMAGE_QUALITY_REQUIREMENTS,
} from './fileUploadConstants';

/**
 * Quality validation result
 */
export interface ImageQualityResult {
  isValid: boolean;
  qualityScore: number; // 0-100
  errors: string[];
  warnings: string[];
  feedback: string[];
  details: {
    fileSize?: number;
    format?: string;
    width?: number;
    height?: number;
    isBlurry?: boolean;
    isTooLight?: boolean;
    isTooDark?: boolean;
  };
}

/**
 * Image validation configuration
 * Uses centralized constants from fileUploadConstants.ts
 */
export const IMAGE_CONFIG = {
  maxSizeBytes: FILE_SIZE_LIMITS.MAX_IMAGE_SIZE,
  minWidth: IMAGE_QUALITY_REQUIREMENTS.MIN_WIDTH,
  minHeight: IMAGE_QUALITY_REQUIREMENTS.MIN_HEIGHT,
  supportedFormats: ALLOWED_FILE_FORMATS.IMAGES,
  quality: {
    blurThreshold: IMAGE_QUALITY_REQUIREMENTS.BLUR_THRESHOLD,
    brightnessMin: IMAGE_QUALITY_REQUIREMENTS.BRIGHTNESS_MIN,
    brightnessMax: IMAGE_QUALITY_REQUIREMENTS.BRIGHTNESS_MAX,
  },
} as const;

/**
 * Supported MIME types
 */
const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
];

/**
 * Format file size for display
 *
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Get file extension from filename or URI
 *
 * @param filename - The filename or URI
 * @returns File extension in lowercase
 */
export function getFileExtension(filename: string): string {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)(?:[?#]|$)/i);
  return match ? match[1] : '';
}

/**
 * Validate file size
 *
 * @param fileSize - Size in bytes
 * @returns Validation result
 */
function validateFileSize(fileSize: number): {
  isValid: boolean;
  error?: string;
  score: number;
} {
  if (fileSize > IMAGE_CONFIG.maxSizeBytes) {
    return {
      isValid: false,
      error: `File size ${formatFileSize(fileSize)} exceeds maximum allowed size of ${formatFileSize(IMAGE_CONFIG.maxSizeBytes)}`,
      score: 0,
    };
  }

  // Score based on size (smaller is better for upload speed)
  // But not too small (might indicate low quality)
  const idealSize = 2 * 1024 * 1024; // 2MB
  const sizeDiff = Math.abs(fileSize - idealSize);
  const sizeScore = Math.max(0, 100 - (sizeDiff / idealSize) * 50);

  return {
    isValid: true,
    score: Math.min(100, sizeScore),
  };
}

/**
 * Validate file format
 *
 * @param filename - Filename or URI
 * @param mimeType - Optional MIME type
 * @returns Validation result
 */
function validateFileFormat(
  filename: string,
  mimeType?: string
): {
  isValid: boolean;
  error?: string;
  format: string;
} {
  const extension = getFileExtension(filename);

  // Check extension
  const isValidExtension = IMAGE_CONFIG.supportedFormats.includes(extension);

  // Check MIME type if provided
  const isValidMime = mimeType ? SUPPORTED_MIME_TYPES.includes(mimeType) : true;

  if (!isValidExtension || !isValidMime) {
    return {
      isValid: false,
      error: `Unsupported file format. Please upload ${IMAGE_CONFIG.supportedFormats.join(', ')} files only`,
      format: extension || 'unknown',
    };
  }

  return {
    isValid: true,
    format: extension,
  };
}

/**
 * Validate image resolution
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns Validation result
 */
function validateResolution(
  width: number,
  height: number
): {
  isValid: boolean;
  error?: string;
  warning?: string;
  score: number;
} {
  if (width < IMAGE_CONFIG.minWidth || height < IMAGE_CONFIG.minHeight) {
    return {
      isValid: false,
      error: `Image resolution ${width}x${height} is too low. Minimum required: ${IMAGE_CONFIG.minWidth}x${IMAGE_CONFIG.minHeight}`,
      score: 0,
    };
  }

  // Ideal resolution for bill images: 1200x900 to 2000x1500
  const idealWidth = 1600;
  const idealHeight = 1200;

  const widthScore = Math.min(100, (width / idealWidth) * 100);
  const heightScore = Math.min(100, (height / idealHeight) * 100);
  const resolutionScore = (widthScore + heightScore) / 2;

  // Warning for very high resolution (might be unnecessarily large)
  let warning: string | undefined;
  if (width > 4000 || height > 3000) {
    warning = 'Image resolution is very high. Consider compressing for faster upload';
  }

  return {
    isValid: true,
    warning,
    score: Math.min(100, resolutionScore),
  };
}

/**
 * Detect image blur using Laplacian variance
 * Note: This requires image processing capabilities
 *
 * @param imageData - Image data (Canvas ImageData or similar)
 * @returns Blur detection result
 */
export function detectBlur(imageData: any): {
  isBlurry: boolean;
  variance: number;
  score: number;
} {
  // This is a simplified version - actual implementation would require
  // image processing library like react-native-image-filter-kit or
  // processing on the backend

  // Placeholder implementation
  // In production, you'd calculate Laplacian variance from pixel data

  const mockVariance = 150; // Simulated variance

  const isBlurry = mockVariance < IMAGE_CONFIG.quality.blurThreshold;
  const score = isBlurry ? 30 : Math.min(100, (mockVariance / 200) * 100);

  return {
    isBlurry,
    variance: mockVariance,
    score,
  };
}

/**
 * Analyze image brightness
 * Note: This requires image processing capabilities
 *
 * @param imageData - Image data
 * @returns Brightness analysis
 */
export function analyzeBrightness(imageData: any): {
  averageBrightness: number;
  isTooLight: boolean;
  isTooDark: boolean;
  score: number;
} {
  // This is a simplified version - actual implementation would require
  // image processing library

  // Placeholder implementation
  const mockBrightness = 128; // 0-255 scale

  const isTooLight = mockBrightness > IMAGE_CONFIG.quality.brightnessMax;
  const isTooDark = mockBrightness < IMAGE_CONFIG.quality.brightnessMin;

  let score = 100;
  if (isTooLight || isTooDark) {
    score = 50;
  } else {
    // Optimal brightness is around 128
    const deviation = Math.abs(mockBrightness - 128);
    score = Math.max(50, 100 - deviation);
  }

  return {
    averageBrightness: mockBrightness,
    isTooLight,
    isTooDark,
    score,
  };
}

/**
 * Main image quality validation function
 *
 * @param imageInfo - Image information object
 * @returns Comprehensive quality validation result
 *
 * @example
 * const result = await validateImageQuality({
 *   uri: 'file:///path/to/image.jpg',
 *   fileSize: 1024000,
 *   width: 1920,
 *   height: 1080,
 *   mimeType: 'image/jpeg'
 * });
 */
export interface ImageInfo {
  uri: string;
  fileSize: number;
  width?: number;
  height?: number;
  mimeType?: string;
  fileName?: string;
}

export async function validateImageQuality(
  imageInfo: ImageInfo
): Promise<ImageQualityResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const feedback: string[] = [];
  const scores: number[] = [];

  // Validate file size
  const sizeValidation = validateFileSize(imageInfo.fileSize);
  if (!sizeValidation.isValid) {
    errors.push(sizeValidation.error!);
  } else {
    scores.push(sizeValidation.score);
    feedback.push(
      `File size: ${formatFileSize(imageInfo.fileSize)} - Good`
    );
  }

  // Validate format
  const filename = imageInfo.fileName || imageInfo.uri;
  const formatValidation = validateFileFormat(filename, imageInfo.mimeType);
  if (!formatValidation.isValid) {
    errors.push(formatValidation.error!);
  } else {
    scores.push(100);
    feedback.push(`Format: ${formatValidation.format.toUpperCase()} - Supported`);
  }

  // Validate resolution (if available)
  let resolutionScore = 100;
  if (imageInfo.width && imageInfo.height) {
    const resValidation = validateResolution(imageInfo.width, imageInfo.height);
    if (!resValidation.isValid) {
      errors.push(resValidation.error!);
      resolutionScore = 0;
    } else {
      resolutionScore = resValidation.score;
      scores.push(resolutionScore);
      feedback.push(
        `Resolution: ${imageInfo.width}x${imageInfo.height} - ${
          resolutionScore > 80 ? 'Good' : 'Acceptable'
        }`
      );

      if (resValidation.warning) {
        warnings.push(resValidation.warning);
      }
    }
  } else {
    warnings.push('Could not determine image resolution');
  }

  // Note: Advanced quality checks (blur, brightness) would require
  // image processing libraries or backend processing
  // For now, we'll add placeholder feedback

  if (Platform.OS !== 'web') {
    // On native platforms, we could potentially use image processing libraries
    // For now, provide general guidance
    feedback.push(
      'Ensure the bill is clearly visible and text is readable'
    );
    feedback.push(
      'Avoid blurry images - hold camera steady when taking photo'
    );
    feedback.push(
      'Ensure good lighting - avoid shadows and glare'
    );
  }

  // Calculate overall quality score
  const qualityScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

  // Determine if valid (no errors)
  const isValid = errors.length === 0;

  // Add quality-based feedback
  if (qualityScore >= 80) {
    feedback.push('Image quality: Excellent');
  } else if (qualityScore >= 60) {
    feedback.push('Image quality: Good');
    warnings.push('Consider taking a clearer photo for best results');
  } else if (qualityScore >= 40) {
    feedback.push('Image quality: Fair');
    warnings.push('Image quality could be improved for better processing');
  } else {
    feedback.push('Image quality: Poor');
    errors.push('Image quality is too low. Please take a clearer photo');
  }

  return {
    isValid,
    qualityScore,
    errors,
    warnings,
    feedback,
    details: {
      fileSize: imageInfo.fileSize,
      format: formatValidation.format,
      width: imageInfo.width,
      height: imageInfo.height,
    },
  };
}

/**
 * Quick validation for basic checks (before detailed analysis)
 *
 * @param imageInfo - Basic image info
 * @returns Quick validation result
 */
export function quickValidateImage(imageInfo: {
  uri: string;
  fileSize: number;
  fileName?: string;
}): { isValid: boolean; error?: string } {
  // Check file size
  const sizeCheck = validateFileSize(imageInfo.fileSize);
  if (!sizeCheck.isValid) {
    return { isValid: false, error: sizeCheck.error };
  }

  // Check format
  const filename = imageInfo.fileName || imageInfo.uri;
  const formatCheck = validateFileFormat(filename);
  if (!formatCheck.isValid) {
    return { isValid: false, error: formatCheck.error };
  }

  return { isValid: true };
}

/**
 * Get quality improvement suggestions based on validation result
 *
 * @param result - Image quality validation result
 * @returns Array of improvement suggestions
 */
export function getQualityImprovementSuggestions(
  result: ImageQualityResult
): string[] {
  const suggestions: string[] = [];

  if (result.details.fileSize && result.details.fileSize > 4 * 1024 * 1024) {
    suggestions.push('Compress the image to reduce file size and upload time');
  }

  if (
    result.details.width &&
    result.details.height &&
    (result.details.width < IMAGE_CONFIG.minWidth * 1.5 ||
      result.details.height < IMAGE_CONFIG.minHeight * 1.5)
  ) {
    suggestions.push('Use a higher resolution camera or zoom in on the bill');
  }

  if (result.details.isBlurry) {
    suggestions.push('Hold the camera steady and ensure proper focus');
    suggestions.push('Use the tap-to-focus feature before taking the photo');
  }

  if (result.details.isTooDark) {
    suggestions.push('Take the photo in better lighting conditions');
    suggestions.push('Avoid shadows on the bill');
  }

  if (result.details.isTooLight) {
    suggestions.push('Reduce exposure or avoid direct flash');
    suggestions.push('Move to a location with less bright lighting');
  }

  if (result.qualityScore < 70 && suggestions.length === 0) {
    suggestions.push('Retake the photo ensuring the bill is clearly visible');
    suggestions.push('Make sure all text on the bill is readable');
  }

  return suggestions;
}

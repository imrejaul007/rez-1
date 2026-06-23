import {
  analyzeImage,
  ImageQualityMetrics,
  checkResolution
} from '../utils/imageProcessing';

/**
 * Image quality validation result
 */
export interface ImageQualityResult {
  isValid: boolean;
  score: number; // 0-100
  feedback: string;
  details: {
    brightness: {
      value: number;
      status: 'good' | 'fair' | 'poor';
      message: string;
    };
    contrast: {
      value: number;
      status: 'good' | 'fair' | 'poor';
      message: string;
    };
    sharpness: {
      value: number;
      status: 'good' | 'fair' | 'poor';
      message: string;
    };
    resolution: {
      width: number;
      height: number;
      megapixels: number;
      status: 'good' | 'fair' | 'poor';
      message: string;
    };
    fileSize?: {
      bytes: number;
      status: 'good' | 'fair' | 'poor';
      message: string;
    };
  };
  issues: string[];
  suggestions: string[];
}

/**
 * Quality thresholds for image validation
 */
const QUALITY_THRESHOLDS = {
  brightness: {
    min: 0.2, // Too dark
    max: 0.9, // Too bright
    optimal: { min: 0.3, max: 0.8 }
  },
  contrast: {
    min: 0.15, // Too low contrast
    optimal: 0.3
  },
  blur: {
    min: 100, // Minimum acceptable blur score
    optimal: 300
  },
  resolution: {
    minMegapixels: 1.0, // 1MP minimum
    optimalMegapixels: 2.0
  },
  fileSize: {
    min: 50_000, // 50KB minimum
    max: 10_000_000, // 10MB maximum
    optimal: { min: 100_000, max: 5_000_000 }
  }
};

/**
 * Analyze image quality and return validation result
 */
export const analyzeImageQuality = async (imageUri: string): Promise<ImageQualityResult> => {
  try {
    // Analyze image metrics
    const metrics = await analyzeImage(imageUri);

    // Evaluate each quality aspect
    const brightnessEval = evaluateBrightness(metrics.brightness);
    const contrastEval = evaluateContrast(metrics.contrast);
    const sharpnessEval = evaluateSharpness(metrics.blurScore);
    const resolutionEval = evaluateResolution(
      metrics.width,
      metrics.height,
      metrics.megapixels
    );
    const fileSizeEval = metrics.fileSize
      ? evaluateFileSize(metrics.fileSize)
      : undefined;

    // Collect issues and suggestions
    const issues: string[] = [];
    const suggestions: string[] = [];

    if (brightnessEval.status === 'poor') {
      issues.push(brightnessEval.message);
      if (metrics.brightness < QUALITY_THRESHOLDS.brightness.min) {
        suggestions.push('Try taking the photo in better lighting conditions');
      } else {
        suggestions.push('Reduce exposure or move away from bright light sources');
      }
    }

    if (contrastEval.status === 'poor') {
      issues.push(contrastEval.message);
      suggestions.push('Ensure the bill is clearly visible against the background');
    }

    if (sharpnessEval.status === 'poor') {
      issues.push(sharpnessEval.message);
      suggestions.push('Hold the camera steady and ensure the bill is in focus');
    }

    if (resolutionEval.status === 'poor') {
      issues.push(resolutionEval.message);
      suggestions.push('Move closer to the bill or use a higher resolution camera');
    }

    if (fileSizeEval && fileSizeEval.status === 'poor') {
      issues.push(fileSizeEval.message);
      if (metrics.fileSize! < QUALITY_THRESHOLDS.fileSize.min) {
        suggestions.push('Image file may be corrupted or too compressed');
      } else {
        suggestions.push('Image file is too large, try reducing quality slightly');
      }
    }

    // Calculate overall score (0-100)
    const score = calculateOverallScore(
      brightnessEval.status,
      contrastEval.status,
      sharpnessEval.status,
      resolutionEval.status,
      fileSizeEval?.status
    );

    // Determine if image is valid (score >= 60)
    const isValid = score >= 60 && issues.length === 0;

    // Generate feedback message
    const feedback = generateFeedback(score, issues, suggestions);

    return {
      isValid,
      score,
      feedback,
      details: {
        brightness: brightnessEval,
        contrast: contrastEval,
        sharpness: sharpnessEval,
        resolution: resolutionEval,
        ...(fileSizeEval && { fileSize: fileSizeEval })
      },
      issues,
      suggestions
    };
  } catch (error) {

    // Return error result
    return {
      isValid: false,
      score: 0,
      feedback: 'Unable to analyze image quality. Please try a different image.',
      details: {
        brightness: { value: 0, status: 'poor', message: 'Analysis failed' },
        contrast: { value: 0, status: 'poor', message: 'Analysis failed' },
        sharpness: { value: 0, status: 'poor', message: 'Analysis failed' },
        resolution: {
          width: 0,
          height: 0,
          megapixels: 0,
          status: 'poor',
          message: 'Analysis failed'
        }
      },
      issues: ['Failed to analyze image'],
      suggestions: ['Please try selecting a different image']
    };
  }
};

/**
 * Evaluate brightness level
 */
const evaluateBrightness = (
  brightness: number
): { value: number; status: 'good' | 'fair' | 'poor'; message: string } => {
  const { min, max, optimal } = QUALITY_THRESHOLDS.brightness;

  if (brightness < min) {
    return {
      value: brightness,
      status: 'poor',
      message: 'Image is too dark'
    };
  }

  if (brightness > max) {
    return {
      value: brightness,
      status: 'poor',
      message: 'Image is too bright'
    };
  }

  if (brightness >= optimal.min && brightness <= optimal.max) {
    return {
      value: brightness,
      status: 'good',
      message: 'Brightness is optimal'
    };
  }

  return {
    value: brightness,
    status: 'fair',
    message: 'Brightness is acceptable'
  };
};

/**
 * Evaluate contrast level
 */
const evaluateContrast = (
  contrast: number
): { value: number; status: 'good' | 'fair' | 'poor'; message: string } => {
  const { min, optimal } = QUALITY_THRESHOLDS.contrast;

  if (contrast < min) {
    return {
      value: contrast,
      status: 'poor',
      message: 'Image has very low contrast'
    };
  }

  if (contrast >= optimal) {
    return {
      value: contrast,
      status: 'good',
      message: 'Contrast is excellent'
    };
  }

  return {
    value: contrast,
    status: 'fair',
    message: 'Contrast is acceptable'
  };
};

/**
 * Evaluate image sharpness (blur detection)
 */
const evaluateSharpness = (
  blurScore: number
): { value: number; status: 'good' | 'fair' | 'poor'; message: string } => {
  const { min, optimal } = QUALITY_THRESHOLDS.blur;

  if (blurScore < min) {
    return {
      value: blurScore,
      status: 'poor',
      message: 'Image is too blurry'
    };
  }

  if (blurScore >= optimal) {
    return {
      value: blurScore,
      status: 'good',
      message: 'Image is sharp and clear'
    };
  }

  return {
    value: blurScore,
    status: 'fair',
    message: 'Image sharpness is acceptable'
  };
};

/**
 * Evaluate image resolution
 */
const evaluateResolution = (
  width: number,
  height: number,
  megapixels: number
): {
  width: number;
  height: number;
  megapixels: number;
  status: 'good' | 'fair' | 'poor';
  message: string;
} => {
  const { minMegapixels, optimalMegapixels } = QUALITY_THRESHOLDS.resolution;

  if (megapixels < minMegapixels) {
    return {
      width,
      height,
      megapixels,
      status: 'poor',
      message: `Resolution too low (${megapixels.toFixed(1)}MP)`
    };
  }

  if (megapixels >= optimalMegapixels) {
    return {
      width,
      height,
      megapixels,
      status: 'good',
      message: `Resolution is excellent (${megapixels.toFixed(1)}MP)`
    };
  }

  return {
    width,
    height,
    megapixels,
    status: 'fair',
    message: `Resolution is acceptable (${megapixels.toFixed(1)}MP)`
  };
};

/**
 * Evaluate file size
 */
const evaluateFileSize = (
  bytes: number
): { bytes: number; status: 'good' | 'fair' | 'poor'; message: string } => {
  const { min, max, optimal } = QUALITY_THRESHOLDS.fileSize;

  const formatSize = (size: number): string => {
    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  };

  if (bytes < min) {
    return {
      bytes,
      status: 'poor',
      message: `File size too small (${formatSize(bytes)})`
    };
  }

  if (bytes > max) {
    return {
      bytes,
      status: 'poor',
      message: `File size too large (${formatSize(bytes)})`
    };
  }

  if (bytes >= optimal.min && bytes <= optimal.max) {
    return {
      bytes,
      status: 'good',
      message: `File size is optimal (${formatSize(bytes)})`
    };
  }

  return {
    bytes,
    status: 'fair',
    message: `File size is acceptable (${formatSize(bytes)})`
  };
};

/**
 * Calculate overall quality score
 */
const calculateOverallScore = (
  brightness: 'good' | 'fair' | 'poor',
  contrast: 'good' | 'fair' | 'poor',
  sharpness: 'good' | 'fair' | 'poor',
  resolution: 'good' | 'fair' | 'poor',
  fileSize?: 'good' | 'fair' | 'poor'
): number => {
  const statusToScore = (status: 'good' | 'fair' | 'poor'): number => {
    switch (status) {
      case 'good':
        return 100;
      case 'fair':
        return 70;
      case 'poor':
        return 30;
    }
  };

  // Weight different aspects
  const weights = {
    brightness: 0.2,
    contrast: 0.15,
    sharpness: 0.35, // Sharpness is most important for text recognition
    resolution: 0.25,
    fileSize: 0.05
  };

  let totalScore = 0;
  let totalWeight = 0;

  totalScore += statusToScore(brightness) * weights.brightness;
  totalWeight += weights.brightness;

  totalScore += statusToScore(contrast) * weights.contrast;
  totalWeight += weights.contrast;

  totalScore += statusToScore(sharpness) * weights.sharpness;
  totalWeight += weights.sharpness;

  totalScore += statusToScore(resolution) * weights.resolution;
  totalWeight += weights.resolution;

  if (fileSize) {
    totalScore += statusToScore(fileSize) * weights.fileSize;
    totalWeight += weights.fileSize;
  }

  return Math.round(totalScore / totalWeight);
};

/**
 * Generate human-readable feedback message
 */
const generateFeedback = (
  score: number,
  issues: string[],
  suggestions: string[]
): string => {
  if (score >= 90) {
    return 'Excellent image quality! This image is perfect for processing.';
  }

  if (score >= 75) {
    return 'Good image quality. This image should work well.';
  }

  if (score >= 60) {
    return 'Acceptable image quality, but could be better. Consider the suggestions below.';
  }

  if (issues.length > 0) {
    return `Image quality issues detected: ${issues[0]}. ${
      suggestions.length > 0 ? suggestions[0] : 'Please try again with a better image.'
    }`;
  }

  return 'Image quality is too low. Please take a new photo with better conditions.';
};

/**
 * Quick validation check (lighter weight than full analysis)
 * Useful for real-time feedback during image selection
 */
export const quickValidateImage = async (
  imageUri: string
): Promise<{ isValid: boolean; message: string }> => {
  try {
    const result = await analyzeImageQuality(imageUri);

    return {
      isValid: result.isValid,
      message: result.feedback
    };
  } catch (error) {
    return {
      isValid: false,
      message: 'Unable to validate image. Please try again.'
    };
  }
};

/**
 * Export quality thresholds for reference
 */
export { QUALITY_THRESHOLDS };

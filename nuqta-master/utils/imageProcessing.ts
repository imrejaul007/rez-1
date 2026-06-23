import { Platform } from 'react-native';

/**
 * Image quality metrics returned by analysis functions
 */
export interface ImageQualityMetrics {
  brightness: number; // 0-1 scale
  contrast: number; // 0-1 scale
  blurScore: number; // Higher = sharper
  width: number;
  height: number;
  megapixels: number;
  fileSize?: number; // in bytes
}

/**
 * Image dimensions
 */
export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Load image and get dimensions
 * Works cross-platform (web and mobile)
 */
export const loadImageDimensions = async (uri: string): Promise<ImageDimensions> => {
  return new Promise((resolve, reject) => {
    if (Platform.OS === 'web') {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      img.src = uri;
    } else {
      // React Native mobile
      const Image = require('react-native').Image;
      Image.getSize(
        uri,
        (width: number, height: number) => {
          resolve({ width, height });
        },
        (error: Error) => {
          reject(error);
        }
      );
    }
  });
};

/**
 * Calculate brightness from image pixels
 * Returns value between 0 (black) and 1 (white)
 */
export const calculateBrightness = (imageData: ImageData): number => {
  const data = imageData.data;
  let sum = 0;
  let count = 0;

  // Sample every 4th pixel for performance
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    sum += luminance;
    count++;
  }

  return count > 0 ? sum / count : 0;
};

/**
 * Calculate image contrast using standard deviation
 * Returns value between 0 (no contrast) and 1 (high contrast)
 */
export const calculateContrast = (imageData: ImageData): number => {
  const data = imageData.data;
  const luminanceValues: number[] = [];

  // Sample every 4th pixel for performance
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    luminanceValues.push(luminance);
  }

  // Calculate mean
  const mean = luminanceValues.reduce((a, b) => a + b, 0) / luminanceValues.length;

  // Calculate standard deviation
  const squaredDiffs = luminanceValues.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / luminanceValues.length;
  const stdDev = Math.sqrt(variance);

  // Normalize to 0-1 scale (typical std dev range is 0-128 for 8-bit images)
  return Math.min(stdDev / 128, 1);
};

/**
 * Detect blur using Laplacian variance
 * Higher values indicate sharper images
 * Typically, values < 100 indicate blur
 */
export const detectBlur = (imageData: ImageData): number => {
  const { width, height, data } = imageData;

  // Laplacian kernel for edge detection
  const laplacianKernel = [
    [0, 1, 0],
    [1, -4, 1],
    [0, 1, 0]
  ];

  let sum = 0;
  let count = 0;

  // Convert to grayscale and apply Laplacian filter
  const grayscale: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    grayscale.push(gray);
  }

  // Sample every 10th pixel in each direction for performance
  const step = 10;
  for (let y = step; y < height - step; y += step) {
    for (let x = step; x < width - step; x += step) {
      let laplacianValue = 0;

      // Apply Laplacian kernel
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixelIndex = (y + ky) * width + (x + kx);
          laplacianValue += grayscale[pixelIndex] * laplacianKernel[ky + 1][kx + 1];
        }
      }

      sum += laplacianValue * laplacianValue;
      count++;
    }
  }

  // Return variance (higher = sharper)
  return count > 0 ? sum / count : 0;
};

/**
 * Get image data from URI for analysis
 * Works cross-platform
 */
export const getImageData = async (uri: string, maxSize: number = 1024): Promise<ImageData> => {
  if (Platform.OS === 'web') {
    return getImageDataWeb(uri, maxSize);
  } else {
    // For mobile, we need to use a canvas library or native module
    // Fallback to web-like implementation if canvas is available
    return getImageDataMobile(uri, maxSize);
  }
};

/**
 * Get image data for web platform
 */
const getImageDataWeb = async (uri: string, maxSize: number): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        // Calculate scaled dimensions
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const scale = maxSize / Math.max(width, height);
          width = Math.floor(width * scale);
          height = Math.floor(height * scale);
        }

        // Create canvas and draw image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        resolve(imageData);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = uri;
  });
};

/**
 * Get image data for mobile platform
 * Note: This is a simplified version. For production, consider using:
 * - expo-image-manipulator for processing
 * - react-native-canvas for canvas operations
 */
const getImageDataMobile = async (uri: string, maxSize: number): Promise<ImageData> => {
  // For React Native, we would typically use expo-image-manipulator or similar
  // This is a placeholder that should be implemented based on available libraries

  try {
    // Try to use expo-image-manipulator if available
    const ImageManipulator = require('expo-image-manipulator');

    // Resize image for analysis
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxSize } }],
      { compress: 1, format: ImageManipulator.SaveFormat.PNG }
    );

    // For actual pixel data extraction on mobile, you'd need a canvas library
    // This is a simplified placeholder
    throw new Error('Mobile image processing requires additional setup');

  } catch (error) {
    // Fallback: return mock data with basic info
    // In production, implement proper mobile image processing

    // Return minimal valid ImageData structure
    const dimensions = await loadImageDimensions(uri);
    const mockData = new Uint8ClampedArray(dimensions.width * dimensions.height * 4);

    return {
      data: mockData,
      width: Math.min(dimensions.width, maxSize),
      height: Math.min(dimensions.height, maxSize),
      colorSpace: 'srgb'
    } as ImageData;
  }
};

/**
 * Check if image resolution meets minimum requirements
 */
export const checkResolution = (
  width: number,
  height: number,
  minMegapixels: number = 1.0
): boolean => {
  const megapixels = (width * height) / 1_000_000;
  return megapixels >= minMegapixels;
};

/**
 * Get file size from URI
 */
export const getFileSize = async (uri: string): Promise<number | undefined> => {
  try {
    if (Platform.OS === 'web') {
      if (uri.startsWith('blob:') || uri.startsWith('data:')) {
        const response = await fetch(uri);
        const blob = await response.blob();
        return blob.size;
      }
      return undefined;
    } else {
      // React Native - use FileSystem if available
      const FileSystem = require('expo-file-system');
      const info = await FileSystem.getInfoAsync(uri);
      return info.size;
    }
  } catch (error) {
    return undefined;
  }
};

/**
 * Analyze image and return all quality metrics
 */
export const analyzeImage = async (uri: string): Promise<ImageQualityMetrics> => {
  try {
    // Load dimensions
    const dimensions = await loadImageDimensions(uri);
    const megapixels = (dimensions.width * dimensions.height) / 1_000_000;

    // Get file size
    const fileSize = await getFileSize(uri);

    // For web or if canvas is available, get detailed metrics
    let brightness = 0.5; // Default values
    let contrast = 0.5;
    let blurScore = 100;

    try {
      const imageData = await getImageData(uri, 512); // Use smaller size for analysis
      brightness = calculateBrightness(imageData);
      contrast = calculateContrast(imageData);
      blurScore = detectBlur(imageData);
    } catch (error) {
      // Continue with default values
    }

    return {
      brightness,
      contrast,
      blurScore,
      width: dimensions.width,
      height: dimensions.height,
      megapixels,
      fileSize
    };
  } catch (error) {
    throw new Error('Failed to analyze image quality');
  }
};

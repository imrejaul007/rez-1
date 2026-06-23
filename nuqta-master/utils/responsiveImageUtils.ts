/**
 * Responsive Image Utilities
 *
 * Utilities for responsive image sizing based on:
 * - Device screen size
 * - Device pixel ratio
 * - Image context (thumbnail, card, hero, etc.)
 * - Network quality
 */

import { Dimensions, Platform, PixelRatio } from 'react-native';

/**
 * Image context types
 */
export enum ImageContext {
  THUMBNAIL = 'thumbnail',        // Small thumbnail images (100x100)
  CARD_SMALL = 'card_small',     // Small product card (180x180)
  CARD_MEDIUM = 'card_medium',   // Medium product card (300x300)
  CARD_LARGE = 'card_large',     // Large store card (400x300)
  HERO = 'hero',                 // Hero/banner images (full width)
  DETAIL = 'detail',             // Product detail images (600x600)
  GALLERY = 'gallery',           // Gallery images (800x800)
  FULL_SCREEN = 'full_screen',   // Full screen images
}

/**
 * Device size categories
 */
export enum DeviceSize {
  SMALL = 'small',       // < 375px (iPhone SE)
  MEDIUM = 'medium',     // 375-414px (Standard phones)
  LARGE = 'large',       // 414-768px (Large phones / small tablets)
  XLARGE = 'xlarge',     // > 768px (Tablets / Desktop)
}

/**
 * Get device size category
 */
export function getDeviceSize(): DeviceSize {
  const { width } = Dimensions.get('window');

  if (width < 375) return DeviceSize.SMALL;
  if (width < 414) return DeviceSize.MEDIUM;
  if (width < 768) return DeviceSize.LARGE;
  return DeviceSize.XLARGE;
}

/**
 * Get device pixel ratio (capped at 3 for optimization)
 */
export function getDevicePixelRatio(): number {
  const pixelRatio = PixelRatio.get();
  // Cap at 3x to avoid unnecessarily large images
  return Math.min(pixelRatio, 3);
}

/**
 * Image dimensions for different contexts and device sizes
 */
const IMAGE_DIMENSIONS: Record<ImageContext, Record<DeviceSize, { width: number; height: number }>> = {
  [ImageContext.THUMBNAIL]: {
    [DeviceSize.SMALL]: { width: 80, height: 80 },
    [DeviceSize.MEDIUM]: { width: 100, height: 100 },
    [DeviceSize.LARGE]: { width: 100, height: 100 },
    [DeviceSize.XLARGE]: { width: 120, height: 120 },
  },
  [ImageContext.CARD_SMALL]: {
    [DeviceSize.SMALL]: { width: 150, height: 150 },
    [DeviceSize.MEDIUM]: { width: 180, height: 180 },
    [DeviceSize.LARGE]: { width: 200, height: 200 },
    [DeviceSize.XLARGE]: { width: 220, height: 220 },
  },
  [ImageContext.CARD_MEDIUM]: {
    [DeviceSize.SMALL]: { width: 250, height: 250 },
    [DeviceSize.MEDIUM]: { width: 300, height: 300 },
    [DeviceSize.LARGE]: { width: 350, height: 350 },
    [DeviceSize.XLARGE]: { width: 400, height: 400 },
  },
  [ImageContext.CARD_LARGE]: {
    [DeviceSize.SMALL]: { width: 350, height: 260 },
    [DeviceSize.MEDIUM]: { width: 400, height: 300 },
    [DeviceSize.LARGE]: { width: 450, height: 340 },
    [DeviceSize.XLARGE]: { width: 500, height: 375 },
  },
  [ImageContext.HERO]: {
    [DeviceSize.SMALL]: { width: 375, height: 200 },
    [DeviceSize.MEDIUM]: { width: 414, height: 220 },
    [DeviceSize.LARGE]: { width: 768, height: 300 },
    [DeviceSize.XLARGE]: { width: 1024, height: 400 },
  },
  [ImageContext.DETAIL]: {
    [DeviceSize.SMALL]: { width: 375, height: 375 },
    [DeviceSize.MEDIUM]: { width: 414, height: 414 },
    [DeviceSize.LARGE]: { width: 600, height: 600 },
    [DeviceSize.XLARGE]: { width: 800, height: 800 },
  },
  [ImageContext.GALLERY]: {
    [DeviceSize.SMALL]: { width: 600, height: 600 },
    [DeviceSize.MEDIUM]: { width: 700, height: 700 },
    [DeviceSize.LARGE]: { width: 800, height: 800 },
    [DeviceSize.XLARGE]: { width: 1000, height: 1000 },
  },
  [ImageContext.FULL_SCREEN]: {
    [DeviceSize.SMALL]: { width: 750, height: 1334 },
    [DeviceSize.MEDIUM]: { width: 828, height: 1472 },
    [DeviceSize.LARGE]: { width: 1536, height: 2048 },
    [DeviceSize.XLARGE]: { width: 2048, height: 2732 },
  },
};

/**
 * Get responsive image dimensions
 */
export function getResponsiveDimensions(
  context: ImageContext,
  options: {
    customWidth?: number;
    customHeight?: number;
    maintainAspectRatio?: boolean;
    applyPixelRatio?: boolean;
  } = {}
): { width: number; height: number } {
  const {
    customWidth,
    customHeight,
    maintainAspectRatio = false,
    applyPixelRatio = true,
  } = options;

  const deviceSize = getDeviceSize();
  const baseDimensions = IMAGE_DIMENSIONS[context][deviceSize];

  let width = customWidth || baseDimensions.width;
  let height = customHeight || baseDimensions.height;

  // Maintain aspect ratio if only one dimension is provided
  if (maintainAspectRatio) {
    const aspectRatio = baseDimensions.width / baseDimensions.height;

    if (customWidth && !customHeight) {
      height = Math.round(customWidth / aspectRatio);
    } else if (customHeight && !customWidth) {
      width = Math.round(customHeight * aspectRatio);
    }
  }

  // Apply pixel ratio for high-DPI screens
  if (applyPixelRatio) {
    const pixelRatio = getDevicePixelRatio();
    width = Math.round(width * pixelRatio);
    height = Math.round(height * pixelRatio);
  }

  return { width, height };
}

/**
 * Get thumbnail dimensions (smaller version for progressive loading)
 */
export function getThumbnailDimensions(
  baseWidth: number,
  baseHeight: number,
  thumbnailScale: number = 0.2
): { width: number; height: number } {
  return {
    width: Math.round(baseWidth * thumbnailScale),
    height: Math.round(baseHeight * thumbnailScale),
  };
}

/**
 * Get optimal image quality based on network and device
 */
export function getOptimalQuality(networkType: 'wifi' | 'cellular' | 'offline'): 'low' | 'medium' | 'high' {
  switch (networkType) {
    case 'wifi':
      return 'high';
    case 'cellular':
      return 'medium';
    case 'offline':
      return 'low';
    default:
      return 'medium';
  }
}

/**
 * Calculate grid item dimensions for image grids
 */
export function getGridItemDimensions(
  columns: number,
  spacing: number = 16,
  aspectRatio: number = 1
): { width: number; height: number } {
  const screenWidth = Dimensions.get('window').width;
  const totalSpacing = spacing * (columns + 1);
  const availableWidth = screenWidth - totalSpacing;
  const width = Math.floor(availableWidth / columns);
  const height = Math.round(width / aspectRatio);

  return { width, height };
}

/**
 * Get image dimensions based on container size
 */
export function getContainerBasedDimensions(
  containerWidth: number,
  containerHeight?: number,
  aspectRatio: number = 1
): { width: number; height: number } {
  const pixelRatio = getDevicePixelRatio();
  const width = Math.round(containerWidth * pixelRatio);
  const height = containerHeight
    ? Math.round(containerHeight * pixelRatio)
    : Math.round(width / aspectRatio);

  return { width, height };
}

/**
 * Get srcset for responsive images (web only)
 */
export function generateSrcSet(
  baseUrl: string,
  widths: number[] = [320, 640, 960, 1280, 1920]
): string {
  if (Platform.OS !== 'web') {
    return '';
  }

  return widths
    .map(width => {
      // Append width parameter to URL
      const url = new URL(baseUrl);
      url.searchParams.set('w', width.toString());
      return `${url.toString()} ${width}w`;
    })
    .join(', ');
}

/**
 * Get sizes attribute for responsive images (web only)
 */
export function generateSizesAttribute(
  context: ImageContext
): string {
  if (Platform.OS !== 'web') {
    return '';
  }

  switch (context) {
    case ImageContext.THUMBNAIL:
      return '(max-width: 375px) 80px, (max-width: 768px) 100px, 120px';
    case ImageContext.CARD_SMALL:
      return '(max-width: 375px) 150px, (max-width: 768px) 180px, 220px';
    case ImageContext.CARD_MEDIUM:
      return '(max-width: 375px) 250px, (max-width: 768px) 300px, 400px';
    case ImageContext.CARD_LARGE:
      return '(max-width: 375px) 350px, (max-width: 768px) 400px, 500px';
    case ImageContext.HERO:
      return '(max-width: 375px) 375px, (max-width: 768px) 768px, 1024px';
    case ImageContext.DETAIL:
      return '(max-width: 375px) 375px, (max-width: 768px) 600px, 800px';
    case ImageContext.GALLERY:
      return '(max-width: 375px) 600px, (max-width: 768px) 800px, 1000px';
    case ImageContext.FULL_SCREEN:
      return '100vw';
    default:
      return '100vw';
  }
}

/**
 * Calculate optimal image format based on browser support
 */
export function getOptimalFormat(): 'webp' | 'jpeg' | 'png' {
  if (Platform.OS === 'web') {
    // Check WebP support
    const canvas = document.createElement('canvas');
    if (canvas.getContext && canvas.getContext('2d')) {
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0 ? 'webp' : 'jpeg';
    }
  }

  // Default to JPEG for native platforms
  return 'jpeg';
}

/**
 * Get memory-efficient dimensions (prevents OOM errors)
 */
export function getMemoryEfficientDimensions(
  width: number,
  height: number,
  maxPixels: number = 4096 * 4096 // 16MP max
): { width: number; height: number } {
  const totalPixels = width * height;

  if (totalPixels <= maxPixels) {
    return { width, height };
  }

  // Scale down to fit within max pixels while maintaining aspect ratio
  const scale = Math.sqrt(maxPixels / totalPixels);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/**
 * Create responsive image configuration
 */
export interface ResponsiveImageConfig {
  width: number;
  height: number;
  quality: 'low' | 'medium' | 'high';
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

export function createResponsiveConfig(
  context: ImageContext,
  networkType: 'wifi' | 'cellular' | 'offline',
  options: {
    customWidth?: number;
    customHeight?: number;
    includeThumbnail?: boolean;
  } = {}
): ResponsiveImageConfig {
  const { customWidth, customHeight, includeThumbnail = true } = options;

  // Get base dimensions
  const dimensions = getResponsiveDimensions(context, {
    customWidth,
    customHeight,
    applyPixelRatio: true,
  });

  // Get optimal quality
  const quality = getOptimalQuality(networkType);

  // Get thumbnail dimensions
  let thumbnailDimensions;
  if (includeThumbnail) {
    thumbnailDimensions = getThumbnailDimensions(dimensions.width, dimensions.height);
  }

  // Get optimal format
  const format = getOptimalFormat();

  return {
    width: dimensions.width,
    height: dimensions.height,
    quality,
    thumbnailWidth: thumbnailDimensions?.width,
    thumbnailHeight: thumbnailDimensions?.height,
    format,
  };
}

/**
 * Export commonly used presets
 */
export const IMAGE_PRESETS = {
  productThumbnail: () => createResponsiveConfig(ImageContext.THUMBNAIL, 'wifi'),
  productCard: () => createResponsiveConfig(ImageContext.CARD_SMALL, 'wifi'),
  storeCard: () => createResponsiveConfig(ImageContext.CARD_LARGE, 'wifi'),
  productDetail: () => createResponsiveConfig(ImageContext.DETAIL, 'wifi'),
  heroBanner: () => createResponsiveConfig(ImageContext.HERO, 'wifi'),
  ugcThumbnail: () => createResponsiveConfig(ImageContext.CARD_MEDIUM, 'cellular'),
  ugcDetail: () => createResponsiveConfig(ImageContext.GALLERY, 'wifi'),
};

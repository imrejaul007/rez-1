/**
 * Image Quality Configuration
 *
 * Defines quality profiles for different image use cases
 * and network conditions
 */

import { Platform } from 'react-native';

/**
 * Image quality profile
 */
export interface ImageQualityProfile {
  width?: number;
  height?: number;
  quality: number;
  format: 'webp' | 'jpeg' | 'png' | 'auto';
  description: string;
}

/**
 * Network connection types
 */
export enum NetworkType {
  WIFI = 'wifi',
  CELLULAR_4G = '4g',
  CELLULAR_3G = '3g',
  CELLULAR_2G = '2g',
  SLOW = 'slow',
  OFFLINE = 'offline',
}

/**
 * Image usage contexts
 */
export enum ImageContext {
  THUMBNAIL = 'thumbnail',
  CARD = 'card',
  DETAIL = 'detail',
  HERO = 'hero',
  AVATAR = 'avatar',
  ICON = 'icon',
  BANNER = 'banner',
  GALLERY = 'gallery',
  PREVIEW = 'preview',
}

/**
 * Base quality profiles for different contexts
 */
export const IMAGE_QUALITY_PROFILES: Record<ImageContext, ImageQualityProfile> = {
  [ImageContext.THUMBNAIL]: {
    width: 150,
    height: 150,
    quality: 70,
    format: 'webp',
    description: 'Small thumbnail images for lists and grids',
  },
  [ImageContext.CARD]: {
    width: 300,
    height: 300,
    quality: 80,
    format: 'webp',
    description: 'Card images for product cards and listings',
  },
  [ImageContext.DETAIL]: {
    width: 800,
    height: 800,
    quality: 85,
    format: 'webp',
    description: 'High quality detail images for product pages',
  },
  [ImageContext.HERO]: {
    width: 1200,
    height: 600,
    quality: 90,
    format: 'webp',
    description: 'Full-width hero images and banners',
  },
  [ImageContext.AVATAR]: {
    width: 100,
    height: 100,
    quality: 80,
    format: 'webp',
    description: 'User avatar images',
  },
  [ImageContext.ICON]: {
    width: 48,
    height: 48,
    quality: 80,
    format: 'png',
    description: 'Small icon images',
  },
  [ImageContext.BANNER]: {
    width: 1080,
    height: 400,
    quality: 85,
    format: 'webp',
    description: 'Wide banner images',
  },
  [ImageContext.GALLERY]: {
    width: 1024,
    height: 1024,
    quality: 85,
    format: 'webp',
    description: 'Gallery images with zoom capability',
  },
  [ImageContext.PREVIEW]: {
    width: 50,
    height: 50,
    quality: 50,
    format: 'webp',
    description: 'Tiny preview/blur-up placeholder images',
  },
};

/**
 * Network-specific quality adjustments
 */
export const NETWORK_QUALITY_ADJUSTMENTS: Record<NetworkType, {
  qualityMultiplier: number;
  sizeMultiplier: number;
  enableWebP: boolean;
}> = {
  [NetworkType.WIFI]: {
    qualityMultiplier: 1.0,
    sizeMultiplier: 1.0,
    enableWebP: true,
  },
  [NetworkType.CELLULAR_4G]: {
    qualityMultiplier: 0.95,
    sizeMultiplier: 0.9,
    enableWebP: true,
  },
  [NetworkType.CELLULAR_3G]: {
    qualityMultiplier: 0.85,
    sizeMultiplier: 0.7,
    enableWebP: true,
  },
  [NetworkType.CELLULAR_2G]: {
    qualityMultiplier: 0.7,
    sizeMultiplier: 0.5,
    enableWebP: true,
  },
  [NetworkType.SLOW]: {
    qualityMultiplier: 0.6,
    sizeMultiplier: 0.4,
    enableWebP: true,
  },
  [NetworkType.OFFLINE]: {
    qualityMultiplier: 1.0,
    sizeMultiplier: 1.0,
    enableWebP: true,
  },
};

/**
 * WebP support detection
 */
export const detectWebPSupport = (): boolean => {
  // Web: Check browser support
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      // Check if canvas supports WebP
      const canvas = document.createElement('canvas');
      if (canvas.getContext && canvas.getContext('2d')) {
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      }
    }
    return false;
  }

  // iOS: WebP supported in iOS 14+
  if (Platform.OS === 'ios') {
    const version = parseInt(Platform.Version as string, 10);
    return version >= 14;
  }

  // Android: WebP supported in Android 4.0+
  if (Platform.OS === 'android') {
    return Platform.Version >= 14; // API level 14 = Android 4.0
  }

  return false;
};

/**
 * Get optimal image quality profile
 */
export const getImageQualityProfile = (
  context: ImageContext,
  networkType: NetworkType = NetworkType.WIFI,
  devicePixelRatio: number = 1
): ImageQualityProfile => {
  const baseProfile = IMAGE_QUALITY_PROFILES[context];
  const networkAdjustment = NETWORK_QUALITY_ADJUSTMENTS[networkType];
  const supportsWebP = detectWebPSupport();

  // Calculate adjusted dimensions
  const dprMultiplier = Math.min(devicePixelRatio, 2); // Cap at 2x
  const width = baseProfile.width
    ? Math.round(baseProfile.width * networkAdjustment.sizeMultiplier * dprMultiplier)
    : undefined;
  const height = baseProfile.height
    ? Math.round(baseProfile.height * networkAdjustment.sizeMultiplier * dprMultiplier)
    : undefined;

  // Calculate adjusted quality
  const quality = Math.round(baseProfile.quality * networkAdjustment.qualityMultiplier);

  // Determine format
  let format: 'webp' | 'jpeg' | 'png' | 'auto' = baseProfile.format;
  if (format === 'webp' && !supportsWebP) {
    format = 'jpeg'; // Fallback to JPEG if WebP not supported
  } else if (format === 'auto') {
    format = supportsWebP && networkAdjustment.enableWebP ? 'webp' : 'jpeg';
  }

  return {
    width,
    height,
    quality,
    format,
    description: baseProfile.description,
  };
};

/**
 * Generate image URL with optimization parameters
 */
export const getOptimizedImageUrl = (
  originalUrl: string,
  options: {
    context?: ImageContext;
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png' | 'auto';
    networkType?: NetworkType;
    dpr?: number;
  }
): string => {
  const {
    context,
    width,
    height,
    quality,
    format,
    networkType = NetworkType.WIFI,
    dpr = 1,
  } = options;

  // Get profile if context provided
  let profile: Partial<ImageQualityProfile> = {};
  if (context) {
    profile = getImageQualityProfile(context, networkType, dpr);
  }

  // Override with explicit parameters
  const finalWidth = width || profile.width;
  const finalHeight = height || profile.height;
  const finalQuality = quality || profile.quality || 80;
  const finalFormat = format || profile.format || 'auto';

  // Cloudinary URL transformation
  if (originalUrl.includes('cloudinary.com')) {
    return transformCloudinaryUrl(originalUrl, {
      width: finalWidth,
      height: finalHeight,
      quality: finalQuality,
      format: finalFormat,
      dpr,
    });
  }

  // Imgix URL transformation
  if (originalUrl.includes('imgix.net')) {
    return transformImgixUrl(originalUrl, {
      width: finalWidth,
      height: finalHeight,
      quality: finalQuality,
      format: finalFormat,
      dpr,
    });
  }

  // Generic URL with query parameters (may not work for all services)
  const url = new URL(originalUrl);
  if (finalWidth) url.searchParams.set('w', finalWidth.toString());
  if (finalHeight) url.searchParams.set('h', finalHeight.toString());
  if (finalQuality) url.searchParams.set('q', finalQuality.toString());
  if (finalFormat && finalFormat !== 'auto') url.searchParams.set('fm', finalFormat);
  if (dpr > 1) url.searchParams.set('dpr', Math.min(dpr, 2).toString());

  return url.toString();
};

/**
 * Transform Cloudinary URL
 */
const transformCloudinaryUrl = (
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
    dpr?: number;
  }
): string => {
  const { width, height, quality, format, dpr } = options;

  const params: string[] = [];

  // Quality
  if (quality) params.push(`q_${quality}`);

  // Dimensions
  if (width) params.push(`w_${width}`);
  if (height) params.push(`h_${height}`);

  // DPR
  if (dpr && dpr > 1) params.push(`dpr_${Math.min(dpr, 2).toFixed(1)}`);

  // Format
  if (format && format !== 'auto') {
    params.push(`f_${format}`);
  } else {
    params.push('f_auto');
  }

  // Crop mode
  params.push('c_fill');

  // Gravity (smart crop)
  params.push('g_auto');

  const transformation = params.join(',');

  // Insert transformation before /upload/
  return url.replace('/upload/', `/upload/${transformation}/`);
};

/**
 * Transform Imgix URL
 */
const transformImgixUrl = (
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
    dpr?: number;
  }
): string => {
  const { width, height, quality, format, dpr } = options;

  const urlObj = new URL(url);

  // Dimensions
  if (width) urlObj.searchParams.set('w', width.toString());
  if (height) urlObj.searchParams.set('h', height.toString());

  // Quality
  if (quality) urlObj.searchParams.set('q', quality.toString());

  // Format
  if (format && format !== 'auto') {
    urlObj.searchParams.set('fm', format);
  } else {
    urlObj.searchParams.set('auto', 'format,compress');
  }

  // DPR
  if (dpr && dpr > 1) urlObj.searchParams.set('dpr', Math.min(dpr, 2).toString());

  // Fit mode
  urlObj.searchParams.set('fit', 'crop');

  return urlObj.toString();
};

/**
 * Generate srcset for responsive images (web only)
 */
export const generateSrcSet = (
  baseUrl: string,
  context: ImageContext,
  sizes: number[] = [1, 1.5, 2]
): string => {
  if (Platform.OS !== 'web') return '';

  const srcsets = sizes.map(multiplier => {
    const profile = getImageQualityProfile(context, NetworkType.WIFI, multiplier);
    const url = getOptimizedImageUrl(baseUrl, {
      context,
      dpr: multiplier,
    });
    return `${url} ${multiplier}x`;
  });

  return srcsets.join(', ');
};

/**
 * Get blur placeholder URL
 */
export const getBlurPlaceholderUrl = (
  originalUrl: string,
  blurRadius: number = 20
): string => {
  return getOptimizedImageUrl(originalUrl, {
    context: ImageContext.PREVIEW,
    quality: 30,
  });
};

/**
 * Image format recommendations by content type
 */
export const IMAGE_FORMAT_RECOMMENDATIONS = {
  photo: 'webp',          // Photos should use WebP or JPEG
  illustration: 'webp',   // Illustrations work well with WebP
  logo: 'png',            // Logos need transparency
  icon: 'png',            // Icons need transparency
  screenshot: 'webp',     // Screenshots compress well with WebP
  diagram: 'png',         // Diagrams benefit from lossless PNG
} as const;

/**
 * Recommended image sizes by context
 */
export const RECOMMENDED_IMAGE_SIZES: Record<ImageContext, {
  min: { width: number; height: number };
  recommended: { width: number; height: number };
  max: { width: number; height: number };
}> = {
  [ImageContext.THUMBNAIL]: {
    min: { width: 100, height: 100 },
    recommended: { width: 150, height: 150 },
    max: { width: 200, height: 200 },
  },
  [ImageContext.CARD]: {
    min: { width: 200, height: 200 },
    recommended: { width: 300, height: 300 },
    max: { width: 400, height: 400 },
  },
  [ImageContext.DETAIL]: {
    min: { width: 600, height: 600 },
    recommended: { width: 800, height: 800 },
    max: { width: 1200, height: 1200 },
  },
  [ImageContext.HERO]: {
    min: { width: 800, height: 400 },
    recommended: { width: 1200, height: 600 },
    max: { width: 1920, height: 1080 },
  },
  [ImageContext.AVATAR]: {
    min: { width: 64, height: 64 },
    recommended: { width: 100, height: 100 },
    max: { width: 200, height: 200 },
  },
  [ImageContext.ICON]: {
    min: { width: 24, height: 24 },
    recommended: { width: 48, height: 48 },
    max: { width: 96, height: 96 },
  },
  [ImageContext.BANNER]: {
    min: { width: 800, height: 300 },
    recommended: { width: 1080, height: 400 },
    max: { width: 1920, height: 600 },
  },
  [ImageContext.GALLERY]: {
    min: { width: 800, height: 800 },
    recommended: { width: 1024, height: 1024 },
    max: { width: 2048, height: 2048 },
  },
  [ImageContext.PREVIEW]: {
    min: { width: 20, height: 20 },
    recommended: { width: 50, height: 50 },
    max: { width: 100, height: 100 },
  },
};

/**
 * Export configuration
 */
export const IMAGE_OPTIMIZATION_CONFIG = {
  profiles: IMAGE_QUALITY_PROFILES,
  networkAdjustments: NETWORK_QUALITY_ADJUSTMENTS,
  formatRecommendations: IMAGE_FORMAT_RECOMMENDATIONS,
  recommendedSizes: RECOMMENDED_IMAGE_SIZES,
};

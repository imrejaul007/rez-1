import { logger } from '../config/logger';
/**
 * Image Processing Service
 *
 * Pre-processes images locally using Sharp before uploading to Cloudinary.
 * Benefits:
 * - Reduces upload bandwidth (smaller optimized files)
 * - Generates multiple sizes in one pass (thumb, medium, large)
 * - Converts to WebP for better compression
 * - Strips EXIF metadata (privacy + smaller files)
 * - Provides consistent quality across all uploads
 *
 * Falls back gracefully if Sharp is unavailable.
 */

import * as fs from 'fs';
import * as path from 'path';

let sharp: any;
let sharpAvailable = false;

try {
  sharp = require('sharp');
  sharpAvailable = true;
  logger.info('✅ [IMAGE] Sharp available for image processing');
} catch {
  logger.warn('⚠️ [IMAGE] Sharp not available - images will be uploaded without local processing');
}

export interface ImageVariant {
  suffix: string;
  width: number;
  height?: number;
  quality: number;
  fit: 'cover' | 'inside' | 'contain' | 'fill';
}

export interface ProcessedImage {
  originalPath: string;
  variants: {
    name: string;
    path: string;
    width: number;
    height: number;
    size: number;
    format: string;
  }[];
}

// Standard image size presets
const IMAGE_PRESETS = {
  product: [
    { suffix: 'large', width: 800, height: 800, quality: 85, fit: 'cover' as const },
    { suffix: 'medium', width: 400, height: 400, quality: 80, fit: 'cover' as const },
    { suffix: 'thumb', width: 150, height: 150, quality: 75, fit: 'cover' as const },
  ],
  storeLogo: [
    { suffix: 'large', width: 400, height: 400, quality: 90, fit: 'inside' as const },
    { suffix: 'thumb', width: 100, height: 100, quality: 80, fit: 'cover' as const },
  ],
  storeBanner: [
    { suffix: 'large', width: 1200, height: 400, quality: 85, fit: 'cover' as const },
    { suffix: 'medium', width: 600, height: 200, quality: 80, fit: 'cover' as const },
  ],
  gallery: [
    { suffix: 'large', width: 1200, height: 800, quality: 85, fit: 'inside' as const },
    { suffix: 'medium', width: 600, height: 400, quality: 80, fit: 'inside' as const },
    { suffix: 'thumb', width: 200, height: 200, quality: 75, fit: 'cover' as const },
  ],
  profile: [
    { suffix: 'large', width: 400, height: 400, quality: 90, fit: 'cover' as const },
    { suffix: 'thumb', width: 100, height: 100, quality: 80, fit: 'cover' as const },
  ],
};

export class ImageProcessingService {
  /**
   * Check if Sharp is available for image processing
   */
  static isAvailable(): boolean {
    return sharpAvailable;
  }

  /**
   * Optimize a single image (resize, convert to WebP, strip metadata)
   * Returns the path to the optimized file
   */
  static async optimizeImage(
    inputPath: string,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: 'webp' | 'jpeg' | 'png';
      stripMetadata?: boolean;
    } = {}
  ): Promise<string> {
    if (!sharpAvailable) return inputPath;

    const {
      maxWidth = 1200,
      maxHeight = 1200,
      quality = 85,
      format = 'webp',
      stripMetadata = true,
    } = options;

    const ext = format === 'webp' ? '.webp' : format === 'png' ? '.png' : '.jpg';
    const outputPath = inputPath.replace(/\.[^.]+$/, `_optimized${ext}`);

    try {
      let pipeline = sharp(inputPath);

      // Strip EXIF/metadata
      if (stripMetadata) {
        pipeline = pipeline.rotate(); // Auto-rotate based on EXIF, then strip
      }

      // Resize to fit within bounds (preserving aspect ratio)
      pipeline = pipeline.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });

      // Convert to target format
      if (format === 'webp') {
        pipeline = pipeline.webp({ quality });
      } else if (format === 'jpeg') {
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      } else if (format === 'png') {
        pipeline = pipeline.png({ quality });
      }

      await pipeline.toFile(outputPath);
      return outputPath;
    } catch (error) {
      logger.warn(`⚠️ [IMAGE] Optimization failed for ${inputPath}, using original:`, error);
      return inputPath;
    }
  }

  /**
   * Generate multiple size variants of an image
   */
  static async generateVariants(
    inputPath: string,
    preset: keyof typeof IMAGE_PRESETS
  ): Promise<ProcessedImage> {
    const variants: ProcessedImage['variants'] = [];

    if (!sharpAvailable) {
      return { originalPath: inputPath, variants };
    }

    const sizes = IMAGE_PRESETS[preset] || IMAGE_PRESETS.product;
    const dir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, path.extname(inputPath));

    for (const size of sizes) {
      const outputPath = path.join(dir, `${baseName}_${size.suffix}.webp`);

      try {
        const result = await sharp(inputPath)
          .rotate() // Auto-rotate from EXIF
          .resize(size.width, size.height || size.width, {
            fit: size.fit,
            withoutEnlargement: true,
          })
          .webp({ quality: size.quality })
          .toFile(outputPath);

        variants.push({
          name: size.suffix,
          path: outputPath,
          width: result.width,
          height: result.height,
          size: result.size,
          format: 'webp',
        });
      } catch (error) {
        logger.warn(`⚠️ [IMAGE] Failed to generate ${size.suffix} variant:`, error);
      }
    }

    return { originalPath: inputPath, variants };
  }

  /**
   * Process an image before Cloudinary upload
   * Optimizes the original and returns the path to the optimized version
   */
  static async processForUpload(
    inputPath: string,
    type: 'product' | 'storeLogo' | 'storeBanner' | 'gallery' | 'profile' = 'product'
  ): Promise<string> {
    if (!sharpAvailable) return inputPath;

    // Get the largest size from the preset as the upload target
    const presets = IMAGE_PRESETS[type] || IMAGE_PRESETS.product;
    const largest = presets[0]; // First preset is always the largest

    try {
      const optimizedPath = await this.optimizeImage(inputPath, {
        maxWidth: largest.width,
        maxHeight: largest.height || largest.width,
        quality: largest.quality,
        format: 'webp',
        stripMetadata: true,
      });

      // Log size reduction
      const originalSize = fs.statSync(inputPath).size;
      const optimizedSize = fs.statSync(optimizedPath).size;
      const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
      logger.info(`📦 [IMAGE] Optimized: ${(originalSize / 1024).toFixed(0)}KB → ${(optimizedSize / 1024).toFixed(0)}KB (${reduction}% reduction)`);

      return optimizedPath;
    } catch (error) {
      logger.warn('⚠️ [IMAGE] processForUpload failed, using original:', error);
      return inputPath;
    }
  }

  /**
   * Clean up temporary processed files
   */
  static cleanupVariants(processed: ProcessedImage): void {
    for (const variant of processed.variants) {
      try {
        if (fs.existsSync(variant.path)) {
          fs.unlinkSync(variant.path);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Clean up a single optimized file
   */
  static cleanup(filePath: string, originalPath: string): void {
    // Only delete if it's a different file from the original
    if (filePath !== originalPath) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Get image metadata (dimensions, format, size)
   */
  static async getMetadata(inputPath: string): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
  } | null> {
    if (!sharpAvailable) return null;

    try {
      const metadata = await sharp(inputPath).metadata();
      const stats = fs.statSync(inputPath);
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: stats.size,
      };
    } catch {
      return null;
    }
  }
}

export default ImageProcessingService;

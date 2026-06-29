import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import fs from 'fs';
import { logger } from '../config/logger';
import { cloudinaryCircuit } from './circuitBreaker';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

// Default Cloudinary upload timeout (30s). Override via CLOUDINARY_UPLOAD_TIMEOUT_MS.
const CLOUDINARY_UPLOAD_TIMEOUT_MS = parseInt(process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS || '30000', 10);

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`[CLOUDINARY] ${label} timed out after ${ms}ms`)), ms);
    if (timer && typeof (timer as any).unref === 'function') (timer as any).unref();
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Result type with fallback tracking
 */
export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  thumbnailUrl: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  isPlaceholder?: boolean;
  fallbackReason?: string;
  circuitState?: string;
}

/**
 * Validate Cloudinary configuration
 */
export function validateCloudinaryConfig(): boolean {
  const { cloud_name, api_key, api_secret } = cloudinary.config();

  if (!cloud_name || !api_key || !api_secret) {
    logger.error('❌ Cloudinary configuration missing. Please set environment variables:');
    logger.error('   - CLOUDINARY_CLOUD_NAME');
    logger.error('   - CLOUDINARY_API_KEY');
    logger.error('   - CLOUDINARY_API_SECRET');
    return false;
  }

  logger.info('✅ Cloudinary configured successfully');
  return true;
}

/**
 * Upload image to Cloudinary with circuit breaker and fallback.
 * @param filePath - Local file path or buffer
 * @param folder - Cloudinary folder (default: bills)
 * @param options - Additional upload options
 * @param options.disableFallback - If true, throws on failure instead of fallback
 */
export async function uploadToCloudinary(
  filePath: string | Buffer,
  folder: string = 'bills',
  options: { disableFallback?: boolean; [key: string]: any } = {},
): Promise<CloudinaryUploadResult> {
  const { disableFallback, ...uploadOptions } = options;
  const circuitState = cloudinaryCircuit.getState();

  const mergedOptions: Record<string, unknown> = {
    folder: `rez/${folder}`,
    resource_type: 'auto' as const,
    transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
    ...uploadOptions,
  };

  try {
    const result = await cloudinaryCircuit.execute(
      async () =>
        withTimeout(
          cloudinary.uploader.upload(
            typeof filePath === 'string' ? filePath : `data:image/jpeg;base64,${filePath.toString('base64')}`,
            mergedOptions,
          ),
          CLOUDINARY_UPLOAD_TIMEOUT_MS,
          `uploader.upload(${typeof filePath === 'string' ? filePath : 'buffer'})`,
        ),
      // Fallback: return placeholder
      () => ({
        public_id: '',
        url: '',
        secure_url: '',
        format: '',
        width: 0,
        height: 0,
        bytes: 0,
        isPlaceholder: true,
      }),
    );

    // Generate thumbnail URL
    const thumbnailUrl = result.public_id
      ? cloudinary.url(result.public_id, {
          width: 300,
          height: 300,
          crop: 'fill',
          quality: 'auto',
          format: 'jpg',
        })
      : '';

    if (result.isPlaceholder) {
      logger.warn('[CloudinaryUtils] Circuit open or upload failed - returning placeholder', {
        fallbackReason: result.fallbackReason,
        circuitState,
      });
      return {
        url: '',
        secureUrl: '',
        publicId: '',
        thumbnailUrl,
        format: '',
        width: 0,
        height: 0,
        bytes: 0,
        isPlaceholder: true,
        fallbackReason: 'circuit_open_or_upload_error',
        circuitState,
      };
    }

    return {
      url: result.url,
      secureUrl: result.secure_url,
      publicId: result.public_id,
      thumbnailUrl,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      isPlaceholder: false,
    };
  } catch (error: any) {
    const errorMessage = error.message || String(error);

    if (disableFallback) {
      throw new Error(`Failed to upload to Cloudinary: ${errorMessage}`);
    }

    logger.error('[CloudinaryUtils] Upload error - returning placeholder', {
      error: errorMessage,
      circuitState,
    });

    // Return placeholder so operations aren't blocked
    return {
      url: '',
      secureUrl: '',
      publicId: '',
      thumbnailUrl: '',
      format: '',
      width: 0,
      height: 0,
      bytes: 0,
      isPlaceholder: true,
      fallbackReason: `upload_error: ${errorMessage}`,
      circuitState,
    };
  }
}

/**
 * Delete image from Cloudinary
 * @param publicId - Cloudinary public ID
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error: any) {
    logger.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete from Cloudinary: ${error.message}`);
  }
}

/**
 * Upload multiple images to Cloudinary with circuit breaker and fallback.
 * Individual failures return placeholders instead of failing the batch.
 * @param filePaths - Array of file paths
 * @param folder - Cloudinary folder
 */
export async function uploadMultipleToCloudinary(
  filePaths: string[],
  folder: string = 'bills',
): Promise<CloudinaryUploadResult[]> {
  const results = await Promise.all(filePaths.map((filePath) => uploadToCloudinary(filePath, folder)));

  const successCount = results.filter((r) => !r.isPlaceholder).length;
  logger.info('[CloudinaryUtils] Batch upload completed', {
    total: filePaths.length,
    successful: successCount,
    placeholders: filePaths.length - successCount,
  });

  return results;
}

/**
 * Get circuit breaker state for health checks
 */
export function getCloudinaryCircuitState(): { state: string; stats: any } {
  const stats = cloudinaryCircuit.getStats();
  return {
    state: cloudinaryCircuit.getState(),
    stats,
  };
}

/**
 * Get optimized image URL
 * @param publicId - Cloudinary public ID
 * @param options - Transformation options
 */
export function getOptimizedImageUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
    format?: string;
  } = {},
): string {
  return cloudinary.url(publicId, {
    width: options.width || 800,
    height: options.height || 800,
    crop: options.crop || 'limit',
    quality: options.quality || 'auto',
    format: options.format || 'jpg',
    fetch_format: 'auto',
  });
}

export default {
  validateCloudinaryConfig,
  uploadToCloudinary,
  deleteFromCloudinary,
  uploadMultipleToCloudinary,
  getOptimizedImageUrl,
};

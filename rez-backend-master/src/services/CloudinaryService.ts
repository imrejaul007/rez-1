import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as fs from 'fs';
import { ImageProcessingService } from './ImageProcessingService';
import { logger } from '../config/logger';
import { cloudinaryCircuit } from '../utils/circuitBreaker';
import { publishMediaEvent } from '../events/mediaQueue';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Default Cloudinary upload timeout (30s). The cloudinary SDK does not
// expose a `timeout` option directly, so we wrap with Promise.race.
// Override with CLOUDINARY_UPLOAD_TIMEOUT_MS env var.
const CLOUDINARY_UPLOAD_TIMEOUT_MS = parseInt(process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS || '30000', 10);

/**
 * Race a promise against a timeout.
 */
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
 * Upload result with fallback tracking.
 * When upload fails or circuit is open, returns placeholder info
 * so user operations are not blocked.
 */
export interface CloudinaryUploadResult extends Partial<UploadApiResponse> {
  /** Flag indicating this is a fallback/placeholder response */
  isPlaceholder?: boolean;
  /** Original local file path (for retry queue) */
  localPath?: string;
  /** Reason for fallback (circuit_open, upload_error, timeout) */
  fallbackReason?: string;
  /** Circuit state at time of fallback */
  circuitState?: string;
  /** Timestamp when fallback was triggered */
  fallbackTimestamp?: number;
}

export interface CloudinaryUploadOptions {
  folder?: string;
  width?: number;
  height?: number;
  crop?: string;
  quality?: string | number;
  format?: string;
  transformation?: any[];
}

export class CloudinaryService {
  /**
   * Upload a single file to Cloudinary with circuit breaker and fallback.
   *
   * When circuit breaker is open or upload fails:
   * - Returns a placeholder response (doesn't block user operations)
   * - Queues the file for retry via mediaQueue
   * - Logs the fallback for monitoring
   *
   * @param filePath - Local file path to upload
   * @param options - Cloudinary upload options
   * @param options.disableFallback - If true, throws on failure instead of fallback
   * @returns CloudinaryUploadResult with cloud URL or placeholder
   */
  static async uploadFile(
    filePath: string,
    options: CloudinaryUploadOptions & { disableFallback?: boolean } = {},
  ): Promise<CloudinaryUploadResult> {
    const { disableFallback, ...uploadOptions } = options;
    const circuitState = cloudinaryCircuit.getState();
    const fallbackReason: string[] = [];

    const defaultOptions = {
      folder: uploadOptions.folder || 'merchant-uploads',
      quality: uploadOptions.quality || 'auto',
      fetch_format: 'auto',
      ...uploadOptions,
    };

    // Define the upload function
    const doUpload = async (): Promise<CloudinaryUploadResult> => {
      const result = await cloudinaryCircuit.execute<CloudinaryUploadResult>(
        async () =>
          withTimeout(
            cloudinary.uploader.upload(filePath, defaultOptions),
            CLOUDINARY_UPLOAD_TIMEOUT_MS,
            `uploader.upload(${filePath})`,
          ),
        // Fallback: return placeholder response when circuit is open
        () =>
          ({
            secure_url: '',
            public_id: '',
            url: '',
            isPlaceholder: true,
            localPath: filePath,
          }) as CloudinaryUploadResult,
      );

      // Delete local file after successful upload
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      logger.info('[CLOUDINARY] Uploaded to Cloudinary', { url: result.secure_url });
      return result;
    };

    try {
      const result = await doUpload();

      // If we got a placeholder response, queue for retry
      if (result.isPlaceholder && result.localPath) {
        fallbackReason.push('circuit_open');
        logger.warn('[CLOUDINARY] Circuit open - file queued for retry', {
          filePath: result.localPath,
          circuitState,
        });

        // Queue for async retry via media queue
        try {
          await publishMediaEvent({
            eventId: `retry-upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            operation: 'retry-upload',
            localPath: result.localPath,
            folder: defaultOptions.folder as string,
            source: 'cloudinary-circuit-breaker',
            createdAt: new Date().toISOString(),
          });
        } catch (queueError) {
          logger.error('[CLOUDINARY] Failed to queue retry event', { error: (queueError as Error).message });
        }

        return {
          ...result,
          fallbackReason: fallbackReason.join(','),
          circuitState,
          fallbackTimestamp: Date.now(),
        };
      }

      return result;
    } catch (error: any) {
      const errorMessage = error.message || String(error);

      if (disableFallback) {
        throw new Error(`Failed to upload to Cloudinary: ${errorMessage}`);
      }

      // Log the failure and return placeholder
      logger.error('[CLOUDINARY] Upload failed - using fallback', {
        error: errorMessage,
        circuitState,
        filePath,
      });

      fallbackReason.push('upload_error');
      const stats = cloudinaryCircuit.getStats();
      logger.warn('[CLOUDINARY] Circuit stats', {
        failures: stats.consecutiveFailures,
        failureRate: stats.failureRate?.toFixed(2),
      });

      // Return a placeholder response so user operations aren't blocked
      return {
        secure_url: '',
        public_id: '',
        url: '',
        isPlaceholder: true,
        localPath: filePath,
        fallbackReason: fallbackReason.join(','),
        circuitState,
        fallbackTimestamp: Date.now(),
      };
    }
  }

  /**
   * Upload multiple files with fallback support.
   * Individual file failures return placeholders rather than failing the batch.
   */
  static async uploadMultipleFiles(
    filePaths: string[],
    options: CloudinaryUploadOptions & { disableFallback?: boolean } = {},
  ): Promise<CloudinaryUploadResult[]> {
    const results = await Promise.all(filePaths.map((filePath) => this.uploadFile(filePath, options)));

    const successCount = results.filter((r) => !r.isPlaceholder).length;
    logger.info('[CLOUDINARY] Batch upload completed', {
      total: filePaths.length,
      successful: successCount,
      placeholders: filePaths.length - successCount,
    });

    return results;
  }

  /**
   * Upload product image with optimization
   */
  static async uploadProductImage(
    filePath: string,
    merchantId: string,
    productId?: string,
  ): Promise<CloudinaryUploadResult> {
    const folder = `merchants/${merchantId}/products${productId ? `/${productId}` : ''}`;

    // Pre-process with Sharp before Cloudinary upload
    const optimizedPath = await ImageProcessingService.processForUpload(filePath, 'product');

    try {
      const result = await this.uploadFile(optimizedPath, {
        folder,
        width: 800,
        height: 800,
        crop: 'fill',
        quality: 'auto',
        transformation: [{ width: 800, height: 800, crop: 'fill' }, { quality: 'auto' }, { fetch_format: 'auto' }],
      });
      return result;
    } finally {
      ImageProcessingService.cleanup(optimizedPath, filePath);
    }
  }

  /**
   * Upload product thumbnail
   */
  static async uploadProductThumbnail(
    filePath: string,
    merchantId: string,
    productId?: string,
  ): Promise<CloudinaryUploadResult> {
    const folder = `merchants/${merchantId}/products${productId ? `/${productId}` : ''}/thumbnails`;

    return this.uploadFile(filePath, {
      folder,
      width: 300,
      height: 300,
      crop: 'fill',
      quality: 80,
    });
  }

  /**
   * Upload store logo
   */
  static async uploadStoreLogo(filePath: string, merchantId: string): Promise<CloudinaryUploadResult> {
    const folder = `merchants/${merchantId}/store/logo`;

    const optimizedPath = await ImageProcessingService.processForUpload(filePath, 'storeLogo');

    try {
      return await this.uploadFile(optimizedPath, {
        folder,
        quality: 'auto',
      });
    } finally {
      ImageProcessingService.cleanup(optimizedPath, filePath);
    }
  }

  /**
   * Upload store banner
   */
  static async uploadStoreBanner(filePath: string, merchantId: string): Promise<CloudinaryUploadResult> {
    const folder = `merchants/${merchantId}/store/banner`;

    const optimizedPath = await ImageProcessingService.processForUpload(filePath, 'storeBanner');

    try {
      return await this.uploadFile(optimizedPath, {
        folder,
        quality: 'auto',
      });
    } finally {
      ImageProcessingService.cleanup(optimizedPath, filePath);
    }
  }

  /**
   * Upload video with circuit breaker and fallback.
   * Videos are larger and may take longer, so we use the configured timeout.
   */
  static async uploadVideo(
    filePath: string,
    merchantId: string,
    resourceType: 'product' | 'store' = 'product',
    options: { disableFallback?: boolean } = {},
  ): Promise<CloudinaryUploadResult> {
    const folder = `merchants/${merchantId}/${resourceType}/videos`;
    const circuitState = cloudinaryCircuit.getState();

    try {
      const result = await cloudinaryCircuit.execute<CloudinaryUploadResult>(
        async () =>
          withTimeout(
            cloudinary.uploader.upload(filePath, {
              folder,
              resource_type: 'video',
              quality: 'auto',
            }),
            CLOUDINARY_UPLOAD_TIMEOUT_MS,
            `uploader.upload_video(${filePath})`,
          ),
        () =>
          ({
            secure_url: '',
            public_id: '',
            url: '',
            isPlaceholder: true,
            localPath: filePath,
          }) as CloudinaryUploadResult,
      );

      // Delete local file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      logger.info('[CLOUDINARY] Uploaded video to Cloudinary', { url: result.secure_url });
      return result;
    } catch (error: any) {
      const errorMessage = error.message || String(error);

      if (options.disableFallback) {
        throw new Error(`Failed to upload video: ${errorMessage}`);
      }

      logger.error('[CLOUDINARY] Video upload failed - using fallback', {
        error: errorMessage,
        circuitState,
        filePath,
      });

      return {
        secure_url: '',
        public_id: '',
        url: '',
        isPlaceholder: true,
        localPath: filePath,
        fallbackReason: 'upload_error',
        circuitState,
        fallbackTimestamp: Date.now(),
      };
    }
  }

  /**
   * Upload store gallery image
   */
  static async uploadStoreGalleryImage(
    filePath: string,
    merchantId: string,
    storeId: string,
  ): Promise<CloudinaryUploadResult> {
    const folder = `merchants/${merchantId}/stores/${storeId}/gallery/images`;

    const optimizedPath = await ImageProcessingService.processForUpload(filePath, 'gallery');

    try {
      return await this.uploadFile(optimizedPath, {
        folder,
        width: 1200,
        height: 800,
        crop: 'limit',
        quality: 'auto',
      });
    } finally {
      ImageProcessingService.cleanup(optimizedPath, filePath);
    }
  }

  /**
   * Upload store gallery video with circuit breaker and fallback.
   */
  static async uploadStoreGalleryVideo(
    filePath: string,
    merchantId: string,
    storeId: string,
    options: { disableFallback?: boolean } = {},
  ): Promise<CloudinaryUploadResult> {
    const folder = `merchants/${merchantId}/stores/${storeId}/gallery/videos`;
    const circuitState = cloudinaryCircuit.getState();

    try {
      const result = await cloudinaryCircuit.execute<CloudinaryUploadResult>(
        async () =>
          withTimeout(
            cloudinary.uploader.upload(filePath, {
              folder,
              resource_type: 'video',
              quality: 'auto',
            }),
            CLOUDINARY_UPLOAD_TIMEOUT_MS,
            `uploader.upload_video(${filePath})`,
          ),
        () =>
          ({
            secure_url: '',
            public_id: '',
            url: '',
            isPlaceholder: true,
            localPath: filePath,
          }) as CloudinaryUploadResult,
      );

      // Delete local file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return result;
    } catch (error: any) {
      const errorMessage = error.message || String(error);

      if (options.disableFallback) {
        throw new Error(`Failed to upload gallery video: ${errorMessage}`);
      }

      logger.error('[CLOUDINARY] Gallery video upload failed - using fallback', {
        error: errorMessage,
        circuitState,
        filePath,
      });

      return {
        secure_url: '',
        public_id: '',
        url: '',
        isPlaceholder: true,
        localPath: filePath,
        fallbackReason: 'upload_error',
        circuitState,
        fallbackTimestamp: Date.now(),
      };
    }
  }

  /**
   * Generate thumbnail for video
   */
  static generateVideoThumbnail(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      time?: string | number; // Time in seconds or format like "00:00:01"
    } = {},
  ): string {
    const { width = 400, height = 300, time = 1 } = options;

    return cloudinary.url(publicId, {
      resource_type: 'video',
      transformation: [
        {
          width,
          height,
          crop: 'fill',
          quality: 'auto',
          start_offset: typeof time === 'number' ? time.toString() : time,
        },
        {
          format: 'jpg',
        },
      ],
    });
  }

  /**
   * Delete file from Cloudinary
   */
  static async deleteFile(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      logger.info('[CLOUDINARY] Deleted from Cloudinary', { publicId });
      return result;
    } catch (error: any) {
      logger.error('[CLOUDINARY] Delete error', { error: error.message });
      throw new Error(`Failed to delete from Cloudinary: ${error.message}`);
    }
  }

  /**
   * Delete video from Cloudinary
   */
  static async deleteVideo(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'video',
      });
      logger.info('[CLOUDINARY] Deleted video from Cloudinary', { publicId });
      return result;
    } catch (error: any) {
      logger.error('[CLOUDINARY] Video delete error', { error: error.message });
      throw new Error(`Failed to delete video: ${error.message}`);
    }
  }

  /**
   * Extract public ID from Cloudinary URL
   */
  static getPublicIdFromUrl(url: string): string {
    // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/merchants/123/products/image.jpg
    const parts = url.split('/upload/');
    if (parts.length < 2) return '';

    const pathParts = parts[1].split('/');
    pathParts.shift(); // Remove version

    const publicId = pathParts.join('/').split('.')[0];
    return publicId;
  }

  /**
   * Check if Cloudinary is configured
   */
  static isConfigured(): boolean {
    return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  }

  /**
   * Get circuit breaker state for monitoring
   */
  static getCircuitState(): { state: string; stats: any } {
    const stats = cloudinaryCircuit.getStats();
    return {
      state: cloudinaryCircuit.getState(),
      stats,
    };
  }

  /**
   * Check if circuit allows requests (for health checks)
   */
  static isCircuitHealthy(): boolean {
    return cloudinaryCircuit.isAllowingRequests();
  }

  /**
   * Force reset the circuit breaker (for manual intervention)
   */
  static resetCircuit(): void {
    cloudinaryCircuit.reset();
    logger.info('[CLOUDINARY] Circuit breaker manually reset');
  }
}

export default CloudinaryService;

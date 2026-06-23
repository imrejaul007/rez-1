import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as fs from 'fs';
import { ImageProcessingService } from './ImageProcessingService';
import { logger } from '../config/logger';
import { cloudinaryCircuit } from '../utils/circuitBreaker';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Default Cloudinary upload timeout (30s). The cloudinary SDK does not
// expose a `timeout` option directly, so we wrap with Promise.race.
// Override with CLOUDINARY_UPLOAD_TIMEOUT_MS env var.
const CLOUDINARY_UPLOAD_TIMEOUT_MS = parseInt(
  process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS || '30000',
  10
);

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
   * Upload a single file to Cloudinary
   */
  static async uploadFile(
    filePath: string,
    options: CloudinaryUploadOptions = {}
  ): Promise<UploadApiResponse> {
    try {
      const defaultOptions = {
        folder: options.folder || 'merchant-uploads',
        quality: options.quality || 'auto',
        fetch_format: 'auto',
        ...options,
      };

      const result = await cloudinaryCircuit.exec(() =>
        withTimeout(
          cloudinary.uploader.upload(filePath, defaultOptions),
          CLOUDINARY_UPLOAD_TIMEOUT_MS,
          `uploader.upload(${filePath})`
        )
      );

      // Delete local file after successful upload
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      logger.info('[CLOUDINARY] Uploaded to Cloudinary', { url: result.secure_url });
      return result;
    } catch (error: any) {
      logger.error('[CLOUDINARY] Upload error', { error: error.message });
      throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
    }
  }

  /**
   * Upload multiple files to Cloudinary
   */
  static async uploadMultipleFiles(
    filePaths: string[],
    options: CloudinaryUploadOptions = {}
  ): Promise<UploadApiResponse[]> {
    const uploadPromises = filePaths.map((filePath) =>
      this.uploadFile(filePath, options)
    );
    return Promise.all(uploadPromises);
  }

  /**
   * Upload product image with optimization
   */
  static async uploadProductImage(
    filePath: string,
    merchantId: string,
    productId?: string
  ): Promise<UploadApiResponse> {
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
        transformation: [
          { width: 800, height: 800, crop: 'fill' },
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
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
    productId?: string
  ): Promise<UploadApiResponse> {
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
  static async uploadStoreLogo(
    filePath: string,
    merchantId: string
  ): Promise<UploadApiResponse> {
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
  static async uploadStoreBanner(
    filePath: string,
    merchantId: string
  ): Promise<UploadApiResponse> {
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
   * Upload video
   */
  static async uploadVideo(
    filePath: string,
    merchantId: string,
    resourceType: 'product' | 'store' = 'product'
  ): Promise<UploadApiResponse> {
    const folder = `merchants/${merchantId}/${resourceType}/videos`;

    try {
      const result = await cloudinaryCircuit.exec(() =>
        withTimeout(
          cloudinary.uploader.upload(filePath, {
            folder,
            resource_type: 'video',
            quality: 'auto',
          }),
          CLOUDINARY_UPLOAD_TIMEOUT_MS,
          `uploader.upload_video(${filePath})`
        )
      );

      // Delete local file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      logger.info('[CLOUDINARY] Uploaded video to Cloudinary', { url: result.secure_url });
      return result;
    } catch (error: any) {
      logger.error('[CLOUDINARY] Video upload error', { error: error.message });
      throw new Error(`Failed to upload video: ${error.message}`);
    }
  }

  /**
   * Upload store gallery image
   */
  static async uploadStoreGalleryImage(
    filePath: string,
    merchantId: string,
    storeId: string
  ): Promise<UploadApiResponse> {
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
   * Upload store gallery video
   */
  static async uploadStoreGalleryVideo(
    filePath: string,
    merchantId: string,
    storeId: string
  ): Promise<UploadApiResponse> {
    const folder = `merchants/${merchantId}/stores/${storeId}/gallery/videos`;

    try {
      const result = await cloudinaryCircuit.exec(() =>
        withTimeout(
          cloudinary.uploader.upload(filePath, {
            folder,
            resource_type: 'video',
            quality: 'auto',
          }),
          CLOUDINARY_UPLOAD_TIMEOUT_MS,
          `uploader.upload_video(${filePath})`
        )
      );

      // Delete local file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return result;
    } catch (error: any) {
      throw new Error(`Failed to upload gallery video: ${error.message}`);
    }
  }

  /**
   * Generate thumbnail for video
   */
  static generateVideoThumbnail(publicId: string, options: {
    width?: number;
    height?: number;
    time?: string | number; // Time in seconds or format like "00:00:01"
  } = {}): string {
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
    return !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
  }
}

export default CloudinaryService;

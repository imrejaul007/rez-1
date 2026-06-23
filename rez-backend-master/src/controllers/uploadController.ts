import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';
import { sendSuccess, sendBadRequest } from '../utils/response';
import { AppError } from '../middleware/errorHandler';

/**
 * Upload project file (image or video) to Cloudinary
 * POST /api/projects/upload
 * Note: File is already uploaded to Cloudinary by multer-storage-cloudinary
 */
export const uploadProjectFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  // Check if file is uploaded
  if (!req.file) {
    return sendBadRequest(res, 'File is required');
  }

  const userId = req.user._id;
  const fileType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';

  try {
    logger.info(`✅ [UPLOAD] ${fileType} uploaded successfully for user: ${userId}`);

    // When using CloudinaryStorage, req.file contains Cloudinary info
    // req.file.path is the Cloudinary URL
    // req.file.filename is the public_id
    const cloudinaryUrl = (req.file as any).path || req.file.path;
    const publicId = (req.file as any).filename || (req.file as any).public_id;

    // Generate thumbnail URL for images
    let thumbnailUrl = cloudinaryUrl;
    if (fileType === 'image' && publicId) {
      const { v2: cloudinary } = require('cloudinary');
      thumbnailUrl = cloudinary.url(publicId, {
        width: 300,
        height: 300,
        crop: 'fill',
        quality: 'auto',
        format: 'jpg'
      });
    }

    sendSuccess(res, {
      url: cloudinaryUrl,
      publicId: publicId,
      thumbnailUrl: thumbnailUrl,
      format: (req.file as any).format || req.file.mimetype.split('/')[1],
      width: (req.file as any).width || undefined,
      height: (req.file as any).height || undefined,
      bytes: (req.file as any).size || req.file.size,
      type: fileType,
    }, `${fileType} uploaded successfully`);
  } catch (error: any) {
    logger.error(`❌ [UPLOAD] Error processing ${fileType}:`, error);
    throw new AppError(`Failed to process ${fileType}: ${error.message}`, 500);
  }
});

/**
 * Upload multiple project files (images/videos) to Cloudinary
 * POST /api/projects/upload-multiple
 * Note: Files are already uploaded to Cloudinary by multer-storage-cloudinary
 */
export const uploadMultipleProjectFiles = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  // Check if files are uploaded
  if (!req.files) {
    return sendBadRequest(res, 'At least one file is required');
  }

  const userId = req.user._id;
  
  // Extract files from req.files
  // When using multer.array('files'), req.files is an array
  // But TypeScript types it as { [fieldname: string]: File[] }
  let files: Express.Multer.File[] = [];
  
  if (Array.isArray(req.files)) {
    files = req.files;
  } else if (req.files && typeof req.files === 'object') {
    // If it's an object, extract all file arrays and flatten them
    files = Object.values(req.files).flat();
  }

  if (files.length === 0) {
    return sendBadRequest(res, 'At least one file is required');
  }

  try {
    logger.info(`✅ [UPLOAD] ${files.length} file(s) uploaded successfully for user: ${userId}`);

    const { v2: cloudinary } = require('cloudinary');

    const results = files.map((file) => {
      const mimetype = file.mimetype || '';
      const fileType = mimetype.startsWith('video/') ? 'video' : 'image';
      const cloudinaryUrl = (file as any).path || file.path;
      const publicId = (file as any).filename || (file as any).public_id;

      // Generate thumbnail URL for images
      let thumbnailUrl = cloudinaryUrl;
      if (fileType === 'image' && publicId) {
        thumbnailUrl = cloudinary.url(publicId, {
          width: 300,
          height: 300,
          crop: 'fill',
          quality: 'auto',
          format: 'jpg'
        });
      }

      return {
        url: cloudinaryUrl,
        publicId: publicId,
        thumbnailUrl: thumbnailUrl,
        format: (file as any).format || mimetype.split('/')[1] || 'jpg',
        width: (file as any).width || undefined,
        height: (file as any).height || undefined,
        bytes: (file as any).size || file.size || 0,
        type: fileType,
        originalName: file.originalname || 'file',
      };
    });

    sendSuccess(res, {
      files: results,
      count: results.length,
    }, `${results.length} file(s) uploaded successfully`);
  } catch (error: any) {
    logger.error('❌ [UPLOAD] Error processing files:', error);
    throw new AppError(`Failed to process files: ${error.message}`, 500);
  }
});

/**
 * Upload review image to Cloudinary
 * POST /api/reviews/upload-image
 * Note: File is already uploaded to Cloudinary by multer-storage-cloudinary
 */
export const uploadReviewImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  // Check if file is uploaded
  if (!req.file) {
    return sendBadRequest(res, 'Image is required');
  }

  const userId = req.user._id;

  try {
    logger.info(`✅ [UPLOAD] Review image uploaded successfully for user: ${userId}`);

    // When using CloudinaryStorage, req.file contains Cloudinary info
    const cloudinaryUrl = (req.file as any).path || req.file.path;
    const publicId = (req.file as any).filename || (req.file as any).public_id;

    sendSuccess(res, {
      url: cloudinaryUrl,
      publicId: publicId,
      format: (req.file as any).format || req.file.mimetype.split('/')[1],
      width: (req.file as any).width || undefined,
      height: (req.file as any).height || undefined,
      bytes: (req.file as any).size || req.file.size,
    }, 'Review image uploaded successfully');
  } catch (error: any) {
    logger.error('❌ [UPLOAD] Error processing review image:', error);
    throw new AppError(`Failed to process image: ${error.message}`, 500);
  }
});


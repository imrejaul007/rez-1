import { Router } from 'express';
import multer from 'multer';
import { logger } from '../config/logger';
import * as path from 'path';
import * as fs from 'fs';
import { authMiddleware } from '../middleware/merchantauth';
import CloudinaryService from '../services/CloudinaryService';

const router = Router();

// Configure multer for temporary storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, '../../uploads/temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// File filter
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedVideoTypes = /mp4|mov|avi|wmv|webm/;

  const extname = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;

  const isImage = allowedImageTypes.test(extname) && mimetype.startsWith('image/');
  const isVideo = allowedVideoTypes.test(extname) && mimetype.startsWith('video/');

  if (isImage || isVideo) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

/**
 * @route   POST /api/merchant/uploads/product-image
 * @desc    Upload product image to Cloudinary
 * @access  Private (Merchant)
 */
router.post(
  '/product-image',
  authMiddleware,
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      const merchantId = req.merchantId;
      const productId = req.body.productId;

      // Upload to Cloudinary
      const result = await CloudinaryService.uploadProductImage(
        req.file.path,
        merchantId!,
        productId
      );

      return res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
        },
      });
    } catch (error: any) {
      // Clean up temp file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      logger.error('Upload error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload image',
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/merchant/uploads/product-images
 * @desc    Upload multiple product images
 * @access  Private (Merchant)
 */
router.post(
  '/product-images',
  authMiddleware,
  upload.array('images', 10), // Max 10 images
  async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded',
        });
      }

      const merchantId = req.merchantId;
      const productId = req.body.productId;

      // Upload all images to Cloudinary
      const uploadPromises = req.files.map((file) =>
        CloudinaryService.uploadProductImage(file.path, merchantId!, productId)
      );

      const results = await Promise.all(uploadPromises);

      const uploadedImages = results.map((result) => ({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
      }));

      return res.json({
        success: true,
        message: `${uploadedImages.length} images uploaded successfully`,
        data: {
          images: uploadedImages,
        },
      });
    } catch (error: any) {
      // Clean up temp files on error
      if (req.files && Array.isArray(req.files)) {
        req.files.forEach((file: any) => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }

      logger.error('Multi-upload error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload images',
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/merchant/uploads/image
 * @desc    Upload generic image (for store logo, banner, or other uses)
 * @access  Private (Merchant)
 */
router.post(
  '/image',
  authMiddleware,
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      const merchantId = req.merchantId;
      const imageType = req.body.type || 'general'; // 'logo', 'banner', 'general'

      let result;
      if (imageType === 'logo') {
        result = await CloudinaryService.uploadStoreLogo(req.file.path, merchantId!);
      } else if (imageType === 'banner') {
        result = await CloudinaryService.uploadStoreBanner(req.file.path, merchantId!);
      } else {
        // Generic image upload
        const folder = `merchants/${merchantId}/uploads`;
        result = await CloudinaryService.uploadFile(req.file.path, {
          folder,
          quality: 'auto',
        });
      }

      return res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          url: result.secure_url,
          publicId: result.public_id,
          filename: req.file.originalname,
          size: req.file.size,
        },
      });
    } catch (error: any) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      logger.error('Image upload error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload image',
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/merchant/uploads/store-logo
 * @desc    Upload store logo
 * @access  Private (Merchant)
 */
router.post(
  '/store-logo',
  authMiddleware,
  upload.single('logo'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      const merchantId = req.merchantId;

      // Upload to Cloudinary
      const result = await CloudinaryService.uploadStoreLogo(req.file.path, merchantId!);

      return res.json({
        success: true,
        message: 'Store logo uploaded successfully',
        data: {
          url: result.secure_url,
          publicId: result.public_id,
        },
      });
    } catch (error: any) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      logger.error('Logo upload error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload logo',
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/merchant/uploads/store-banner
 * @desc    Upload store banner
 * @access  Private (Merchant)
 */
router.post(
  '/store-banner',
  authMiddleware,
  upload.single('banner'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      const merchantId = req.merchantId;

      // Upload to Cloudinary
      const result = await CloudinaryService.uploadStoreBanner(req.file.path, merchantId!);

      return res.json({
        success: true,
        message: 'Store banner uploaded successfully',
        data: {
          url: result.secure_url,
          publicId: result.public_id,
        },
      });
    } catch (error: any) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      logger.error('Banner upload error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload banner',
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/merchant/uploads/video
 * @desc    Upload product/store video
 * @access  Private (Merchant)
 */
router.post(
  '/video',
  authMiddleware,
  upload.single('video'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      const merchantId = req.merchantId;
      const resourceType = req.body.type || 'product'; // 'product' or 'store'

      // Upload to Cloudinary
      const result = await CloudinaryService.uploadVideo(
        req.file.path,
        merchantId!,
        resourceType
      );

      return res.json({
        success: true,
        message: 'Video uploaded successfully',
        data: {
          url: result.secure_url,
          publicId: result.public_id,
          duration: result.duration,
          format: result.format,
        },
      });
    } catch (error: any) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      logger.error('Video upload error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload video',
        error: error.message,
      });
    }
  }
);

/**
 * @route   DELETE /api/merchant/uploads/delete/:publicId
 * @desc    Delete file from Cloudinary
 * @access  Private (Merchant)
 */
router.delete('/delete/:publicId', authMiddleware, async (req, res) => {
  try {
    const publicId = req.params.publicId;
    const { type } = req.query; // 'image' or 'video'

    if (type === 'video') {
      await CloudinaryService.deleteVideo(publicId);
    } else {
      await CloudinaryService.deleteFile(publicId);
    }

    return res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    logger.error('Delete error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: error.message,
    });
  }
});

// Error handling middleware for multer
router.use((error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB.',
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 10 files per request.',
      });
    }
  }
  return res.status(400).json({
    success: false,
    message: error.message || 'File upload error',
  });
});

export default router;

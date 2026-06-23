import { logger } from '../../config/logger';
import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import CloudinaryService from '../../services/CloudinaryService';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// Ensure temp directory exists
const tempDir = path.join(__dirname, '../../../uploads/temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configure multer for temporary storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `admin-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

/**
 * @route   POST /api/admin/uploads/image
 * @desc    Upload a single image for admin (campaigns, banners, etc.)
 * @access  Admin only
 */
router.post(
  '/image',
  requireAuth,
  requireAdmin,
  upload.single('image'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }

      // Check if Cloudinary is configured
      if (!CloudinaryService.isConfigured()) {
        // Clean up temp file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, message: 'Cloudinary is not configured' });
        return;
      }

      // Get folder from request body or use default
      const folder = req.body.folder || 'admin/campaigns';
      const type = req.body.type || 'general'; // banner, icon, deal

      // Set dimensions based on type
      let options: any = {
        folder: `rez-admin/${folder}`,
        quality: 'auto',
      };

      if (type === 'banner') {
        options.width = 1200;
        options.height = 400;
        options.crop = 'fill';
      } else if (type === 'icon') {
        options.width = 200;
        options.height = 200;
        options.crop = 'fill';
      } else if (type === 'deal') {
        options.width = 400;
        options.height = 400;
        options.crop = 'fill';
      }

      // Upload to Cloudinary
      const result = await CloudinaryService.uploadFile(req.file.path, options);

      res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        },
      });
  })
);

/**
 * @route   POST /api/admin/uploads/multiple
 * @desc    Upload multiple images for admin
 * @access  Admin only
 */
router.post(
  '/multiple',
  requireAuth,
  requireAdmin,
  upload.array('images', 10),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json({ success: false, message: 'No files uploaded' });
        return;
      }

      if (!CloudinaryService.isConfigured()) {
        // Clean up temp files
        files.forEach((file) => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
        res.status(500).json({ success: false, message: 'Cloudinary is not configured' });
        return;
      }

      const folder = req.body.folder || 'admin/campaigns';

      const uploadPromises = files.map((file) =>
        CloudinaryService.uploadFile(file.path, {
          folder: `rez-admin/${folder}`,
          quality: 'auto',
        })
      );

      const results = await Promise.all(uploadPromises);

      res.json({
        success: true,
        message: `${results.length} images uploaded successfully`,
        data: results.map((result) => ({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        })),
      });
  })
);

/**
 * @route   POST /api/admin/uploads/delete
 * @desc    Delete an image from Cloudinary
 * @access  Admin only
 */
router.post(
  '/delete',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { publicId } = req.body;

      if (!publicId) {
        res.status(400).json({ success: false, message: 'Public ID is required' });
        return;
      }

      await CloudinaryService.deleteFile(publicId);

      res.json({
        success: true,
        message: 'Image deleted successfully',
      });
  })
);

export default router;

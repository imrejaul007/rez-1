// Upload Middleware for Cloudinary
// Handles file uploads with multer and cloudinary

import multer from 'multer';
import path from 'path';
const cloudinary = require('cloudinary').v2;
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';
import { logger } from '../config/logger';

// Allowed file extensions for security validation (checks actual extension, not just mimetype header)
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.heic', '.heif'];
const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
const ALLOWED_DOC_EXTENSIONS = ['.pdf'];

function isAllowedImageFile(file: Express.Multer.File): boolean {
  const ext = path.extname(file.originalname).toLowerCase();
  return file.mimetype.startsWith('image/') && ALLOWED_IMAGE_EXTENSIONS.includes(ext);
}

function isAllowedVideoFile(file: Express.Multer.File): boolean {
  const ext = path.extname(file.originalname).toLowerCase();
  return file.mimetype.startsWith('video/') && ALLOWED_VIDEO_EXTENSIONS.includes(ext);
}

function isAllowedDocFile(file: Express.Multer.File): boolean {
  const ext = path.extname(file.originalname).toLowerCase();
  return file.mimetype === 'application/pdf' && ALLOWED_DOC_EXTENSIONS.includes(ext);
}

dotenv.config();

// Configure Cloudinary with increased timeout
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  timeout: 120000, // 120 seconds timeout (increased from 60)
});

logger.info('☁️  [CLOUDINARY] Configuration loaded:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key_present: !!process.env.CLOUDINARY_API_KEY,
  api_secret_present: !!process.env.CLOUDINARY_API_SECRET,
});

// Test Cloudinary connection at startup (Phase 4 smoke test fix: defensive error handling + no process exit)
cloudinary.api.ping()
  .then(() => {
    logger.info('✅ [CLOUDINARY] Connection successful!');
  })
  .catch((error: any) => {
    const msg = (error && error.message) ? String(error.message) : '<no message>';
    logger.error('❌ [CLOUDINARY] Connection failed:', msg);
    if (msg.includes('Invalid cloud_name')) {
      logger.error('   → Check CLOUDINARY_CLOUD_NAME in .env');
    } else if (msg.includes('quota')) {
      logger.error('   → Your Cloudinary storage quota may be full!');
      logger.error('   → Check: https://cloudinary.com/console/usage');
    }
    // Do NOT throw — keep server running even if cloudinary is unreachable
  });

// Create storage engine for profile images - MINIMAL CONFIG FOR SPEED
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    logger.info(`📤 [CLOUDINARY] Uploading avatar for user: ${req.user?._id}`);
    return {
      folder: 'rez-app/profiles',
      resource_type: 'image',
      public_id: `user_${req.user?._id}_${Date.now()}`,
      // No transformations during upload for maximum speed
      timeout: 120000,
    };
  },
});

// Create storage engine for project files (images/videos)
const projectStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    logger.info(`📤 [CLOUDINARY] Uploading project file for user: ${req.user?._id}`);
    const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';
    return {
      folder: 'rez-app/projects',
      resource_type: resourceType,
      public_id: `project_${req.user?._id}_${Date.now()}`,
      timeout: 120000,
    };
  },
});

// Create multer upload instance for profile images
export const uploadProfileImage = multer({
  storage: profileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (!isAllowedImageFile(file)) {
      return cb(new Error('Only image files are allowed (jpg, png, webp, gif)!') as any, false);
    }
    cb(null, true);
  },
});

// Create storage engine for review images
const reviewStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    logger.info(`📤 [CLOUDINARY] Uploading review image for user: ${req.user?._id}`);
    return {
      folder: 'rez-app/reviews',
      resource_type: 'image',
      public_id: `review_${req.user?._id}_${Date.now()}`,
      timeout: 120000,
    };
  },
});

// Create multer upload instance for project files (images/videos)
export const uploadProjectFile = multer({
  storage: projectStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    if (!isAllowedImageFile(file) && !isAllowedVideoFile(file)) {
      return cb(new Error('Only image and video files are allowed!') as any, false);
    }
    cb(null, true);
  },
});

// Create storage engine for social media proof uploads (images/videos)
const socialMediaProofStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    logger.info(`📤 [CLOUDINARY] Uploading social media proof for user: ${req.user?._id}`);
    const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';
    return {
      folder: 'rez-app/social-media-proofs',
      resource_type: resourceType,
      public_id: `social_proof_${req.user?._id}_${Date.now()}`,
      timeout: 120000,
    };
  },
});

// Create multer upload instance for social media proof files (images/videos)
export const uploadSocialMediaProof = multer({
  storage: socialMediaProofStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    if (!isAllowedImageFile(file) && !isAllowedVideoFile(file)) {
      return cb(new Error('Only image and video files are allowed!') as any, false);
    }
    cb(null, true);
  },
});

// Create multer upload instance for review images
export const uploadReviewImage = multer({
  storage: reviewStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for review images
  },
  fileFilter: (req, file, cb) => {
    if (!isAllowedImageFile(file)) {
      return cb(new Error('Only image files are allowed (jpg, png, webp, gif)!') as any, false);
    }
    cb(null, true);
  },
});

// Create storage engine for verification documents
const verificationStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const zone = req.params?.zone || 'general';
    logger.info(`📤 [CLOUDINARY] Uploading verification document for user: ${(req as any).user?._id} (zone: ${zone})`);
    return {
      folder: `rez-app/verifications/${zone}`,
      resource_type: 'image',
      public_id: `verification_${(req as any).user?._id}_${Date.now()}`,
      timeout: 120000,
    };
  },
});

// Create multer upload instance for verification documents
export const uploadVerificationDocument = multer({
  storage: verificationStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for verification documents
  },
  fileFilter: (req, file, cb) => {
    if (!isAllowedImageFile(file) && !isAllowedDocFile(file)) {
      return cb(new Error('Only image and PDF files are allowed for verification!') as any, false);
    }
    cb(null, true);
  },
});
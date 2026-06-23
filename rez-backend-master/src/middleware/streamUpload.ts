import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/rez-uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  logger.info(`[Upload] Created upload directory: ${UPLOAD_DIR}`);
}

/**
 * Disk storage — never buffers entire file in RAM
 * Files are streamed directly to disk, preventing memory exhaustion
 */
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      // Create subdirectory based on route path and user ID
      const userId = (req as any).user?._id || 'anonymous';
      const subdir = path.join(UPLOAD_DIR, req.path.replace(/\//g, '-').slice(1), userId);
      fs.mkdirSync(subdir, { recursive: true });
      cb(null, subdir);
    } catch (err: any) {
      logger.error('[Upload] Failed to create destination directory: ' + err.message);
      cb(err as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const basename = path.basename(file.originalname, ext).slice(0, 50); // Limit name length
    const filename = `${Date.now()}-${uniqueId}-${basename}${ext}`;
    cb(null, filename);
  },
});

/**
 * File filter — only allow safe image types
 */
const imageFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeAllowed = file.mimetype.startsWith('image/');

  if (allowed.includes(ext) && mimeAllowed) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} not allowed. Allowed: ${allowed.join(', ')}`));
  }
};

/**
 * File filter — only allow PDF documents
 */
const pdfFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.pdf' && file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'));
  }
};

/**
 * Standard image uploader — max 10MB, streams to disk
 * For avatar, gallery, and general image uploads
 */
export const imageUpload = multer({
  storage: diskStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10, // Max 10 files per request
  },
  fileFilter: imageFilter,
});

/**
 * Document uploader — PDF only, max 20MB
 * For verification documents, invoices, etc.
 */
export const documentUpload = multer({
  storage: diskStorage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
    files: 3, // Max 3 files per request
  },
  fileFilter: pdfFilter,
});

/**
 * Large file uploader — for bulk imports
 * Max 50MB per file
 */
export const bulkUpload = multer({
  storage: diskStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1,
  },
  fileFilter: pdfFilter,
});

/**
 * Cleanup function — removes uploaded file after processing
 * Call this after successfully processing the upload (moving to cloud, DB, etc.)
 * Non-blocking: errors are logged but not thrown
 */
export function cleanupUpload(filePath?: string) {
  if (!filePath || !fs.existsSync(filePath)) {
    return;
  }

  // Fire-and-forget async deletion
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      logger.warn(`[Upload] Failed to cleanup file ${filePath}: ${err.message}`);
    }
  });
}

/**
 * Cleanup multiple files (e.g., from req.files array)
 */
export function cleanupUploads(files?: Express.Multer.File[]) {
  if (!files || !Array.isArray(files)) {
    return;
  }

  files.forEach((file) => {
    cleanupUpload(file.path);
  });
}

/**
 * Error handler middleware for multer errors
 * Use after multer middleware to catch file validation errors
 */
export function uploadErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large. Maximum size depends on upload type.',
      });
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files. Please check the endpoint limits.',
      });
    } else {
      return res.status(400).json({ error: 'Upload failed' });
    }
  } else if (err) {
    // Custom validation errors
    return res.status(400).json({ error: 'Upload failed' });
  }

  next();
}

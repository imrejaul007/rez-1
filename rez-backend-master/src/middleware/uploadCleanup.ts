/**
 * Upload Cleanup Middleware
 *
 * Automatically deletes temporary upload files after request completes.
 * Prevents disk space exhaustion from accumulating temp files.
 */

import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { logger } from '../config/logger';

/**
 * Attach file cleanup to request
 *
 * Call this after multer middleware:
 * router.post('/upload', upload.single('file'), attachUploadCleanup, handler);
 */
export const attachUploadCleanup = (req: Request, res: Response, next: NextFunction) => {
  // Store cleanup functions for this request
  const filesToDelete: string[] = [];

  if (req.file) {
    filesToDelete.push(req.file.path);
  }

  if (req.files && Array.isArray(req.files)) {
    req.files.forEach((file: any) => {
      filesToDelete.push(file.path);
    });
  } else if (req.files && typeof req.files === 'object') {
    Object.values(req.files as any).forEach((fileArray: any) => {
      if (Array.isArray(fileArray)) {
        fileArray.forEach((file: any) => {
          filesToDelete.push(file.path);
        });
      }
    });
  }

  // Attach cleanup function to response
  (req as any).deleteUploadedFiles = async () => {
    for (const filePath of filesToDelete) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.debug(`Cleaned up temp upload: ${filePath}`);
        }
      } catch (err) {
        logger.warn(`Failed to delete temp file: ${filePath}`, err);
      }
    }
  };

  // Auto-cleanup on response finish
  res.on('finish', async () => {
    try {
      await (req as any).deleteUploadedFiles();
    } catch (err) {
      logger.error('Upload cleanup error', err);
    }
  });

  next();
};

/**
 * Cleanup task to remove old temp files (run periodically via cron)
 *
 * Usage in a cron job:
 * await cleanupOldTempFiles('/tmp/gallery-uploads/', 3600); // 1 hour old
 */
export async function cleanupOldTempFiles(
  tempDir: string,
  ageSeconds: number = 7200 // 2 hours
): Promise<{ deleted: number; errors: number }> {
  let deleted = 0;
  let errors = 0;
  const now = Date.now();
  const ageMs = ageSeconds * 1000;

  try {
    if (!fs.existsSync(tempDir)) {
      logger.info(`Temp directory does not exist: ${tempDir}`);
      return { deleted: 0, errors: 0 };
    }

    const files = fs.readdirSync(tempDir);

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      try {
        const stat = fs.statSync(filePath);
        const age = now - stat.mtimeMs;

        if (age > ageMs) {
          fs.unlinkSync(filePath);
          deleted++;
          logger.debug(`Removed old temp file: ${file}`);
        }
      } catch (err) {
        errors++;
        logger.warn(`Error processing temp file: ${file}`, err);
      }
    }

    logger.info(`Temp cleanup: deleted ${deleted}, errors ${errors}`);
  } catch (err) {
    logger.error('Temp directory cleanup failed', err);
    errors++;
  }

  return { deleted, errors };
}

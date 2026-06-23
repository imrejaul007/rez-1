import express, { Request, Response } from 'express';
import multer from 'multer';
import { logger } from '../config/logger';
import path from 'path';
import fs from 'fs';
import { bulkImportService } from '../merchantservices/bulkImportService';
import { ImportJob } from '../models/ImportJob';
import { Store } from '../models/Store';
import { authMiddleware } from '../middleware/merchantauth';

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/imports');

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `import-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const allowedExtensions = ['.csv', '.xls', '.xlsx'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  }
});

/**
 * @route   POST /api/merchant/products/bulk-import
 * @desc    Upload and process bulk product import
 * @access  Private (Merchant)
 */
router.post(
  '/bulk-import',
  authMiddleware,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const merchantId = req.merchantId;
      const { storeId } = req.body;

      // Validate merchant and store
      if (!merchantId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Merchant ID not found'
        });
      }

      if (!storeId) {
        return res.status(400).json({
          success: false,
          message: 'Store ID is required'
        });
      }

      // Verify store belongs to merchant
      const store = await Store.findOne({ _id: storeId, merchantId });
      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found or does not belong to this merchant'
        });
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const file = req.file;
      const fileType = file.originalname.endsWith('.csv') ? 'csv' : 'excel';

      // Create import job
      const importJob = new ImportJob({
        merchantId,
        storeId,
        fileName: file.originalname,
        fileType,
        filePath: file.path,
        status: 'pending'
      });

      await importJob.save();

      // Process import asynchronously
      processImportJob(importJob._id.toString(), file.path, fileType, storeId, merchantId).catch(
        error => {
          logger.error('Import job failed:', error);
        }
      );

      return res.status(202).json({
        success: true,
        message: 'Import job created successfully. Processing in background.',
        data: {
          jobId: importJob._id,
          status: importJob.status,
          fileName: importJob.fileName
        }
      });
    } catch (error) {
      logger.error('Bulk import error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to process bulk import',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Process import job asynchronously
 */
async function processImportJob(
  jobId: string,
  filePath: string,
  fileType: string,
  storeId: string,
  merchantId: string
) {
  try {
    // Update job status to processing
    await ImportJob.findByIdAndUpdate(jobId, {
      status: 'processing',
      startedAt: new Date()
    });

    // Process the import
    const result = await bulkImportService.processBulkImport(
      filePath,
      fileType,
      storeId,
      merchantId
    );

    // Update job with results
    await ImportJob.findByIdAndUpdate(jobId, {
      status: 'completed',
      result,
      progress: {
        total: result.total,
        processed: result.total,
        successful: result.successful,
        failed: result.failed,
        warnings: result.warnings
      },
      completedAt: new Date()
    });

    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    logger.error('Import processing error:', error);

    // Update job with error
    await ImportJob.findByIdAndUpdate(jobId, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      completedAt: new Date()
    });

    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

/**
 * @route   GET /api/merchant/products/import-status/:jobId
 * @desc    Get import job status
 * @access  Private (Merchant)
 */
router.get(
  '/import-status/:jobId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const merchantId = req.merchantId;
      const { jobId } = req.params;

      const importJob = await ImportJob.findOne({ _id: jobId, merchantId });

      if (!importJob) {
        return res.status(404).json({
          success: false,
          message: 'Import job not found'
        });
      }

      // Calculate progress percentage
      const progressPercent =
        importJob.progress.total > 0
          ? Math.round((importJob.progress.processed / importJob.progress.total) * 100)
          : 0;

      return res.status(200).json({
        success: true,
        data: {
          jobId: importJob._id,
          fileName: importJob.fileName,
          status: importJob.status,
          progress: {
            ...importJob.progress,
            percentage: progressPercent
          },
          result: importJob.result,
          error: importJob.error,
          createdAt: importJob.createdAt,
          startedAt: importJob.startedAt,
          completedAt: importJob.completedAt
        }
      });
    } catch (error) {
      logger.error('Get import status error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get import status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route   GET /api/merchant/products/import-jobs
 * @desc    Get all import jobs for merchant
 * @access  Private (Merchant)
 */
router.get(
  '/import-jobs',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const merchantId = req.merchantId;
      const { status, storeId, page = 1, limit = 20 } = req.query;

      const query: any = { merchantId };

      if (status) {
        query.status = status;
      }

      if (storeId) {
        query.storeId = storeId;
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [jobs, total] = await Promise.all([
        ImportJob.find(query)
          .populate('storeId', 'name')
          .sort({ createdAt: -1 })
          .limit(Number(limit))
          .skip(skip),
        ImportJob.countDocuments(query)
      ]);

      return res.status(200).json({
        success: true,
        data: {
          jobs: jobs.map(job => ({
            jobId: job._id,
            fileName: job.fileName,
            store: job.storeId,
            status: job.status,
            progress: job.progress,
            createdAt: job.createdAt,
            completedAt: job.completedAt
          })),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      logger.error('Get import jobs error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get import jobs',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route   GET /api/merchant/products/import-template
 * @desc    Download CSV import template
 * @access  Private (Merchant)
 */
router.get(
  '/import-template',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const csv = bulkImportService.generateCSVTemplate();

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=product-import-template.csv');

      return res.status(200).send(csv);
    } catch (error) {
      logger.error('Get template error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate template',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route   GET /api/merchant/products/import-instructions
 * @desc    Get import instructions
 * @access  Private (Merchant)
 */
router.get(
  '/import-instructions',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const instructions = bulkImportService.getImportInstructions();

      return res.status(200).json({
        success: true,
        data: instructions
      });
    } catch (error) {
      logger.error('Get instructions error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get instructions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route   DELETE /api/merchant/products/import-job/:jobId
 * @desc    Delete import job
 * @access  Private (Merchant)
 */
router.delete(
  '/import-job/:jobId',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const merchantId = req.merchantId;
      const { jobId } = req.params;

      const importJob = await ImportJob.findOne({ _id: jobId, merchantId });

      if (!importJob) {
        return res.status(404).json({
          success: false,
          message: 'Import job not found'
        });
      }

      // Can only delete completed or failed jobs
      if (importJob.status === 'pending' || importJob.status === 'processing') {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete job in progress'
        });
      }

      await importJob.deleteOne();

      return res.status(200).json({
        success: true,
        message: 'Import job deleted successfully'
      });
    } catch (error) {
      logger.error('Delete import job error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete import job',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;

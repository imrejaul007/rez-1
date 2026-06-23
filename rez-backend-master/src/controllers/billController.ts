import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { logger } from '../config/logger';
import { Bill } from '../models/Bill';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendNotFound, sendError } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { billVerificationService } from '../services/billVerificationService';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinaryUtils';
import { fraudDetectionService } from '../services/fraudDetectionService';
import crypto from 'crypto';
import gamificationEventBus from '../events/gamificationEventBus';
import redisService from '../services/redisService';
import { ocrService } from '../services/ocrService';

// Analyze bill image for user (OCR pre-fill before upload)
export const analyzeBillForUser = asyncHandler(async (req: Request, res: Response) => {
  if (!(req as any).user) throw new AppError('Authentication required', 401);
  if (!req.file) throw new AppError('Bill image is required', 400);

  try {
    // Upload to Cloudinary temporarily for OCR processing
    const uploadResult = await uploadToCloudinary(req.file.buffer, 'bills/temp');

    // Run OCR
    const ocrResult = await ocrService.extractTextFromBill(uploadResult.secureUrl);

    // Delete temp image (full upload happens on submit)
    deleteFromCloudinary(uploadResult.publicId).catch(() => {});

    if (ocrResult.success && ocrResult.extractedData) {
      const { amount, merchantName, date, billNumber } = ocrResult.extractedData;
      return sendSuccess(res, {
        amount: amount ?? null,
        merchantName: merchantName ?? null,
        date: date ? new Date(date).toISOString().split('T')[0] : null,
        billNumber: billNumber ?? null,
        confidence: ocrResult.confidence ?? 0,
      }, 'Bill analyzed');
    }

    return sendSuccess(res, {
      amount: null, merchantName: null, date: null, billNumber: null, confidence: 0,
    }, 'Could not extract bill details — please enter manually');
  } catch (err) {
    logger.warn('[BILL ANALYZE] OCR failed:', (err as Error).message);
    return sendSuccess(res, {
      amount: null, merchantName: null, date: null, billNumber: null, confidence: 0,
    }, 'Analysis unavailable — please enter manually');
  }
});

// Upload bill with image
export const uploadBill = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  // Check if file is uploaded
  if (!req.file) {
    throw new AppError('Bill image is required', 400);
  }

  const { merchantId, amount, billDate, billNumber, notes } = req.body;

  // Validate required fields
  if (!merchantId || !amount || !billDate) {
    throw new AppError('Merchant, amount, and bill date are required', 400);
  }

  logger.info('📤 [BILL UPLOAD] Processing bill upload...');
  logger.info('User:', req.user._id);
  logger.info('Merchant:', merchantId);
  logger.info('Amount:', amount);

  try {
    // Generate image hash for duplicate detection
    const imageHash = crypto
      .createHash('sha256')
      .update(req.file.buffer)
      .digest('hex');

    // Check for duplicate image
    const duplicateImage = await Bill.findOne({
      'billImage.imageHash': imageHash,
      verificationStatus: { $in: ['pending', 'processing', 'approved'] },
      isActive: true,
    }).lean();

    if (duplicateImage) {
      throw new AppError('This bill image has already been uploaded', 400);
    }

    // Upload to Cloudinary
    logger.info('☁️ [CLOUDINARY] Uploading bill image...');
    const cloudinaryResult = await uploadToCloudinary(
      req.file.buffer,
      `bills/${req.user._id}`,
      {
        transformation: [
          { width: 1200, crop: 'limit' },
          { quality: 'auto' },
        ],
        generateThumbnail: true,
      }
    );

    logger.info('✅ [CLOUDINARY] Image uploaded successfully');

    // Create bill document
    const bill = await Bill.create({
      user: req.user._id,
      merchant: merchantId,
      billImage: {
        url: cloudinaryResult.url,
        thumbnailUrl: cloudinaryResult.thumbnailUrl,
        cloudinaryId: cloudinaryResult.publicId,
        publicId: cloudinaryResult.publicId,
        imageHash,
      },
      amount: parseFloat(amount),
      billDate: new Date(billDate),
      billNumber,
      notes,
      verificationStatus: 'pending',
      metadata: {
        ipAddress: req.ip,
        deviceInfo: req.headers['user-agent'],
      },
    });

    logger.info('✅ [BILL] Bill created:', bill._id);

    // Trigger async verification process
    billVerificationService
      .processBill(bill._id as Types.ObjectId, cloudinaryResult.url, imageHash)
      .then((result) => {
        logger.info(`✅ [VERIFICATION] Bill ${bill._id} processed:`, result.status);
      })
      .catch((error) => {
        logger.error(`❌ [VERIFICATION] Error processing bill ${bill._id}:`, error);
      });

    // Emit bill_uploaded event for mission progress tracking
    gamificationEventBus.emit('bill_uploaded', {
      userId: String(req.user._id),
      entityId: String(bill._id),
      entityType: 'bill',
      amount: parseFloat(amount),
      storeId: merchantId,
      source: { controller: 'billController', action: 'uploadBill' },
    });

    // Populate merchant details before sending response
    await bill.populate('merchant', 'name logo cashbackPercentage');

    // Invalidate user's bill list cache
    redisService.delPattern(`bills:user:${req.user!._id}:*`).catch((err) => logger.warn('[Bill] Cache invalidation for user bills failed', { error: err.message }));

    sendSuccess(
      res,
      bill,
      'Bill uploaded successfully and is being verified',
      201
    );
  } catch (error) {
    logger.error('❌ [BILL UPLOAD] Error:', error);
    throw error;
  }
});

// Get user's bill history
export const getUserBills = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const {
    status,
    merchantId,
    startDate,
    endDate,
    limit = 20,
    page = 1,
  } = req.query;

  // Build query
  const query: any = {
    user: req.user._id,
    isActive: true,
  };

  if (status) {
    query.verificationStatus = status;
  }

  if (merchantId) {
    query.merchant = merchantId;
  }

  if (startDate || endDate) {
    query.billDate = {};
    if (startDate) {
      query.billDate.$gte = new Date(startDate as string);
    }
    if (endDate) {
      query.billDate.$lte = new Date(endDate as string);
    }
  }

  // Pagination
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  // Check cache (60s TTL)
  const cacheKey = `bills:user:${req.user._id}:${status || 'all'}:${merchantId || ''}:${page}:${limit}`;
  const cached = await redisService.get<any>(cacheKey);
  if (cached) {
    return sendSuccess(res, cached);
  }

  // Get bills and total count in parallel
  const [bills, total] = await Promise.all([
    Bill.find(query)
      .populate('merchant', 'name logo cashbackPercentage')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip).lean(),
    Bill.countDocuments(query),
  ]);

  const data = {
    bills,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    },
  };

  redisService.set(cacheKey, data, 60).catch((err) => logger.warn('[Bill] Cache set for bill list failed', { error: err.message }));

  sendSuccess(res, data);
});

// Get bill by ID
export const getBillById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { billId } = req.params;

  const bill = await Bill.findOne({
    _id: billId,
    user: req.user._id,
    isActive: true,
  }).populate('merchant', 'name logo cashbackPercentage').lean();

  if (!bill) {
    return sendNotFound(res, 'Bill not found');
  }

  sendSuccess(res, bill);
});

// Get bill statistics
export const getBillStatistics = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const stats = await (Bill as any).getUserStatistics(req.user._id);

  sendSuccess(res, stats);
});

// Resubmit rejected bill
export const resubmitBill = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { billId } = req.params;

  // Check if file is uploaded
  if (!req.file) {
    throw new AppError('New bill image is required', 400);
  }

  const bill = await Bill.findOne({
    _id: billId,
    user: req.user._id,
    isActive: true,
  }).lean();

  if (!bill) {
    return sendNotFound(res, 'Bill not found');
  }

  if (bill.verificationStatus !== 'rejected') {
    throw new AppError('Only rejected bills can be resubmitted', 400);
  }

  // Check resubmission limit (max 3 times)
  if ((bill.resubmissionCount || 0) >= 3) {
    throw new AppError('Maximum resubmission limit reached', 400);
  }

  try {
    // Delete old image from Cloudinary
    if (bill.billImage.cloudinaryId) {
      await deleteFromCloudinary(bill.billImage.cloudinaryId);
    }

    // Generate new image hash
    const imageHash = crypto
      .createHash('sha256')
      .update(req.file.buffer)
      .digest('hex');

    // Upload new image
    const cloudinaryResult = await uploadToCloudinary(
      req.file.buffer,
      `bills/${req.user._id}`,
      {
        transformation: [
          { width: 1200, crop: 'limit' },
          { quality: 'auto' },
        ],
        generateThumbnail: true,
      }
    );

    // Reprocess bill
    const result = await billVerificationService.reprocessBill(
      bill._id as Types.ObjectId,
      cloudinaryResult.url,
      imageHash
    );

    if (!result.success) {
      throw new AppError(result.error || 'Resubmission failed', 400);
    }

    // Get updated bill
    const updatedBill = await Bill.findById(billId).populate(
      'merchant',
      'name logo cashbackPercentage'
    ).lean();

    sendSuccess(res, updatedBill, 'Bill resubmitted successfully');
  } catch (error) {
    logger.error('❌ [RESUBMIT] Error:', error);
    throw error;
  }
});

// Admin: Get pending bills for manual review
export const getPendingBills = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  const { limit = 20, page = 1 } = req.query;

  const bills = await billVerificationService.getPendingReviewBills(
    parseInt(limit as string),
    parseInt(page as string)
  );

  const total = await Bill.countDocuments({
    verificationStatus: 'pending',
    verificationMethod: 'manual',
    isActive: true,
  });

  sendSuccess(res, {
    bills,
    pagination: {
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      pages: Math.ceil(total / parseInt(limit as string)),
    },
  });
});

// Admin: Manually approve bill
export const approveBill = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  const { billId } = req.params;
  const { notes } = req.body;

  const result = await billVerificationService.manuallyApproveBill(
    billId as any,
    req.user._id as Types.ObjectId,
    notes
  );

  if (!result.success) {
    throw new AppError(result.error || 'Approval failed', 400);
  }

  const bill = await Bill.findById(billId).populate('merchant', 'name logo').lean();

  sendSuccess(res, bill, 'Bill approved successfully');
});

// Admin: Manually reject bill
export const rejectBill = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  const { billId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    throw new AppError('Rejection reason is required', 400);
  }

  const result = await billVerificationService.manuallyRejectBill(
    billId as any,
    req.user._id as Types.ObjectId,
    reason
  );

  if (!result.success) {
    throw new AppError(result.error || 'Rejection failed', 400);
  }

  const bill = await Bill.findById(billId).populate('merchant', 'name logo').lean();

  sendSuccess(res, bill, 'Bill rejected successfully');
});

// Admin: Get verification statistics
export const getVerificationStatistics = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  const stats = await billVerificationService.getVerificationStatistics();

  sendSuccess(res, stats);
});

// Admin: Get user's fraud history
export const getUserFraudHistory = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    throw new AppError('Admin access required', 403);
  }

  const { userId } = req.params;

  const history = await fraudDetectionService.getUserFraudHistory(userId as any);

  sendSuccess(res, history);
});

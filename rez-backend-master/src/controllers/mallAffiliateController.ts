import { logger } from '../config/logger';
/**
 * Mall Affiliate Controller
 *
 * Handles API endpoints for affiliate click tracking, conversion processing,
 * and user cashback management.
 */

import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import crypto from 'crypto';
import mallAffiliateService from '../services/mallAffiliateService';
import MallAffiliateService from '../services/mallAffiliateService';
import { MallBrand } from '../models/MallBrand';
import { AffiliateWebhookLog, AffiliateWebhookType } from '../models/AffiliateWebhookLog';
import redisService from '../services/redisService';
import {
  sendSuccess,
  sendPaginated,
  sendNotFound,
  sendBadRequest,
  sendError,
  sendUnauthorized,
} from '../utils/response';

// Webhook idempotency: 24-hour TTL for deduplication keys
const IDEMPOTENCY_TTL = 24 * 60 * 60;

/**
 * Check webhook idempotency. Returns cached response if this is a duplicate.
 * Key format: webhook_idem:{type}:{purchaseId|orderId}
 */
const checkIdempotency = async (
  idempotencyKey: string
): Promise<{ isDuplicate: boolean; cachedResponse?: any }> => {
  const cached = await redisService.get<any>(`webhook_idem:${idempotencyKey}`);
  if (cached) {
    return { isDuplicate: true, cachedResponse: cached };
  }
  return { isDuplicate: false };
};

/**
 * Store webhook response for idempotency deduplication.
 */
const storeIdempotency = async (
  idempotencyKey: string,
  response: any
): Promise<void> => {
  await redisService.set(`webhook_idem:${idempotencyKey}`, response, IDEMPOTENCY_TTL);
};

// Helper function to log webhook request
const logWebhookRequest = async (
  req: Request,
  webhookType: AffiliateWebhookType
): Promise<Types.ObjectId | null> => {
  try {
    const webhookAuth = (req as any).webhookAuth;
    const log = await (AffiliateWebhookLog as any).logWebhook({
      webhookType,
      endpoint: req.originalUrl,
      method: req.method,
      headers: Object.fromEntries(
        Object.entries(req.headers)
          .filter(([key]) => !key.toLowerCase().includes('authorization') && !key.toLowerCase().includes('api-key'))
          .map(([key, value]) => [key, String(value)])
      ),
      body: req.body,
      queryParams: req.query as Record<string, string>,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'],
      brandId: webhookAuth?.brandId,
      brandName: webhookAuth?.brandName,
      affiliateNetwork: webhookAuth?.type === 'brand' ? 'direct' : undefined,
    });
    return log._id;
  } catch (error) {
    logger.error('[WEBHOOK LOG] Failed to create log entry:', error);
    return null;
  }
};

// Helper function to update webhook log with result
const updateWebhookLog = async (
  logId: Types.ObjectId | null,
  result: {
    status: 'success' | 'failed' | 'duplicate' | 'invalid';
    responseStatus: number;
    responseBody?: Record<string, any>;
    processingTime: number;
    errorMessage?: string;
    clickId?: string;
    purchaseId?: string;
    cashbackId?: Types.ObjectId;
  }
): Promise<void> => {
  if (!logId) return;
  try {
    await (AffiliateWebhookLog as any).updateLogResult(logId, result);
  } catch (error) {
    logger.error('[WEBHOOK LOG] Failed to update log entry:', error);
  }
};

// Async handler wrapper
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Generate session ID if not provided
const generateSessionId = (): string => {
  return `sess_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`;
};

/**
 * Track Brand Click
 * POST /api/mall/affiliate/click
 *
 * Creates a click record and returns a tracking URL
 */
export const trackBrandClick = asyncHandler(async (req: Request, res: Response) => {
  const { brandId, sessionId, utmSource, utmMedium, utmCampaign } = req.body;
  const userId = (req as any).user?._id?.toString();

  if (!brandId) {
    return sendBadRequest(res, 'Brand ID is required');
  }

  if (!Types.ObjectId.isValid(brandId)) {
    return sendBadRequest(res, 'Invalid brand ID');
  }

  // Get tracking data from request
  const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const referrer = req.headers.referer || req.headers.referrer as string;

  // Detect platform from user agent
  let platform: 'web' | 'ios' | 'android' = 'web';
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    platform = 'ios';
  } else if (userAgent.includes('Android')) {
    platform = 'android';
  }

  const result = await mallAffiliateService.trackClick({
    brandId,
    userId,
    sessionId: sessionId || generateSessionId(),
    ipAddress,
    userAgent,
    referrer,
    platform,
    utmSource,
    utmMedium,
    utmCampaign,
  });

  return sendSuccess(res, result, 'Click tracked successfully');
});

/**
 * Get User's Click History
 * GET /api/mall/affiliate/clicks
 */
export const getUserClicks = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?._id?.toString();

  if (!userId) {
    return sendUnauthorized(res, 'Authentication required');
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

  const { clicks, total, pages } = await mallAffiliateService.getUserClicks(userId, page, limit);

  return sendPaginated(res, clicks, page, limit, total, 'Click history retrieved successfully');
});

/**
 * Get User's Purchase History
 * GET /api/mall/affiliate/purchases
 */
export const getUserPurchases = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?._id?.toString();

  if (!userId) {
    return sendUnauthorized(res, 'Authentication required');
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const status = req.query.status as any;

  const { purchases, total, pages } = await mallAffiliateService.getUserPurchases(
    userId,
    status,
    page,
    limit
  );

  return sendPaginated(res, purchases, page, limit, total, 'Purchase history retrieved successfully');
});

/**
 * Get User's Mall Cashback Summary
 * GET /api/mall/affiliate/summary
 */
export const getUserCashbackSummary = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?._id?.toString();

  if (!userId) {
    return sendUnauthorized(res, 'Authentication required');
  }

  const summary = await mallAffiliateService.getUserCashbackSummary(userId);

  // Enrich response with coin-based display labels
  const enriched = {
    ...summary,
    totalCoinsEarned: summary.totalEarned ?? 0,
    pendingCoins: summary.pending ?? 0,
    confirmedCoins: (summary as any).confirmed ?? 0,
    creditedCoins: summary.credited ?? 0,
    displayLabel: 'REZ Coins',
    coinValue: 1,
    currencySymbol: '🪙',
  };

  return sendSuccess(res, enriched, 'Cashback summary retrieved successfully');
});

/**
 * Process Conversion Webhook
 * POST /api/mall/webhook/conversion
 *
 * Called by brand/affiliate network when a purchase is made
 */
export const processConversionWebhook = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const logId = await logWebhookRequest(req, 'conversion');

  const {
    click_id,
    clickId,
    order_id,
    orderId,
    order_amount,
    orderAmount,
    currency,
    status,
    purchased_at,
    purchasedAt: purchasedAtBody,
    aff_sub,
    subid,
  } = req.body;

  // Support both snake_case and camelCase
  let resolvedClickId: string | undefined = click_id || clickId;

  // If click_id not provided, try decoding from aff_sub or subid parameter
  if (!resolvedClickId) {
    const subIdRaw = aff_sub || subid;
    if (subIdRaw && typeof subIdRaw === 'string') {
      const decodedSub = (MallAffiliateService as any).decodeSubId
        ? (MallAffiliateService as any).decodeSubId(subIdRaw)
        : null;
      if (decodedSub?.clickId) {
        resolvedClickId = decodedSub.clickId;
        logger.info(`[AFFILIATE WEBHOOK] Resolved click_id "${resolvedClickId}" from aff_sub parameter`);
      }
    }
  }
  const resolvedOrderId = order_id || orderId;
  const resolvedOrderAmount = parseFloat(order_amount || orderAmount);
  const resolvedPurchasedAt = purchased_at || purchasedAtBody;
  const authenticatedBrandId = (req as any).webhookAuth?.brandId?.toString() || undefined;

  if (!resolvedClickId || typeof resolvedClickId !== 'string' || resolvedClickId.trim() === '') {
    await updateWebhookLog(logId, {
      status: 'invalid',
      responseStatus: 400,
      processingTime: Date.now() - startTime,
      errorMessage: 'click_id or clickId is required and must be a non-empty string',
    });
    return sendBadRequest(res, 'click_id or clickId is required and must be a non-empty string');
  }

  if (!resolvedOrderId || typeof resolvedOrderId !== 'string' || resolvedOrderId.trim() === '') {
    await updateWebhookLog(logId, {
      status: 'invalid',
      responseStatus: 400,
      processingTime: Date.now() - startTime,
      errorMessage: 'order_id or orderId is required and must be a non-empty string',
      clickId: resolvedClickId,
    });
    return sendBadRequest(res, 'order_id or orderId is required and must be a non-empty string');
  }

  if (isNaN(resolvedOrderAmount) || resolvedOrderAmount <= 0) {
    await updateWebhookLog(logId, {
      status: 'invalid',
      responseStatus: 400,
      processingTime: Date.now() - startTime,
      errorMessage: 'order_amount or orderAmount is required and must be a positive number',
      clickId: resolvedClickId,
    });
    return sendBadRequest(res, 'order_amount or orderAmount is required and must be a positive number');
  }

  // Idempotency check: same order ID + brand = same conversion
  const conversionIdempKey = `conversion:${resolvedOrderId}:${authenticatedBrandId || 'unknown'}`;
  const { isDuplicate: isConvDuplicate, cachedResponse: cachedConvResponse } = await checkIdempotency(conversionIdempKey);
  if (isConvDuplicate && cachedConvResponse) {
    await updateWebhookLog(logId, {
      status: 'duplicate',
      responseStatus: 200,
      responseBody: cachedConvResponse,
      processingTime: Date.now() - startTime,
      clickId: resolvedClickId,
    });
    return sendSuccess(res, cachedConvResponse, 'Conversion already processed (idempotent)');
  }

  // Validate click before processing
  const validation = await mallAffiliateService.validateClickForConversion(resolvedClickId);
  if (!validation.valid) {
    await updateWebhookLog(logId, {
      status: 'invalid',
      responseStatus: 400,
      processingTime: Date.now() - startTime,
      errorMessage: validation.error || 'Invalid click',
      clickId: resolvedClickId,
    });
    return sendBadRequest(res, validation.error || 'Invalid click');
  }

  try {
    const purchase = await mallAffiliateService.processConversion({
      clickId: resolvedClickId,
      externalOrderId: resolvedOrderId,
      orderAmount: resolvedOrderAmount,
      currency: currency || 'INR',
      status: status || 'pending',
      webhookPayload: req.body,
      purchasedAt: resolvedPurchasedAt ? new Date(resolvedPurchasedAt) : undefined,
      authenticatedBrandId,
    });

    const responseData = {
      purchaseId: purchase.purchaseId,
      status: purchase.status,
      cashbackAmount: purchase.actualCashback,
    };

    // Store idempotency response
    await storeIdempotency(conversionIdempKey, responseData);

    await updateWebhookLog(logId, {
      status: 'success',
      responseStatus: 200,
      responseBody: responseData,
      processingTime: Date.now() - startTime,
      clickId: resolvedClickId,
      purchaseId: purchase.purchaseId,
    });

    return sendSuccess(res, responseData, 'Conversion processed successfully');
  } catch (error: any) {
    await updateWebhookLog(logId, {
      status: 'failed',
      responseStatus: 500,
      processingTime: Date.now() - startTime,
      errorMessage: error.message,
      clickId: resolvedClickId,
    });
    throw error;
  }
});

/**
 * Confirm Purchase Webhook
 * POST /api/mall/webhook/confirm
 *
 * Called when a pending purchase is confirmed
 */
export const confirmPurchaseWebhook = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const logId = await logWebhookRequest(req, 'confirm');

  const { purchase_id, purchaseId, reason } = req.body;
  const resolvedPurchaseId = purchase_id || purchaseId;

  if (!resolvedPurchaseId) {
    await updateWebhookLog(logId, {
      status: 'invalid',
      responseStatus: 400,
      processingTime: Date.now() - startTime,
      errorMessage: 'Purchase ID is required',
    });
    return sendBadRequest(res, 'Purchase ID is required');
  }

  // Idempotency check
  const confirmIdempKey = `confirm:${resolvedPurchaseId}`;
  const { isDuplicate: isConfirmDup, cachedResponse: cachedConfirmResp } = await checkIdempotency(confirmIdempKey);
  if (isConfirmDup && cachedConfirmResp) {
    await updateWebhookLog(logId, { status: 'duplicate', responseStatus: 200, responseBody: cachedConfirmResp, processingTime: Date.now() - startTime, purchaseId: resolvedPurchaseId });
    return sendSuccess(res, cachedConfirmResp, 'Purchase already confirmed (idempotent)');
  }

  try {
    const purchase = await mallAffiliateService.confirmPurchase(resolvedPurchaseId, reason);

    const responseData = {
      purchaseId: purchase.purchaseId,
      status: purchase.status,
    };

    await storeIdempotency(confirmIdempKey, responseData);

    await updateWebhookLog(logId, {
      status: 'success',
      responseStatus: 200,
      responseBody: responseData,
      processingTime: Date.now() - startTime,
      purchaseId: purchase.purchaseId,
    });

    return sendSuccess(res, responseData, 'Purchase confirmed successfully');
  } catch (error: any) {
    await updateWebhookLog(logId, {
      status: 'failed',
      responseStatus: 500,
      processingTime: Date.now() - startTime,
      errorMessage: error.message,
      purchaseId: resolvedPurchaseId,
    });
    throw error;
  }
});

/**
 * Refund Webhook
 * POST /api/mall/webhook/refund
 *
 * Called when a purchase is refunded
 */
export const refundWebhook = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const logId = await logWebhookRequest(req, 'refund');

  const { purchase_id, purchaseId, reason, refund_amount, refundAmount } = req.body;
  const resolvedPurchaseId = purchase_id || purchaseId;
  const resolvedRefundAmount = refund_amount || refundAmount;
  const parsedRefundAmount = resolvedRefundAmount ? parseFloat(resolvedRefundAmount) : undefined;

  if (!resolvedPurchaseId) {
    await updateWebhookLog(logId, {
      status: 'invalid',
      responseStatus: 400,
      processingTime: Date.now() - startTime,
      errorMessage: 'Purchase ID is required',
    });
    return sendBadRequest(res, 'Purchase ID is required');
  }

  if (!reason) {
    await updateWebhookLog(logId, {
      status: 'invalid',
      responseStatus: 400,
      processingTime: Date.now() - startTime,
      errorMessage: 'Refund reason is required',
      purchaseId: resolvedPurchaseId,
    });
    return sendBadRequest(res, 'Refund reason is required');
  }

  // Idempotency check
  const refundIdempKey = `refund:${resolvedPurchaseId}`;
  const { isDuplicate: isRefundDup, cachedResponse: cachedRefundResp } = await checkIdempotency(refundIdempKey);
  if (isRefundDup && cachedRefundResp) {
    await updateWebhookLog(logId, { status: 'duplicate', responseStatus: 200, responseBody: cachedRefundResp, processingTime: Date.now() - startTime, purchaseId: resolvedPurchaseId });
    return sendSuccess(res, cachedRefundResp, 'Refund already processed (idempotent)');
  }

  try {
    const purchase = await mallAffiliateService.handleRefund(
      resolvedPurchaseId,
      reason,
      parsedRefundAmount && parsedRefundAmount > 0 ? parsedRefundAmount : undefined
    );

    const responseData = {
      purchaseId: purchase.purchaseId,
      status: purchase.status,
      ...(parsedRefundAmount && { refundAmount: parsedRefundAmount }),
    };

    await storeIdempotency(refundIdempKey, responseData);

    await updateWebhookLog(logId, {
      status: 'success',
      responseStatus: 200,
      responseBody: responseData,
      processingTime: Date.now() - startTime,
      purchaseId: purchase.purchaseId,
    });

    return sendSuccess(res, responseData, 'Refund processed successfully');
  } catch (error: any) {
    await updateWebhookLog(logId, {
      status: 'failed',
      responseStatus: 500,
      processingTime: Date.now() - startTime,
      errorMessage: error.message,
      purchaseId: resolvedPurchaseId,
    });
    throw error;
  }
});

/**
 * Reject Purchase Webhook
 * POST /api/mall/webhook/reject
 *
 * Called when a purchase is rejected (e.g., cancelled order)
 */
export const rejectPurchaseWebhook = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const logId = await logWebhookRequest(req, 'reject');

  const { purchase_id, purchaseId, reason } = req.body;
  const resolvedPurchaseId = purchase_id || purchaseId;

  if (!resolvedPurchaseId) {
    await updateWebhookLog(logId, {
      status: 'invalid',
      responseStatus: 400,
      processingTime: Date.now() - startTime,
      errorMessage: 'Purchase ID is required',
    });
    return sendBadRequest(res, 'Purchase ID is required');
  }

  if (!reason) {
    await updateWebhookLog(logId, {
      status: 'invalid',
      responseStatus: 400,
      processingTime: Date.now() - startTime,
      errorMessage: 'Rejection reason is required',
      purchaseId: resolvedPurchaseId,
    });
    return sendBadRequest(res, 'Rejection reason is required');
  }

  // Idempotency check
  const rejectIdempKey = `reject:${resolvedPurchaseId}`;
  const { isDuplicate: isRejectDup, cachedResponse: cachedRejectResp } = await checkIdempotency(rejectIdempKey);
  if (isRejectDup && cachedRejectResp) {
    await updateWebhookLog(logId, { status: 'duplicate', responseStatus: 200, responseBody: cachedRejectResp, processingTime: Date.now() - startTime, purchaseId: resolvedPurchaseId });
    return sendSuccess(res, cachedRejectResp, 'Purchase already rejected (idempotent)');
  }

  try {
    const purchase = await mallAffiliateService.rejectPurchase(resolvedPurchaseId, reason);

    const responseData = {
      purchaseId: purchase.purchaseId,
      status: purchase.status,
    };

    await storeIdempotency(rejectIdempKey, responseData);

    await updateWebhookLog(logId, {
      status: 'success',
      responseStatus: 200,
      responseBody: responseData,
      processingTime: Date.now() - startTime,
      purchaseId: purchase.purchaseId,
    });

    return sendSuccess(res, responseData, 'Purchase rejected successfully');
  } catch (error: any) {
    await updateWebhookLog(logId, {
      status: 'failed',
      responseStatus: 500,
      processingTime: Date.now() - startTime,
      errorMessage: error.message,
      purchaseId: resolvedPurchaseId,
    });
    throw error;
  }
});

/**
 * Get Brand Analytics (Admin)
 * GET /api/mall/affiliate/analytics/:brandId
 */
export const getBrandAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { brandId } = req.params;

  if (!Types.ObjectId.isValid(brandId)) {
    return sendBadRequest(res, 'Invalid brand ID');
  }

  // Default to last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  if (req.query.startDate) {
    startDate.setTime(new Date(req.query.startDate as string).getTime());
  }
  if (req.query.endDate) {
    endDate.setTime(new Date(req.query.endDate as string).getTime());
  }

  const analytics = await mallAffiliateService.getBrandAnalytics(brandId, startDate, endDate);

  return sendSuccess(res, analytics, 'Brand analytics retrieved successfully');
});

// ==================== DEMO/TEST ENDPOINTS ====================

/**
 * Simulate Purchase (Demo/Test Only)
 * POST /api/mall/demo/simulate-purchase
 *
 * For testing the cashback flow without real brand integration
 */
export const simulatePurchase = asyncHandler(async (req: Request, res: Response) => {
  const { clickId, orderAmount } = req.body;

  if (!clickId) {
    return sendBadRequest(res, 'Click ID is required');
  }

  if (!orderAmount || orderAmount <= 0) {
    return sendBadRequest(res, 'Valid order amount is required');
  }

  // Validate click
  const validation = await mallAffiliateService.validateClickForConversion(clickId);
  if (!validation.valid) {
    return sendBadRequest(res, validation.error || 'Invalid click');
  }

  // Generate a fake order ID
  const fakeOrderId = `DEMO_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;

  // Process as confirmed purchase (skip pending state for demo)
  const purchase = await mallAffiliateService.processConversion({
    clickId,
    externalOrderId: fakeOrderId,
    orderAmount,
    currency: 'INR',
    status: 'confirmed',
    webhookPayload: {
      demo: true,
      timestamp: new Date().toISOString(),
    },
  });

  return sendSuccess(res, {
    purchaseId: purchase.purchaseId,
    externalOrderId: fakeOrderId,
    orderAmount: purchase.orderAmount,
    cashbackRate: purchase.cashbackRate,
    cashbackAmount: purchase.actualCashback,
    status: purchase.status,
    message: 'Demo purchase created. Cashback will be credited after verification period.',
    verificationDays: purchase.verificationDays,
  }, 'Demo purchase simulated successfully');
});

/**
 * Trigger Cashback Credit Job (Demo/Test Only)
 * POST /api/mall/demo/credit-cashback
 *
 * Manually trigger the cashback credit job for testing
 */
export const triggerCashbackCredit = asyncHandler(async (req: Request, res: Response) => {
  const result = await mallAffiliateService.creditPendingCashback();

  return sendSuccess(res, result, `Credited ${result.credited} of ${result.total} pending cashbacks`);
});

/**
 * Fast-Track Purchase Credit (Demo/Test Only)
 * POST /api/mall/demo/fast-credit/:purchaseId
 *
 * Immediately credit cashback for a purchase (bypass verification period)
 */
export const fastTrackCredit = asyncHandler(async (req: Request, res: Response) => {
  const { purchaseId } = req.params;

  const { MallPurchase } = await import('../models/MallPurchase');
  const purchase = await MallPurchase.findOne({ purchaseId }).lean();

  if (!purchase) {
    return sendNotFound(res, 'Purchase not found');
  }

  if (purchase.status === 'credited') {
    return sendBadRequest(res, 'Purchase already credited');
  }

  if (purchase.status !== 'confirmed') {
    // Auto-confirm if pending
    await purchase.updateStatus('confirmed', 'Fast-tracked for demo', 'admin');
  }

  // Credit immediately
  await mallAffiliateService.creditCashbackForPurchase(purchase);

  return sendSuccess(res, {
    purchaseId: purchase.purchaseId,
    cashbackAmount: purchase.actualCashback,
    status: 'credited',
  }, 'Cashback credited successfully');
});

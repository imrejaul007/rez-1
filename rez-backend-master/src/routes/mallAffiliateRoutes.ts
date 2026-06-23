/**
 * Mall Affiliate Routes
 *
 * API routes for affiliate click tracking, conversion webhooks,
 * and user cashback management.
 */

import { Router } from 'express';
import {
  trackBrandClick,
  getUserClicks,
  getUserPurchases,
  getUserCashbackSummary,
  processConversionWebhook,
  confirmPurchaseWebhook,
  refundWebhook,
  rejectPurchaseWebhook,
  getBrandAnalytics,
  simulatePurchase,
  triggerCashbackCredit,
  fastTrackCredit,
} from '../controllers/mallAffiliateController';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { webhookAuth, demoWebhookAuth, webhookRateLimit } from '../middleware/webhookAuth';

const router = Router();

// ==================== USER-FACING ROUTES ====================

/**
 * Track Brand Click
 * POST /api/mall/affiliate/click
 * Auth: Optional (works for guests too, but tracks user if logged in)
 */
router.post('/click', optionalAuth, trackBrandClick);

/**
 * Get User's Click History
 * GET /api/mall/affiliate/clicks
 * Auth: Required
 */
router.get('/clicks', requireAuth, getUserClicks);

/**
 * Get User's Purchase History
 * GET /api/mall/affiliate/purchases
 * Auth: Required
 */
router.get('/purchases', requireAuth, getUserPurchases);

/**
 * Get User's Cashback Summary
 * GET /api/mall/affiliate/summary
 * Auth: Required
 */
router.get('/summary', requireAuth, getUserCashbackSummary);

// ==================== WEBHOOK ROUTES ====================

/**
 * Process Conversion Webhook
 * POST /api/mall/affiliate/webhook/conversion
 * Auth: Webhook API Key
 *
 * Called by brand/affiliate network when a purchase is made.
 * Body: { click_id, order_id, order_amount, currency?, status? }
 */
router.post(
  '/webhook/conversion',
  webhookAuth,
  webhookRateLimit(100, 60000), // 100 requests per minute
  processConversionWebhook
);

/**
 * Confirm Purchase Webhook
 * POST /api/mall/affiliate/webhook/confirm
 * Auth: Webhook API Key
 *
 * Called when a pending purchase is confirmed by the brand.
 * Body: { purchase_id, reason? }
 */
router.post(
  '/webhook/confirm',
  webhookAuth,
  webhookRateLimit(100, 60000),
  confirmPurchaseWebhook
);

/**
 * Refund Webhook
 * POST /api/mall/affiliate/webhook/refund
 * Auth: Webhook API Key
 *
 * Called when a purchase is refunded.
 * Body: { purchase_id, reason }
 */
router.post(
  '/webhook/refund',
  webhookAuth,
  webhookRateLimit(100, 60000),
  refundWebhook
);

/**
 * Reject Purchase Webhook
 * POST /api/mall/affiliate/webhook/reject
 * Auth: Webhook API Key
 *
 * Called when a purchase is rejected (e.g., order cancelled).
 * Body: { purchase_id, reason }
 */
router.post(
  '/webhook/reject',
  webhookAuth,
  webhookRateLimit(100, 60000),
  rejectPurchaseWebhook
);

// ==================== ADMIN ROUTES ====================

/**
 * Get Brand Analytics
 * GET /api/mall/affiliate/analytics/:brandId
 * Auth: Required (Admin)
 */
router.get('/analytics/:brandId', requireAuth, getBrandAnalytics);

// ==================== DEMO/TEST ROUTES ====================

/**
 * Simulate Purchase (Demo Only)
 * POST /api/mall/affiliate/demo/simulate-purchase
 * Auth: Demo (development only)
 *
 * For testing the cashback flow without real brand integration.
 * Body: { clickId, orderAmount }
 */
router.post('/demo/simulate-purchase', demoWebhookAuth, simulatePurchase);

/**
 * Trigger Cashback Credit Job (Demo Only)
 * POST /api/mall/affiliate/demo/credit-cashback
 * Auth: Demo (development only)
 *
 * Manually trigger the cashback credit job.
 */
router.post('/demo/credit-cashback', demoWebhookAuth, triggerCashbackCredit);

/**
 * Fast-Track Purchase Credit (Demo Only)
 * POST /api/mall/affiliate/demo/fast-credit/:purchaseId
 * Auth: Demo (development only)
 *
 * Immediately credit cashback for a purchase (bypass verification period).
 */
router.post('/demo/fast-credit/:purchaseId', demoWebhookAuth, fastTrackCredit);

export default router;

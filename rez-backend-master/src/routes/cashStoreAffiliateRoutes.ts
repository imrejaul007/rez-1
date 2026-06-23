/**
 * Cash Store Affiliate Routes
 *
 * API routes for affiliate click tracking, conversion webhooks,
 * and user cashback management for external brand purchases.
 *
 * Cash Store = Affiliate cashback for external websites (Amazon, Myntra, etc.)
 * Users earn real cashback (rupees) by shopping through tracking links.
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
import { createRateLimiter } from '../middleware/rateLimiter';

// Rate limiter for click endpoint: max 10 requests per minute per IP
const clickRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many click requests. Please try again in a minute.',
});

const router = Router();

// ==================== USER-FACING ROUTES ====================

/**
 * Track Brand Click
 * POST /api/cashstore/affiliate/click
 * Auth: Optional (works for guests too, but tracks user if logged in)
 *
 * Records the user's click and returns a tracking URL for affiliate attribution.
 */
router.post('/click', clickRateLimiter, optionalAuth, trackBrandClick);

/**
 * Get User's Click History
 * GET /api/cashstore/affiliate/clicks
 * Auth: Required
 *
 * Returns list of user's affiliate clicks with status.
 */
router.get('/clicks', requireAuth, getUserClicks);

/**
 * Get User's Purchase History
 * GET /api/cashstore/affiliate/purchases
 * Auth: Required
 *
 * Returns list of user's purchases made through affiliate links.
 */
router.get('/purchases', requireAuth, getUserPurchases);

/**
 * Get User's Cashback Summary
 * GET /api/cashstore/affiliate/summary
 * Auth: Required
 *
 * Returns aggregated cashback summary:
 * - Total earned
 * - Pending (awaiting confirmation)
 * - Confirmed (ready to credit)
 * - Credited (added to wallet)
 */
router.get('/summary', requireAuth, getUserCashbackSummary);

// ==================== WEBHOOK ROUTES ====================
// These endpoints are called by affiliate networks/brands

/**
 * Process Conversion Webhook
 * POST /api/cashstore/affiliate/webhook/conversion
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
 * POST /api/cashstore/affiliate/webhook/confirm
 * Auth: Webhook API Key
 *
 * Called when a pending purchase is confirmed by the brand (e.g., order delivered).
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
 * POST /api/cashstore/affiliate/webhook/refund
 * Auth: Webhook API Key
 *
 * Called when a purchase is refunded by the brand.
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
 * POST /api/cashstore/affiliate/webhook/reject
 * Auth: Webhook API Key
 *
 * Called when a purchase is rejected (e.g., order cancelled before delivery).
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
 * GET /api/cashstore/affiliate/analytics/:brandId
 * Auth: Required (Admin)
 *
 * Returns analytics for a specific brand:
 * - Click count
 * - Conversion rate
 * - Total revenue
 * - Cashback distributed
 */
router.get('/analytics/:brandId', requireAuth, getBrandAnalytics);

// ==================== DEMO/TEST ROUTES ====================
// These routes are for testing the cashback flow in development

/**
 * Simulate Purchase (Demo Only)
 * POST /api/cashstore/affiliate/demo/simulate-purchase
 * Auth: Demo (development only)
 *
 * For testing the cashback flow without real brand integration.
 * Body: { clickId, orderAmount }
 */
router.post('/demo/simulate-purchase', demoWebhookAuth, simulatePurchase);

/**
 * Trigger Cashback Credit Job (Demo Only)
 * POST /api/cashstore/affiliate/demo/credit-cashback
 * Auth: Demo (development only)
 *
 * Manually trigger the cashback credit job to process confirmed purchases.
 */
router.post('/demo/credit-cashback', demoWebhookAuth, triggerCashbackCredit);

/**
 * Fast-Track Purchase Credit (Demo Only)
 * POST /api/cashstore/affiliate/demo/fast-credit/:purchaseId
 * Auth: Demo (development only)
 *
 * Immediately credit cashback for a purchase (bypass verification period).
 */
router.post('/demo/fast-credit/:purchaseId', demoWebhookAuth, fastTrackCredit);

export default router;

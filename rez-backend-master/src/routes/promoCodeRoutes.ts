// @ts-nocheck
/**
 * promoCodeRoutes.ts — Promo code routes
 *
 * Consumer routes (require auth):
 *   POST /api/promo-codes/validate      — validate a promo code before checkout
 *   GET  /api/promo-codes/available     — list codes available to the current user
 *
 * Admin routes (require auth + admin role):
 *   GET    /api/promo-codes/analytics/overview — analytics overview
 *   GET    /api/promo-codes                    — list all codes (paginated)
 *   POST   /api/promo-codes                    — create a new code
 *   GET    /api/promo-codes/:id                — get single code
 *   PATCH  /api/promo-codes/:id                — update allowed fields
 *   DELETE /api/promo-codes/:id                — deactivate a code
 *   GET    /api/promo-codes/:id/usage          — usage statistics
 */
import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  validatePromoCode,
  getAvailablePromoCodes,
  createPromoCode,
  getAllPromoCodes,
  getPromoCode,
  updatePromoCode,
  deactivatePromoCode,
  getPromoCodeUsage,
  getPromoCodeAnalytics,
} from '../controllers/promoCodeController';

const router = Router();

// ── Consumer routes (authenticated users) ──────────────────────────────────
router.post('/validate', authenticate, validatePromoCode);
router.get('/available', authenticate, getAvailablePromoCodes);

// ── Admin routes (admin only) ──────────────────────────────────────────────
// Analytics overview must be mounted before /:id to avoid shadowing.
router.get('/analytics/overview', authenticate, requireAdmin, getPromoCodeAnalytics);

router.get('/', authenticate, requireAdmin, getAllPromoCodes);
router.post('/', authenticate, requireAdmin, createPromoCode);
router.get('/:id', authenticate, requireAdmin, getPromoCode);
router.patch('/:id', authenticate, requireAdmin, updatePromoCode);
router.delete('/:id', authenticate, requireAdmin, deactivatePromoCode);
router.get('/:id/usage', authenticate, requireAdmin, getPromoCodeUsage);

export default router;

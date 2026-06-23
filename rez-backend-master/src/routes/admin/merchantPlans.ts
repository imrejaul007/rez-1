// @ts-nocheck
import { Router, Request, Response } from 'express';
import { MerchantPlan, MerchantPlanTier } from '../../models/MerchantPlan';
import { requireAdmin } from '../../middleware/auth';
import { sendSuccess, sendError, sendBadRequest } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

const ALLOWED_PLANS: MerchantPlanTier[] = ['starter', 'growth', 'pro'];

const UPDATABLE_FIELDS = [
  'monthlyPrice',
  'maxProducts',
  'maxStores',
  'smsPerMonth',
  'whatsappPerMonth',
  'pushPerMonth',
  'analyticsRetentionDays',
] as const;

/**
 * GET /api/admin/merchant-plans
 * Returns all three merchant plans.
 * Seeds defaults automatically if the collection is empty.
 */
router.get(
  '/merchant-plans',
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      // Seed on first access if needed
      await MerchantPlan.ensureDefaults();

      const plans = await MerchantPlan.find({ isActive: true }).sort({ monthlyPrice: 1 }).lean();

      sendSuccess(res, { plans }, 'Merchant plans retrieved');
    } catch (err) {
      sendError(res, 'Failed to fetch merchant plans', 500);
    }
  }),
);

/**
 * GET /api/admin/merchant-plans/:plan
 * Returns a single merchant plan by tier name.
 */
router.get(
  '/merchant-plans/:plan',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const planName = req.params.plan as MerchantPlanTier;

    if (!ALLOWED_PLANS.includes(planName)) {
      return sendBadRequest(res, `Invalid plan. Must be one of: ${ALLOWED_PLANS.join(', ')}`);
    }

    try {
      await MerchantPlan.ensureDefaults();
      const plan = await MerchantPlan.findOne({ plan: planName }).lean();
      if (!plan) return sendBadRequest(res, 'Plan not found');
      sendSuccess(res, { plan }, 'Merchant plan retrieved');
    } catch (err) {
      sendError(res, 'Failed to fetch merchant plan', 500);
    }
  }),
);

/**
 * PATCH /api/admin/merchant-plans/:plan
 * Update limits/pricing for a specific tier.
 * Only whitelisted numeric fields can be changed.
 */
router.patch(
  '/merchant-plans/:plan',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const planName = req.params.plan as MerchantPlanTier;

    if (!ALLOWED_PLANS.includes(planName)) {
      return sendBadRequest(res, `Invalid plan. Must be one of: ${ALLOWED_PLANS.join(', ')}`);
    }

    // Build update payload — only accept whitelisted fields
    const update: Partial<Record<(typeof UPDATABLE_FIELDS)[number], number>> = {};
    for (const field of UPDATABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        const val = Number(req.body[field]);
        if (isNaN(val) || val < 0) {
          return sendBadRequest(res, `Field "${field}" must be a non-negative number`);
        }
        update[field] = val;
      }
    }

    if (Object.keys(update).length === 0) {
      return sendBadRequest(res, `No valid fields to update. Allowed: ${UPDATABLE_FIELDS.join(', ')}`);
    }

    try {
      await MerchantPlan.ensureDefaults();

      const plan = await MerchantPlan.findOneAndUpdate(
        { plan: planName },
        { $set: update },
        { new: true, runValidators: true },
      );

      if (!plan) return sendBadRequest(res, 'Plan not found');

      sendSuccess(res, { plan }, `Merchant plan "${planName}" updated`);
    } catch (err: any) {
      if (err?.name === 'ValidationError') {
        return sendBadRequest(res, err.message);
      }
      sendError(res, 'Failed to update merchant plan', 500);
    }
  }),
);

export default router;

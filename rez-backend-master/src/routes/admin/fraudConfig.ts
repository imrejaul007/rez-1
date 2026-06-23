// @ts-nocheck
/**
 * routes/admin/fraudConfig.ts — Admin CRUD for CashbackConfig / fraud tuning
 *
 * Endpoints
 * ─────────
 *   GET  /api/admin/fraud-config   — return active config
 *   PUT  /api/admin/fraud-config   — update active config fields
 *
 * All fields are optional on PUT; only supplied fields are updated.
 * After a successful update the in-process cache is invalidated so the
 * next cashbackService call picks up the new values within seconds.
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireSuperAdmin } from '../../middleware/auth';
import CashbackConfig, { invalidateCashbackConfigCache } from '../../models/CashbackConfig';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { logger } from '../../config/logger';

const router = Router();

// All fraud-config routes require a valid session AND super_admin role.
router.use(requireAuth);
router.use(requireSuperAdmin);

// Editable numeric fields — used to whitelist + validate the PUT body.
const EDITABLE_FIELDS = [
  'minOrderValue',
  'maxCashbackPerOrder',
  'maxCashbackPerUserPerDay',
  'maxCashbackPerMerchantPerDay',
  'cooldownMinutes',
  'maxRedemptionPercent',
  'cashbackHoldHours',
  'maxDevicesPerUser',
  'reconciliationIntervalHours',
  'riskScoreBlockThreshold',
  'riskScoreHoldThreshold',
] as const;

/**
 * @route  GET /api/admin/fraud-config
 * @desc   Return the currently active cashback / fraud config
 * @access super_admin
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    // Use the model directly (no cache) so the admin always sees the DB truth.
    let config = await CashbackConfig.findOne({ isActive: true }).lean();
    if (!config) {
      // Return the hard-coded defaults if no DB document exists yet.
      config = {
        name: 'default',
        minOrderValue: 100,
        maxCashbackPerOrder: 200,
        maxCashbackPerUserPerDay: 500,
        maxCashbackPerMerchantPerDay: 50000,
        cooldownMinutes: 30,
        maxRedemptionPercent: 40,
        cashbackHoldHours: 24,
        maxDevicesPerUser: 3,
        reconciliationIntervalHours: 6,
        riskScoreBlockThreshold: 70,
        riskScoreHoldThreshold: 30,
        isActive: true,
      } as any;
    }
    sendSuccess(res, { config });
  }),
);

/**
 * @route  PUT /api/admin/fraud-config
 * @desc   Update one or more cashback / fraud config fields
 * @access super_admin
 */
router.put(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const updates: Record<string, number> = {};

    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        const value = Number(req.body[field]);
        if (isNaN(value) || value < 0) {
          return res.status(400).json({
            success: false,
            message: `Invalid value for field '${field}': must be a non-negative number`,
          });
        }
        updates[field] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update',
      });
    }

    // Upsert — creates the default document if none exists yet.
    const updated = await CashbackConfig.findOneAndUpdate(
      { isActive: true },
      { $set: updates },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();

    // Bust the in-process cache so cashbackService picks up the new values immediately.
    invalidateCashbackConfigCache();

    logger.info('[ADMIN] CashbackConfig updated', {
      adminId: (req as any).user?._id,
      updates,
    });

    sendSuccess(res, { config: updated }, 'Fraud config updated successfully');
  }),
);

export default router;

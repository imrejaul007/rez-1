/**
 * merchantroutes/loyaltyConfig.ts
 *
 * Salon loyalty configuration routes for merchants.
 *
 * GET  /api/merchant/loyalty-config  — fetch current config (or defaults)
 * POST /api/merchant/loyalty-config  — upsert config
 */

import { Router, Request, Response } from 'express';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/merchantauth';
import { MerchantLoyaltyConfig } from '../models/MerchantLoyaltyConfig';

const router = Router();

router.use(authMiddleware);

const VALID_BONUS_CATEGORIES = ['hair', 'nails', 'spa', 'skin', 'makeup', 'massage', 'beard'] as const;

/**
 * GET /api/merchant/loyalty-config
 * Returns saved config for ?storeId=, or default values if not yet configured.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const storeId = (req.query.storeId as string) || (req as any).merchantId;

    if (!storeId) {
      return res.status(400).json({ success: false, message: 'storeId is required' });
    }

    const config = await MerchantLoyaltyConfig.findOne({ storeId }).lean();

    if (!config) {
      return res.json({
        success: true,
        data: {
          storeId,
          pointsPerRupee: 0.1,
          expiryDays: 365,
          bonusCategories: [],
          isActive: true,
          isDefault: true,
        },
      });
    }

    return res.json({ success: true, data: config });
  } catch (error) {
    logger.error('[loyaltyConfig] GET error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch loyalty config' });
  }
});

/**
 * POST /api/merchant/loyalty-config
 * Creates or updates the loyalty config for the store.
 *
 * Body: { storeId, pointsPerRupee, expiryDays, bonusCategories[], isActive }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const { storeId, pointsPerRupee, expiryDays, bonusCategories, isActive } = req.body;

    if (!storeId) {
      return res.status(400).json({ success: false, message: 'storeId is required' });
    }

    // Validate numeric fields
    const ppr = parseFloat(pointsPerRupee);
    const exp = parseInt(expiryDays, 10);

    if (isNaN(ppr) || ppr < 0) {
      return res.status(400).json({ success: false, message: 'pointsPerRupee must be a non-negative number' });
    }

    if (isNaN(exp) || exp < 1) {
      return res.status(400).json({ success: false, message: 'expiryDays must be at least 1' });
    }

    // Sanitise bonus categories
    const cats: string[] = Array.isArray(bonusCategories)
      ? bonusCategories.filter((c: string) => (VALID_BONUS_CATEGORIES as readonly string[]).includes(c))
      : [];

    const config = await MerchantLoyaltyConfig.findOneAndUpdate(
      { storeId },
      {
        $set: {
          merchantId,
          pointsPerRupee: ppr,
          expiryDays: exp,
          bonusCategories: cats,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );

    return res.status(200).json({
      success: true,
      data: config,
      message: 'Loyalty config saved',
    });
  } catch (error) {
    logger.error('[loyaltyConfig] POST error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save loyalty config' });
  }
});

export default router;

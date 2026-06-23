// @ts-nocheck
/**
 * Admin Cashback Rules Routes
 *
 * GET  /api/admin/cashback-rules  — get global cashback config + category multipliers
 * POST /api/admin/cashback-rules  — upsert global cashback config + category multipliers
 *
 * Config is stored in SystemConfig under key 'cashback_rules'.
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import SystemConfig from '../../models/SystemConfig';
import { asyncHandler } from '../../utils/asyncHandler';
import { logger } from '../../config/logger';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

const CONFIG_KEY = 'cashback_rules';

interface CategoryMultiplier {
  id: string;
  categoryName: string;
  multiplier: number;
}

interface CashbackRulesConfig {
  globalSettings: {
    defaultCashbackRate: number;
    maxCashbackPerTransaction: number;
    minOrderForCashback: number;
  };
  categoryMultipliers: CategoryMultiplier[];
}

const DEFAULT_CONFIG: CashbackRulesConfig = {
  globalSettings: {
    defaultCashbackRate: 2,
    maxCashbackPerTransaction: 500,
    minOrderForCashback: 0,
  },
  categoryMultipliers: [],
};

// GET /api/admin/cashback-rules
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const doc = await SystemConfig.findOne({ key: CONFIG_KEY }).lean();
    const config = (doc?.value as unknown as CashbackRulesConfig) || DEFAULT_CONFIG;
    return res.json({ success: true, data: config });
  }),
);

// POST /api/admin/cashback-rules
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { globalSettings, categoryMultipliers } = req.body as Partial<CashbackRulesConfig>;

    // Validate globalSettings
    if (!globalSettings) {
      return res.status(400).json({ success: false, message: 'globalSettings is required' });
    }
    const { defaultCashbackRate, maxCashbackPerTransaction, minOrderForCashback } = globalSettings;
    if (typeof defaultCashbackRate !== 'number' || defaultCashbackRate < 0 || defaultCashbackRate > 100) {
      return res.status(400).json({ success: false, message: 'defaultCashbackRate must be between 0 and 100' });
    }
    if (typeof maxCashbackPerTransaction !== 'number' || maxCashbackPerTransaction <= 0) {
      return res.status(400).json({ success: false, message: 'maxCashbackPerTransaction must be positive' });
    }
    if (typeof minOrderForCashback !== 'number' || minOrderForCashback < 0) {
      return res.status(400).json({ success: false, message: 'minOrderForCashback must be >= 0' });
    }

    // Validate category multipliers
    const multipliers: CategoryMultiplier[] = Array.isArray(categoryMultipliers) ? categoryMultipliers : [];
    for (const cat of multipliers) {
      if (!cat.categoryName?.trim()) {
        return res.status(400).json({ success: false, message: 'Each category must have a name' });
      }
      if (typeof cat.multiplier !== 'number' || cat.multiplier <= 0) {
        return res.status(400).json({ success: false, message: 'Each category multiplier must be > 0' });
      }
    }

    const payload: CashbackRulesConfig = {
      globalSettings: { defaultCashbackRate, maxCashbackPerTransaction, minOrderForCashback },
      categoryMultipliers: multipliers,
    };

    await SystemConfig.findOneAndUpdate(
      { key: CONFIG_KEY },
      { key: CONFIG_KEY, value: payload, updatedAt: new Date() },
      { upsert: true, new: true },
    );

    logger.info('[ADMIN] Cashback rules updated', {
      defaultCashbackRate,
      categoryCount: multipliers.length,
    });

    return res.json({ success: true, data: payload, message: 'Cashback rules saved successfully' });
  }),
);

export default router;

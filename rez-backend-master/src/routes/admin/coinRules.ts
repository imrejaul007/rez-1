/**
 * Admin Coin Rules Engine Routes
 *
 * ADM-02: Manage coin expiry, multiplier rules, and daily caps
 *
 * GET  /               - Get all coin rules from WalletConfig
 * PUT  /               - Update coin rules (expiry, multipliers, daily caps)
 * POST /multiplier     - Add a new multiplier rule
 * PUT  /multiplier/:index - Update a specific multiplier rule
 * DELETE /multiplier/:index - Remove a specific multiplier rule
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin, requireOperator } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendError } from '../../utils/response';
import { WalletConfig } from '../../models/WalletConfig';
import { invalidateWalletConfigCache } from '../../services/walletCacheService';
import { logger } from '../../config/logger';

const router = Router();

router.use(requireAuth);

const VALID_COIN_TYPES = ['rez', 'branded', 'promo', 'prive'] as const;
const VALID_RULE_TYPES = ['category', 'time_based', 'event', 'subscription'] as const;

// ── GET / — Fetch all coin rules ──
router.get('/', requireAdmin, asyncHandler(async (_req: Request, res: Response) => {
  const config = await WalletConfig.getOrCreate();
  const configObj = config.toObject();

  return sendSuccess(res, {
    expiryConfig: configObj.coinExpiryConfig || {
      rez: { expiryDays: 0, maxUsagePct: 100 },
      prive: { expiryDays: 365, maxUsagePct: 100 },
      promo: { expiryDays: 90, maxUsagePct: 20 },
      branded: { expiryDays: 0, maxUsagePct: 100 },
    },
    multiplierRules: configObj.coinManagement?.multiplierRules || [],
    dailyCaps: configObj.coinManagement?.dailyCaps || {
      perUserPerDay: 10000,
      globalDailyIssuance: 5000000,
      perTransactionMax: 2000,
    },
  }, 'Coin rules fetched');
}));

// ── PUT / — Bulk update coin rules ──
router.put('/', requireOperator, asyncHandler(async (req: Request, res: Response) => {
  const { expiryConfig, multiplierRules, dailyCaps } = req.body;
  const adminId = (req as any).user?.id || (req as any).adminUser?._id;

  const config = await WalletConfig.getOrCreate();

  // Update expiry config
  if (expiryConfig) {
    for (const coinType of VALID_COIN_TYPES) {
      if (expiryConfig[coinType]) {
        const rule = expiryConfig[coinType];
        if (typeof rule.expiryDays === 'number' && rule.expiryDays < 0) {
          return sendError(res, `expiryDays for ${coinType} cannot be negative`, 400);
        }
        if (typeof rule.maxUsagePct === 'number' && (rule.maxUsagePct < 0 || rule.maxUsagePct > 100)) {
          return sendError(res, `maxUsagePct for ${coinType} must be between 0 and 100`, 400);
        }
      }
    }
    (config as any).coinExpiryConfig = {
      ...(config as any).coinExpiryConfig?.toObject?.() || (config as any).coinExpiryConfig,
      ...expiryConfig,
    };
    config.markModified('coinExpiryConfig');
  }

  // Update multiplier rules
  if (multiplierRules && Array.isArray(multiplierRules)) {
    for (const rule of multiplierRules) {
      if (rule.multiplier != null && (rule.multiplier < 0.1 || rule.multiplier > 10)) {
        return sendError(res, `Multiplier value must be between 0.1 and 10.0`, 400);
      }
      if (rule.coinType && !VALID_COIN_TYPES.includes(rule.coinType)) {
        return sendError(res, `Invalid coinType: ${rule.coinType}`, 400);
      }
    }

    if (!config.coinManagement) {
      (config as any).coinManagement = {};
    }
    (config as any).coinManagement.multiplierRules = multiplierRules;
    config.markModified('coinManagement');
  }

  // Update daily caps
  if (dailyCaps) {
    if (dailyCaps.perUserPerDay != null && dailyCaps.perUserPerDay < 0) {
      return sendError(res, 'perUserPerDay cannot be negative', 400);
    }
    if (dailyCaps.globalDailyIssuance != null && dailyCaps.globalDailyIssuance < 0) {
      return sendError(res, 'globalDailyIssuance cannot be negative', 400);
    }
    if (dailyCaps.perTransactionMax != null && dailyCaps.perTransactionMax < 0) {
      return sendError(res, 'perTransactionMax cannot be negative', 400);
    }

    if (!config.coinManagement) {
      (config as any).coinManagement = {};
    }
    (config as any).coinManagement.dailyCaps = {
      ...(config as any).coinManagement.dailyCaps,
      ...dailyCaps,
    };
    config.markModified('coinManagement');
  }

  await config.save();

  // Invalidate cache so all services pick up new values
  await invalidateWalletConfigCache().catch((err) =>
    logger.warn('[CoinRules] Cache invalidation failed', { error: err.message })
  );

  logger.info('[CoinRules] Rules updated', { adminId, sections: Object.keys(req.body) });

  const updated = config.toObject();
  return sendSuccess(res, {
    expiryConfig: updated.coinExpiryConfig,
    multiplierRules: updated.coinManagement?.multiplierRules || [],
    dailyCaps: updated.coinManagement?.dailyCaps || {},
  }, 'Coin rules updated');
}));

// ── POST /multiplier — Add a single multiplier rule ──
router.post('/multiplier', requireOperator, asyncHandler(async (req: Request, res: Response) => {
  const { name, coinType, multiplier, conditions, categories, validFrom, validTo, isActive } = req.body;
  const adminId = (req as any).user?.id || (req as any).adminUser?._id;

  if (!name || !coinType || multiplier == null) {
    return sendError(res, 'name, coinType, and multiplier are required', 400);
  }
  if (!VALID_COIN_TYPES.includes(coinType)) {
    return sendError(res, `Invalid coinType: ${coinType}`, 400);
  }
  if (multiplier < 0.1 || multiplier > 10) {
    return sendError(res, 'Multiplier must be between 0.1 and 10.0', 400);
  }

  const config = await WalletConfig.getOrCreate();
  if (!config.coinManagement) {
    (config as any).coinManagement = { multiplierRules: [], dailyCaps: {} };
  }
  if (!config.coinManagement!.multiplierRules) {
    config.coinManagement!.multiplierRules = [];
  }

  const newRule = {
    name,
    coinType,
    multiplier,
    conditions: conditions || '',
    categories: categories || [],
    validFrom: validFrom ? new Date(validFrom) : undefined,
    validTo: validTo ? new Date(validTo) : undefined,
    isActive: isActive ?? false,
  };

  config.coinManagement!.multiplierRules.push(newRule as any);
  config.markModified('coinManagement');
  await config.save();

  await invalidateWalletConfigCache().catch((err) =>
    logger.warn('[CoinRules] Cache invalidation failed', { error: err.message })
  );

  logger.info('[CoinRules] Multiplier rule added', { adminId, ruleName: name });

  return sendSuccess(res, {
    rule: newRule,
    totalRules: config.coinManagement!.multiplierRules.length,
  }, 'Multiplier rule added');
}));

// ── PUT /multiplier/:index — Update a specific multiplier rule ──
router.put('/multiplier/:index', requireOperator, asyncHandler(async (req: Request, res: Response) => {
  const index = parseInt(req.params.index, 10);
  const adminId = (req as any).user?.id || (req as any).adminUser?._id;

  if (isNaN(index) || index < 0) {
    return sendError(res, 'Invalid rule index', 400);
  }

  const config = await WalletConfig.getOrCreate();
  const rules = config.coinManagement?.multiplierRules || [];

  if (index >= rules.length) {
    return sendError(res, `Rule at index ${index} not found`, 404);
  }

  const updates = req.body;

  if (updates.multiplier != null && (updates.multiplier < 0.1 || updates.multiplier > 10)) {
    return sendError(res, 'Multiplier must be between 0.1 and 10.0', 400);
  }
  if (updates.coinType && !VALID_COIN_TYPES.includes(updates.coinType)) {
    return sendError(res, `Invalid coinType: ${updates.coinType}`, 400);
  }

  // Merge updates
  const rule = rules[index];
  if (updates.name !== undefined) rule.name = updates.name;
  if (updates.coinType !== undefined) rule.coinType = updates.coinType;
  if (updates.multiplier !== undefined) rule.multiplier = updates.multiplier;
  if (updates.conditions !== undefined) rule.conditions = updates.conditions;
  if (updates.categories !== undefined) rule.categories = updates.categories;
  if (updates.validFrom !== undefined) rule.validFrom = updates.validFrom ? new Date(updates.validFrom) : undefined;
  if (updates.validTo !== undefined) rule.validTo = updates.validTo ? new Date(updates.validTo) : undefined;
  if (updates.isActive !== undefined) rule.isActive = updates.isActive;

  config.markModified('coinManagement');
  await config.save();

  await invalidateWalletConfigCache().catch((err) =>
    logger.warn('[CoinRules] Cache invalidation failed', { error: err.message })
  );

  logger.info('[CoinRules] Multiplier rule updated', { adminId, index });

  return sendSuccess(res, { rule, index }, 'Multiplier rule updated');
}));

// ── DELETE /multiplier/:index — Remove a multiplier rule ──
router.delete('/multiplier/:index', requireOperator, asyncHandler(async (req: Request, res: Response) => {
  const index = parseInt(req.params.index, 10);
  const adminId = (req as any).user?.id || (req as any).adminUser?._id;

  if (isNaN(index) || index < 0) {
    return sendError(res, 'Invalid rule index', 400);
  }

  const config = await WalletConfig.getOrCreate();
  const rules = config.coinManagement?.multiplierRules || [];

  if (index >= rules.length) {
    return sendError(res, `Rule at index ${index} not found`, 404);
  }

  const removed = rules.splice(index, 1)[0];
  config.markModified('coinManagement');
  await config.save();

  await invalidateWalletConfigCache().catch((err) =>
    logger.warn('[CoinRules] Cache invalidation failed', { error: err.message })
  );

  logger.info('[CoinRules] Multiplier rule removed', { adminId, index, ruleName: removed.name });

  return sendSuccess(res, { removed, remainingCount: rules.length }, 'Multiplier rule removed');
}));

export default router;

import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin, requireSuperAdmin } from '../../middleware/auth';
import { WalletConfig } from '../../models/WalletConfig';
import { invalidateWalletConfigCache } from '../../services/walletCacheService';
import { asyncHandler } from '../../utils/asyncHandler';
import { logger } from '../../config/logger';
import { pick } from '../../utils/safeAssign';

const router = Router();

router.use(requireAuth);

/**
 * @route   GET /api/admin/wallet-config
 * @desc    Get wallet configuration singleton
 * @access  Admin (any level)
 */
router.get('/', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    const config = await WalletConfig.getOrCreate();
    res.json({ success: true, data: config });
}));

/**
 * @route   PUT /api/admin/wallet-config
 * @desc    Update wallet configuration
 * @access  SuperAdmin only — critical platform config
 */
router.put('/', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
    const config = await WalletConfig.getOrCreate();
    const allowedFields = [
      'transferLimits', 'giftLimits', 'rechargeConfig',
      'expiryConfig', 'commissionRate', 'coinConversion', 'fraudThresholds',
      'redemptionConfig', 'habitLoopConfig', 'coinExpiryConfig', 'coinRules'
    ];

    // SECURITY: explicit per-subfield allowlist for each allowed section.
    // Previously the spread-merge on `...req.body[field]` would let an
    // attacker inject arbitrary keys into the config (e.g., `fraudThresholds.bypass`).
    const subFieldAllowlists: Record<string, readonly string[]> = {
      transferLimits: ['min', 'max', 'daily', 'monthly', 'perTransaction'],
      giftLimits: ['min', 'max', 'daily', 'monthly'],
      rechargeConfig: ['min', 'max', 'bonusPercentage', 'minForBonus'],
      expiryConfig: ['coinLifetimeDays', 'expiryNoticeDays', 'autoExtendOnActivity'],
      commissionRate: ['percentage', 'minAmount', 'maxAmount'],
      coinConversion: ['inrPerCoin', 'minRedeemCoins', 'maxRedeemCoins'],
      fraudThresholds: ['velocity', 'amountSpike', 'geoMismatch', 'newDevice'],
      redemptionConfig: ['minCoins', 'maxCoins', 'cooldownHours', 'tierMultipliers'],
      habitLoopConfig: ['streakBonus', 'dailyCheckin', 'weeklyMultiplier', 'monthlyMultiplier'],
      coinExpiryConfig: ['tierBasedLifetime', 'extendOnActivity', 'noticeDays'],
      coinRules: ['earnRate', 'burnRate', 'transferFee', 'lockupDays'],
    };

    for (const field of allowedFields) {
      if (req.body[field] === undefined) continue;
      const allowlist = subFieldAllowlists[field] || [];
      const existing = (config as any)[field]?.toObject?.() || (config as any)[field] || {};
      // Pick only the allowed sub-fields from the user input.
      const sanitized = pick<Record<string, any>>(req.body[field], allowlist);
      (config as any)[field] = { ...existing, ...sanitized };
      config.markModified(field);
    }

    await config.save();

    // Invalidate cached config so all services pick up new values immediately
    await invalidateWalletConfigCache().catch((err) => logger.warn('[WalletConfig] Cache invalidation for wallet config failed', { error: err.message }));

    res.json({ success: true, data: config, message: 'Wallet config updated' });
}));

export default router;

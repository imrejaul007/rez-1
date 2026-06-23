// @ts-nocheck
/**
 * EconGuard: RewardConfig Admin Routes
 * Endpoints for managing reward configurations (coins, cashback, referral, loyalty, campaign)
 *
 * GET  /api/admin/reward-configs              - List all configs (seed defaults if empty)
 * GET  /api/admin/reward-configs/:key         - Get single config
 * PATCH /api/admin/reward-configs/:key        - Update value and/or kill switch
 * GET  /api/admin/reward-configs/category/:cat - List configs in a category
 */

import { Router, Request, Response } from 'express';
import { requireAdmin, requireSuperAdmin } from '../../middleware/auth';
import RewardConfig, { IRewardConfig } from '../../models/RewardConfig';
import { invalidateRewardConfigCache } from '../../utils/rewardConfig';
import { asyncHandler } from '../../utils/asyncHandler';
import { logger } from '../../config/logger';

const router = Router();

/**
 * Default reward configurations seeded on first access
 */
const DEFAULT_REWARD_CONFIGS = [
  // COINS
  {
    key: 'trial_completion_coins',
    value: 50,
    description: 'Coins granted when trial booking completed',
    category: 'coins' as const,
    minValue: 0,
    maxValue: 500,
  },
  {
    key: 'new_category_points',
    value: 50,
    description: 'Points awarded for trying new category',
    category: 'coins' as const,
    minValue: 0,
    maxValue: 200,
  },
  {
    key: 'new_merchant_points',
    value: 25,
    description: 'Points awarded for trying new merchant',
    category: 'coins' as const,
    minValue: 0,
    maxValue: 150,
  },
  {
    key: 'streak_base_points',
    value: 10,
    description: 'Base points for streak bonus (multiplied by streak count)',
    category: 'coins' as const,
    minValue: 1,
    maxValue: 100,
  },
  {
    key: 'coin_expiry_days',
    value: 90,
    description: 'Days before unused coins expire',
    category: 'coins' as const,
    minValue: 30,
    maxValue: 365,
  },
  {
    key: 'max_coins_per_transaction',
    value: 500,
    description: 'Max coins redeemable per single transaction',
    category: 'coins' as const,
    minValue: 0,
    maxValue: 5000,
  },

  // CASHBACK
  {
    key: 'cashback_rate_base',
    value: 5,
    description: 'Base cashback rate % for standard orders',
    category: 'cashback' as const,
    minValue: 0,
    maxValue: 20,
  },
  {
    key: 'cashback_rate_electronics',
    value: 3,
    description: 'Cashback % for electronics category',
    category: 'cashback' as const,
    minValue: 0,
    maxValue: 15,
  },
  {
    key: 'cashback_rate_fashion',
    value: 2.5,
    description: 'Cashback % for fashion category',
    category: 'cashback' as const,
    minValue: 0,
    maxValue: 10,
  },
  {
    key: 'cashback_threshold_5000',
    value: 1,
    description: 'Extra cashback % for orders >= ₹5000',
    category: 'cashback' as const,
    minValue: 0,
    maxValue: 10,
  },
  {
    key: 'cashback_threshold_10000',
    value: 0.5,
    description: 'Extra cashback % for orders >= ₹10000',
    category: 'cashback' as const,
    minValue: 0,
    maxValue: 5,
  },
  {
    key: 'max_cashback_per_transaction',
    value: 200,
    description: 'Max cashback INR per transaction',
    category: 'cashback' as const,
    minValue: 0,
    maxValue: 1000,
  },
  {
    key: 'daily_cashback_cap_coins',
    value: 1000,
    description: 'Max cashback coins any user can earn in a day',
    category: 'cashback' as const,
    minValue: 100,
    maxValue: 10000,
  },

  // REFERRAL
  {
    key: 'referral_referrer_coins',
    value: 100,
    description: 'Coins to referrer when referee completes first purchase',
    category: 'referral' as const,
    minValue: 0,
    maxValue: 1000,
  },
  {
    key: 'referral_referee_coins',
    value: 50,
    description: 'Coins to new user on first purchase via referral',
    category: 'referral' as const,
    minValue: 0,
    maxValue: 500,
  },

  // LOYALTY
  {
    key: 'loyalty_silver_threshold',
    value: 500,
    description: 'Coins needed for Silver tier',
    category: 'loyalty' as const,
    minValue: 100,
    maxValue: 2000,
  },
  {
    key: 'loyalty_gold_threshold',
    value: 1500,
    description: 'Coins needed for Gold tier',
    category: 'loyalty' as const,
    minValue: 500,
    maxValue: 10000,
  },
  {
    key: 'loyalty_platinum_threshold',
    value: 5000,
    description: 'Coins needed for Platinum tier',
    category: 'loyalty' as const,
    minValue: 1000,
    maxValue: 50000,
  },

  // CAMPAIGN
  {
    key: 'campaign_max_coins_budget',
    value: 50000,
    description: 'Max coins any single campaign can distribute',
    category: 'campaign' as const,
    minValue: 1000,
    maxValue: 500000,
  },
];

/**
 * GET /api/admin/reward-configs
 * Fetch all reward configurations grouped by category
 * Seeds default configs if collection is empty
 */
router.get(
  '/',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const existingCount = await RewardConfig.countDocuments();

      // Seed defaults if empty
      if (existingCount === 0) {
        await RewardConfig.insertMany(DEFAULT_REWARD_CONFIGS);
        logger.info('[RewardConfig] Seeded default configurations', {
          count: DEFAULT_REWARD_CONFIGS.length,
        });
      }

      // Fetch all configs, sorted by category then key
      const configs = await RewardConfig.find().sort({ category: 1, key: 1 }).lean();

      // Group by category for easier frontend handling
      const grouped = configs.reduce(
        (acc, config) => {
          if (!acc[config.category]) {
            acc[config.category] = [];
          }
          acc[config.category].push(config);
          return acc;
        },
        {} as Record<string, IRewardConfig[]>,
      );

      res.json({
        success: true,
        data: {
          total: configs.length,
          byCategory: grouped,
          all: configs,
        },
      });
    } catch (err) {
      logger.error('[RewardConfig] GET failed', err as Error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch reward configs',
      });
    }
  }),
);

/**
 * GET /api/admin/reward-configs/:key
 * Fetch a single reward config by key
 */
router.get(
  '/:key',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const config = await RewardConfig.findOne({ key: req.params.key.toLowerCase() });

      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'Config not found',
          key: req.params.key,
        });
      }

      res.json({ success: true, data: config });
    } catch (err) {
      logger.error('[RewardConfig] GET :key failed', err as Error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch config',
      });
    }
  }),
);

/**
 * GET /api/admin/reward-configs/category/:category
 * Fetch all configs in a specific category
 */
router.get(
  '/category/:category',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const validCategories = ['coins', 'cashback', 'referral', 'loyalty', 'campaign'];
      const category = req.params.category.toLowerCase();

      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
        });
      }

      const configs = await RewardConfig.find({ category }).sort({ key: 1 }).lean();

      res.json({
        success: true,
        data: configs,
        category,
      });
    } catch (err) {
      logger.error('[RewardConfig] GET /category failed', err as Error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch configs by category',
      });
    }
  }),
);

/**
 * DEV: Economics control — Safe reward percentage caps
 * Prevents accidental/intentional reward explosion
 */
const REWARD_SAFETY_CAPS = {
  baseCashbackPercent: 20, // Max 20% cashback
  signupBonus: 200, // Max 200 coins signup bonus
  referralBonus: 100, // Max 100 coins per referral
  reviewBonus: 20, // Max 20 coins per review
};

/**
 * PATCH /api/admin/reward-configs/:key
 * Update a single config value and/or kill switch
 * Requires SuperAdmin for changes (not just viewing)
 *
 * DEV: economics control — Strict validation gates
 * Every coin issued must have measurable business justification
 */
router.patch(
  '/:key',
  requireSuperAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { value, isKillSwitched, platformKillSwitch, changeReason } = req.body;
      const config = await RewardConfig.findOne({ key: req.params.key.toLowerCase() });

      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'Config not found',
          key: req.params.key,
        });
      }

      const adminId = (req as any).user?.id || 'system';
      const oldValue = config.value;

      // Update value if provided
      if (value !== undefined) {
        if (typeof value !== 'number') {
          return res.status(400).json({
            success: false,
            message: 'Value must be a number',
          });
        }

        if (value < config.minValue || value > config.maxValue) {
          return res.status(400).json({
            success: false,
            message: `Value must be between ${config.minValue} and ${config.maxValue}`,
            received: value,
            minValue: config.minValue,
            maxValue: config.maxValue,
          });
        }

        // DEV: economics control — Business-safe maximum validation
        // Ensure reward percentages don't exceed safe maximums for P&L protection
        const keyLower = config.key.toLowerCase();
        if (keyLower.includes('cashback_rate') && value > REWARD_SAFETY_CAPS.baseCashbackPercent) {
          return res.status(400).json({
            success: false,
            message: `Exceeds safe maximum: cashback percentage cannot exceed ${REWARD_SAFETY_CAPS.baseCashbackPercent}%`,
            safeCap: REWARD_SAFETY_CAPS.baseCashbackPercent,
            requested: value,
          });
        }
        if (keyLower.includes('signup') && value > REWARD_SAFETY_CAPS.signupBonus) {
          return res.status(400).json({
            success: false,
            message: `Exceeds safe maximum: signup bonus cannot exceed ${REWARD_SAFETY_CAPS.signupBonus} coins`,
            safeCap: REWARD_SAFETY_CAPS.signupBonus,
            requested: value,
          });
        }
        if (keyLower.includes('referral') && value > REWARD_SAFETY_CAPS.referralBonus) {
          return res.status(400).json({
            success: false,
            message: `Exceeds safe maximum: referral bonus cannot exceed ${REWARD_SAFETY_CAPS.referralBonus} coins per referral`,
            safeCap: REWARD_SAFETY_CAPS.referralBonus,
            requested: value,
          });
        }
        if (keyLower.includes('review') && value > REWARD_SAFETY_CAPS.reviewBonus) {
          return res.status(400).json({
            success: false,
            message: `Exceeds safe maximum: review bonus cannot exceed ${REWARD_SAFETY_CAPS.reviewBonus} coins`,
            safeCap: REWARD_SAFETY_CAPS.reviewBonus,
            requested: value,
          });
        }

        // DEV: economics control — Audit log entry for all value changes
        if (!config.changeHistory) {
          config.changeHistory = [];
        }
        config.changeHistory.push({
          oldValue,
          newValue: value,
          changedBy: adminId,
          changedAt: new Date(),
          reason: changeReason || undefined,
        });

        config.value = value;
      }

      // Update kill switch if provided
      if (isKillSwitched !== undefined) {
        if (typeof isKillSwitched !== 'boolean') {
          return res.status(400).json({
            success: false,
            message: 'isKillSwitched must be a boolean',
          });
        }
        config.isKillSwitched = isKillSwitched;
      }

      // DEV: economics control — Master kill switch for entire platform
      // When true, disables ALL reward issuance across entire platform
      if (platformKillSwitch !== undefined) {
        if (typeof platformKillSwitch !== 'boolean') {
          return res.status(400).json({
            success: false,
            message: 'platformKillSwitch must be a boolean',
          });
        }
        config.platformKillSwitch = platformKillSwitch;
        logger.warn('[EconGuard] Platform Kill Switch Status', {
          enabled: platformKillSwitch,
          changedBy: adminId,
          timestamp: new Date(),
        });
      }

      // Record who made the change
      config.updatedBy = adminId;
      await config.save();

      // Invalidate cache so all services pick up the new value immediately
      invalidateRewardConfigCache(config.key);

      logger.info('[RewardConfig] Updated', {
        key: config.key,
        oldValue,
        newValue: config.value,
        isKillSwitched: config.isKillSwitched,
        platformKillSwitch: config.platformKillSwitch,
        updatedBy: adminId,
        reason: changeReason || 'none',
      });

      res.json({
        success: true,
        data: config,
        message: `Config updated: ${config.key}`,
        audit: {
          changedBy: adminId,
          timestamp: config.updatedAt,
          changeHistory: config.changeHistory,
        },
      });
    } catch (err) {
      logger.error('[RewardConfig] PATCH failed', err as Error);
      res.status(500).json({
        success: false,
        message: 'Failed to update config',
      });
    }
  }),
);

/**
 * POST /api/admin/reward-configs/:key/validate
 * Validate if a value would be acceptable for a config (without actually updating)
 */
router.post(
  '/:key/validate',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { value } = req.body;
      const config = await RewardConfig.findOne({ key: req.params.key.toLowerCase() });

      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'Config not found',
        });
      }

      if (typeof value !== 'number') {
        return res.json({
          success: false,
          valid: false,
          reason: 'Value must be a number',
        });
      }

      const valid = value >= config.minValue && value <= config.maxValue;
      res.json({
        success: true,
        valid,
        value,
        minValue: config.minValue,
        maxValue: config.maxValue,
        reason: !valid ? `Value must be between ${config.minValue} and ${config.maxValue}` : 'Valid',
      });
    } catch (err) {
      logger.error('[RewardConfig] POST /validate failed', err as Error);
      res.status(500).json({
        success: false,
        message: 'Validation failed',
      });
    }
  }),
);

/**
 * GET /api/admin/reward-configs/:key/audit-log
 * DEV: economics control — Retrieve full audit history of config changes
 * Tracks who changed what, when, and why (P&L accountability)
 */
router.get(
  '/:key/audit-log',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const config = await RewardConfig.findOne({ key: req.params.key.toLowerCase() });

      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'Config not found',
        });
      }

      res.json({
        success: true,
        data: {
          configKey: config.key,
          description: config.description,
          currentValue: config.value,
          changeHistory: config.changeHistory || [],
          currentAdmin: config.updatedBy,
          lastUpdated: config.updatedAt,
        },
      });
    } catch (err) {
      logger.error('[RewardConfig] GET /audit-log failed', err as Error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit log',
      });
    }
  }),
);

/**
 * GET /api/admin/reward-configs/platform-kill-switch/status
 * DEV: economics control — Check master platform kill switch status
 * When enabled, disables ALL reward issuance across entire platform
 */
router.get(
  '/platform-kill-switch/status',
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // Check if any config has platform kill switch enabled
      const killSwitchConfigs = await RewardConfig.find({ platformKillSwitch: true }).lean();

      const isEnabled = killSwitchConfigs.length > 0;

      res.json({
        success: true,
        data: {
          platformKillSwitchEnabled: isEnabled,
          affectedConfigs: killSwitchConfigs.map((c) => ({
            key: c.key,
            description: c.description,
            category: c.category,
          })),
          message: isEnabled
            ? 'Platform kill switch is ACTIVE - all reward issuance is disabled'
            : 'Platform kill switch is inactive - normal reward operations',
        },
      });
    } catch (err) {
      logger.error('[RewardConfig] GET /platform-kill-switch failed', err as Error);
      res.status(500).json({
        success: false,
        message: 'Failed to check kill switch status',
      });
    }
  }),
);

export default router;

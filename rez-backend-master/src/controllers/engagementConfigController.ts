import { logger } from '../config/logger';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import EngagementConfig from '../models/EngagementConfig';
import { asyncHandler } from '../utils/asyncHandler';

// Default configs to seed if none exist
const DEFAULT_CONFIGS = [
  { action: 'share_store', isEnabled: true, baseCoins: 10, bonusCoins: 50, dailyLimit: 5, requiresModeration: false },
  { action: 'share_offer', isEnabled: true, baseCoins: 5, bonusCoins: 30, dailyLimit: 10, requiresModeration: false },
  { action: 'poll_vote', isEnabled: true, baseCoins: 10, bonusCoins: 0, dailyLimit: 3, requiresModeration: false },
  { action: 'offer_comment', isEnabled: true, baseCoins: 15, bonusCoins: 5, dailyLimit: 5, requiresModeration: true, qualityChecks: { minTextLength: 20 } },
  { action: 'photo_upload', isEnabled: true, baseCoins: 25, bonusCoins: 75, dailyLimit: 3, requiresModeration: true, qualityChecks: { minPhotos: 1 } },
  { action: 'ugc_reel', isEnabled: true, baseCoins: 50, bonusCoins: 150, dailyLimit: 2, requiresModeration: true, qualityChecks: { minVideoLength: 10 } },
  { action: 'event_rating', isEnabled: true, baseCoins: 20, bonusCoins: 5, dailyLimit: 3, requiresModeration: false },
];

/**
 * Get all engagement configs.
 * GET /api/admin/engagement-config
 */
export const getAllConfigs = asyncHandler(async (req: Request, res: Response) => {
    let configs = await EngagementConfig.find().sort({ action: 1 }).lean();

    // Seed defaults if empty
    if (configs.length === 0) {
      await EngagementConfig.insertMany(DEFAULT_CONFIGS);
      configs = await EngagementConfig.find().sort({ action: 1 }).lean();
    }

    res.status(200).json({
      success: true,
      data: { configs },
    });
});

/**
 * Update a specific engagement config.
 * PATCH /api/admin/engagement-config/:action
 */
export const updateConfig = asyncHandler(async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id || (req as any).user?._id;
    const { action } = req.params;
    const updates = req.body;

    const config = await EngagementConfig.findOne({ action });
    if (!config) {
      return res.status(404).json({ success: false, error: 'Config not found for action: ' + action });
    }

    const allowedFields = ['isEnabled', 'baseCoins', 'bonusCoins', 'dailyLimit', 'requiresModeration', 'qualityChecks', 'multiplier', 'multiplierEndsAt'];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        (config as any)[field] = updates[field];
      }
    }

    if (adminId) {
      config.updatedBy = new mongoose.Types.ObjectId(adminId);
    }

    await config.save();

    res.status(200).json({
      success: true,
      message: `Config for ${action} updated`,
      data: { config },
    });
});

/**
 * Set a campaign multiplier with end date.
 * POST /api/admin/engagement-config/:action/campaign
 */
export const setCampaign = asyncHandler(async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id || (req as any).user?._id;
    const { action } = req.params;
    const { multiplier, endsAt } = req.body;

    if (!multiplier || multiplier < 1 || multiplier > 10) {
      return res.status(400).json({ success: false, error: 'Multiplier must be between 1 and 10' });
    }

    if (!endsAt) {
      return res.status(400).json({ success: false, error: 'Campaign end date is required' });
    }

    const config = await EngagementConfig.findOne({ action });
    if (!config) {
      return res.status(404).json({ success: false, error: 'Config not found for action: ' + action });
    }

    config.multiplier = multiplier;
    config.multiplierEndsAt = new Date(endsAt);
    if (adminId) {
      config.updatedBy = new mongoose.Types.ObjectId(adminId);
    }
    await config.save();

    res.status(200).json({
      success: true,
      message: `${multiplier}x campaign set for ${action} until ${endsAt}`,
      data: { config },
    });
});

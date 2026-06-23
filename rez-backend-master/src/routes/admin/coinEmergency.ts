/**
 * Admin Coin Emergency Routes
 *
 * A-04  POST  /emergency/pause   → Pause coin issuance for specific types
 *       POST  /emergency/resume  → Resume coin issuance
 *       GET   /emergency/status  → Check current pause state
 *
 * Uses WalletConfig.coinManagement.globalKillSwitch (existing schema)
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireSuperAdmin } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendError } from '../../utils/response';
import { WalletConfig } from '../../models/WalletConfig';
import { logger } from '../../config/logger';

const router = Router();

router.use(requireAuth);
router.use(requireSuperAdmin);

// Valid coin types
const VALID_COIN_TYPES = ['rez', 'branded', 'promo', 'prive'];

// ── A-04: POST /emergency/pause ──
router.post('/emergency/pause', asyncHandler(async (req: Request, res: Response) => {
  const { coinTypes, reason, durationHours } = req.body;
  const adminId = (req as any).user?.id || (req as any).adminUser?._id;

  if (!coinTypes || !Array.isArray(coinTypes) || coinTypes.length === 0) {
    return sendError(res, 'coinTypes is required (array of: rez, branded, promo, prive)', 400);
  }

  const invalidTypes = coinTypes.filter((t: string) => !VALID_COIN_TYPES.includes(t));
  if (invalidTypes.length > 0) {
    return sendError(res, `Invalid coin types: ${invalidTypes.join(', ')}`, 400);
  }

  if (!reason) {
    return sendError(res, 'reason is required', 400);
  }

  const config = await WalletConfig.getOrCreate();

  const now = new Date();
  const pausedUntil = durationHours
    ? new Date(now.getTime() + durationHours * 60 * 60 * 1000)
    : undefined;

  // Update the globalKillSwitch in coinManagement
  if (!config.coinManagement) {
    (config as any).coinManagement = {};
  }

  (config as any).coinManagement.globalKillSwitch = {
    active: true,
    reason,
    activatedBy: adminId,
    activatedAt: now,
    expiresAt: pausedUntil || null,
    pausedTypes: coinTypes,
  };

  config.markModified('coinManagement');
  await config.save();

  logger.warn(`[COIN_EMERGENCY] Paused coin types: ${coinTypes.join(', ')} | Reason: ${reason} | By: ${adminId}`);

  return sendSuccess(res, {
    paused: coinTypes,
    reason,
    pausedUntil: pausedUntil?.toISOString() || null,
    auditLogId: config._id,
  }, 'Coin issuance paused');
}));

// ── POST /emergency/resume ──
router.post('/emergency/resume', asyncHandler(async (req: Request, res: Response) => {
  const adminId = (req as any).user?.id || (req as any).adminUser?._id;
  const { coinTypes } = req.body;

  const config = await WalletConfig.getOrCreate();

  if (!(config as any).coinManagement?.globalKillSwitch?.active) {
    return sendError(res, 'No active pause to resume', 400);
  }

  if (coinTypes && Array.isArray(coinTypes) && coinTypes.length > 0) {
    // Resume only specific types
    const currentPaused = (config as any).coinManagement.globalKillSwitch.pausedTypes || [];
    const remaining = currentPaused.filter((t: string) => !coinTypes.includes(t));

    if (remaining.length === 0) {
      (config as any).coinManagement.globalKillSwitch.active = false;
    }
    (config as any).coinManagement.globalKillSwitch.pausedTypes = remaining;
  } else {
    // Resume all
    (config as any).coinManagement.globalKillSwitch.active = false;
    (config as any).coinManagement.globalKillSwitch.pausedTypes = [];
  }

  config.markModified('coinManagement');
  await config.save();

  logger.info(`[COIN_EMERGENCY] Resumed coin issuance | By: ${adminId}`);

  return sendSuccess(res, {
    resumed: true,
    stillPaused: (config as any).coinManagement.globalKillSwitch.pausedTypes || [],
  }, 'Coin issuance resumed');
}));

// ── GET /emergency/status ──
router.get('/emergency/status', asyncHandler(async (req: Request, res: Response) => {
  const config = await WalletConfig.getOrCreate();
  const killSwitch = (config as any).coinManagement?.globalKillSwitch || {};

  return sendSuccess(res, {
    active: killSwitch.active || false,
    pausedTypes: killSwitch.pausedTypes || [],
    reason: killSwitch.reason || '',
    activatedAt: killSwitch.activatedAt || null,
    expiresAt: killSwitch.expiresAt || null,
    rewardIssuanceEnabled: config.rewardIssuanceEnabled,
  }, 'Emergency status fetched');
}));

export default router;

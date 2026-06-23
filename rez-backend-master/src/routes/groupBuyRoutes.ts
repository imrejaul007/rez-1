// @ts-nocheck
/**
 * groupBuyRoutes.ts — Group Buy Sessions
 *
 * POST   /api/group-buy          — create a group buy session (requireAuth)
 * POST   /api/group-buy/join     — join via invite code (requireAuth)
 * GET    /api/group-buy/:groupId — get current status (requireAuth)
 * POST   /api/group-buy/:groupId/confirm — confirm purchase, award coins (requireAuth, creator only)
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import * as crypto from 'crypto';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';
import { GroupBuy } from '../models/GroupBuy';
import { CoinTransaction } from '../models/CoinTransaction';
import { logger } from '../config/logger';

const router = Router();

// Coin rate: 1 paise spent = 0.05 coins
const COINS_PER_PAISE = 0.05;

function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
}

/**
 * POST /api/group-buy
 * Create a group buy session.
 * Body: { storeId, targetAmountPaise }
 */
router.post(
  '/',
  generalLimiter,
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;
    const { storeId, targetAmountPaise } = req.body;

    if (!storeId || !mongoose.isValidObjectId(storeId)) {
      return res.status(400).json({ success: false, message: 'Valid storeId is required' });
    }
    if (!targetAmountPaise || typeof targetAmountPaise !== 'number' || targetAmountPaise <= 0) {
      return res.status(400).json({ success: false, message: 'targetAmountPaise must be a positive number' });
    }

    // Generate a unique 6-char invite code
    let inviteCode = generateInviteCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await GroupBuy.findOne({ inviteCode }).lean();
      if (!existing) break;
      inviteCode = generateInviteCode();
      attempts++;
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h

    const groupBuy = await GroupBuy.create({
      creator: userId,
      storeId: new mongoose.Types.ObjectId(storeId),
      targetAmountPaise,
      pooledAmountPaise: 0,
      members: [],
      inviteCode,
      status: 'open',
      expiresAt,
    });

    logger.info('[GroupBuy] Created', { groupId: groupBuy._id, creator: userId, inviteCode });

    return res.status(201).json({
      success: true,
      groupId: groupBuy._id,
      inviteCode: groupBuy.inviteCode,
    });
  }),
);

/**
 * POST /api/group-buy/join
 * Join a group buy via invite code.
 * Body: { inviteCode, amountPaise }
 */
router.post(
  '/join',
  generalLimiter,
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;
    const { inviteCode, amountPaise } = req.body;

    if (!inviteCode || typeof inviteCode !== 'string') {
      return res.status(400).json({ success: false, message: 'inviteCode is required' });
    }
    if (!amountPaise || typeof amountPaise !== 'number' || amountPaise <= 0) {
      return res.status(400).json({ success: false, message: 'amountPaise must be a positive number' });
    }

    const groupBuy = await GroupBuy.findOne({ inviteCode: inviteCode.toUpperCase() });

    if (!groupBuy) {
      return res.status(404).json({ success: false, message: 'Invalid invite code' });
    }
    if (groupBuy.status !== 'open') {
      return res.status(400).json({ success: false, message: `Group buy is ${groupBuy.status}` });
    }
    if (new Date() > groupBuy.expiresAt) {
      groupBuy.status = 'expired';
      await groupBuy.save();
      return res.status(400).json({ success: false, message: 'Group buy has expired' });
    }

    const alreadyMember = groupBuy.members.some((m) => m.userId.toString() === userId.toString());
    if (alreadyMember) {
      return res.status(409).json({ success: false, message: 'You have already joined this group buy' });
    }

    groupBuy.members.push({ userId, amountPaise });
    groupBuy.pooledAmountPaise += amountPaise;
    await groupBuy.save();

    logger.info('[GroupBuy] Member joined', { groupId: groupBuy._id, userId, amountPaise });

    return res.json({
      success: true,
      groupId: groupBuy._id,
      status: groupBuy.status,
      pooledAmountPaise: groupBuy.pooledAmountPaise,
      targetAmountPaise: groupBuy.targetAmountPaise,
      memberCount: groupBuy.members.length,
    });
  }),
);

/**
 * GET /api/group-buy/:groupId
 * Get current group buy status.
 */
router.get(
  '/:groupId',
  generalLimiter,
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { groupId } = req.params;

    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({ success: false, message: 'Invalid groupId' });
    }

    const groupBuy = await GroupBuy.findById(groupId).lean();

    if (!groupBuy) {
      return res.status(404).json({ success: false, message: 'Group buy not found' });
    }

    return res.json({
      success: true,
      groupId: groupBuy._id,
      storeId: groupBuy.storeId,
      status: groupBuy.status,
      pooledAmountPaise: groupBuy.pooledAmountPaise,
      targetAmountPaise: groupBuy.targetAmountPaise,
      inviteCode: groupBuy.inviteCode,
      expiresAt: groupBuy.expiresAt,
      memberCount: groupBuy.members.length,
      members: groupBuy.members.map((m) => ({
        userId: m.userId,
        amountPaise: m.amountPaise,
      })),
    });
  }),
);

/**
 * POST /api/group-buy/:groupId/confirm
 * Confirm purchase (creator only). Awards coins to all members.
 */
router.post(
  '/:groupId/confirm',
  generalLimiter,
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;
    const { groupId } = req.params;

    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({ success: false, message: 'Invalid groupId' });
    }

    const groupBuy = await GroupBuy.findById(groupId);

    if (!groupBuy) {
      return res.status(404).json({ success: false, message: 'Group buy not found' });
    }
    if (groupBuy.creator.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Only the creator can confirm this group buy' });
    }
    if (groupBuy.status !== 'open') {
      return res.status(400).json({ success: false, message: `Group buy is already ${groupBuy.status}` });
    }

    groupBuy.status = 'confirmed';
    await groupBuy.save();

    // Award coins to all members proportional to contribution
    const awardResults: Array<{ userId: string; coins: number; error?: string }> = [];

    for (const member of groupBuy.members) {
      const coinsToAward = Math.floor(member.amountPaise * COINS_PER_PAISE);
      if (coinsToAward <= 0) continue;

      try {
        await CoinTransaction.createTransaction(
          member.userId.toString(),
          'earned',
          coinsToAward,
          'purchase_reward',
          `Group buy reward for store purchase (${member.amountPaise} paise)`,
          { groupBuyId: groupBuy._id, storeId: groupBuy.storeId },
        );
        awardResults.push({ userId: member.userId.toString(), coins: coinsToAward });
      } catch (err: any) {
        logger.error('[GroupBuy] Failed to award coins', {
          userId: member.userId,
          groupId: groupBuy._id,
          error: err.message,
        });
        awardResults.push({ userId: member.userId.toString(), coins: coinsToAward, error: err.message });
      }
    }

    logger.info('[GroupBuy] Confirmed', { groupId: groupBuy._id, coinAwards: awardResults.length });

    return res.json({
      success: true,
      groupId: groupBuy._id,
      status: groupBuy.status,
      coinAwards: awardResults,
    });
  }),
);

export default router;

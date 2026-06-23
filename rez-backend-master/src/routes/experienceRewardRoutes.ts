// @ts-nocheck
import * as crypto from 'crypto';
import express, { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { logger } from '../config/logger';
import { getUserRewards, getMonthlySpendForUser, markUsed, getCurrentMonth } from '../services/ExperienceRewardService';
import { getRewardTier, getNextTierInfo, ExperienceReward } from '../models/ExperienceReward';

const router = Router();

// ── GET /api/experience-rewards/mine ─────────────────────────────────────────

router.get('/mine', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id?.toString() || (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const rewards = await getUserRewards(userId);
    return res.json({ success: true, data: rewards });
  } catch (err) {
    logger.error('[ExperienceRewardRoutes] GET /mine error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ── GET /api/experience-rewards/progress ─────────────────────────────────────

router.get('/progress', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id?.toString() || (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const spendThisMonth = await getMonthlySpendForUser(userId);
    const currentMonth = getCurrentMonth();
    const tierInfo = getRewardTier(spendThisMonth);
    const nextTierInfo = getNextTierInfo(spendThisMonth);

    const currentReward = await ExperienceReward.findOne({
      rezUserId: userId,
      month: currentMonth,
    }).lean();

    return res.json({
      success: true,
      data: {
        spendThisMonth,
        currentTier: tierInfo ?? null,
        nextTier: nextTierInfo?.nextTier ?? null,
        amountToNextTier: nextTierInfo?.amountToNextTier ?? null,
        currentReward: currentReward ?? null,
      },
    });
  } catch (err) {
    logger.error('[ExperienceRewardRoutes] GET /progress error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ── POST /api/experience-rewards/webhook/used ────────────────────────────────
// Called by Rendez when a credit is consumed.
// Verified via x-rendez-signature: sha256=HMAC(body, RENDEZ_WEBHOOK_SECRET)

router.post(
  '/webhook/used',
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  }),
  async (req: Request, res: Response) => {
    try {
      const secret = process.env.RENDEZ_WEBHOOK_SECRET || '';
      if (!secret) {
        logger.warn('[ExperienceRewardRoutes] RENDEZ_WEBHOOK_SECRET not configured — rejecting webhook');
        return res.status(500).json({ success: false, message: 'Webhook secret not configured' });
      }

      // Verify HMAC signature against raw body to avoid re-serialisation drift
      const incomingSignature = (req.headers['x-rendez-signature'] as string) || '';
      const rawBody = (req as any).rawBody as string;
      const expectedSig = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;

      const sigMatches = crypto.timingSafeEqual(Buffer.from(incomingSignature), Buffer.from(expectedSig));

      if (!sigMatches) {
        logger.warn('[ExperienceRewardRoutes] Webhook signature mismatch');
        return res.status(401).json({ success: false, message: 'Invalid signature' });
      }

      const { rendezCreditId } = req.body;
      if (!rendezCreditId || typeof rendezCreditId !== 'string') {
        return res.status(400).json({ success: false, message: 'rendezCreditId is required' });
      }

      await markUsed(rendezCreditId);
      return res.json({ success: true });
    } catch (err) {
      logger.error('[ExperienceRewardRoutes] POST /webhook/used error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },
);

export default router;

// @ts-nocheck
/**
 * userSubscriptionRoutes.ts — Sprint 9 / Sprint 13
 *
 * GET  /api/user/subscription              — get current user subscription
 * POST /api/user/subscription/subscribe    — subscribe to a plan
 * POST /api/user/subscription/create-order — create Razorpay subscription order (Sprint 13)
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';
import { UserSubscription } from '../models/UserSubscription';
import { CoinTransaction } from '../models/CoinTransaction';
import { logger } from '../config/logger';
import { razorpay, isLiveMode } from '../config/razorpay.config';

const router = Router();

router.use(requireAuth);
router.use(generalLimiter);

// ─── GET /api/user/subscription ───────────────────────────────────────────────

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id || (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const sub = await UserSubscription.findOne({ userId: new mongoose.Types.ObjectId(userId.toString()) })
      .sort({ createdAt: -1 })
      .lean();

    if (!sub) {
      // Return a default free-tier response when no record exists
      return res.json({
        success: true,
        subscription: {
          plan: 'free',
          status: 'active',
          startedAt: null,
          renewsAt: null,
          coinMultiplier: 1,
        },
      });
    }

    return res.json({
      success: true,
      subscription: {
        plan: sub.plan,
        status: sub.status,
        startedAt: sub.startedAt,
        renewsAt: sub.renewsAt,
        coinMultiplier: sub.coinMultiplier,
      },
    });
  }),
);

// ─── POST /api/user/subscription/subscribe ────────────────────────────────────

router.post(
  '/subscribe',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id || (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { plan } = req.body as { plan?: string };

    if (plan !== 'premium_monthly') {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan. Supported plans: premium_monthly',
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId.toString());
    const now = new Date();
    const renewsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

    // Upsert: mark any existing active subscription as cancelled, then create new one
    await UserSubscription.updateMany({ userId: userObjectId, status: 'active' }, { $set: { status: 'cancelled' } });

    const sub = await UserSubscription.create({
      userId: userObjectId,
      plan,
      status: 'active',
      startedAt: now,
      renewsAt,
      coinMultiplier: 2,
    });

    // Update User model subscription field (best-effort — User schema may vary)
    try {
      const User = mongoose.model('User');
      await User.findByIdAndUpdate(userObjectId, {
        $set: {
          'subscription.plan': 'premium_monthly',
          'subscription.coinMultiplier': 2,
        },
      });
    } catch (err) {
      // Non-blocking — log but don't fail the subscription creation
      logger.warn('[UserSubscription] Could not update User.subscription field', {
        userId: userId.toString(),
        error: (err as Error).message,
      });
    }

    // Award 50 welcome bonus coins (best-effort — balance operations require Redis lock)
    try {
      await CoinTransaction.createTransaction(
        userId.toString(),
        'bonus',
        50,
        'purchase',
        'Premium subscription welcome bonus',
        {
          idempotencyKey: `sub_welcome:${userId.toString()}:${(sub._id as mongoose.Types.ObjectId).toString()}`,
          subscriptionId: (sub._id as mongoose.Types.ObjectId).toString(),
        },
        null,
      );
    } catch (coinErr) {
      // Non-blocking — coin award failure should not roll back the subscription
      logger.warn('[UserSubscription] Welcome bonus coin award failed', {
        userId: userId.toString(),
        error: (coinErr as Error).message,
      });
    }

    logger.info('[UserSubscription] New subscription created', {
      userId: userId.toString(),
      plan,
      subscriptionId: (sub._id as mongoose.Types.ObjectId).toString(),
    });

    return res.status(201).json({
      success: true,
      subscription: {
        plan: sub.plan,
        status: sub.status,
        startedAt: sub.startedAt,
        renewsAt: sub.renewsAt,
        coinMultiplier: sub.coinMultiplier,
      },
    });
  }),
);

// ─── POST /api/user/subscription/create-order ─────────────────────────────────
// Creates a Razorpay plan (if needed) and subscription for REZ Premium (₹99/month).
// Returns { subscriptionId, shortUrl } for Razorpay checkout.

const REZ_PREMIUM_AMOUNT_PAISE = 9900; // ₹99 in paise

router.post(
  '/create-order',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id || (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      logger.error('[UserSubscription] Razorpay keys not configured');
      return res.status(503).json({ success: false, message: 'Payment service not configured' });
    }

    logger.info('[UserSubscription] Creating Razorpay subscription order', {
      userId: userId.toString(),
      mode: isLiveMode() ? 'live' : 'test',
    });

    // Step 1: Create a monthly plan for REZ Premium
    let planId: string;
    try {
      const plan: any = await (razorpay.plans as any).create({
        period: 'monthly',
        interval: 1,
        item: {
          name: 'REZ Premium',
          description: 'REZ Premium monthly subscription — 2x coin multiplier + exclusive benefits',
          amount: REZ_PREMIUM_AMOUNT_PAISE,
          currency: 'INR',
        },
        notes: { plan: 'premium_monthly', source: 'rez_app' },
      });
      planId = plan.id as string;
    } catch (planErr: any) {
      logger.error('[UserSubscription] Failed to create Razorpay plan', { error: planErr.message });
      return res.status(502).json({ success: false, message: 'Failed to create subscription plan' });
    }

    // Step 2: Create the subscription
    let subscription: any;
    try {
      subscription = await (razorpay.subscriptions as any).create({
        plan_id: planId,
        total_count: 12, // 12 monthly charges
        quantity: 1,
        customer_notify: 1,
        notes: {
          userId: userId.toString(),
          plan: 'premium_monthly',
        },
      });
    } catch (subErr: any) {
      logger.error('[UserSubscription] Failed to create Razorpay subscription', { error: subErr.message });
      return res.status(502).json({ success: false, message: 'Failed to create subscription' });
    }

    logger.info('[UserSubscription] Razorpay subscription created', {
      userId: userId.toString(),
      subscriptionId: subscription.id,
    });

    return res.status(201).json({
      success: true,
      subscriptionId: subscription.id as string,
      shortUrl: subscription.short_url as string,
    });
  }),
);

export default router;

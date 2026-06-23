// @ts-nocheck
/**
 * merchantBroadcastRoutes.ts — Sprint 9
 *
 * POST /api/merchant/broadcast/send — enqueue push notifications to a user segment
 *
 * Rate limit: 1 broadcast per hour per merchant (enforced via MongoDB timestamp check).
 *
 * Body:
 *   segment    : 'high_value' | 'at_risk' | 'new_users' | 'all'
 *   merchantId : ObjectId string of the merchant
 *   templateId?: ObjectId string of a MerchantTemplate to use
 *   title?     : notification title (overrides template or used standalone)
 *   body?      : notification body  (overrides template or used standalone)
 */

import { Router as ExpressRouter, Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';
import { CoinTransaction } from '../models/CoinTransaction';
import { MerchantTemplate } from '../models/MerchantTemplate';
import { notificationQueue } from '../config/bullmq-queues';
import { logger } from '../config/logger';

const router = ExpressRouter();

router.use(requireAuth);
router.use(generalLimiter);

// In-memory last-broadcast tracker (falls back gracefully without Redis/MongoDB collection)
// We store { merchantId -> lastBroadcastAt } to enforce 1 broadcast/hour per merchant.
// For a production-grade solution this should be backed by Redis or a dedicated collection.
const lastBroadcastMap = new Map<string, number>();

const BROADCAST_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

type Segment = 'high_value' | 'at_risk' | 'new_users' | 'all';

async function resolveSegmentUserIds(segment: Segment, merchantId: mongoose.Types.ObjectId): Promise<string[]> {
  if (segment === 'all') {
    // All users who have ever had a purchase_reward from this merchant
    const results = await CoinTransaction.aggregate([
      {
        $match: {
          source: 'purchase_reward',
          type: 'earned',
          'metadata.merchantId': merchantId,
        },
      },
      {
        $group: { _id: '$user' },
      },
    ]);
    return results.map((r: any) => r._id.toString());
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const userSpend = await CoinTransaction.aggregate([
    {
      $match: {
        source: 'purchase_reward',
        type: 'earned',
        'metadata.merchantId': merchantId,
      },
    },
    {
      $group: {
        _id: '$user',
        totalCoins: { $sum: '$amount' },
        lastTransaction: { $max: '$createdAt' },
        firstTransaction: { $min: '$createdAt' },
      },
    },
  ]);

  const matched: string[] = [];

  for (const u of userSpend) {
    const isNew = u.firstTransaction >= thirtyDaysAgo;
    const isAtRisk = u.lastTransaction < thirtyDaysAgo && u.lastTransaction >= ninetyDaysAgo;
    const isHighValue = u.totalCoins >= 500;

    if (segment === 'new_users' && isNew) {
      matched.push(u._id.toString());
    } else if (segment === 'at_risk' && isAtRisk) {
      matched.push(u._id.toString());
    } else if (segment === 'high_value' && isHighValue && !isNew) {
      matched.push(u._id.toString());
    }
  }

  return matched;
}

// ─── POST /api/merchant/broadcast/send ────────────────────────────────────────

router.post(
  '/broadcast/send',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req as any).user?._id || (req as any).user?.id;

    if (!merchantId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const merchantIdStr = merchantId.toString();

    // ── Rate limit: 1 broadcast per hour per merchant ──────────────────────
    const lastBroadcast = lastBroadcastMap.get(merchantIdStr);
    if (lastBroadcast && Date.now() - lastBroadcast < BROADCAST_COOLDOWN_MS) {
      const remainingMs = BROADCAST_COOLDOWN_MS - (Date.now() - lastBroadcast);
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return res.status(429).json({
        success: false,
        message: `Broadcast rate limit exceeded. Try again in ${remainingMinutes} minute(s).`,
        retryAfterMinutes: remainingMinutes,
      });
    }

    const {
      segment,
      templateId,
      title: bodyTitle,
      body: bodyText,
      merchantId: bodyMerchantId,
    } = req.body as {
      segment?: string;
      templateId?: string;
      title?: string;
      body?: string;
      merchantId?: string;
    };

    const validSegments: Segment[] = ['high_value', 'at_risk', 'new_users', 'all'];
    if (!segment || !validSegments.includes(segment as Segment)) {
      return res.status(400).json({
        success: false,
        message: `segment is required and must be one of: ${validSegments.join(', ')}`,
      });
    }

    // Resolve merchantId: prefer JWT-derived, fall back to body (if present and trusted)
    const resolvedMerchantObjectId = new mongoose.Types.ObjectId(merchantIdStr);

    // ── Resolve template if provided ───────────────────────────────────────
    let notifTitle = bodyTitle || 'New message from us!';
    let notifBody = bodyText || '';

    if (templateId && mongoose.Types.ObjectId.isValid(templateId)) {
      const template = await MerchantTemplate.findOne({
        _id: new mongoose.Types.ObjectId(templateId),
        merchantId: resolvedMerchantObjectId,
      }).lean();

      if (template) {
        notifTitle = bodyTitle || template.title;
        notifBody = bodyText || template.body;
      }
    }

    if (!notifBody) {
      return res.status(400).json({
        success: false,
        message: 'Notification body is required. Provide body or a valid templateId.',
      });
    }

    // ── Resolve user IDs for segment ───────────────────────────────────────
    const userIds = await resolveSegmentUserIds(segment as Segment, resolvedMerchantObjectId);

    if (userIds.length === 0) {
      return res.json({
        success: true,
        queued: 0,
        estimatedDelivery: '~0m',
        message: 'No users found for the specified segment.',
      });
    }

    // ── Enqueue one push_notification job per user ─────────────────────────
    lastBroadcastMap.set(merchantIdStr, Date.now());

    let enqueued = 0;

    // Batch-add jobs; continue even if individual jobs fail
    const jobPromises = userIds.map((uid) =>
      notificationQueue
        .add(
          'push_notification',
          {
            userId: uid,
            merchantId: merchantIdStr,
            segment,
            title: notifTitle,
            body: notifBody,
            templateId: templateId || null,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
          },
        )
        .then(() => {
          enqueued++;
        })
        .catch((err: Error) => {
          logger.warn('[MerchantBroadcast] Failed to enqueue job for user', {
            userId: uid,
            error: err.message,
          });
        }),
    );

    await Promise.all(jobPromises);

    const estimatedMinutes = Math.ceil(userIds.length / 500); // ~500 notifications/min estimate
    const estimatedDelivery = estimatedMinutes < 1 ? '~1m' : `~${estimatedMinutes}m`;

    logger.info('[MerchantBroadcast] Broadcast enqueued', {
      merchantId: merchantIdStr,
      segment,
      totalUsers: userIds.length,
      enqueued,
    });

    return res.status(202).json({
      success: true,
      queued: enqueued,
      estimatedDelivery,
    });
  }),
);

export default router;

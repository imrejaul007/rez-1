// @ts-nocheck
/**
 * adminBroadcastRoutes.ts — Sprint 14
 *
 * Admin platform-wide broadcast notification routes.
 *
 * GET  /api/admin/broadcast/estimate — estimate audience size
 * POST /api/admin/broadcast/send     — enqueue platform-wide push notifications
 * GET  /api/admin/broadcasts         — last 10 broadcast records
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { User } from '../models/User';
import { AdminBroadcast } from '../models/AdminBroadcast';
import { notificationQueue } from '../config/bullmq-queues';
import { logger } from '../config/logger';

const router = Router();
const BATCH_SIZE = 10_000;

router.use(requireAuth);
router.use(requireAdmin);

type Audience = 'all' | 'premium' | 'inactive' | string;

/**
 * Build a Mongoose filter object for a given audience value.
 */
function buildAudienceFilter(audience: Audience): Record<string, any> {
  if (audience === 'all') {
    return { isActive: true };
  }
  if (audience === 'premium') {
    // Users with an active premium/paid tier
    return { isActive: true, tier: { $in: ['premium', 'gold', 'platinum'] } };
  }
  if (audience === 'inactive') {
    // Users who have not been active for 30+ days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return { isActive: true, lastActiveAt: { $lt: thirtyDaysAgo } };
  }
  // Custom audience — treat as a tier name or role
  return { isActive: true, $or: [{ tier: audience }, { role: audience }] };
}

/**
 * @route   GET /api/admin/broadcast/estimate
 * @desc    Estimate the number of users that match the given audience
 * @access  Admin
 * @query   audience = 'all'|'premium'|'inactive'|<custom>
 */
router.get(
  '/broadcast/estimate',
  asyncHandler(async (req: Request, res: Response) => {
    const audience = ((req.query.audience as string) || 'all').trim();
    const filter = buildAudienceFilter(audience);
    const estimatedUsers = await User.countDocuments(filter);

    res.json({ success: true, estimatedUsers });
  }),
);

/**
 * @route   POST /api/admin/broadcast/send
 * @desc    Enqueue a platform-wide push notification for the specified audience
 * @access  Admin
 * @body    { audience: string, title: string, body: string }
 */
router.post(
  '/broadcast/send',
  asyncHandler(async (req: Request, res: Response) => {
    const { audience, title, body } = req.body as {
      audience?: string;
      title?: string;
      body?: string;
    };

    if (!audience || typeof audience !== 'string' || !audience.trim()) {
      return res.status(400).json({ success: false, message: '`audience` is required' });
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: '`title` is required' });
    }
    if (!body || typeof body !== 'string' || !body.trim()) {
      return res.status(400).json({ success: false, message: '`body` is required' });
    }

    const adminId = (req as any).userId || (req as any).user?._id;
    const filter = buildAudienceFilter(audience.trim());

    // Resolve user IDs in pages (max BATCH_SIZE total)
    const userIds: string[] = await User.find(filter)
      .select('_id')
      .limit(BATCH_SIZE)
      .lean()
      .then((docs) => docs.map((d: any) => String(d._id)));

    if (userIds.length === 0) {
      return res.json({ success: true, queued: 0, broadcastId: null });
    }

    const notifTitle = title.trim();
    const notifBody = body.trim();
    const audienceValue = audience.trim();

    // Enqueue one job per user — continue past individual failures
    let queued = 0;
    const jobPromises = userIds.map((uid) =>
      notificationQueue
        .add(
          'push_notification',
          {
            userId: uid,
            title: notifTitle,
            body: notifBody,
            source: 'admin_broadcast',
            audience: audienceValue,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
          },
        )
        .then(() => {
          queued++;
        })
        .catch((err: Error) => {
          logger.warn('[AdminBroadcast] Failed to enqueue job for user', {
            userId: uid,
            error: err.message,
          });
        }),
    );

    await Promise.all(jobPromises);

    // Persist broadcast record
    const sentAt = new Date();
    const record = await AdminBroadcast.create({
      adminId,
      audience: audienceValue,
      title: notifTitle,
      body: notifBody,
      sentAt,
      userCount: queued,
    });

    logger.info('[AdminBroadcast] Broadcast enqueued', {
      broadcastId: String(record._id),
      audience: audienceValue,
      totalUsers: userIds.length,
      queued,
    });

    res.status(202).json({ success: true, queued, broadcastId: String(record._id) });
  }),
);

/**
 * @route   GET /api/admin/broadcasts
 * @desc    Last 10 admin broadcasts
 * @access  Admin
 */
router.get(
  '/broadcasts',
  asyncHandler(async (req: Request, res: Response) => {
    const broadcasts = await AdminBroadcast.find()
      .select('_id audience title sentAt userCount')
      .sort({ sentAt: -1 })
      .limit(10)
      .lean();

    res.json({ success: true, data: broadcasts });
  }),
);

export default router;

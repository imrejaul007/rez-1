// @ts-nocheck
/**
 * Admin Marketing Analytics Routes
 * Aggregated marketing campaign performance metrics
 */

import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { logger } from '../../config/logger';
import { BroadcastCampaign } from '../../models/BroadcastCampaign';

const router = Router();

router.use(authenticate, requireAdmin);

// GET /admin/marketing/analytics
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Aggregate campaign stats
    const [channelStats, recentCampaigns, totalStats] = await Promise.all([
      // Channel breakdown
      BroadcastCampaign.aggregate([
        {
          $group: {
            _id: '$channel',
            sent: { $sum: '$stats.sent' },
            delivered: { $sum: '$stats.delivered' },
            failed: { $sum: '$stats.failed' },
            count: { $sum: 1 },
          },
        },
      ]),
      // Recent campaigns
      BroadcastCampaign.find()
        .sort({ createdAt: -1 })
        .limit(20)
        .select('name channel status stats createdAt scheduledAt')
        .lean(),
      // Totals
      BroadcastCampaign.aggregate([
        {
          $group: {
            _id: null,
            totalCampaignsSent: { $sum: 1 },
            totalMessagesDelivered: { $sum: '$stats.delivered' },
            totalMessagesSent: { $sum: '$stats.sent' },
            totalFailed: { $sum: '$stats.failed' },
          },
        },
      ]),
    ]);

    const totals = totalStats[0] || { totalCampaignsSent: 0, totalMessagesDelivered: 0, totalMessagesSent: 0 };
    const averageOpenRate =
      totals.totalMessagesSent > 0 ? Math.round((totals.totalMessagesDelivered / totals.totalMessagesSent) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalCampaignsSent: totals.totalCampaignsSent,
        totalMessagesDelivered: totals.totalMessagesDelivered,
        averageOpenRate,
        totalKeywordBidsActive: 0,
        channels: channelStats.map((c: any) => ({
          channel: c._id || 'unknown',
          sent: c.sent,
          delivered: c.delivered,
          failed: c.failed,
          campaigns: c.count,
        })),
        recentCampaigns,
      },
    });
  } catch (error: any) {
    logger.error('[MarketingAnalytics] Fetch failed:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch marketing analytics' });
  }
});

export default router;

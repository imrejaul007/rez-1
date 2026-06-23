// @ts-nocheck
/**
 * Admin Ads Routes — Direct implementation in rezbackend
 *
 * Manages AdCampaign moderation: list, stats, approve, reject, pause.
 * rez-ads-service is not deployed; all ad data lives in the shared MongoDB.
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import AdCampaign from '../../models/AdCampaign';
import { asyncHandler } from '../../utils/asyncHandler';
import { logger } from '../../config/logger';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

// GET / — list ads with filters + pagination
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.merchantId) filter.merchantId = new Types.ObjectId(req.query.merchantId as string);
    if (req.query.placement) filter.placement = req.query.placement;
    if (req.query.search) {
      const escaped = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ title: { $regex: escaped, $options: 'i' } }, { headline: { $regex: escaped, $options: 'i' } }];
    }

    const [ads, total] = await Promise.all([
      AdCampaign.find(filter)
        .populate('merchantId', 'businessName email')
        .populate('storeId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AdCampaign.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);
    return res.json({
      success: true,
      data: {
        ads,
        pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
      },
    });
  }),
);

// GET /stats — network-wide stats
router.get(
  '/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    const [statusCounts, totals] = await Promise.all([
      AdCampaign.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      AdCampaign.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalImpressions: { $sum: '$impressions' },
            totalClicks: { $sum: '$clicks' },
            totalSpend: { $sum: '$totalSpent' },
          },
        },
      ]),
    ]);

    const byStatus: Record<string, number> = {};
    for (const row of statusCounts) byStatus[row._id] = row.count;

    const agg = totals[0] || { total: 0, totalImpressions: 0, totalClicks: 0, totalSpend: 0 };

    return res.json({
      success: true,
      data: {
        total: agg.total,
        byStatus,
        totalImpressions: agg.totalImpressions,
        totalClicks: agg.totalClicks,
        totalSpend: agg.totalSpend,
      },
    });
  }),
);

// GET /:id — single ad
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const ad = await AdCampaign.findById(req.params.id)
      .populate('merchantId', 'businessName email phone')
      .populate('storeId', 'name address')
      .populate('reviewedBy', 'name email');

    if (!ad) return res.status(404).json({ success: false, message: 'Ad not found' });
    return res.json({ success: true, data: ad });
  }),
);

// PATCH /:id/approve
router.patch(
  '/:id/approve',
  asyncHandler(async (req: Request, res: Response) => {
    const ad = await AdCampaign.findById(req.params.id);
    if (!ad) return res.status(404).json({ success: false, message: 'Ad not found' });

    if (ad.status !== 'pending_review') {
      return res.status(400).json({ success: false, message: 'Only pending_review ads can be approved' });
    }

    ad.status = 'active';
    ad.reviewedBy = (req as any).userId ? new Types.ObjectId((req as any).userId) : undefined;
    ad.reviewedAt = new Date();
    await ad.save();

    logger.info('[ADMIN ADS] Ad approved', { adId: ad._id, adminId: (req as any).userId });
    return res.json({ success: true, data: ad, message: 'Ad approved and set to active' });
  }),
);

// PATCH /:id/reject
router.patch(
  '/:id/reject',
  asyncHandler(async (req: Request, res: Response) => {
    const { rejectionReason } = req.body as { rejectionReason?: string };
    if (!rejectionReason?.trim()) {
      return res.status(400).json({ success: false, message: 'rejectionReason is required' });
    }

    const ad = await AdCampaign.findById(req.params.id);
    if (!ad) return res.status(404).json({ success: false, message: 'Ad not found' });

    if (ad.status !== 'pending_review') {
      return res.status(400).json({ success: false, message: 'Only pending_review ads can be rejected' });
    }

    ad.status = 'rejected';
    ad.rejectionReason = rejectionReason.trim();
    ad.reviewedBy = (req as any).userId ? new Types.ObjectId((req as any).userId) : undefined;
    ad.reviewedAt = new Date();
    await ad.save();

    logger.info('[ADMIN ADS] Ad rejected', { adId: ad._id, reason: rejectionReason });
    return res.json({ success: true, data: ad, message: 'Ad rejected' });
  }),
);

// PATCH /:id/pause
router.patch(
  '/:id/pause',
  asyncHandler(async (req: Request, res: Response) => {
    const ad = await AdCampaign.findById(req.params.id);
    if (!ad) return res.status(404).json({ success: false, message: 'Ad not found' });

    if (ad.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Only active ads can be paused' });
    }

    ad.status = 'paused';
    await ad.save();

    logger.info('[ADMIN ADS] Ad paused by admin', { adId: ad._id });
    return res.json({ success: true, data: ad, message: 'Ad paused by admin' });
  }),
);

export default router;

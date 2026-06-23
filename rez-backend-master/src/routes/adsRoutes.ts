// @ts-nocheck
import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { authenticate } from '../middleware/auth';
import AdCampaign from '../models/AdCampaign';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// GET /api/ads/serve — serve a relevant ad for the authenticated user
router.get(
  '/serve',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { placement } = req.query;

    const filter: Record<string, unknown> = {
      status: 'active',
      startDate: { $lte: new Date() },
      $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: new Date() } }],
    };

    if (placement) filter.placement = placement;

    const ad = await AdCampaign.findOne(filter).sort({ bidAmount: -1, createdAt: -1 }).lean();

    if (!ad) return res.json({ success: true, data: null });

    return res.json({ success: true, data: ad });
  }),
);

// POST /api/ads/impression — record an ad impression
router.post(
  '/impression',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { adId } = req.body as { adId?: string };

    if (!adId || !Types.ObjectId.isValid(adId)) {
      return res.status(400).json({ success: false, message: 'Valid adId is required' });
    }

    await AdCampaign.findByIdAndUpdate(adId, { $inc: { impressions: 1 } });

    return res.json({ success: true });
  }),
);

// POST /api/ads/click — record an ad click
router.post(
  '/click',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { adId } = req.body as { adId?: string };

    if (!adId || !Types.ObjectId.isValid(adId)) {
      return res.status(400).json({ success: false, message: 'Valid adId is required' });
    }

    await AdCampaign.findByIdAndUpdate(adId, { $inc: { clicks: 1 } });

    return res.json({ success: true });
  }),
);

export default router;

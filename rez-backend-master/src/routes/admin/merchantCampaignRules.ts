// @ts-nocheck
/**
 * Admin Merchant Campaign Rules — read-only oversight of merchant store-level campaigns.
 * Allows admin to see what campaign rules merchants have created.
 */
import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import CampaignRule from '../../models/CampaignRule';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();
router.use(requireAuth);
router.use(requireAdmin);

// GET /api/admin/merchant-campaign-rules — list all merchant campaign rules
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const query: any = {};
    if (req.query.merchantId) query.merchantId = req.query.merchantId;
    if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';
    if (req.query.triggerType) query['trigger.type'] = req.query.triggerType;

    const [rules, total] = await Promise.all([
      CampaignRule.find(query)
        .populate('merchantId', 'businessName email')
        .populate('storeId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CampaignRule.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: rules,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),
);

// GET /api/admin/merchant-campaign-rules/stats — aggregate stats
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const [totalRules, activeRules, triggerBreakdown] = await Promise.all([
      CampaignRule.countDocuments({}),
      CampaignRule.countDocuments({ isActive: true }),
      CampaignRule.aggregate([
        { $group: { _id: '$trigger.type', count: { $sum: 1 }, totalFired: { $sum: '$firedCount' } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: { totalRules, activeRules, inactiveRules: totalRules - activeRules, triggerBreakdown },
    });
  }),
);

export default router;

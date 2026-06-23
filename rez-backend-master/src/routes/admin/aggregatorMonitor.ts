// @ts-nocheck
import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth';

const router = Router();

// GET /api/admin/aggregator-orders
// Returns aggregator order stats across all merchants
router.get('/aggregator-orders', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const AggregatorOrder = require('../../models/AggregatorOrder').default;
    const { platform, status, page = 1, limit = 50 } = req.query;

    const filter: any = {};
    if (platform) filter.platform = platform;
    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
      AggregatorOrder.find(filter)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .populate('storeId', 'name city')
        .lean(),
      AggregatorOrder.countDocuments(filter),
    ]);

    // Platform summary stats
    const platformStats = await AggregatorOrder.aggregate([
      { $group: { _id: '$platform', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
    ]);

    res.json({
      success: true,
      data: {
        orders,
        platformStats,
        meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

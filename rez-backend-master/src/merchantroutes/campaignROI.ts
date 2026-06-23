/**
 * Campaign ROI Routes
 * Merchant endpoints for campaign ROI tracking and analytics
 * Tracks: coins spent, revenue generated, orders from campaigns
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { Store } from '../models/Store';
import { Order } from '../models/Order';
import { CoinTransaction } from '../models/CoinTransaction';
import { logger, createServiceLogger } from '../config/logger';
import Offer from '../models/Offer';
import redisService from '../services/redisService';

const serviceLogger = createServiceLogger('offer-performance');

const router = Router();
router.use(authMiddleware);

interface CampaignROIData {
  campaignId: string;
  campaignName: string;
  coinsSpent: number;
  revenueGenerated: number;
  roi: number;
  orders: number;
  status: 'active' | 'completed';
  startDate: string;
  endDate?: string;
}

/**
 * @route   GET /api/merchant/campaigns/roi
 * @desc    Get ROI metrics for all campaigns
 * @access  Merchant
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { storeId, startDate, endDate, campaignId } = req.query;

    // Verify merchant owns store
    let store;
    if (storeId) {
      store = await Store.findOne({
        _id: storeId,
        merchantId,
      }).lean();
      if (!store) {
        return res.status(403).json({ success: false, message: 'Store not found' });
      }
    } else {
      // Get first store
      store = await Store.findOne({ merchantId }).lean();
      if (!store) {
        return res.status(404).json({ success: false, message: 'No store found' });
      }
    }

    // Build query for campaign ROI
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate as string);
    }

    // Fetch orders from this store with campaign data
    const ordersQuery: any = {
      store: store._id,
    };

    if (Object.keys(dateFilter).length > 0) {
      ordersQuery.createdAt = dateFilter;
    }

    if (campaignId) {
      ordersQuery.campaignId = campaignId;
    }

    const orders = await Order.find(ordersQuery).lean();

    // Group by campaign
    const campaignMap = new Map<string, any>();

    for (const order of orders) {
      const cId = (order as any).campaignId || 'organic';
      if (!campaignMap.has(cId)) {
        campaignMap.set(cId, {
          campaignId: cId,
          campaignName: (order as any).campaignName || 'Organic',
          coinsSpent: 0,
          revenueGenerated: 0,
          orders: 0,
          orderIds: [],
        });
      }

      const campaign = campaignMap.get(cId);
      campaign.revenueGenerated += order.totals?.total || 0;
      campaign.orders += 1;
      campaign.orderIds.push(order._id);
    }

    // Fetch coin transactions for coin cost analysis
    const coinTransactions = await CoinTransaction.find({
      store: store._id,
      type: 'campaign_spending',
      ...dateFilter,
    }).lean();

    // Aggregate coins by campaign
    const coinsBycampaign = new Map<string, number>();
    for (const tx of coinTransactions) {
      const cId = (tx as any).campaignId || 'organic';
      const current = coinsBycampaign.get(cId) || 0;
      coinsBycampaign.set(cId, current + (tx.amount || 0));
    }

    // Build final response
    const campaigns: CampaignROIData[] = [];
    for (const [cId, campaign] of campaignMap) {
      const coinsSpent = coinsBycampaign.get(cId) || 0;
      const roi = coinsSpent > 0 ? Math.round(((campaign.revenueGenerated - coinsSpent) / coinsSpent) * 100) : 0;

      campaigns.push({
        campaignId: cId,
        campaignName: campaign.campaignName,
        coinsSpent,
        revenueGenerated: campaign.revenueGenerated,
        roi,
        orders: campaign.orders,
        status:
          new Date(campaign.orderIds[0]?.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            ? 'active'
            : 'completed',
        startDate: new Date(Math.min(...campaign.orderIds.map((id: any) => new Date(id).getTime()))).toISOString(),
      });
    }

    // Sort by ROI descending
    campaigns.sort((a, b) => b.roi - a.roi);

    return res.json({
      success: true,
      data: {
        campaigns,
        summary: {
          totalCoinsSpent: campaigns.reduce((sum, c) => sum + c.coinsSpent, 0),
          totalRevenueGenerated: campaigns.reduce((sum, c) => sum + c.revenueGenerated, 0),
          totalOrders: campaigns.reduce((sum, c) => sum + c.orders, 0),
          overallROI:
            campaigns.reduce((sum, c) => sum + c.coinsSpent, 0) > 0
              ? Math.round(
                  ((campaigns.reduce((sum, c) => sum + c.revenueGenerated, 0) -
                    campaigns.reduce((sum, c) => sum + c.coinsSpent, 0)) /
                    campaigns.reduce((sum, c) => sum + c.coinsSpent, 0)) *
                    100,
                )
              : 0,
        },
      },
    });
  } catch (error: any) {
    logger.error('Error fetching campaign ROI:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign ROI',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/merchant/campaigns/roi/:campaignId
 * @desc    Get detailed ROI metrics for a specific campaign
 * @access  Merchant
 */
router.get('/:campaignId', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    const { campaignId } = req.params;

    if (!merchantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const store = await Store.findOne({ merchantId }).lean();
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    // Fetch orders from this campaign
    const orders = await Order.find({
      store: store._id,
      campaignId,
    })
      .lean()
      .sort({ createdAt: -1 });

    // Fetch coin transactions
    const coinTransactions = await CoinTransaction.find({
      store: store._id,
      campaignId,
      type: 'campaign_spending',
    }).lean();

    const totalCoinsSpent = coinTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totals?.total || 0), 0);
    const roi = totalCoinsSpent > 0 ? Math.round(((totalRevenue - totalCoinsSpent) / totalCoinsSpent) * 100) : 0;

    // Group by day for trend
    const dailyData = new Map<string, { revenue: number; orders: number; coins: number }>();

    for (const order of orders) {
      const dateKey = new Date(order.createdAt).toISOString().split('T')[0];
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, { revenue: 0, orders: 0, coins: 0 });
      }
      const day = dailyData.get(dateKey)!;
      day.revenue += order.totals?.total || 0;
      day.orders += 1;
    }

    for (const tx of coinTransactions) {
      const dateKey = new Date(tx.createdAt).toISOString().split('T')[0];
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, { revenue: 0, orders: 0, coins: 0 });
      }
      const day = dailyData.get(dateKey)!;
      day.coins += tx.amount || 0;
    }

    const dailyTrends = Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));

    return res.json({
      success: true,
      data: {
        campaignId,
        coinsSpent: totalCoinsSpent,
        revenueGenerated: totalRevenue,
        roi,
        orders: orders.length,
        averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
        coinsPerOrder: orders.length > 0 ? totalCoinsSpent / orders.length : 0,
        dailyTrends,
        topCustomers: orders.slice(0, 5).map((order) => ({
          customerId: order.user,
          orders: 1,
          spent: order.totals?.total,
        })),
      },
    });
  } catch (error: any) {
    logger.error('Error fetching campaign ROI details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign ROI details',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/merchant/campaigns/roi/onboarding/progress
 * @desc    Get onboarding checklist progress
 * @access  Merchant
 */
router.get('/onboarding/progress', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const store = await Store.findOne({ merchantId }).lean();
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    // Check checklist items
    const storePhoto = !!store.image;
    const { Product } = await import('../models/Product');
    const firstProduct = await Product.countDocuments({
      store: store._id,
    });
    const paymentSetup = !!(store as any).bankAccount;
    const firstOrder = await Order.countDocuments({ store: store._id });
    // CoinCampaign may not exist yet; fall back gracefully
    let firstCampaign = 0;
    try {
      const CoinCampaignModule = await import('../models/CoinCampaign' as any);
      const CoinCampaignModel = CoinCampaignModule.default || CoinCampaignModule.CoinCampaign;
      if (CoinCampaignModel) {
        firstCampaign = await CoinCampaignModel.countDocuments({ store: store._id });
      }
    } catch (_e) {
      // model not yet available
    }

    const items = [
      {
        id: 'store-photo',
        title: 'Add Store Photo',
        completed: storePhoto,
      },
      {
        id: 'first-product',
        title: 'Add Your First Product',
        completed: firstProduct > 0,
      },
      {
        id: 'payment-setup',
        title: 'Set Up Payments',
        completed: paymentSetup,
      },
      {
        id: 'first-order',
        title: 'Receive First Order',
        completed: firstOrder > 0,
      },
      {
        id: 'first-campaign',
        title: 'Launch First Campaign',
        completed: firstCampaign > 0,
      },
    ];

    const completedCount = items.filter((item) => item.completed).length;

    return res.json({
      success: true,
      data: {
        items,
        completionPercentage: Math.round((completedCount / items.length) * 100),
        completedCount,
        totalCount: items.length,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching onboarding progress:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch onboarding progress',
      error: error.message,
    });
  }
});

type OfferLabel = 'top_revenue' | 'aov_booster' | 'low_roi' | 'inactive';

interface OfferAnalytics {
  offerId: string;
  title: string;
  type: string;
  cashbackPercent: number;
  isActive: boolean;
  ordersCount: number;
  revenueGeneratedPaise: number;
  avgOrderValuePaise: number;
  cashbackCostPaise: number;
  roi: number;
  label: OfferLabel;
  labelReason: string;
}

/**
 * @route   GET /api/merchant/campaigns/offer-performance
 * @desc    Per-offer analytics — revenue, AOV, cashback cost, ROI, classification
 * @access  Merchant
 */
router.get('/offer-performance', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { storeId, days: daysParam } = req.query;
    if (!storeId || typeof storeId !== 'string')
      return res.status(400).json({ success: false, message: 'storeId query parameter is required' });

    const days = Math.min(Math.max(parseInt((daysParam as string) || '30', 10) || 30, 1), 365);

    const store = await Store.findOne({ _id: storeId, merchantId }).lean();
    if (!store) return res.status(403).json({ success: false, message: 'Store not found or access denied' });

    const cacheKey = `offer-perf:${storeId}:${days}`;
    try {
      const cached = await redisService.get<object>(cacheKey);
      if (cached) return res.json({ success: true, data: cached, cached: true });
    } catch (_e) {
      serviceLogger.warn('Redis cache read failed');
    }

    const offers = await Offer.find({
      'store.id': storeId,
      createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    })
      .select('_id title type cashbackPercentage validity.isActive')
      .lean();

    if (offers.length === 0) {
      return res.json({
        success: true,
        data: {
          offers: [],
          summary: {
            totalOffersAnalyzed: 0,
            topRevenueOffer: null,
            bestAOVOffer: null,
            worstROIOffer: null,
            recommendation: 'Create a spend-threshold offer to increase AOV',
          },
        },
      });
    }

    // Aggregate orders for this store within the days window, grouped by offer title or coupon code
    let aggRows: Array<{
      _id: string | null;
      ordersCount: number;
      revenueGeneratedPaise: number;
      cashbackCostPaise: number;
    }> = [];
    try {
      aggRows = await (Order as any).aggregate([
        {
          $match: {
            store: store._id,
            createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
            status: { $nin: ['cancelled', 'returned', 'refunded'] },
          },
        },
        {
          $group: {
            _id: { $ifNull: ['$offerRedemption.offerTitle', '$couponCode'] },
            ordersCount: { $sum: 1 },
            revenueGeneratedPaise: { $sum: '$totals.total' },
            cashbackCostPaise: { $sum: '$totals.cashback' },
          },
        },
      ]);
    } catch (e: any) {
      serviceLogger.error('Order aggregation failed', { error: e.message });
    }

    const metricsMap = new Map<
      string,
      { ordersCount: number; revenueGeneratedPaise: number; cashbackCostPaise: number }
    >();
    for (const row of aggRows) {
      if (row._id)
        metricsMap.set(row._id.toLowerCase().trim(), {
          ordersCount: row.ordersCount,
          revenueGeneratedPaise: Math.round(row.revenueGeneratedPaise || 0),
          cashbackCostPaise: Math.round(row.cashbackCostPaise || 0),
        });
    }

    const analytics: OfferAnalytics[] = offers.map((offer) => {
      const m = metricsMap.get((offer.title || '').toLowerCase().trim()) ?? {
        ordersCount: 0,
        revenueGeneratedPaise: 0,
        cashbackCostPaise: 0,
      };
      const { ordersCount, revenueGeneratedPaise, cashbackCostPaise } = m;
      const avgOrderValuePaise = ordersCount > 0 ? Math.round(revenueGeneratedPaise / ordersCount) : 0;
      const roi =
        cashbackCostPaise > 0
          ? Math.round(((revenueGeneratedPaise - cashbackCostPaise) / cashbackCostPaise) * 100)
          : ordersCount > 0
            ? 100
            : 0;
      return {
        offerId: offer._id.toString(),
        title: offer.title,
        type: offer.type,
        cashbackPercent: offer.cashbackPercentage ?? 0,
        isActive: offer.validity?.isActive ?? false,
        ordersCount,
        revenueGeneratedPaise,
        avgOrderValuePaise,
        cashbackCostPaise,
        roi,
        label: 'inactive' as OfferLabel,
        labelReason: '',
      };
    });

    const withOrders = analytics.filter((o) => o.ordersCount > 0);
    const totalRevenue = withOrders.reduce((s, o) => s + o.revenueGeneratedPaise, 0);
    const topRevenueOffer =
      withOrders.length > 0
        ? withOrders.reduce((a, b) => (b.revenueGeneratedPaise > a.revenueGeneratedPaise ? b : a))
        : null;
    const bestAOVOffer =
      withOrders.length > 0 ? withOrders.reduce((a, b) => (b.avgOrderValuePaise > a.avgOrderValuePaise ? b : a)) : null;
    const worstROIOffer = withOrders.length > 0 ? withOrders.reduce((a, b) => (b.roi < a.roi ? b : a)) : null;

    for (const o of analytics) {
      if (o.ordersCount === 0) {
        o.label = 'inactive';
        o.labelReason = 'No orders used this offer in the selected period';
        continue;
      }
      if (o.roi < 10) {
        o.label = 'low_roi';
        o.labelReason =
          o.roi < 0
            ? `Cashback cost exceeds revenue benefit — ROI is ${o.roi}%`
            : `Low return on investment — ROI is only ${o.roi}%`;
        continue;
      }
      if (topRevenueOffer && o.offerId === topRevenueOffer.offerId) {
        const pct = totalRevenue > 0 ? Math.round((o.revenueGeneratedPaise / totalRevenue) * 100) : 0;
        o.label = 'top_revenue';
        o.labelReason = `Drives ${pct}% of your revenue from offers`;
        continue;
      }
      if (bestAOVOffer && o.offerId === bestAOVOffer.offerId) {
        o.label = 'aov_booster';
        o.labelReason = `Highest average order value — ₹${(o.avgOrderValuePaise / 100).toFixed(0)} per order`;
        continue;
      }
      o.label = 'aov_booster';
      o.labelReason = `Positive ROI of ${o.roi}%`;
    }

    const negROI = analytics.find((o) => o.ordersCount > 0 && o.roi < 0);
    const recommendation = negROI
      ? `Consider pausing "${negROI.title}" — it has negative ROI (${negROI.roi}%)`
      : topRevenueOffer
        ? `Boost "${topRevenueOffer.title}" — it drives ${totalRevenue > 0 ? Math.round((topRevenueOffer.revenueGeneratedPaise / totalRevenue) * 100) : 0}% of your offer-attributed revenue`
        : 'Create a spend-threshold offer to increase AOV';

    const result = {
      offers: analytics,
      summary: {
        totalOffersAnalyzed: analytics.length,
        topRevenueOffer: topRevenueOffer?.title ?? null,
        bestAOVOffer: bestAOVOffer?.title ?? null,
        worstROIOffer: worstROIOffer?.title ?? null,
        recommendation,
      },
    };

    try {
      await redisService.set(cacheKey, JSON.stringify(result), 600);
    } catch (_e) {
      serviceLogger.warn('Redis cache write failed');
    }

    return res.json({ success: true, data: result });
  } catch (error: any) {
    serviceLogger.error('Error fetching offer performance', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to fetch offer performance', error: error.message });
  }
});

export default router;

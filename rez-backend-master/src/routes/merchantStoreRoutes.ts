// @ts-nocheck
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { authMiddleware as authenticateMerchant } from '../middleware/merchantauth';
import { Store } from '../models/Store';
import { logger } from '../config/logger';

const router = Router();

router.use(authenticateMerchant);

/**
 * GET /api/merchant/stores
 * List all stores for the authenticated merchant, enriched with daily visit
 * counts and monthly revenue from CoinTransactions.
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId =
      (req as any).merchantId || (req as any).userId || (req as any).user?._id || (req as any).user?.id;
    if (!merchantId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const merchantObjId = new mongoose.Types.ObjectId(merchantId.toString());

    const stores = await Store.find({ merchantId: merchantObjId })
      .select('_id name location contact category isActive')
      .lean();

    if (stores.length === 0) {
      return res.json({ success: true, stores: [] });
    }

    const storeIds = stores.map((s) => s._id);

    // Daily visits: count of userstreaks with these storeIds updated today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Monthly revenue: sum of CoinTransaction amounts this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [dailyVisitsRaw, monthlyRevenueRaw] = await Promise.all([
      mongoose.connection
        .collection('userstreaks')
        .aggregate([
          {
            $match: {
              lastStoreId: { $in: storeIds },
              updatedAt: { $gte: todayStart },
            },
          },
          {
            $group: {
              _id: '$lastStoreId',
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),

      mongoose.connection
        .collection('cointransactions')
        .aggregate([
          {
            $match: {
              'metadata.storeId': { $in: storeIds.map((id) => id.toString()) },
              createdAt: { $gte: monthStart },
            },
          },
          {
            $group: {
              _id: '$metadata.storeId',
              total: { $sum: '$amount' },
            },
          },
        ])
        .toArray(),
    ]);

    // Build lookup maps
    const visitsMap = new Map<string, number>();
    for (const row of dailyVisitsRaw) {
      visitsMap.set(String(row._id), row.count as number);
    }

    const revenueMap = new Map<string, number>();
    for (const row of monthlyRevenueRaw) {
      revenueMap.set(String(row._id), row.total as number);
    }

    const enriched = stores.map((store) => ({
      ...store,
      stats: {
        dailyVisits: visitsMap.get(String(store._id)) ?? 0,
        monthlyRevenue: revenueMap.get(String(store._id)) ?? 0,
      },
    }));

    return res.json({ success: true, stores: enriched });
  }),
);

/**
 * POST /api/merchant/stores
 * Add a new store location linked to the authenticated merchant.
 * Body: { name, address, city, phone, category }
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId =
      (req as any).merchantId || (req as any).userId || (req as any).user?._id || (req as any).user?.id;
    if (!merchantId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { name, address, city, phone, category } = req.body as {
      name?: string;
      address?: string;
      city?: string;
      phone?: string;
      category?: string;
    };

    if (!name || !address || !city || !category) {
      return res.status(400).json({ success: false, message: 'name, address, city, and category are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ success: false, message: 'Invalid category id' });
    }

    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

    const store = await Store.create({
      name,
      slug,
      merchantId: new mongoose.Types.ObjectId(merchantId.toString()),
      category: new mongoose.Types.ObjectId(category),
      location: { address, city },
      contact: { phone },
      isActive: true,
      isFeatured: false,
      isVerified: false,
      ratings: { average: 0, count: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } },
      offers: { isPartner: false },
      operationalInfo: { acceptsWalletPayment: false, paymentMethods: [], hours: {} },
      deliveryCategories: {
        fastDelivery: false,
        budgetFriendly: false,
        ninetyNineStore: false,
        premium: false,
        organic: false,
        alliance: false,
        lowestPrice: false,
        mall: false,
        cashStore: false,
      },
      analytics: {
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        repeatCustomers: 0,
        followersCount: 0,
      },
      tags: [],
    });

    logger.info(`[merchantStoreRoutes] New store created: ${store._id} for merchant ${merchantId}`);

    return res.status(201).json({
      success: true,
      storeId: store._id,
      name: store.name,
    });
  }),
);

/**
 * POST /api/merchant/stores/:storeId/switch
 * Set active store context (client manages active store in AsyncStorage).
 */
router.post(
  '/:storeId/switch',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId =
      (req as any).merchantId || (req as any).userId || (req as any).user?._id || (req as any).user?.id;
    if (!merchantId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { storeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({ success: false, message: 'Invalid storeId' });
    }

    const store = await Store.findOne({
      _id: new mongoose.Types.ObjectId(storeId),
      merchantId: new mongoose.Types.ObjectId(merchantId.toString()),
    })
      .select('_id name')
      .lean();

    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    return res.json({
      success: true,
      storeId: store._id,
      storeName: store.name,
      switched: true,
    });
  }),
);

export default router;

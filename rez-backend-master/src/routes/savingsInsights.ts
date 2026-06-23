// @ts-nocheck
import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';
import { CoinTransaction } from '../models/CoinTransaction';
import Offer from '../models/Offer';

const router = Router();

router.use(generalLimiter);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseCoords(lat: unknown, lng: unknown): [number, number] | null {
  const la = parseFloat(String(lat));
  const lo = parseFloat(String(lng));
  if (isNaN(la) || isNaN(lo)) return null;
  if (la < -90 || la > 90 || lo < -180 || lo > 180) return null;
  return [la, lo];
}

/** Haversine distance in metres between two [lat,lng] pairs */
function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Batch-fetch the best cashback offer for each store in a single query.
 * Returns a Map<storeIdString, bestOffer>.
 */
async function fetchBestCashbackOffers(
  storeIds: mongoose.Types.ObjectId[],
  selectFields: string = 'cashbackPercentage store.id store.logo',
): Promise<Map<string, any>> {
  if (storeIds.length === 0) return new Map();

  const offers = await (Offer as any).aggregate([
    {
      $match: {
        'store.id': { $in: storeIds },
        'validity.isActive': true,
        type: 'cashback',
      },
    },
    { $sort: { 'store.id': 1, cashbackPercentage: -1 } },
    {
      $group: {
        _id: '$store.id',
        cashbackPercentage: { $first: '$cashbackPercentage' },
        storeLogo: { $first: '$store.logo' },
      },
    },
  ]);

  const map = new Map<string, any>();
  for (const o of offers) {
    map.set(o._id.toString(), {
      cashbackPercentage: o.cashbackPercentage,
      store: { id: o._id, logo: o.storeLogo },
    });
  }
  return map;
}

// ---------------------------------------------------------------------------
// GET /api/user/savings/missed
// ---------------------------------------------------------------------------
router.get(
  '/missed',
  requireAuth,
  asyncHandler(async (req: any, res: any) => {
    const userId = req.user?.id || req.user?._id?.toString();
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const coords = parseCoords(req.query.lat, req.query.lng);
    if (!coords) {
      return res.status(400).json({ success: false, message: 'Valid lat and lng query params are required' });
    }
    const [userLat, userLng] = coords;
    const radiusMeters = Math.min(parseInt(String(req.query.radiusMeters ?? '2000'), 10) || 2000, 50_000);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Last 5 transactions with a storeId in the past 30 days
    const recentTxns = await CoinTransaction.find({
      user: new mongoose.Types.ObjectId(userId),
      'metadata.storeId': { $exists: true, $ne: null },
      createdAt: { $gte: thirtyDaysAgo },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('metadata.storeId metadata.storeName amount createdAt')
      .lean();

    if (recentTxns.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const Store = mongoose.model('Store');

    // Batch-fetch all transaction stores + their offers in 2 queries instead of N
    const txnStoreIds = recentTxns.map((txn) => txn.metadata?.storeId?.toString()).filter(Boolean) as string[];
    const uniqueTxnStoreIds = [...new Set(txnStoreIds)];
    const txnStoreObjIds = uniqueTxnStoreIds.map((id) => new mongoose.Types.ObjectId(id));

    const [txnStores, txnOfferMap] = await Promise.all([
      Store.find({ _id: { $in: txnStoreObjIds } })
        .select('name logo category location.coordinates ratings.average')
        .lean(),
      fetchBestCashbackOffers(txnStoreObjIds),
    ]);

    const storeMap = new Map<string, any>();
    for (const s of txnStores) storeMap.set((s as any)._id.toString(), s);

    // Build txnData from maps
    const txnData = recentTxns.map((txn) => {
      const storeId = txn.metadata?.storeId?.toString();
      if (!storeId) return null;
      const usedStore = storeMap.get(storeId);
      if (!usedStore || !(usedStore as any).category) return null;
      const usedOffer = txnOfferMap.get(storeId);
      return { txn, storeId, usedStore, usedCashbackPct: usedOffer?.cashbackPercentage ?? 0 };
    });

    // For each valid txn, find nearby alternatives with batch offer lookup
    const resultCandidates = await Promise.all(
      txnData.map(async (entry) => {
        if (!entry) return null;
        const { txn, storeId, usedStore, usedCashbackPct } = entry;
        const usedStoreCategoryId = (usedStore as any).category.toString();

        const nearbyStores = await Store.find({
          _id: { $ne: new mongoose.Types.ObjectId(storeId) },
          category: new mongoose.Types.ObjectId(usedStoreCategoryId),
          isActive: true,
          'location.coordinates': {
            $geoWithin: { $centerSphere: [[userLng, userLat], radiusMeters / 6_371_000] },
          },
        })
          .select('name logo location.coordinates ratings.average')
          .limit(20)
          .lean();

        // Batch-fetch offers for all nearby stores in ONE query
        const nearbyStoreIds = nearbyStores.map((s: any) => s._id);
        const altOfferMap = await fetchBestCashbackOffers(nearbyStoreIds);

        let bestAlternative: any = null;
        for (const altStore of nearbyStores) {
          const altStoreId = (altStore as any)._id.toString();
          const altOffer = altOfferMap.get(altStoreId);
          if (!altOffer) continue;
          const altCashback: number = altOffer.cashbackPercentage ?? 0;
          if (altCashback <= usedCashbackPct) continue;
          if (bestAlternative && altCashback <= bestAlternative.cashbackPercent) continue;

          const altCoords: number[] | undefined = (altStore as any).location?.coordinates;
          const distanceMeters =
            altCoords && altCoords.length === 2
              ? haversineMetres(userLat, userLng, altCoords[1], altCoords[0])
              : radiusMeters;

          bestAlternative = {
            storeId: altStoreId,
            storeName: (altStore as any).name,
            storeLogo: (altStore as any).logo ?? altOffer.store?.logo,
            cashbackPercent: altCashback,
            estimatedSavingPaise: Math.round(((altCashback - usedCashbackPct) * txn.amount) / 100),
            distanceMeters: Math.round(distanceMeters),
          };
        }

        if (!bestAlternative) return null;
        return {
          transactionStoreId: storeId,
          transactionStoreName: (usedStore as any).name ?? txn.metadata?.storeName ?? '',
          transactionAmountPaise: txn.amount,
          betterOption: bestAlternative,
        };
      }),
    );

    const results = resultCandidates.filter(Boolean).slice(0, 5);
    return res.json({ success: true, data: results });
  }),
);

// ---------------------------------------------------------------------------
// GET /api/user/savings/summary
// ---------------------------------------------------------------------------
router.get(
  '/summary',
  requireAuth,
  asyncHandler(async (req: any, res: any) => {
    const userId = req.user?.id || req.user?._id?.toString();
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const userObjId = new mongoose.Types.ObjectId(userId);

    // Aggregate lifetime + this month + last month cashback earnings
    const [savingsAgg] = await CoinTransaction.aggregate([
      {
        $match: {
          user: userObjId,
          type: { $in: ['earned', 'bonus'] },
          source: { $in: ['cashback', 'purchase_reward', 'smart_spend_reward'] },
        },
      },
      {
        $group: {
          _id: null,
          lifetimeTotal: { $sum: '$amount' },
          thisMonthTotal: {
            $sum: {
              $cond: [{ $gte: ['$createdAt', startOfThisMonth] }, '$amount', 0],
            },
          },
          lastMonthTotal: {
            $sum: {
              $cond: [
                {
                  $and: [{ $gte: ['$createdAt', startOfLastMonth] }, { $lte: ['$createdAt', endOfLastMonth] }],
                },
                '$amount',
                0,
              ],
            },
          },
          visitCount: { $sum: 1 },
        },
      },
    ]);

    const lifetimeSavedPaise = savingsAgg?.lifetimeTotal ?? 0;
    const thisMonthSavedPaise = savingsAgg?.thisMonthTotal ?? 0;
    const lastMonthSavedPaise = savingsAgg?.lastMonthTotal ?? 0;
    const visitCount = savingsAgg?.visitCount ?? 0;
    const avgPerVisitPaise = visitCount > 0 ? Math.round(lifetimeSavedPaise / visitCount) : 0;

    // Top category by cashback savings
    const categoryAgg = await CoinTransaction.aggregate([
      {
        $match: {
          user: userObjId,
          type: { $in: ['earned', 'bonus'] },
          source: { $in: ['cashback', 'purchase_reward', 'smart_spend_reward'] },
          category: { $ne: null },
        },
      },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
      { $limit: 1 },
    ]);
    const topCategory: string = categoryAgg[0]?._id ?? '';

    // Missed savings count (rough: transactions with metadata.storeId in last 30d)
    const missedSavingsCount = await CoinTransaction.countDocuments({
      user: userObjId,
      'metadata.storeId': { $exists: true, $ne: null },
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Savings streak: consecutive calendar days with at least one cashback transaction
    const recentDays = await CoinTransaction.aggregate([
      {
        $match: {
          user: userObjId,
          type: { $in: ['earned', 'bonus'] },
          source: { $in: ['cashback', 'purchase_reward', 'smart_spend_reward'] },
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    const daySet = new Set(recentDays.map((d: any) => d._id));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 31; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const key = d.toISOString().split('T')[0];
      if (daySet.has(key)) {
        streak++;
      } else {
        break;
      }
    }

    return res.json({
      success: true,
      data: {
        lifetimeSavedPaise,
        thisMonthSavedPaise,
        lastMonthSavedPaise,
        avgPerVisitPaise,
        topCategory,
        missedSavingsCount,
        savingsStreak: streak,
      },
    });
  }),
);

// ---------------------------------------------------------------------------
// GET /api/user/savings/best-nearby
// ---------------------------------------------------------------------------
router.get(
  '/best-nearby',
  optionalAuth,
  asyncHandler(async (req: any, res: any) => {
    const coords = parseCoords(req.query.lat, req.query.lng);
    if (!coords) {
      return res.status(400).json({ success: false, message: 'Valid lat and lng query params are required' });
    }
    const [userLat, userLng] = coords;

    const categoryParam = req.query.category ? String(req.query.category).trim() : null;
    const budgetPaise = Math.max(0, parseInt(String(req.query.budgetPaise ?? '50000'), 10) || 50_000);

    // Find category ObjectId if name provided.
    // SEC: escape regex metachars so attacker input can't trigger catastrophic
    // backtracking (ReDoS) or unintended query semantics. e.g. `category=(a+)+b`
    // previously would DoS the DB. Limit length too as defence in depth.
    const Category = mongoose.model('Category');
    let categoryFilter: any = {};
    if (categoryParam && categoryParam.length <= 100) {
      const escapedName = categoryParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const cat = await Category.findOne({
        $or: [{ name: { $regex: new RegExp(`^${escapedName}$`, 'i') } }, { slug: categoryParam.toLowerCase() }],
      })
        .select('_id')
        .lean();
      if (cat) {
        categoryFilter = { category: (cat as any)._id };
      }
    }

    const Store = mongoose.model('Store');

    // Find nearby stores within 2km
    const nearbyStores = await Store.find({
      isActive: true,
      ...categoryFilter,
      'location.coordinates': {
        $geoWithin: {
          $centerSphere: [[userLng, userLat], 2000 / 6_371_000],
        },
      },
    })
      .select('name logo location.coordinates ratings.average')
      .limit(50)
      .lean();

    // Batch-fetch best cashback offer for all stores in ONE query
    const storeIds = nearbyStores.map((s: any) => s._id);
    const offerMap = await fetchBestCashbackOffers(storeIds);

    const storeResults: any[] = nearbyStores
      .map((store) => {
        const storeId = (store as any)._id.toString();
        const bestOffer = offerMap.get(storeId);
        if (!bestOffer) return null;
        const cashbackPercent: number = bestOffer.cashbackPercentage ?? 0;
        const storeCoords: number[] | undefined = (store as any).location?.coordinates;
        return {
          storeId,
          storeName: (store as any).name,
          storeLogo: (store as any).logo ?? bestOffer.store?.logo,
          distanceMeters:
            storeCoords && storeCoords.length === 2
              ? Math.round(haversineMetres(userLat, userLng, storeCoords[1], storeCoords[0]))
              : null,
          cashbackPercent,
          expectedSavingPaise: Math.round((cashbackPercent * budgetPaise) / 100),
          rating: (store as any).ratings?.average ?? 0,
        };
      })
      .filter(Boolean) as any[];

    storeResults.sort((a, b) => b.expectedSavingPaise - a.expectedSavingPaise);

    return res.json({ success: true, data: storeResults.slice(0, 5) });
  }),
);

export default router;

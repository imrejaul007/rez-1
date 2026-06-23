import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin, requireSuperAdmin } from '../../middleware/auth';
import { CoinTransaction } from '../../models/CoinTransaction';
import { MerchantLiability } from '../../models/MerchantLiability';
import { MerchantWallet } from '../../models/MerchantWallet';
import { Order } from '../../models/Order';
import { WalletConfig } from '../../models/WalletConfig';
import redisService from '../../services/redisService';
import { logger } from '../../config/logger';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

const CACHE_KEY = 'admin:economics:overview';
const CACHE_TTL = 60; // 60 seconds

/**
 * @route   GET /api/admin/economics/overview
 * @desc    Economic Control Center — all 6 sections in one call
 * @access  Admin
 */
router.get('/overview', asyncHandler(async (_req: Request, res: Response) => {
  // Check Redis cache
  const cached = await redisService.get<any>(CACHE_KEY);
  if (cached) {
    return res.json({ success: true, data: cached });
  }

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const FRAUD_THRESHOLD = 5000;

  // ── All aggregations in parallel ──────────────────────────
  const [
    cashbackTodayAgg,
    cashbackYesterdayAgg,
    liabilityAgg,
    fraudUsersAgg,
    fraudHourlyAgg,
    issuanceTodayAgg,
    issuanceYesterdayAgg,
    topSourcesAgg,
    pendingReversals,
    completedReversalsAgg,
    oldestPending,
    settlementSummaryAgg,
    topMerchantsAgg,
  ] = await Promise.all([
    // 1. Cashback today
    CoinTransaction.aggregate([
      { $match: { source: 'purchase_reward', type: 'earned', createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),

    // 2. Cashback yesterday
    CoinTransaction.aggregate([
      { $match: { source: 'purchase_reward', type: 'earned', createdAt: { $gte: yesterday, $lt: today } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    // 3. Merchant liability by status
    MerchantLiability.aggregate([
      {
        $group: {
          _id: '$status',
          totalPending: { $sum: '$pendingAmount' },
          totalSettled: { $sum: '$settledAmount' },
          count: { $sum: 1 },
        },
      },
    ]),

    // 4. Fraud — top users earning > threshold in 24h
    CoinTransaction.aggregate([
      { $match: { type: 'earned', createdAt: { $gte: twentyFourHoursAgo } } },
      { $group: { _id: '$user', totalEarned: { $sum: '$amount' }, transactionCount: { $sum: 1 } } },
      { $match: { totalEarned: { $gt: FRAUD_THRESHOLD } } },
      { $sort: { totalEarned: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
          pipeline: [{ $project: { 'profile.firstName': 1, 'profile.lastName': 1 } }],
        },
      },
      {
        $project: {
          userId: '$_id',
          userName: {
            $concat: [
              { $ifNull: [{ $arrayElemAt: ['$userInfo.profile.firstName', 0] }, ''] },
              ' ',
              { $ifNull: [{ $arrayElemAt: ['$userInfo.profile.lastName', 0] }, ''] },
            ],
          },
          totalEarned: 1,
          transactionCount: 1,
          _id: 0,
        },
      },
    ]),

    // 5. Fraud — hourly alert counts (last 24h)
    CoinTransaction.aggregate([
      { $match: { type: 'earned', createdAt: { $gte: twentyFourHoursAgo } } },
      {
        $group: {
          _id: { user: '$user', hour: { $hour: '$createdAt' } },
          total: { $sum: '$amount' },
        },
      },
      { $match: { total: { $gt: FRAUD_THRESHOLD } } },
      { $group: { _id: '$_id.hour', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { hour: '$_id', count: 1, _id: 0 } },
    ]),

    // 6. Coin issuance today
    CoinTransaction.aggregate([
      { $match: { type: { $in: ['earned', 'bonus'] }, createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    // 7. Coin issuance yesterday
    CoinTransaction.aggregate([
      { $match: { type: { $in: ['earned', 'bonus'] }, createdAt: { $gte: yesterday, $lt: today } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    // 8. Top sources today
    CoinTransaction.aggregate([
      { $match: { type: { $in: ['earned', 'bonus'] }, createdAt: { $gte: today } } },
      { $group: { _id: '$source', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { amount: -1 } },
      { $limit: 5 },
      { $project: { source: '$_id', amount: 1, count: 1, _id: 0 } },
    ]),

    // 9. Pending reversals count
    Order.countDocuments({ status: 'cancelled', 'cancellation.refundStatus': 'pending' }),

    // 10. Completed reversals today
    CoinTransaction.aggregate([
      { $match: { type: 'refunded', createdAt: { $gte: today } } },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]),

    // 11. Oldest pending reversal
    Order.findOne({ status: 'cancelled', 'cancellation.refundStatus': 'pending' })
      .sort({ 'cancellation.cancelledAt': 1, createdAt: 1 })
      .select('cancellation.cancelledAt createdAt')
      .lean(),

    // 12. Settlement summary
    MerchantWallet.aggregate([
      { $match: { isActive: true, 'balance.pending': { $gt: 0 } } },
      { $group: { _id: null, totalPending: { $sum: '$balance.pending' }, merchantCount: { $sum: 1 } } },
    ]),

    // 13. Top merchants by pending settlement
    MerchantWallet.aggregate([
      { $match: { isActive: true, 'balance.pending': { $gt: 0 } } },
      { $sort: { 'balance.pending': -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'stores',
          localField: 'store',
          foreignField: '_id',
          as: 'storeInfo',
          pipeline: [{ $project: { name: 1 } }],
        },
      },
      {
        $project: {
          merchantId: '$merchant',
          storeName: { $ifNull: [{ $arrayElemAt: ['$storeInfo.name', 0] }, 'Unknown'] },
          pendingAmount: '$balance.pending',
          settlementCycle: 1,
          _id: 0,
        },
      },
    ]),
  ]);

  // ── Build liability map ──────────────────────────────────
  const liabilityMap: Record<string, { totalPending: number; totalSettled: number; count: number }> = {};
  for (const row of liabilityAgg) {
    liabilityMap[row._id] = row;
  }

  // ── Compute issuance metrics ─────────────────────────────
  const todayTotal = issuanceTodayAgg[0]?.total || 0;
  const yesterdayTotal = issuanceYesterdayAgg[0]?.total || 0;
  const hoursElapsed = Math.max(1, (now.getTime() - today.getTime()) / 3600000);
  const changePercent = yesterdayTotal > 0
    ? Math.round(((todayTotal - yesterdayTotal) / yesterdayTotal) * 100)
    : todayTotal > 0 ? 100 : 0;

  // ── Compute oldest pending age ───────────────────────────
  let oldestPendingAge: number | null = null;
  if (oldestPending) {
    const cancelDate = (oldestPending as any).cancellation?.cancelledAt || (oldestPending as any).createdAt;
    if (cancelDate) {
      oldestPendingAge = Math.round((now.getTime() - new Date(cancelDate).getTime()) / 3600000);
    }
  }

  // ── Assemble response ────────────────────────────────────
  const result = {
    cashbackToday: {
      totalAmount: cashbackTodayAgg[0]?.total || 0,
      transactionCount: cashbackTodayAgg[0]?.count || 0,
      yesterdayAmount: cashbackYesterdayAgg[0]?.total || 0,
    },
    merchantLiability: {
      totalPending: (liabilityMap['active']?.totalPending || 0) + (liabilityMap['pending_settlement']?.totalPending || 0),
      totalSettled: liabilityMap['settled']?.totalSettled || 0,
      activeCount: liabilityMap['active']?.count || 0,
      pendingSettlementCount: liabilityMap['pending_settlement']?.count || 0,
      disputedCount: liabilityMap['disputed']?.count || 0,
    },
    fraudAlerts: {
      alertCount: fraudUsersAgg.length,
      threshold: FRAUD_THRESHOLD,
      window: '24h',
      topFlaggedUsers: fraudUsersAgg,
      hourlyAlertCounts: fraudHourlyAgg,
    },
    coinIssuance: {
      todayTotal,
      yesterdayTotal,
      changePercent,
      hourlyRate: Math.round(todayTotal / hoursElapsed),
      topSources: topSourcesAgg,
    },
    rewardReversals: {
      pendingReversals,
      completedReversalsToday: completedReversalsAgg[0]?.count || 0,
      completedReversalAmount: completedReversalsAgg[0]?.amount || 0,
      oldestPendingAge,
    },
    settlementDue: {
      totalDueMerchants: settlementSummaryAgg[0]?.merchantCount || 0,
      totalPendingAmount: settlementSummaryAgg[0]?.totalPending || 0,
      topMerchants: topMerchantsAgg,
    },
    lastUpdated: now.toISOString(),
  };

  // Cache result
  await redisService.set(CACHE_KEY, result, CACHE_TTL).catch((err) => logger.warn('[Economics] Cache set for economics dashboard failed', { error: err.message }));

  res.json({ success: true, data: result });
}));

/**
 * @route   POST /api/admin/economics/cashback-toggle
 * @desc    Emergency toggle for platform-wide cashback (superadmin only)
 * @access  Super Admin
 */
router.post('/cashback-toggle', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ success: false, message: 'enabled (boolean) is required' });
  }

  // Use Redis feature flag for instant effect
  const flagKey = 'platform:cashback_enabled';
  await redisService.set(flagKey, enabled, 0); // no expiry

  // Also persist in WalletConfig for durability
  const config = await WalletConfig.findOne();
  if (config) {
    if (!config.get('platformSettings')) {
      config.set('platformSettings', {});
    }
    config.set('platformSettings.cashbackEnabled', enabled);
    config.markModified('platformSettings');
    await config.save();
  }

  logger.info(`🚨 [Emergency] Cashback ${enabled ? 'RESUMED' : 'PAUSED'} by admin ${req.userId}`);

  res.json({
    success: true,
    message: `Cashback ${enabled ? 'resumed' : 'paused'} platform-wide`,
    data: { cashbackEnabled: enabled },
  });
}));

/**
 * @route   GET /api/admin/economics/float-forecast
 * @desc    Platform float/burn forecast — total outstanding liability, projected burn, required float
 */
router.get('/float-forecast', asyncHandler(async (_req: Request, res: Response) => {
  const cacheKey = 'admin:economics:float-forecast';
  const cached = await redisService.get<any>(cacheKey);
  if (cached) {
    return res.json({ success: true, data: cached });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalLiability,
    dailyBurnLast30d,
    weeklyBurnTrend,
    totalIssuedToday,
    activeMerchants,
  ] = await Promise.all([
    // 1. Total outstanding liability (all pending + active)
    MerchantLiability.aggregate([
      { $match: { status: { $in: ['active', 'pending_settlement'] } } },
      { $group: { _id: null, totalPending: { $sum: '$pendingAmount' }, totalIssued: { $sum: '$rewardIssued' }, totalSettled: { $sum: '$settledAmount' }, count: { $sum: 1 } } },
    ]),

    // 2. Average daily coin burn (last 30 days)
    CoinTransaction.aggregate([
      { $match: { type: 'earned', createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, daily: { $sum: '$amount' } } },
      { $group: { _id: null, avgDaily: { $avg: '$daily' }, totalDays: { $sum: 1 }, totalCoins: { $sum: '$daily' } } },
    ]),

    // 3. Last 7 days burn per day (trend line)
    CoinTransaction.aggregate([
      { $match: { type: 'earned', createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    // 4. Total issued today
    CoinTransaction.aggregate([
      { $match: { type: 'earned', createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),

    // 5. Active merchant count
    MerchantLiability.distinct('merchant', { status: { $in: ['active', 'pending_settlement'] } }),
  ]);

  const liability = totalLiability[0] || { totalPending: 0, totalIssued: 0, totalSettled: 0, count: 0 };
  const burn = dailyBurnLast30d[0] || { avgDaily: 0, totalDays: 0, totalCoins: 0 };
  const todayIssued = totalIssuedToday[0] || { total: 0, count: 0 };

  const forecast = {
    // Current state
    outstandingLiability: liability.totalPending,
    totalIssuedAllTime: liability.totalIssued,
    totalSettledAllTime: liability.totalSettled,
    activeMerchantCount: activeMerchants.length,
    openLiabilityRecords: liability.count,

    // Burn metrics
    avgDailyBurn: Math.round(burn.avgDaily || 0),
    todayBurn: todayIssued.total,
    todayTransactions: todayIssued.count,

    // Projections
    projectedMonthlyBurn: Math.round((burn.avgDaily || 0) * 30),
    projectedQuarterlyBurn: Math.round((burn.avgDaily || 0) * 90),
    requiredFloatCapital: Math.round(liability.totalPending + (burn.avgDaily || 0) * 30), // Outstanding + 1 month runway

    // Trend (last 7 days)
    dailyBurnTrend: weeklyBurnTrend.map((d: any) => ({
      date: d._id,
      coinsIssued: d.total,
      transactions: d.count,
    })),

    // Health indicator
    burnRateChange: weeklyBurnTrend.length >= 2
      ? Math.round(((weeklyBurnTrend[weeklyBurnTrend.length - 1]?.total || 0) -
          (weeklyBurnTrend[0]?.total || 0)) / Math.max(weeklyBurnTrend[0]?.total || 1, 1) * 100)
      : 0,

    generatedAt: now.toISOString(),
  };

  await redisService.set(cacheKey, forecast, 300); // 5 min cache

  return res.json({ success: true, data: forecast });
}));

export default router;

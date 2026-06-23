import { logger } from '../../config/logger';
import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { Order } from '../../models/Order';
import { User } from '../../models/User';
import { Merchant } from '../../models/Merchant';
import { Store } from '../../models/Store';
import { MerchantWallet } from '../../models/MerchantWallet';
import { CoinTransaction } from '../../models/CoinTransaction';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get platform-wide dashboard statistics
 * @access  Admin
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());

  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // Get counts in parallel
  const [
    totalUsers,
    activeUsers,
    newUsersToday,
    newUsersThisMonth,
    totalMerchants,
    activeMerchants,
    pendingMerchants,
    suspendedMerchants,
    newMerchantsThisMonth,
    totalOrders,
    todayOrders,
    thisWeekOrders,
    thisMonthOrders,
    pendingOrders,
    totalCoinTransactions,
    todayCoinTransactions,
    thisMonthCoinTransactions,
    pendingCoinRewards,
    platformStats
  ] = await Promise.all([
    // Users
    User.countDocuments({}),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ createdAt: { $gte: today } }),
    User.countDocuments({ createdAt: { $gte: thisMonthStart } }),

    // Merchants (from merchants collection)
    Merchant.countDocuments({}),
    Merchant.countDocuments({ isActive: true }),
    Merchant.countDocuments({ verificationStatus: 'pending' }),
    Merchant.countDocuments({ isActive: false }),
    Merchant.countDocuments({ createdAt: { $gte: thisMonthStart } }),

    // Orders
    Order.countDocuments(),
    Order.countDocuments({ createdAt: { $gte: today } }),
    Order.countDocuments({ createdAt: { $gte: thisWeekStart } }),
    Order.countDocuments({ createdAt: { $gte: thisMonthStart } }),
    Order.countDocuments({ status: { $in: ['pending', 'placed'] } }),

    // Coins
    CoinTransaction.countDocuments({}),
    CoinTransaction.countDocuments({ createdAt: { $gte: today } }),
    CoinTransaction.countDocuments({ createdAt: { $gte: thisMonthStart } }),

    // Pending coin rewards count
    (async () => {
      try {
        const PendingCoinReward = require('../../models/PendingCoinReward').default || require('../../models/PendingCoinReward').PendingCoinReward;
        return await PendingCoinReward.countDocuments({ status: 'pending' });
      } catch { return 0; }
    })(),

    // Platform-wide wallet stats
    MerchantWallet.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$statistics.totalSales' },
          totalPlatformFees: { $sum: '$statistics.totalPlatformFees' },
          totalNetSales: { $sum: '$statistics.netSales' },
          totalOrders: { $sum: '$statistics.totalOrders' }
        }
      }
    ])
  ]);

  // Get total coins awarded
  const coinStats = await CoinTransaction.aggregate([
    {
      $group: {
        _id: null,
        totalAwarded: { $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] } }
      }
    }
  ]);

  // Revenue stats
  const revenueStats = await Order.aggregate([
    { $match: { 'payment.status': 'paid' } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totals.total' },
        totalPlatformFees: { $sum: { $ifNull: ['$totals.platformFee', 0] } }
      }
    }
  ]);

  const todayRevenue = await Order.aggregate([
    { $match: { 'payment.status': 'paid', createdAt: { $gte: today } } },
    { $group: { _id: null, revenue: { $sum: '$totals.total' } } }
  ]);

  const weekRevenue = await Order.aggregate([
    { $match: { 'payment.status': 'paid', createdAt: { $gte: thisWeekStart } } },
    { $group: { _id: null, revenue: { $sum: '$totals.total' } } }
  ]);

  const monthRevenue = await Order.aggregate([
    { $match: { 'payment.status': 'paid', createdAt: { $gte: thisMonthStart } } },
    { $group: { _id: null, revenue: { $sum: '$totals.total' } } }
  ]);

  // Build stats matching frontend DashboardStats interface
  const stats = {
    merchants: {
      total: totalMerchants,
      active: activeMerchants,
      pending: pendingMerchants,
      suspended: suspendedMerchants,
      newThisMonth: newMerchantsThisMonth
    },
    users: {
      total: totalUsers,
      active: activeUsers,
      newToday: newUsersToday,
      newThisMonth: newUsersThisMonth
    },
    orders: {
      total: totalOrders,
      today: todayOrders,
      thisWeek: thisWeekOrders,
      thisMonth: thisMonthOrders,
      pendingCount: pendingOrders
    },
    revenue: {
      today: todayRevenue[0]?.revenue || 0,
      thisWeek: weekRevenue[0]?.revenue || 0,
      thisMonth: monthRevenue[0]?.revenue || 0,
      totalPlatformFees: revenueStats[0]?.totalPlatformFees || platformStats[0]?.totalPlatformFees || 0
    },
    coins: {
      totalAwarded: coinStats[0]?.totalAwarded || totalCoinTransactions,
      pendingApproval: pendingCoinRewards,
      awardedToday: todayCoinTransactions,
      awardedThisMonth: thisMonthCoinTransactions
    },
    merchantWallets: platformStats[0] || {
      totalSales: 0,
      totalPlatformFees: 0,
      totalNetSales: 0,
      totalOrders: 0
    }
  };

  res.json({
    success: true,
    data: stats
  });
}));

/**
 * @route   GET /api/admin/dashboard/recent-activity
 * @desc    Get recent platform activity
 * @access  Admin
 */
router.get('/recent-activity', asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;

  // Get recent orders
  const recentOrders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('orderNumber status totals.total payment.status createdAt user')
    .populate('user', 'profile.firstName profile.lastName phoneNumber');

  // Get recent coin transactions
  const recentCoins = await CoinTransaction.find({ source: 'purchase_reward' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('amount source description createdAt user')
    .populate('user', 'profile.firstName profile.lastName phoneNumber');

  res.json({
    success: true,
    data: {
      recentOrders,
      recentCoinAwards: recentCoins
    }
  });
}));

export default router;
